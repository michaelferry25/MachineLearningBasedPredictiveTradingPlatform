import requests
from textblob import TextBlob
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import time


class SentimentAnalyzer:
    """Multi-source NLP sentiment engine combining news articles and Reddit social data."""

    SUBREDDITS = ['wallstreetbets', 'stocks', 'investing', 'StockMarket', 'options', 'Daytrading']
    REDDIT_HEADERS = {'User-Agent': 'MarketMind/1.0 (Sentiment Research Bot)'}

    def __init__(self):
        self.news_api_key = os.getenv('NEWS_API_KEY', '')

    # ──────────────── News API ────────────────

    def get_news_sentiment(self, symbol):
        try:
            url = 'https://newsapi.org/v2/everything'
            params = {
                'q': f'{symbol} stock OR {symbol} market',
                'language': 'en',
                'sortBy': 'publishedAt',
                'pageSize': 50,
                'apiKey': self.news_api_key,
                'from': (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            }

            response = requests.get(url, params=params, timeout=10)

            if response.status_code != 200:
                return self._default_news()

            articles = response.json().get('articles', [])
            if not articles:
                return self._default_news()

            analyzed = []
            for article in articles:
                title = article.get('title', '') or ''
                description = article.get('description', '') or ''
                text = f"{title} {description}".strip()
                if not text or len(text) < 10:
                    continue

                blob = TextBlob(text)
                polarity = blob.sentiment.polarity
                subjectivity = blob.sentiment.subjectivity

                analyzed.append({
                    'title': title,
                    'source': article.get('source', {}).get('name', 'Unknown'),
                    'url': article.get('url', ''),
                    'published': article.get('publishedAt', ''),
                    'polarity': round(polarity, 3),
                    'subjectivity': round(subjectivity, 3),
                    'sentiment': 'positive' if polarity > 0.1 else ('negative' if polarity < -0.1 else 'neutral'),
                })

            if not analyzed:
                return self._default_news()

            polarities = [a['polarity'] for a in analyzed]
            avg = sum(polarities) / len(polarities)
            pos = len([p for p in polarities if p > 0.1])
            neg = len([p for p in polarities if p < -0.1])
            neu = len(polarities) - pos - neg

            return {
                'source': 'news',
                'score': round(avg, 3),
                'label': self._label(avg),
                'confidence': round(min(95, max(50, abs(avg) * 100 + 50)), 1),
                'article_count': len(analyzed),
                'positive_ratio': round(pos / len(polarities) * 100, 1),
                'negative_ratio': round(neg / len(polarities) * 100, 1),
                'neutral_ratio': round(neu / len(polarities) * 100, 1),
                'top_articles': sorted(analyzed, key=lambda a: abs(a['polarity']), reverse=True)[:8],
            }

        except Exception as e:
            print(f"News sentiment error: {e}")
            return self._default_news()

    # ──────────────── Reddit Public JSON API ────────────────

    def get_reddit_sentiment(self, symbol):
        all_posts = []
        subreddit_counts = {}

        # Fetch all subreddits in parallel
        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {executor.submit(self._fetch_subreddit, sub, symbol): sub for sub in self.SUBREDDITS}
            for future in as_completed(futures):
                sub = futures[future]
                try:
                    posts = future.result()
                    subreddit_counts[sub] = len(posts)
                    all_posts.extend(posts)
                except Exception as e:
                    print(f"Reddit r/{sub} error: {e}")
                    subreddit_counts[sub] = 0

        if not all_posts:
            return self._default_reddit()

        # NLP analysis with upvote weighting
        analyzed = []
        for post in all_posts:
            text = f"{post['title']} {post.get('selftext', '')}".strip()
            if len(text) < 10:
                continue

            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity

            # Weight by engagement: more upvotes = more influential
            ups = max(post.get('ups', 1), 1)
            comments = max(post.get('num_comments', 0), 0)
            engagement = ups + (comments * 2)
            weight = min(3.0, 1.0 + (engagement / 500))

            analyzed.append({
                'title': post['title'],
                'subreddit': post['subreddit'],
                'url': f"https://reddit.com{post.get('permalink', '')}",
                'ups': ups,
                'num_comments': comments,
                'created': post.get('created_utc', ''),
                'polarity': round(polarity, 3),
                'subjectivity': round(subjectivity, 3),
                'weight': round(weight, 2),
                'weighted_polarity': round(polarity * weight, 3),
                'sentiment': 'positive' if polarity > 0.1 else ('negative' if polarity < -0.1 else 'neutral'),
            })

        if not analyzed:
            return self._default_reddit()

        # Weighted average sentiment
        total_weight = sum(a['weight'] for a in analyzed)
        weighted_avg = sum(a['weighted_polarity'] for a in analyzed) / total_weight if total_weight else 0

        polarities = [a['polarity'] for a in analyzed]
        pos = len([p for p in polarities if p > 0.1])
        neg = len([p for p in polarities if p < -0.1])
        neu = len(polarities) - pos - neg

        # Sort by engagement for display
        top_posts = sorted(analyzed, key=lambda a: a['ups'] + a['num_comments'], reverse=True)[:10]

        return {
            'source': 'reddit',
            'score': round(weighted_avg, 3),
            'label': self._label(weighted_avg),
            'confidence': round(min(95, max(50, abs(weighted_avg) * 100 + 45)), 1),
            'post_count': len(analyzed),
            'positive_ratio': round(pos / len(polarities) * 100, 1),
            'negative_ratio': round(neg / len(polarities) * 100, 1),
            'neutral_ratio': round(neu / len(polarities) * 100, 1),
            'subreddit_counts': subreddit_counts,
            'top_posts': top_posts,
        }

    def _fetch_subreddit(self, subreddit, symbol):
        """Fetch posts mentioning symbol from a subreddit using Reddit's public JSON API."""
        url = f"https://www.reddit.com/r/{subreddit}/search.json"
        params = {
            'q': symbol,
            'restrict_sr': 'on',
            'sort': 'relevance',
            't': 'week',
            'limit': 25,
        }

        resp = requests.get(url, headers=self.REDDIT_HEADERS, params=params, timeout=5)

        if resp.status_code == 429:
            time.sleep(2)
            resp = requests.get(url, headers=self.REDDIT_HEADERS, params=params, timeout=5)

        if resp.status_code != 200:
            return []

        data = resp.json().get('data', {}).get('children', [])
        posts = []
        cutoff = datetime.now().timestamp() - (7 * 86400)

        for child in data:
            post = child.get('data', {})
            created = post.get('created_utc', 0)
            if created < cutoff:
                continue

            posts.append({
                'title': post.get('title', ''),
                'selftext': (post.get('selftext', '') or '')[:500],
                'subreddit': subreddit,
                'ups': post.get('ups', 0),
                'num_comments': post.get('num_comments', 0),
                'permalink': post.get('permalink', ''),
                'created_utc': created,
            })

        return posts

    # ──────────────── Combined Intelligence ────────────────

    def get_combined_sentiment(self, symbol):
        # Fetch news and Reddit in parallel
        with ThreadPoolExecutor(max_workers=2) as executor:
            news_future = executor.submit(self.get_news_sentiment, symbol)
            reddit_future = executor.submit(self.get_reddit_sentiment, symbol)
            news = news_future.result()
            reddit = reddit_future.result()

        news_score = news.get('score', 0)
        reddit_score = reddit.get('score', 0)
        news_count = news.get('article_count', 0)
        reddit_count = reddit.get('post_count', 0)

        # Dynamic weighting: more data = more influence
        total_sources = news_count + reddit_count
        if total_sources == 0:
            news_weight, reddit_weight = 0.5, 0.5
        else:
            news_weight = max(0.3, min(0.7, news_count / total_sources))
            reddit_weight = 1.0 - news_weight

        combined_score = (news_score * news_weight) + (reddit_score * reddit_weight)
        combined_confidence = (news.get('confidence', 50) * news_weight) + (reddit.get('confidence', 50) * reddit_weight)

        # Agreement check: do news and Reddit agree?
        news_dir = 1 if news_score > 0.05 else (-1 if news_score < -0.05 else 0)
        reddit_dir = 1 if reddit_score > 0.05 else (-1 if reddit_score < -0.05 else 0)
        sources_agree = news_dir == reddit_dir and news_dir != 0

        if sources_agree:
            combined_confidence = min(95, combined_confidence + 10)
            agreement = 'strong'
        elif news_dir != 0 and reddit_dir != 0 and news_dir != reddit_dir:
            combined_confidence = max(50, combined_confidence - 10)
            agreement = 'divergent'
        else:
            agreement = 'mixed'

        return {
            'combined': {
                'score': round(combined_score, 3),
                'label': self._label(combined_score),
                'confidence': round(combined_confidence, 1),
                'agreement': agreement,
                'news_weight': round(news_weight, 2),
                'reddit_weight': round(reddit_weight, 2),
                'total_sources': total_sources,
            },
            'news': news,
            'reddit': reddit,
        }

    # ──────────────── Helpers ────────────────

    def _label(self, score):
        if score > 0.3:
            return 'Very Positive'
        elif score > 0.1:
            return 'Positive'
        elif score > -0.1:
            return 'Neutral'
        elif score > -0.3:
            return 'Negative'
        else:
            return 'Very Negative'

    def _default_news(self):
        return {
            'source': 'news', 'score': 0.0, 'label': 'Neutral', 'confidence': 50.0,
            'article_count': 0, 'positive_ratio': 33.3, 'negative_ratio': 33.3,
            'neutral_ratio': 33.4, 'top_articles': [],
        }

    def _default_reddit(self):
        return {
            'source': 'reddit', 'score': 0.0, 'label': 'Neutral', 'confidence': 50.0,
            'post_count': 0, 'positive_ratio': 33.3, 'negative_ratio': 33.3,
            'neutral_ratio': 33.4, 'subreddit_counts': {}, 'top_posts': [],
        }
