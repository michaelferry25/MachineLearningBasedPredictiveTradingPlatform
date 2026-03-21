<div align="center">


  # MarketMind

  **Machine learning powered predictive trading platform with real-time AI stock predictions**

  [![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
  [![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.2-6DB33F?style=flat&logo=spring-boot&logoColor=white)](https://spring.io/projects/spring-boot)
  [![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=flat&logo=python&logoColor=white)](https://python.org/)
  [![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white)](https://www.chartjs.org/)
</div>

---

## Overview

**MarketMind** is a full-stack predictive trading platform that gives retail investors access to institutional-grade market analysis tools. It combines real-time stock data, machine learning price predictions, FinBERT-powered financial sentiment analysis, paper trading, and a gamified learning module — all in a responsive web application.

- **ML-powered predictions** — ensemble of Random Forest, Gradient Boosting, and XGBoost models predicting 5-day forward returns using 29 technical indicators and macro signals
- **FinBERT sentiment analysis** — NLP analysis of financial news (NewsAPI) and Reddit discussions (6 subreddits) using the ProsusAI/finbert transformer model, with TextBlob fallback
- **Real-time market data** — live prices via Finnhub API, historical and candlestick charts via Yahoo Finance, market session tracking
- **Paper trading engine** — simulated trading with $100,000 virtual funds, portfolio tracking, equity curves, P&L analysis, and trade receipts
- **Research & analytics** — stock screener, research hub, analytics hub with model comparison, Fear & Greed gauge, and prediction track records
- **Gamified learning** — 16 lessons across 3 modules (Market Basics, Data Whiz, Market Pro) with XP, streaks, and badge achievements
- **Interactive dashboard** — React 19 UI with real-time updates, toast notifications, keyboard shortcuts, watchlists, and CSV export

---

## Problem Statement

Retail investors lack access to the sophisticated analysis tools available to institutional traders. Existing platforms like Bloomberg Terminal or Refinitiv charge thousands per year, while free alternatives lack predictive capabilities.

**MarketMind** offers a free, accessible platform that combines:

- Machine learning price predictions with calibrated confidence scoring
- Real-time market sentiment analysis using FinBERT NLP on financial news and Reddit
- Paper trading to practice strategies without financial risk
- A learning module to build foundational trading knowledge
- Clean, intuitive dashboard designed for quick decision-making

---

## Architecture

| Component | Tech Stack | Function |
|---|---|---|
| **Frontend** | React 19, Vite 7, Chart.js 4.5, Lightweight Charts | Dashboard, charts, trading UI, learning module, auth |
| **Backend API** | Spring Boot 3.2, Java 17, Spring Security, JPA/Hibernate | REST API, JWT auth, portfolio management, prediction logging |
| **ML Service** | Python 3.11, Flask, scikit-learn, XGBoost, PyTorch | Ensemble predictions, FinBERT sentiment, background scheduler |
| **Database** | H2 (file-based) with Hibernate ORM | Users, portfolios, trades, predictions, learning progress |
| **External APIs** | Finnhub, Yahoo Finance, NewsAPI, Reddit | Live prices, historical data, news and social sentiment |

```
┌──────────────────────┐
│   React Frontend     │ ← Nginx (Port 80)
│   Vite / Chart.js    │   SPA routing + API proxy
└──────────┬───────────┘
           │
      ┌────┴─────┐
      ↓          ↓
┌──────────┐ ┌──────────────┐
│  Spring  │ │  Python ML   │
│  Boot    │ │  Service     │
│  API     │ │  Flask       │
│  :8080   │ │  :5001       │
│          │ │              │
│  JWT Auth│ │  RF + GBR +  │
│  JPA/H2  │ │  XGBoost     │
│  Trading │ │  FinBERT NLP │
└────┬─────┘ └──────┬───────┘
     │               │
     ↓               ↓
┌──────────────────────┐
│    External APIs     │
│  Finnhub · Yahoo     │
│  NewsAPI · Reddit    │
└──────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **Real-Time Stock Tracking** | Live price updates for 8 tracked equities via Finnhub API |
| **Ensemble ML Predictions** | Random Forest, Gradient Boosting, and XGBoost models with dynamic weighted averaging based on validation MAE |
| **FinBERT Sentiment Analysis** | ProsusAI/finbert NLP model analysing news (NewsAPI) and Reddit (6 subreddits) with weighted source fusion |
| **Paper Trading** | Buy/sell simulation with $100k virtual portfolio, position averaging, and real-time P&L tracking |
| **JWT Authentication** | Secure user accounts with registration, login, profile management, password change, and user settings |
| **Equity Curve** | Interactive portfolio performance chart with gradient fill, crosshair tooltip, zoom/pan, and high/low watermarks |
| **Prediction History & Track Record** | Full history of past predictions with accuracy metrics, directional accuracy, evaluation against actuals |
| **Market Status Indicator** | Live display showing market open, pre-market, after-hours, or closed with countdown timer |
| **Trade Receipt Modal** | Detailed confirmation after each trade showing order ID, price, quantity, and realised P&L |
| **Confetti Animation** | Canvas-based particle celebration on profitable sell trades |
| **Stock Screener** | Filter and browse stocks with key metrics |
| **Research Hub** | Centralised research dashboard for in-depth stock analysis |
| **Analytics Hub** | Model comparison, global metrics, and prediction performance analytics |
| **News Sentiment Panel** | News articles and Reddit posts with per-article sentiment scores and source agreement signals |
| **Fear & Greed Gauge** | Market fear/greed index (0–100) derived from VIX and SPY signals |
| **Technical Indicators** | RSI, MACD, Stochastic, ADX, Bollinger Bands, moving averages displayed in interactive charts |
| **Feature Importance Chart** | Visual breakdown of which indicators drive predictions for each stock |
| **Model Performance Charts** | Predicted vs actual price comparison, accuracy over time, backtest visualisation |
| **Candlestick Charts** | Candlestick data with configurable intervals and output sizes |
| **Historical Charts** | Lightweight Charts JS rendering with 5D, 1M, 3M, 6M, 1Y ranges and track record overlay |
| **Custom Watchlist** | Personalised stock watchlist for quick access |
| **Learning Module** | 16 gamified lessons across 3 modules (Market Basics, Data Whiz, Market Pro) with XP, streaks, and badges |
| **Export to CSV** | Download portfolio holdings and trade history as CSV files |
| **Keyboard Shortcuts** | Keys 1–8 for quick stock selection, ? for help, and other navigation shortcuts |
| **Toast Notifications** | Real-time feedback on trade execution, errors, and system events |
| **Live Market View** | Dedicated real-time market data page |
| **User Settings** | Theme, notification preferences, and personalisation options |
| **Scheduled Predictions** | Background jobs running hourly predictions and daily close predictions (4 PM ET, Mon–Fri) with automatic evaluation |

---

## Tracked Stocks

The platform tracks and generates predictions for eight major US equities:

**AAPL** · **MSFT** · **TSLA** · **AMZN** · **NVDA** · **META** · **NFLX** · **GOOGL**

Predictions run on a configurable schedule (default: every 60 minutes) with a dedicated daily close prediction at 4 PM ET on weekdays. All predictions are automatically evaluated against actual prices.

---

## ML Model Details

The prediction engine uses a **return-based ensemble** approach rather than direct price prediction:

1. **Feature Engineering** — 29 features across 5 categories:
   - **Trend (8):** SMA 20/50/200, SMA crossovers, distance from SMA 200
   - **Momentum (8):** MACD, MACD histogram, RSI, momentum, rate of change, 1/5/10-day returns
   - **Volatility (8):** Bollinger Band width/%, ATR ratio, volatility, volume ratio, OBV signal, ADX, Stochastic K
   - **Macro (4):** VIX level, VIX 5-day change, SPY vs SMA 50, SPY 5-day return
   - **Other (1):** 52-week high/low percentages

2. **Ensemble Models** trained on 5 years of historical data with 70/15/15 train/validation/test split:
   - Random Forest (300 estimators, max_depth=8)
   - Gradient Boosting (250 estimators, max_depth=4, learning_rate=0.02)
   - XGBoost (300 estimators, max_depth=5, learning_rate=0.02, L1/L2 regularisation)

3. **Dynamic Weighting** — models weighted by inverse validation MAE so more accurate models contribute more to the final prediction

4. **Sentiment Fusion** — FinBERT sentiment scores integrated with a controlled max 2% return contribution, with blend weight (0–40%) determined by confidence and source agreement

5. **Confidence Calibration** — calibrated between 35–94% based on signal-to-noise ratio, model disagreement, and historical accuracy

6. **Output** — predicted price, % change, calibrated confidence, signal (STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL), direction, market regime detection (bullish_trend, bearish_trend, high_volatility, range_bound), and prediction intervals

---

## Sentiment Analysis

Multi-source NLP-powered sentiment using **FinBERT** (ProsusAI/finbert):

- **News** — last 7 days of articles from NewsAPI (up to 50 articles per symbol)
- **Reddit** — last 7 days from 6 subreddits: r/wallstreetbets, r/stocks, r/investing, r/StockMarket, r/options, r/Daytrading
- **Scoring** — per-article/post sentiment score [-1, +1] with positive/negative/neutral ratios
- **Source Agreement** — strong, divergent, or mixed signals based on news vs Reddit alignment
- **Fallback** — TextBlob polarity analysis if FinBERT model is unavailable
- **Caching** — 30-minute TTL to avoid redundant API calls

---

## Pages & Navigation

| Page | Route | Description |
|---|---|---|
| Overview | `/overview` | Landing page with hero section and platform introduction |
| Dashboard | `/dashboard` | Main trading interface with stock selection, charts, predictions, and trading panel |
| Analytics | `/analytics` | Analytics hub with model comparison and global metrics |
| Research | `/research` | Research dashboard for in-depth stock analysis |
| Screener | `/screener` | Stock screening and filtering tool |
| Live Market | `/live` | Real-time market data view |
| Portfolio | `/portfolio` | Portfolio page with holdings, equity curve, trade history, and performance |
| Learn | `/learn` | Gamified learning module with 16 lessons, XP, streaks, and badges |
| Profile | `/profile` | User profile management and portfolio summary |
| Settings | `/settings` | Theme, notifications, and personalisation preferences |
| Security | `/security` | Security information |
| About | `/about` | About MarketMind |

---

## Prerequisites

- Node.js 18+
- Java Development Kit 17
- Python 3.11+
- Finnhub API key ([free tier available](https://finnhub.io/))
- NewsAPI key ([free tier available](https://newsapi.org/))

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/michaelferry25/MachineLearningBasedPredictiveTradingPlatform.git
cd MachineLearningBasedPredictiveTradingPlatform
cp .env.example .env
```

Edit `.env` with your keys:

```
FINNHUB_API_KEY=your_finnhub_key
NEWS_API_KEY=your_newsapi_key
JWT_SECRET=your_64_char_random_string
```

### 2. One-command dev run

```bash
./dev.sh        # Mac/Linux
dev.bat         # Windows
```

This starts all three services:
- **Frontend** → `http://localhost:5173`
- **Backend** → `http://localhost:8080`
- **ML Service** → `http://localhost:5001`

---

## Docker Deployment

### Build and run with Docker Compose

```bash
docker-compose up --build
```

This starts:
- **Frontend** (Nginx) → `http://localhost:80` — serves the React SPA, proxies `/api/` to the backend and `/ml/` to the ML service
- **Backend** (Spring Boot) → `http://localhost:8080` — REST API with JWT auth and H2 database persisted in a Docker volume
- **ML Service** (Flask) → `http://localhost:5001` — prediction engine with in-memory caching (30 min TTL)

All services have `restart: unless-stopped` and the database persists via a Docker volume (`db-data`).

---

## Manual Setup

### Backend

```bash
cd backend
./gradlew build
./gradlew bootRun
```

### ML Service

```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login and receive JWT token (60 min expiry)
- `GET /api/auth/me` — Get current user profile
- `PUT /api/auth/profile` — Update display name and email
- `PUT /api/auth/password` — Change password
- `GET /api/auth/settings` — Get user settings
- `PUT /api/auth/settings` — Update user settings

### Stock Data
- `GET /api/price/{symbol}` — Live stock price from Finnhub
- `GET /api/historical/{symbol}?range={range}` — Historical prices (1W, 1M, 3M, 6M, 1Y)
- `GET /api/candles/{symbol}?interval=&outputsize=` — Candlestick chart data
- `GET /api/news/{symbol}` — News articles with sentiment scores

### Machine Learning
- `GET /api/ml/predict/{symbol}?horizonHours=24` — Get cached or fresh prediction
- `POST /api/ml/predict/{symbol}/refresh?horizonHours=24` — Force refresh prediction
- `GET /api/ml/predict/{symbol}/detailed` — Detailed prediction with feature importance, model comparison, indicator timeseries, and backtest data
- `GET /api/ml/predict-comparison/{symbol}` — Compare predictions from different sources
- `GET /api/ml/scan` — Batch predict all 8 tracked symbols
- `GET /api/ml/sentiment/{symbol}` — Sentiment analysis breakdown (news + Reddit)
- `GET /api/ml/predictions/{symbol}?limit=50&source=` — Prediction history for a symbol
- `GET /api/ml/predictions?limit=25` — Recent predictions across all symbols
- `POST /api/ml/evaluate?horizonHours=24` — Evaluate pending predictions against actual prices
- `GET /api/ml/accuracy/{symbol}?days=30` — Accuracy metrics over time
- `GET /api/ml/track-record/{symbol}?days=180` — Full prediction track record with data points
- `GET /api/ml/metrics` — Global prediction metrics across all symbols
- `GET /api/ml/health` — ML service health check

### ML Service (Flask — direct access on port 5001)
- `GET /predict/<symbol>` — Get prediction with sentiment fusion
- `GET /predict/<symbol>/detailed` — Detailed prediction with 60-day indicator timeseries
- `POST /batch-predict` — Batch predict multiple symbols
- `GET /sentiment/<symbol>` — Full sentiment breakdown
- `GET /market-fear` — Fear & Greed index (0–100)
- `GET /scheduler/status` — Background scheduler status
- `POST /cache/clear` — Clear prediction and sentiment caches
- `GET /health` — Health check

### Trading (requires JWT auth)
- `POST /api/trading/buy` — Execute buy order
- `POST /api/trading/sell` — Execute sell order
- `GET /api/trading/portfolio` — Portfolio summary with holdings, equity curve snapshots, and cash balance
- `GET /api/trading/history` — Trade history with realised P&L
- `GET /api/trading/performance` — Performance metrics

### Learning (requires JWT auth)
- `GET /api/learning/progress` — Get learning progress, XP, streak, badges, completed lessons
- `POST /api/learning/complete` — Mark lesson as complete and award XP

---

## Database Schema

| Entity | Fields | Purpose |
|---|---|---|
| **UserAccount** | email, encrypted password, display name, role, created date | User authentication |
| **TradeEntity** | symbol, quantity, price, type (buy/sell), timestamp, realised P&L | Trade records |
| **HoldingEntity** | symbol, quantity, average cost price | Current positions |
| **UserCashBalance** | available cash (starts at $100,000) | Cash tracking |
| **PortfolioSnapshotEntity** | total value, cash, holdings value, timestamp | Equity curve data |
| **PredictionLog** | symbol, direction, signal, confidence, predicted price, actual price, accuracy, source, timestamp | Prediction tracking |
| **LearningProgress** | lesson ID, completed flag, XP earned | Lesson completion |
| **UserXP** | total XP, current streak, skill level, last activity date | Learning gamification |

---

## Project Structure

```
MarketMind/
├── backend/
│   └── src/main/java/ie/michaelferry/tradingapi/
│       ├── auth/              # JWT auth, Spring Security config, user entities
│       ├── controllers/       # StockController, MLController, TradingController, LearningController
│       ├── models/            # JPA entities (trades, holdings, predictions, learning)
│       ├── repositories/      # Spring Data JPA repositories
│       ├── services/          # TradingService, StockService, NewsService, PredictionLogService
│       └── ml/                # PredictionScheduler (hourly + daily close + evaluation)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── auth/          # AuthPanel, ProfilePage
│       │   ├── layout/        # Navbar, Footer, HeroSection, Toast, MarketStatus, Confetti
│       │   ├── market/        # LiveMarket, StockScreener, StockInfo, Watchlist, PopularStocks
│       │   ├── charts/        # HistoricalChart, CandleChart, PerformanceChart
│       │   ├── trading/       # TradingPanel, Portfolio, EquityCurve, TradeHistory, TradeReceipt
│       │   ├── predictions/   # EnhancedPredictionCard, PredictionHistory, MLInsightsTabs
│       │   ├── research/      # ResearchHub, AnalyticsHub, NewsSentiment, FearGreedGauge
│       │   └── pages/         # LearnPage, SettingsPage, AboutSection, SecuritySection
│       ├── App.jsx            # Router with 12 pages
│       └── App.css            # Global styles
├── ml-service/
│   ├── app.py                 # Flask API with caching, scheduling, and Fear & Greed
│   ├── ml_model.py            # EnhancedStockPredictor (RF + GBR + XGB ensemble)
│   ├── sentiment_analyzer.py  # FinBERT sentiment (NewsAPI + Reddit, TextBlob fallback)
│   └── requirements.txt       # Flask, scikit-learn, XGBoost, PyTorch, transformers, yfinance
├── docker-compose.yml         # 3-service deployment with Nginx proxy
├── dev.sh                     # One-command dev launcher (Mac/Linux)
├── dev.bat                    # One-command dev launcher (Windows)
└── README.md
```

---

## Testing

```bash
# Backend
cd backend && ./gradlew test

# Frontend
cd frontend && npm test

# ML Service
cd ml-service && python -m pytest
```

---

## Contact

**Developer:** Michael Ferry
**Institution:** Atlantic Technological University
**Programme:** Software Development
**Year:** 2025/2026

---

## Disclaimer

MarketMind is a demonstration platform developed for educational purposes as a final year project. It uses simulated trading with virtual funds. This software should not be used for actual trading decisions or financial advice. Past performance does not guarantee future results.
