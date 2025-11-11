import os
import requests
import pandas as pd
from textblob import TextBlob
from dotenv import load_dotenv

# === Load environment variables ===
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    print(f".env file not found at {ENV_PATH}")
    exit()

API_KEY = os.getenv("NEWS_API_KEY")

if not API_KEY:
    print("Error: NEWS_API_KEY not found in .env file.")
    exit()

# === Configuration ===
QUERY = "stock market"
URL = f"https://newsapi.org/v2/everything?q={QUERY}&language=en&sortBy=publishedAt&apiKey={API_KEY}"

# === Fetch Latest News ===
print("Fetching latest financial news...")
response = requests.get(URL)
data = response.json()

if response.status_code != 200 or "articles" not in data:
    print("Error fetching news. Check your API key or query.")
    exit()

articles = data["articles"]
records = []

# === Analyse Sentiment ===
for article in articles[:10]:
    headline = article.get("title", "No Title")
    published = article.get("publishedAt", "Unknown")

    sentiment_score = TextBlob(headline).sentiment.polarity
    sentiment_label = (
        "Positive" if sentiment_score > 0.1
        else "Negative" if sentiment_score < -0.1
        else "Neutral"
    )

    records.append({
        "Headline": headline,
        "Sentiment": sentiment_label,
        "Score": round(sentiment_score, 3),
        "Published": published
    })

# === Display Results ===
df = pd.DataFrame(records)
print("\n=== Latest Financial News Sentiment ===\n")
print(df[["Headline", "Sentiment", "Score", "Published"]].to_string(index=False))

# === Save to CSV ===
output_path = os.path.join(PROJECT_ROOT, "data", "news_sentiment_results.csv")
df.to_csv(output_path, index=False)
print(f"\nResults saved to: {output_path}")
