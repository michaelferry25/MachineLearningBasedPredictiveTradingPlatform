import requests
from textblob import TextBlob
from datetime import datetime, timedelta
import os
import snscrape.modules.reddit as snreddit

class SentimentAnalyzer:
    def __init__(self):
        self.news_api_key = os.getenv('NEWS_API_KEY', '')
        
    def get_news_sentiment(self, symbol):
        try:
            url = f'https://newsapi.org/v2/everything'
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
                return self._get_default_sentiment()
            
            articles = response.json().get('articles', [])
            
            if not articles:
                return self._get_default_sentiment()
            
            sentiments = []
            for article in articles:
                title = article.get('title', '')
                description = article.get('description', '')
                text = f"{title} {description}"
                
                if text:
                    blob = TextBlob(text)
                    sentiments.append(blob.sentiment.polarity)
            
            if not sentiments:
                return self._get_default_sentiment()
            
            avg_sentiment = sum(sentiments) / len(sentiments)
            positive_count = len([s for s in sentiments if s > 0.1])
            negative_count = len([s for s in sentiments if s < -0.1])
            neutral_count = len(sentiments) - positive_count - negative_count
            
            sentiment_label = self._get_sentiment_label(avg_sentiment)
            confidence = min(95, max(50, abs(avg_sentiment) * 100 + 50))
            
            return {
                'score': round(avg_sentiment, 3),
                'label': sentiment_label,
                'confidence': round(confidence, 2),
                'article_count': len(articles),
                'positive_ratio': round(positive_count / len(sentiments) * 100, 1),
                'negative_ratio': round(negative_count / len(sentiments) * 100, 1),
                'neutral_ratio': round(neutral_count / len(sentiments) * 100, 1)
            }
            
        except Exception as e:
            print(f"Error fetching news sentiment: {str(e)}")
            return self._get_default_sentiment()
    
    def get_reddit_sentiment(self, symbol):
        try:
            subreddits = ['wallstreetbets', 'stocks', 'investing', 'StockMarket', 'options', 'Daytrading']
            all_posts = []
            
            for subreddit in subreddits:
                try:
                    query = f'{symbol} subreddit:{subreddit}'
                    scraper = snreddit.RedditSearchScraper(query, limit=15)
                    
                    post_count = 0
                    for post in scraper.get_items():
                        if post_count >= 15:
                            break
                        
                        if hasattr(post, 'created'):
                            post_age_days = (datetime.now() - post.created).days
                            if post_age_days <= 7:
                                all_posts.append(post)
                                post_count += 1
                        else:
                            all_posts.append(post)
                            post_count += 1
                            
                except Exception as e:
                    print(f"Error scraping r/{subreddit}: {str(e)}")
                    continue
            
            if not all_posts:
                print(f"No Reddit posts found for {symbol}")
                return self._get_default_sentiment()
            
            sentiments = []
            for post in all_posts:
                title = getattr(post, 'title', '')
                selftext = getattr(post, 'selftext', '')
                text = f"{title} {selftext}"
                
                if text and len(text.strip()) > 10:
                    blob = TextBlob(text)
                    polarity = blob.sentiment.polarity
                    
                    score = getattr(post, 'score', 0)
                    weight = min(score / 100, 3) if score > 0 else 1
                    
                    weighted_sentiment = polarity * weight
                    sentiments.append(weighted_sentiment)
            
            if not sentiments:
                print(f"No valid sentiment data from Reddit for {symbol}")
                return self._get_default_sentiment()
            
            avg_sentiment = sum(sentiments) / len(sentiments)
            positive_count = len([s for s in sentiments if s > 0.1])
            negative_count = len([s for s in sentiments if s < -0.1])
            neutral_count = len(sentiments) - positive_count - negative_count
            
            sentiment_label = self._get_sentiment_label(avg_sentiment)
            confidence = min(95, max(50, abs(avg_sentiment) * 100 + 40))
            
            wsb_posts = len([p for p in all_posts if hasattr(p, 'subreddit') and p.subreddit.lower() == 'wallstreetbets'])
            
            return {
                'score': round(avg_sentiment, 3),
                'label': sentiment_label,
                'confidence': round(confidence, 2),
                'post_count': len(all_posts),
                'wsb_posts': wsb_posts,
                'positive_ratio': round(positive_count / len(sentiments) * 100, 1),
                'negative_ratio': round(negative_count / len(sentiments) * 100, 1),
                'neutral_ratio': round(neutral_count / len(sentiments) * 100, 1)
            }
            
        except Exception as e:
            print(f"Error fetching Reddit sentiment: {str(e)}")
            return self._get_default_sentiment()
    
    def get_combined_sentiment(self, symbol):
        news = self.get_news_sentiment(symbol)
        reddit = self.get_reddit_sentiment(symbol)
        
        combined_score = (news['score'] * 0.6) + (reddit['score'] * 0.4)
        combined_label = self._get_sentiment_label(combined_score)
        combined_confidence = (news['confidence'] * 0.6) + (reddit['confidence'] * 0.4)
        
        return {
            'combined': {
                'score': round(combined_score, 3),
                'label': combined_label,
                'confidence': round(combined_confidence, 2)
            },
            'news': news,
            'reddit': reddit
        }
    
    def _get_sentiment_label(self, score):
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
    
    def _get_default_sentiment(self):
        return {
            'score': 0.0,
            'label': 'Neutral',
            'confidence': 50.0,
            'article_count': 0,
            'post_count': 0,
            'positive_ratio': 33.3,
            'negative_ratio': 33.3,
            'neutral_ratio': 33.4
        }