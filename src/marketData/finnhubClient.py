import finnhub
import os
from dotenv import load_dotenv

# Works out the project root so the script can find the .env file
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")

# Loads the environment variables
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    print(f".env file not found at {ENV_PATH}")
    exit()

API_KEY = os.getenv("FINNHUB_API_KEY")

# Stops everything if the API key is missing
if not API_KEY:
    print("FINNHUB_API_KEY not found in .env")
    exit()

# Create the Finnhub client
client = finnhub.Client(api_key=API_KEY)

def get_current_price(symbol: str):
    """
    Gets the latest price info for a given symbol.
    Keeping it simple at the moment.
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

# Basic test so I can run the file on its own
if __name__ == "__main__":
    print(get_current_price("AAPL"))
