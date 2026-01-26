# MarketMind

A full-stack predictive trading platform that provides retail investors with institutional-grade market analysis tools. MarketMind combines real-time stock data, machine learning price predictions, and paper trading capabilities in a responsive web application.

## Overview

MarketMind bridges the information gap between retail and institutional investors by delivering sophisticated trading analytics through an accessible interface. The platform integrates live market data, historical trend analysis, and predictive modelling to support informed investment decisions.

## Key Features

- Real-time stock price tracking via Finnhub API
- Machine learning price predictions with confidence scoring
- Interactive portfolio management with paper trading
- Historical price visualisation and trend analysis
- Trade execution simulation with profit/loss tracking
- Responsive dashboard with real-time updates

## Technology Stack

### Frontend
- React 18 with Vite
- Chart.js for data visualisation
- CSS3 for responsive design

### Backend
- Spring Boot 4.0 (Java 17)
- RESTful API architecture
- In-memory data management

### Machine Learning Service
- Python 3.11 with Flask
- Moving average trend analysis
- Yahoo Finance data integration

### External APIs
- Finnhub API for live stock prices
- Yahoo Finance for historical data

## Architecture

The application follows a microservices architecture with three main components:

```
┌─────────────────┐
│  React Frontend │ (Port 5173)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Spring Boot API │ (Port 8080)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Python ML      │ (Port 5001)
│  Service        │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  External APIs  │
└─────────────────┘
```

## Prerequisites

- Node.js 18 or higher
- Java Development Kit 17
- Python 3.11 or higher
- npm or yarn package manager
- Finnhub API key (free tier available)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/michaelferry25/MachineLearningBasedPredictiveTradingPlatform.git
cd MachineLearningBasedPredictiveTradingPlatform
```

### 2. Configure API Keys

Create a `.env` file at the repo root (you can copy `.env.example`) and add your keys:

```bash
cp .env.example .env
# then edit .env with your keys
```

Required:
- `FINNHUB_API_KEY`
- `NEWS_API_KEY`

Optional (frontend overrides):
- `VITE_API_URL` (default `http://localhost:8080`)
- `VITE_ML_API_URL` (default `http://localhost:5001`)

### 3. One-Command Dev Run (frontend + backend + ML)

```bash
./dev.sh
```

This starts:
- Backend on `http://localhost:8080`
- ML service on `http://localhost:5001`
- Frontend on `http://localhost:5173`

### 4. Backend Setup

```bash
cd backend
./gradlew build
./gradlew bootRun
```

The backend will start on `http://localhost:8080`

### 5. ML Service Setup

```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The ML service will start on `http://localhost:5001`

### 6. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

## Usage

1. Navigate to `http://localhost:5173` in your browser
2. Select a stock from popular stocks or search by symbol
3. View real-time price, historical chart, and price prediction
4. Use the trading panel to buy/sell shares with virtual funds
5. Monitor portfolio performance and trade history

## API Endpoints

### Stock Data
- `GET /api/price/{symbol}` - Fetch current stock price
- `GET /api/historical/{symbol}` - Retrieve historical prices

### Machine Learning
- `GET /api/ml/predict/{symbol}` - Get price prediction

### Trading
- `POST /api/trading/buy` - Execute buy order
- `POST /api/trading/sell` - Execute sell order
- `GET /api/trading/portfolio` - Fetch portfolio summary
- `GET /api/trading/history` - Retrieve trade history

## Project Structure

```
MarketMind/
├── backend/
│   └── src/main/java/ie/michaelferry/tradingapi/
│       ├── controllers/
│       ├── models/
│       └── services/
├── frontend/
│   └── src/
│       ├── components/
│       ├── App.jsx
│       └── App.css
├── ml-service/
│   ├── app.py
│   └── requirements.txt
└── README.md
```

## Testing

### Backend Tests
```bash
cd backend
./gradlew test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### ML Service Tests
```bash
cd ml-service
python -m pytest
```

## Development Roadmap

- Phase 1: Core development (Completed)
- Phase 2: Advanced ML models and testing (In Progress)
- Phase 3: User authentication and data persistence
- Phase 4: Mobile responsive optimisation
- Phase 5: Production deployment

## Contributing

This is an academic project developed as part of a final year dissertation. Contributions are not currently accepted.

## Licence

This project is developed for academic purposes. All rights reserved.

## Contact

**Developer:** Michael Ferry  
**Institution:** Atlantic Technological University  
**Programme:** Software Development  
**Year:** 2025/2026

## Acknowledgements

- Finnhub for market data API access
- Yahoo Finance for historical price data
- Atlantic Technological University for project supervision and support

## Disclaimer

MarketMind is a demonstration platform for educational purposes. It uses simulated trading with virtual funds. This software should not be used for actual trading decisions or financial advice. Past performance does not guarantee future results.
