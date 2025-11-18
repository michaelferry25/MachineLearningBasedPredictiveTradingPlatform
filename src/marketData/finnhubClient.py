import finnhub
import os
from dotenv import load_dotenv
import pandas as pd
import yfinance as yf
import time

# Work out the project root so the file can find the .env no matter where it is
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

# Load the environment values
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    print(f".env file not found at {ENV_PATH}")
    exit()

API_KEY = os.getenv("FINNHUB_API_KEY")

# Stop everything if the key is missing
if not API_KEY:
    print("FINNHUB_API_KEY not found in .env")
    exit()

# Create the Finnhub client for live prices
client = finnhub.Client(api_key=API_KEY)


def get_current_price(symbol: str):
    """
    Gets the latest price info for a stock.
    Keeping it simple for now.
    """
    try:
        data = client.quote(symbol)

        return {
            "symbol": symbol,
            "current": data.get("c"),
            "high": data.get("h"),
            "low": data.get("l"),
            "open": data.get("o"),
            "previous_close": data.get("pc")
        }

    except Exception as e:
        print(f"Error retrieving price for {symbol}: {e}")
        return None


def get_stock_history(symbol: str, period: str = "1y", interval: str = "1d"):
    """
    Historical stock data using Yahoo Finance.
    Works for stocks and ETFs.
    """
    try:
        df = yf.download(symbol, period=period, interval=interval)

        if df.empty:
            print("No historical data found for", symbol)
            return None

        df.reset_index(inplace=True)
        return df

    except Exception as e:
        print(f"Error getting historical stock data for {symbol}: {e}")
        return None


if __name__ == "__main__":
    # Test live price
    print("Live price test:")
    print(get_current_price("AAPL"))
    print()

    # Test historical price data
    print("Historical stock test:")
    print(get_stock_history("AAPL", period="1mo", interval="1d"))
