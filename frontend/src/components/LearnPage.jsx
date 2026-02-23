import { useState, useEffect } from "react";
import "./LearnPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const SKILL_CONFIG = {
  Beginner: { title: "Beginner Trader", color: "#4ade80", nextLevel: "Intermediate", nextXp: 300 },
  Intermediate: { title: "Market Analyst", color: "#60a5fa", nextLevel: "Expert", nextXp: 1000 },
  Expert: { title: "Expert Trader", color: "#f59e0b", nextLevel: null, nextXp: null }
};

const BADGE_ICONS = {
  "First Steps": "👣",
  "Getting Started": "⭐",
  "Scholar": "🎓",
  "On Fire": "🔥",
  "Dedicated": "🏆",
  "Market Basics": "📊",
  "Data Whiz": "🧠",
  "Market Pro": "🚀"
};

const LESSONS = [
  {
    id: "what-is-a-stock",
    module: 1,
    title: "What is a Stock?",
    xp: 25,
    content: (
      <>
        <p>When you buy a <strong>stock</strong>, you're buying a tiny piece of ownership in a company. Think of it like buying a slice of a pizza -the whole pizza is the company, and your slice is your share.</p>
        <p>Companies sell stocks to raise money. In return, you get to benefit if the company does well -the value of your slice goes up.</p>
        <h4>Why do stock prices move?</h4>
        <ul>
          <li><strong>Supply & demand</strong> -If lots of people want to buy a stock, the price goes up. If lots of people are selling, it goes down.</li>
          <li><strong>Company performance</strong> -Good earnings reports, new products, or strong growth push prices up.</li>
          <li><strong>Market sentiment</strong> -News, world events, and even social media can shift how people feel about a stock.</li>
        </ul>
        <div className="lesson-tip">Think of stock prices like a popularity contest -the more people believe in a company, the higher its stock price goes.</div>
      </>
    ),
    quiz: [
      { q: "If you own 100 shares of a company with 10,000 total shares, what do you own?", options: ["10% of the company", "1% of the company", "100% of the company", "0.1% of the company"], answer: 1 },
      { q: "A company reports record profits. What is most likely to happen to its stock?", options: ["Price drops sharply", "Price stays exactly the same", "Price rises due to demand", "The stock gets delisted"], answer: 2 }
    ]
  },
  {
    id: "how-the-market-works",
    module: 1,
    title: "How the Stock Market Works",
    xp: 25,
    content: (
      <>
        <p>The <strong>stock market</strong> is like a giant marketplace where people buy and sell shares of companies. The two biggest in the US are the <strong>NYSE</strong> (New York Stock Exchange) and <strong>NASDAQ</strong>.</p>
        <h4>Key concepts</h4>
        <ul>
          <li><strong>Exchange</strong> -The place where stocks are traded. Think of it as a farmers' market, but for company shares.</li>
          <li><strong>Broker</strong> -The middleman who executes your trades. Apps like Robinhood, Fidelity, and E*TRADE are brokers.</li>
          <li><strong>Ticker symbol</strong> -A short code for each company. Apple = AAPL, Tesla = TSLA, Google = GOOGL.</li>
        </ul>
        <h4>Market hours</h4>
        <p>The US stock market is open Monday to Friday, 9:30 AM to 4:00 PM Eastern Time. Some brokers offer pre-market (before 9:30) and after-hours (after 4:00) trading too.</p>
        <div className="lesson-tip">When the market is closed, you can still research and plan your trades using MarketMind's tools!</div>
      </>
    ),
    quiz: [
      { q: "Apple trades under the code AAPL. What is AAPL called?", options: ["A stock index", "A trading fee", "A ticker symbol", "A market order"], answer: 2 },
      { q: "It's 5:00 PM ET on a Tuesday. Can you trade on the NYSE right now?", options: ["Yes, the NYSE is open 24/7", "No, regular hours ended at 4:00 PM", "Yes, it closes at 6:00 PM", "No, it's only open on weekends"], answer: 1 }
    ]
  },
  {
    id: "buying-and-selling",
    module: 1,
    title: "How to Buy and Sell Stocks",
    xp: 25,
    content: (
      <>
        <p>The basic mechanics of trading are simple: you <strong>buy</strong> a stock when you think it will go up, and <strong>sell</strong> it when you want to take profits or cut losses.</p>
        <h4>Types of orders</h4>
        <ul>
          <li><strong>Market order</strong> -Buy/sell immediately at the current price. Fast but you might not get the exact price you see.</li>
          <li><strong>Limit order</strong> -Buy/sell only at a specific price or better. More control, but the trade might not happen if the price doesn't reach your limit.</li>
        </ul>
        <h4>The trading flow</h4>
        <ol>
          <li>Pick a stock you've researched</li>
          <li>Decide how many shares to buy</li>
          <li>Place your order</li>
          <li>Monitor your position</li>
          <li>Sell when you've hit your target or want to exit</li>
        </ol>
        <div className="lesson-tip">You can practice buying and selling on MarketMind's Dashboard with paper trading -no real money involved!</div>
      </>
    ),
    quiz: [
      { q: "You want to buy a stock at exactly $50, not a penny more. Which order type should you use?", options: ["A market order", "A stop order", "A limit order", "A margin order"], answer: 2 },
      { q: "You set a target price of $120 and the stock just hit $122. What should you do?", options: ["Hold and wait for $200", "Consider selling per your plan", "Buy more shares immediately", "Switch to a different stock"], answer: 1 }
    ]
  },
  {
    id: "reading-a-stock-quote",
    module: 1,
    title: "Reading a Stock Quote",
    xp: 25,
    usesLiveData: "scan",
    content: (liveData) => (
      <>
        <p>A stock quote tells you everything you need to know about a stock at a glance. Here are the key numbers:</p>
        <ul>
          <li><strong>Price</strong> -What one share costs right now.</li>
          <li><strong>Volume</strong> -How many shares have been traded today. High volume = lots of interest.</li>
          <li><strong>Market Cap</strong> -The total value of all shares. A $1 trillion market cap means the company is massive.</li>
          <li><strong>Change %</strong> -How much the price has moved today. Green = up, red = down.</li>
        </ul>
        {liveData && liveData.length > 0 && (
          <div className="lesson-live-data">
            <h4>Live Example from Our Scanner</h4>
            <p>Here's a real stock from today's scan:</p>
            <div className="live-example-card">
              <strong>{liveData[0].symbol}</strong>
              <span>Confidence: {(liveData[0].confidence * 100).toFixed(0)}%</span>
              <span>Signal: {liveData[0].signal}</span>
            </div>
          </div>
        )}
        <div className="lesson-tip">When you see a stock in the Scanner, these are the exact numbers it's showing you!</div>
      </>
    ),
    quiz: [
      { q: "A stock has a volume of 50 million today vs its average of 5 million. What does this suggest?", options: ["The stock is overpriced", "The stock is cheap to buy", "Unusually high interest today", "The market is about to close"], answer: 2 },
      { q: "TSLA shows: Price $245, Change -3.5%, Market Cap $780B. Which statement is true?", options: ["TSLA's total value is $245", "TSLA's price rose today", "All TSLA shares combined are worth $780B", "TSLA traded 3.5M shares"], answer: 2 }
    ]
  },
  {
    id: "bull-vs-bear",
    module: 1,
    title: "Bull vs Bear Markets",
    xp: 25,
    content: (
      <>
        <p>You'll hear these terms a lot in finance:</p>
        <div className="lesson-comparison">
          <div className="comparison-item bull">
            <h4>Bull Market</h4>
            <p>Prices are rising overall. People are optimistic. Think of a bull charging upward with its horns.</p>
          </div>
          <div className="comparison-item bear">
            <h4>Bear Market</h4>
            <p>Prices are falling overall. People are cautious. Think of a bear swiping downward with its paw.</p>
          </div>
        </div>
        <p>Markets naturally cycle between bull and bear phases. A bear market is officially defined as a drop of 20% or more from recent highs.</p>
        <div className="lesson-tip">Neither phase lasts forever. Smart traders plan for both -they don't panic when things go down, and they don't get overconfident when things go up.</div>
      </>
    ),
    quiz: [
      { q: "The S&P 500 has fallen 18% from its peak. Is this a bear market?", options: ["Yes, any decline is a bear market", "No, it needs a 20% drop", "Yes, 15% qualifies as bear", "No, only individual stocks can be bearish"], answer: 1 },
      { q: "During a bull market, a smart trader should:", options: ["Sell everything immediately", "Invest carefully but not get overconfident", "Stop checking the market", "Assume prices will rise forever"], answer: 1 }
    ]
  },
  {
    id: "what-is-a-portfolio",
    module: 1,
    title: "What is a Portfolio?",
    xp: 25,
    content: (
      <>
        <p>Your <strong>portfolio</strong> is simply the collection of all your investments. It might include stocks from different companies, in different industries.</p>
        <h4>Why diversification matters</h4>
        <p>The golden rule: <em>don't put all your eggs in one basket</em>. If you own stock in only one company and it crashes, you lose everything. But if you spread your money across 10 companies in different sectors, one bad day won't wipe you out.</p>
        <ul>
          <li><strong>Tech stocks</strong> -Apple, Google, Microsoft</li>
          <li><strong>Healthcare</strong> -Pfizer, Johnson & Johnson</li>
          <li><strong>Finance</strong> -JPMorgan, Goldman Sachs</li>
          <li><strong>Consumer</strong> -Amazon, Nike, Coca-Cola</li>
        </ul>
        <div className="lesson-tip">Head over to the <a href="#/portfolio">Portfolio page</a> to see your own holdings and practice building a diversified portfolio!</div>
      </>
    ),
    quiz: [
      { q: "You invest your entire savings into one tech stock. What risk are you taking?", options: ["No extra risk at all", "Minimal risk since tech always grows", "Maximum risk from zero diversification", "Less risk than a savings account"], answer: 2 },
      { q: "Which portfolio is best diversified?", options: ["Apple, Microsoft, Google, Meta", "Apple, Pfizer, JPMorgan, Nike", "Tesla, Rivian, Lucid, NIO", "Amazon, Shopify, eBay, Etsy"], answer: 1 }
    ]
  },
  {
    id: "ai-predictions",
    module: 2,
    title: "What Do AI Predictions Mean?",
    xp: 50,
    usesLiveData: "prediction",
    content: (liveData) => (
      <>
        <p>MarketMind uses machine learning to analyze patterns in stock data and make predictions. But what do the numbers actually mean?</p>
        <ul>
          <li><strong>Confidence Score</strong> -How sure the AI is about its prediction. 90% = very confident. 55% = barely more than a coin flip.</li>
          <li><strong>Signal</strong> -BUY, SELL, or HOLD. This is the AI's recommendation based on the data.</li>
          <li><strong>Predicted Change</strong> -How much the AI thinks the price will move (as a percentage).</li>
        </ul>
        {liveData && (
          <div className="lesson-live-data">
            <h4>Live Prediction Example</h4>
            <p>Here's what our AI currently thinks about AAPL:</p>
            <div className="live-example-card">
              <strong>AAPL</strong>
              <span>Confidence: {((liveData.confidence || 0) * 100).toFixed(0)}%</span>
              <span>Signal: {liveData.signal || "N/A"}</span>
              <span>Predicted change: {liveData.predicted_change ? `${(liveData.predicted_change * 100).toFixed(2)}%` : "N/A"}</span>
            </div>
          </div>
        )}
        <div className="lesson-tip">AI predictions are tools, not guarantees. Always use them alongside your own research -the AI can spot patterns humans miss, but it can also be wrong.</div>
      </>
    ),
    quiz: [
      { q: "An AI shows 92% confidence on a BUY signal. Which statement is correct?", options: ["The stock will definitely go up", "You should invest all your money", "The AI is highly confident but not certain", "A 92% confidence means 92% profit"], answer: 2 },
      { q: "The AI says SELL but news reports are very positive. What should you do?", options: ["Always trust the AI over news", "Always trust news over the AI", "Consider both signals before deciding", "Ignore both and guess"], answer: 2 }
    ]
  },
  {
    id: "sentiment-analysis",
    module: 2,
    title: "Sentiment Analysis Explained",
    xp: 50,
    usesLiveData: "sentiment",
    content: (liveData) => (
      <>
        <p><strong>Sentiment analysis</strong> uses AI to read news articles and social media posts and figure out whether people feel positive or negative about a stock.</p>
        <h4>How it works</h4>
        <ol>
          <li>Our system collects recent news articles and Reddit posts about a stock</li>
          <li>AI reads each one and scores it: positive, negative, or neutral</li>
          <li>We average the scores to get an overall sentiment</li>
        </ol>
        <ul>
          <li><strong>Positive sentiment</strong> -People are excited. Good news is flowing. Could push prices up.</li>
          <li><strong>Negative sentiment</strong> -Bad press, concerns, fear. Could push prices down.</li>
          <li><strong>Neutral sentiment</strong> -No strong feeling either way.</li>
        </ul>
        {liveData && (
          <div className="lesson-live-data">
            <h4>Live Sentiment Example</h4>
            <p>Here's the current sentiment for AAPL:</p>
            <div className="live-example-card">
              <strong>AAPL Sentiment</strong>
              {liveData.news_sentiment != null && <span>News: {(liveData.news_sentiment * 100).toFixed(0)}% positive</span>}
              {liveData.reddit_sentiment != null && <span>Reddit: {(liveData.reddit_sentiment * 100).toFixed(0)}% positive</span>}
            </div>
          </div>
        )}
        <div className="lesson-tip">Sentiment can be a leading indicator -if everyone on Reddit is suddenly talking about a stock, the price might move before the news officially breaks.</div>
      </>
    ),
    quiz: [
      { q: "Reddit is buzzing about a stock but no major news has broken yet. What might happen?", options: ["Nothing, Reddit doesn't affect stocks", "The price could move before official news", "The stock will be delisted", "Reddit buzz always means a crash"], answer: 1 },
      { q: "A stock shows 85% positive news sentiment but 30% Reddit sentiment. What does this mean?", options: ["The stock is guaranteed to rise", "News outlets are optimistic but retail investors are skeptical", "The data is broken and unreliable", "You should sell immediately"], answer: 1 }
    ]
  },
  {
    id: "technical-indicators",
    module: 2,
    title: "Technical Indicators 101",
    xp: 50,
    content: (
      <>
        <p>Technical indicators are math-based tools that help you understand price trends. Don't worry -you don't need to do the math. Here's what they tell you:</p>
        <h4>RSI (Relative Strength Index)</h4>
        <p>A number from 0 to 100 that measures if a stock is overbought or oversold.</p>
        <ul>
          <li><strong>Above 70</strong> -Overbought. The stock might be "too expensive" and could drop.</li>
          <li><strong>Below 30</strong> -Oversold. The stock might be "too cheap" and could bounce back.</li>
          <li><strong>Around 50</strong> -Neutral territory.</li>
        </ul>
        <h4>Moving Averages</h4>
        <p>A smoothed-out line of the average price over time. It helps you see the overall trend without the daily noise.</p>
        <ul>
          <li><strong>50-day MA</strong> -Short-term trend. If the price is above this line, the short-term trend is up.</li>
          <li><strong>200-day MA</strong> -Long-term trend. If the price is above this, the overall direction is positive.</li>
        </ul>
        <div className="lesson-tip">You can see these indicators on the Dashboard chart -toggle "Advanced View" to see RSI and moving averages overlaid on the price chart.</div>
      </>
    ),
    quiz: [
      { q: "A stock has an RSI of 25. What does this suggest?", options: ["It's overbought and may fall", "It's in neutral territory", "It's oversold and may bounce back", "RSI doesn't go below 30"], answer: 2 },
      { q: "The price crosses above the 200-day moving average. Traders typically see this as:", options: ["A bearish signal", "A bullish long-term signal", "Completely irrelevant", "A sign to sell immediately"], answer: 1 }
    ]
  },
  {
    id: "risk-and-reward",
    module: 2,
    title: "Risk & Reward",
    xp: 50,
    content: (
      <>
        <p>Every investment has risk -the chance you could lose money. The key is understanding the relationship between risk and reward.</p>
        <h4>The basic rule</h4>
        <p>Higher potential reward = higher risk. A stable blue-chip stock like Apple might return 10% per year. A small startup stock could return 500% -or go to zero.</p>
        <h4>Volatility</h4>
        <p>This measures how much a stock's price swings up and down. High volatility = big swings = more risk (but also more opportunity).</p>
        <ul>
          <li><strong>Low volatility</strong> -Coca-Cola, Johnson & Johnson. Steady and predictable.</li>
          <li><strong>High volatility</strong> -Tesla, crypto-related stocks. Wild price swings.</li>
        </ul>
        <h4>Risk management tips</h4>
        <ul>
          <li>Never invest money you can't afford to lose</li>
          <li>Diversify across different sectors</li>
          <li>Set a stop-loss -decide in advance when you'll sell if the price drops</li>
        </ul>
        <div className="lesson-tip">Our AI scanner shows volatility scores for each stock -use them to gauge how "wild" a stock might be before you invest.</div>
      </>
    ),
    quiz: [
      { q: "Stock A moves 1-2% daily, Stock B moves 8-10% daily. Which is higher risk?", options: ["Stock A, small moves are risky", "Both carry equal risk", "Stock B, larger swings mean more risk", "Neither, risk depends on price"], answer: 2 },
      { q: "You buy a stock at $100 and set a stop-loss at $90. What happens if it drops to $88?", options: ["Nothing, stop-loss only triggers at exactly $90", "Your shares are sold around $90 to limit loss", "You automatically buy more shares", "The stop-loss cancels your original purchase"], answer: 1 }
    ]
  },
  {
    id: "how-ai-works",
    module: 3,
    title: "How Our AI Model Works",
    xp: 100,
    content: (
      <>
        <p>MarketMind uses a type of AI called an <strong>LSTM neural network</strong> (Long Short-Term Memory). Here's the simple version:</p>
        <h4>What is a neural network?</h4>
        <p>It's software that learns patterns from data, similar to how your brain learns from experience. Show it thousands of examples, and it starts recognizing patterns.</p>
        <h4>Why LSTM?</h4>
        <p>LSTM is special because it has <strong>memory</strong>. It remembers what happened yesterday, last week, and last month -which is perfect for stock prices, where past trends influence future movements.</p>
        <h4>The training process</h4>
        <ol>
          <li>We feed it years of historical price data for a stock</li>
          <li>The AI looks for patterns: "Every time X happened, Y followed"</li>
          <li>It tests its predictions against real outcomes and adjusts</li>
          <li>After thousands of rounds, it gets better at spotting trends</li>
        </ol>
        <h4>What it uses</h4>
        <ul>
          <li>Historical prices (open, close, high, low)</li>
          <li>Trading volume</li>
          <li>Technical indicators (RSI, MACD, moving averages)</li>
          <li>Price momentum and trend patterns</li>
        </ul>
        <div className="lesson-tip">No AI can predict the market with 100% accuracy. Our model is a tool to help inform your decisions -not a crystal ball.</div>
      </>
    ),
    quiz: [
      { q: "Why is LSTM better suited for stock prediction than a basic neural network?", options: ["It runs on faster hardware", "It can remember patterns across time", "It only needs one day of data", "It was built specifically for finance"], answer: 1 },
      { q: "Our AI was trained on 5 years of AAPL data. What is this process called?", options: ["Backtesting", "Supervised training", "Sentiment analysis", "Technical analysis"], answer: 1 }
    ]
  },
  {
    id: "backtesting",
    module: 3,
    title: "Backtesting Strategies",
    xp: 100,
    content: (
      <>
        <p><strong>Backtesting</strong> means testing a trading strategy against historical data to see how it would have performed in the past.</p>
        <h4>How it works</h4>
        <ol>
          <li>Define your strategy: "Buy when RSI drops below 30, sell when it rises above 70"</li>
          <li>Apply it to 5 years of historical data</li>
          <li>See how many trades would have been profitable</li>
          <li>Calculate the overall return vs. just holding the stock</li>
        </ol>
        <h4>Why it matters</h4>
        <p>It's like a "what if" time machine. Instead of risking real money on an untested idea, you can simulate it first.</p>
        <h4>Limitations</h4>
        <ul>
          <li><strong>Past performance ≠ future results</strong> -Just because a strategy worked in 2020 doesn't guarantee it'll work in 2025.</li>
          <li><strong>Overfitting</strong> -A strategy tuned too perfectly to past data may fail in new conditions.</li>
          <li><strong>Market changes</strong> -Rules that worked in calm markets may fail in volatile ones.</li>
        </ul>
        <div className="lesson-tip">Our AI model is continuously backtested against recent data to ensure its predictions stay relevant.</div>
      </>
    ),
    quiz: [
      { q: "A strategy returns 40% in backtesting but only 5% in live trading. What likely happened?", options: ["The market broke", "The strategy was overfitted to past data", "Backtesting was done wrong", "5% is still a great return"], answer: 1 },
      { q: "Your RSI-based strategy worked well in 2020-2023 data. What should you do before using real money?", options: ["Start trading immediately", "Test it on different time periods too", "Only use it on the same stocks", "Assume it will always work"], answer: 1 }
    ]
  },
  {
    id: "market-psychology",
    module: 3,
    title: "Market Psychology",
    xp: 100,
    content: (
      <>
        <p>The market isn't just numbers -it's driven by human emotions. Understanding psychology is often more valuable than reading charts.</p>
        <h4>Common traps</h4>
        <div className="lesson-comparison">
          <div className="comparison-item">
            <h4>FOMO</h4>
            <p><strong>Fear Of Missing Out</strong> -"Everyone's buying this stock, I need to get in NOW!" This leads to buying at the top.</p>
          </div>
          <div className="comparison-item">
            <h4>Panic Selling</h4>
            <p>The stock drops 10% and you sell in fear. Then it recovers the next day. Emotional selling locks in losses.</p>
          </div>
        </div>
        <h4>Emotional discipline rules</h4>
        <ul>
          <li><strong>Have a plan before you buy</strong> -Know your entry price, target price, and stop-loss.</li>
          <li><strong>Don't check prices every 5 minutes</strong> -Short-term noise creates anxiety.</li>
          <li><strong>Ignore the herd</strong> -When everyone is buying, it might be time to be cautious. When everyone is panicking, there might be opportunity.</li>
          <li><strong>Accept losses gracefully</strong> -Every investor has losing trades. It's part of the game.</li>
        </ul>
        <div className="lesson-tip">Warren Buffett's famous rule: "Be fearful when others are greedy, and greedy when others are fearful."</div>
      </>
    ),
    quiz: [
      { q: "A stock jumps 30% in a day and everyone on social media is buying. You feel the urge to buy too. This is an example of:", options: ["Smart momentum trading", "FOMO", "Technical analysis", "Fundamental analysis"], answer: 1 },
      { q: "Your stock drops 10% but nothing about the company has changed. Warren Buffett would most likely:", options: ["Sell everything immediately", "Buy more at the lower price", "Post about it on Reddit", "Switch to a different broker"], answer: 1 }
    ]
  },
  {
    id: "building-strategy",
    module: 3,
    title: "Building Your Strategy",
    xp: 100,
    content: (
      <>
        <p>Now that you understand the tools, it's time to think like a trader. A good strategy combines multiple signals:</p>
        <h4>The MarketMind approach</h4>
        <ol>
          <li><strong>Screen</strong> -Use the Scanner to find stocks with strong AI confidence scores</li>
          <li><strong>Research</strong> -Check the sentiment: is the news positive? What's Reddit saying?</li>
          <li><strong>Analyze</strong> -Look at technical indicators. Is the RSI suggesting good entry timing?</li>
          <li><strong>Decide</strong> -Combine all signals. If AI, sentiment, AND technicals all agree, that's a strong signal.</li>
          <li><strong>Execute</strong> -Place your trade in the Dashboard. Set a mental stop-loss.</li>
          <li><strong>Monitor</strong> -Track your portfolio. Review and learn from each trade.</li>
        </ol>
        <h4>Key principles</h4>
        <ul>
          <li>Never use just one signal -always combine AI prediction + sentiment + technicals</li>
          <li>Start small. Use our paper trading to practice before risking real money.</li>
          <li>Keep a trading journal. Note why you bought, why you sold, and what you learned.</li>
          <li>Review your performance on the Portfolio page regularly.</li>
        </ul>
        <div className="lesson-tip">Congratulations -you've completed the MarketMind Academy! You now have the foundation to trade with confidence. Keep learning, stay disciplined, and trust the process.</div>
      </>
    ),
    quiz: [
      { q: "AI says BUY, sentiment is positive, RSI is at 28. Is this a strong signal?", options: ["No, too many conflicting signals", "Yes, all three indicators align well", "Only the AI matters here", "RSI at 28 cancels out the others"], answer: 1 },
      { q: "You just completed a paper trade that lost 15%. What should you do?", options: ["Stop trading forever", "Ignore it since it wasn't real money", "Analyze why it failed and adjust", "Switch to real money trading instead"], answer: 2 }
    ]
  }
];

/* ── Module exam questions (5 per module, need 80% = 4/5 to pass) ── */
const MODULE_EXAMS = {
  1: {
    title: "Module 1 Exam: Market Basics",
    passingScore: 4,
    questions: [
      { q: "A company has 1 million shares at $50 each. What is its market cap?", options: ["$50 million", "$500 million", "$50,000", "$1 million"], answer: 0 },
      { q: "GOOGL, MSFT, and TSLA are examples of:", options: ["Market orders", "Stock exchanges", "Ticker symbols", "Portfolio types"], answer: 2 },
      { q: "You own tech, healthcare, finance, and consumer stocks. This is called:", options: ["Concentration", "Diversification", "Day trading", "Short selling"], answer: 1 },
      { q: "The market drops 15% from its peak. Is this officially a bear market?", options: ["Yes, any drop over 10% counts", "No, it must drop at least 20%", "Yes, 15% is the threshold", "It depends on volume"], answer: 1 },
      { q: "You place a limit order to buy at $50 but the stock is at $52. What happens?", options: ["You buy at $52 anyway", "The order waits until the price hits $50", "The order is cancelled", "You buy at the average of $51"], answer: 1 }
    ]
  },
  2: {
    title: "Module 2 Exam: Understanding Data",
    passingScore: 4,
    questions: [
      { q: "A stock has RSI 75 and the AI shows a BUY signal. What should concern you?", options: ["The AI signal is wrong", "RSI suggests it may be overbought", "Nothing, always follow AI", "RSI 75 means oversold"], answer: 1 },
      { q: "The AI gives 60% confidence on a SELL signal. How reliable is this?", options: ["Very reliable", "Barely better than random chance", "100% guaranteed to drop", "Confidence doesn't matter"], answer: 1 },
      { q: "News sentiment is 90% positive but the stock is falling. This could mean:", options: ["Sentiment data is always wrong", "The positive news is already priced in", "You should buy immediately", "The market is closed"], answer: 1 },
      { q: "Tesla stock moves 8% daily while Coca-Cola moves 1%. Tesla has:", options: ["Lower volatility", "Higher volatility", "The same risk level", "No volatility"], answer: 1 },
      { q: "You set a stop-loss at $45 on a stock bought at $50. Your max loss per share is:", options: ["$50", "$45", "$5", "$0"], answer: 2 }
    ]
  },
  3: {
    title: "Module 3 Exam: Advanced Concepts",
    passingScore: 4,
    questions: [
      { q: "LSTM networks are ideal for stock data because:", options: ["They process images well", "They handle time-series patterns", "They only need one data point", "They run without training"], answer: 1 },
      { q: "A strategy scores 95% in backtesting but 20% live. The most likely cause is:", options: ["The broker is cheating", "Overfitting to historical data", "The market changed overnight", "Bad internet connection"], answer: 1 },
      { q: "Everyone on social media says to buy a stock that already jumped 40%. A disciplined trader would:", options: ["Buy immediately before it goes higher", "Be cautious - this could be FOMO territory", "Short sell the stock", "Close their trading account"], answer: 1 },
      { q: "AI says BUY, sentiment is positive, RSI shows oversold. How many signals align?", options: ["Just one", "Two out of three", "All three suggest buying", "None of them align"], answer: 2 },
      { q: "What separates a good backtest from a reliable real-world strategy?", options: ["Using more stocks in the test", "Testing across multiple time periods and conditions", "Running the test faster", "Only testing bullish markets"], answer: 1 }
    ]
  }
};

const MODULE_INFO = [
  { num: 1, name: "Market Basics", color: "#4ade80" },
  { num: 2, name: "Understanding Data", color: "#60a5fa" },
  { num: 3, name: "Advanced Concepts", color: "#a78bfa" }
];

const TOTAL_LESSONS = LESSONS.length;

export default function LearnPage({ authToken, user, onSkillLevelChange }) {
  const [progress, setProgress] = useState(null);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [xpAnimation, setXpAnimation] = useState(null);
  const [liveData, setLiveData] = useState({});
  const [loading, setLoading] = useState(true);
  const [quizState, setQuizState] = useState({});
  const [examState, setExamState] = useState({});
  const isNewUser = sessionStorage.getItem("marketmind_new_signup") === "true";

  useEffect(() => {
    fetchProgress();
    if (isNewUser) {
      sessionStorage.removeItem("marketmind_new_signup");
    }
  }, []);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`${API_URL}/api/learning/progress`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        if (onSkillLevelChange) onSkillLevelChange(data.skillLevel);
      }
    } catch (e) {
      /* handled silently */
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async (type) => {
    if (liveData[type]) return liveData[type];
    try {
      let url;
      if (type === "scan") url = `${API_URL}/api/ml/scan`;
      else if (type === "prediction") url = `${API_URL}/api/ml/predict/AAPL/detailed`;
      else if (type === "sentiment") url = `${API_URL}/api/ml/sentiment/AAPL`;
      else return null;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const result = type === "scan" ? (data.results || []) : data;
        setLiveData(prev => ({ ...prev, [type]: result }));
        return result;
      }
    } catch (e) { /* handled silently */ }
    return null;
  };

  const handleExpandLesson = async (lesson) => {
    if (expandedLesson === lesson.id) { setExpandedLesson(null); return; }
    setExpandedLesson(lesson.id);
    if (lesson.usesLiveData) await fetchLiveData(lesson.usesLiveData);
  };

  /* ── Quiz logic ── */
  const handleQuizAnswer = (lessonId, qIndex, optionIndex) => {
    setQuizState(prev => {
      const key = `${lessonId}-${qIndex}`;
      if (prev[key]?.locked) return prev;
      return { ...prev, [key]: { selected: optionIndex, locked: true } };
    });
  };

  const isQuizPassed = (lesson) => {
    if (!lesson.quiz) return true;
    return lesson.quiz.every((q, i) => {
      const state = quizState[`${lesson.id}-${i}`];
      return state?.locked && state.selected === q.answer;
    });
  };

  const isQuizAttempted = (lesson) => {
    if (!lesson.quiz) return true;
    return lesson.quiz.every((_, i) => quizState[`${lesson.id}-${i}`]?.locked);
  };

  /* ── Exam logic ── */
  const handleExamAnswer = (modNum, qIndex, optionIndex) => {
    setExamState(prev => {
      const key = `exam-${modNum}-${qIndex}`;
      if (prev[key]?.locked) return prev;
      return { ...prev, [key]: { selected: optionIndex, locked: true } };
    });
  };

  const getExamScore = (modNum) => {
    const exam = MODULE_EXAMS[modNum];
    if (!exam) return { answered: 0, correct: 0, total: exam?.questions.length || 5 };
    let answered = 0, correct = 0;
    exam.questions.forEach((q, i) => {
      const state = examState[`exam-${modNum}-${i}`];
      if (state?.locked) {
        answered++;
        if (state.selected === q.answer) correct++;
      }
    });
    return { answered, correct, total: exam.questions.length };
  };

  const isExamPassed = (modNum) => {
    const exam = MODULE_EXAMS[modNum];
    if (!exam) return false;
    const score = getExamScore(modNum);
    return score.answered === score.total && score.correct >= exam.passingScore;
  };

  const isExamCompleted = (modNum) => {
    const examLessonId = `exam-module-${modNum}`;
    return isLessonCompleted(examLessonId);
  };

  const resetExam = (modNum) => {
    setExamState(prev => {
      const next = { ...prev };
      const exam = MODULE_EXAMS[modNum];
      exam.questions.forEach((_, i) => { delete next[`exam-${modNum}-${i}`]; });
      return next;
    });
  };

  const handleExamComplete = async (modNum) => {
    const examXp = modNum === 1 ? 50 : modNum === 2 ? 75 : 100;
    try {
      const res = await fetch(`${API_URL}/api/learning/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ lessonId: `exam-module-${modNum}`, xp: examXp })
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(prev => ({
          ...prev,
          totalXp: data.totalXp,
          currentStreak: data.currentStreak,
          skillLevel: data.skillLevel,
          badges: data.badges,
          completedLessons: Array.isArray(data.completedLessons) ? data.completedLessons : [...(prev?.completedLessons || []), `exam-module-${modNum}`],
          completedCount: (prev?.completedCount || 0) + 1
        }));
        if (onSkillLevelChange) onSkillLevelChange(data.skillLevel);
        setXpAnimation({ xp: examXp, lessonId: `exam-${modNum}` });
        setTimeout(() => setXpAnimation(null), 1500);
      }
    } catch (e) { /* handled silently */ }
  };

  const handleComplete = async (lesson) => {
    try {
      const res = await fetch(`${API_URL}/api/learning/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ lessonId: lesson.id, xp: lesson.xp })
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(prev => ({
          ...prev,
          totalXp: data.totalXp,
          currentStreak: data.currentStreak,
          skillLevel: data.skillLevel,
          badges: data.badges,
          completedLessons: Array.isArray(data.completedLessons) ? data.completedLessons : [...(prev?.completedLessons || []), lesson.id],
          completedCount: (prev?.completedCount || 0) + 1
        }));
        if (onSkillLevelChange) onSkillLevelChange(data.skillLevel);
        setXpAnimation({ xp: lesson.xp, lessonId: lesson.id });
        setTimeout(() => setXpAnimation(null), 1500);
      }
    } catch (e) { /* handled silently */ }
  };

  const isLessonCompleted = (lessonId) => {
    if (!progress?.completedLessons) return false;
    const lessons = progress.completedLessons;
    if (Array.isArray(lessons)) return lessons.includes(lessonId);
    if (typeof lessons === "object") return lessonId in lessons || lessons[lessonId];
    return false;
  };

  const isModuleUnlocked = (moduleNum) => {
    if (moduleNum === 1) return true;
    return isExamCompleted(moduleNum - 1);
  };

  const allLessonsInModuleDone = (moduleNum) => {
    return LESSONS.filter(l => l.module === moduleNum).every(l => isLessonCompleted(l.id));
  };

  const completedLessons = progress?.completedLessons;
  const completedSet = new Set(
    Array.isArray(completedLessons) ? completedLessons :
    typeof completedLessons === "object" ? Object.keys(completedLessons || {}) : []
  );

  const skillLevel = progress?.skillLevel || "Beginner";
  const skillInfo = SKILL_CONFIG[skillLevel] || SKILL_CONFIG.Beginner;
  const totalXp = progress?.totalXp || 0;
  const xpForNext = skillInfo.nextXp;
  const prevXpThreshold = skillLevel === "Expert" ? 1000 : skillLevel === "Intermediate" ? 300 : 0;
  const xpProgress = xpForNext ? ((totalXp - prevXpThreshold) / (xpForNext - prevXpThreshold)) * 100 : 100;

  if (loading) {
    return (
      <section className="section-wrapper learn-shell">
        <div className="learn-loading">Loading your progress...</div>
      </section>
    );
  }

  return (
    <section className="section-wrapper learn-shell" id="learn">
      {isNewUser && (
        <div className="learn-welcome-banner">
          <h2>Welcome to MarketMind!</h2>
          <p>Start your trading education here. Complete lessons to earn XP and unlock your trader rank.</p>
          <a href="#module-1" className="btn primary-btn" onClick={(e) => {
            e.preventDefault();
            document.getElementById("module-1")?.scrollIntoView({ behavior: "smooth" });
          }}>Start Learning</a>
        </div>
      )}

      <div className="section-header">
        <span className="section-kicker">Academy</span>
        <h2>MarketMind Academy</h2>
        <p>Learn trading fundamentals, earn XP, and level up your trader rank. Pass each module exam with 80%+ to advance.</p>
      </div>

      <div className="learn-progress-dashboard">
        <div className="progress-skill" style={{ borderColor: skillInfo.color }}>
          <div className="skill-badge" style={{ background: skillInfo.color }}>{skillLevel[0]}</div>
          <div className="skill-info">
            <span className="skill-title" style={{ color: skillInfo.color }}>{skillInfo.title}</span>
            <span className="skill-xp">{totalXp} XP</span>
          </div>
        </div>

        <div className="progress-xp-bar">
          <div className="xp-bar-label">
            {xpForNext ? <span>{totalXp} / {xpForNext} XP to {skillInfo.nextLevel}</span> : <span>Max level reached!</span>}
          </div>
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${Math.min(xpProgress, 100)}%`, background: skillInfo.color }} />
          </div>
        </div>

        <div className="progress-streak">
          <span className="streak-flame">🔥</span>
          <span className="streak-count">{progress?.currentStreak || 0} day streak</span>
        </div>

        <div className="progress-stats">
          <div className="stat-item">
            <span className="stat-value">{completedSet.size}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{TOTAL_LESSONS + 3}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>

        {progress?.badges?.length > 0 && (
          <div className="progress-badges">
            {progress.badges.map(badge => (
              <span key={badge} className="badge-chip" title={badge}>
                {BADGE_ICONS[badge] || "🏅"} {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {MODULE_INFO.map(mod => {
        const moduleLessons = LESSONS.filter(l => l.module === mod.num);
        const unlocked = isModuleUnlocked(mod.num);
        const completedInModule = moduleLessons.filter(l => isLessonCompleted(l.id)).length;
        const allDone = allLessonsInModuleDone(mod.num);
        const examPassed = isExamCompleted(mod.num);
        const exam = MODULE_EXAMS[mod.num];
        const examScore = getExamScore(mod.num);

        return (
          <div key={mod.num} className={`learn-module ${!unlocked ? "module-locked" : ""}`} id={`module-${mod.num}`}>
            <div className="module-header" style={{ borderLeftColor: mod.color }}>
              <div className="module-title">
                <h3 style={{ color: mod.color }}>Module {mod.num}: {mod.name}</h3>
                <span className="module-progress">{completedInModule}/{moduleLessons.length} lessons{examPassed ? " + Exam passed" : ""}</span>
              </div>
              {!unlocked && (
                <span className="module-lock-msg">Pass Module {mod.num - 1} Exam to unlock</span>
              )}
            </div>

            <div className="module-lessons">
              {moduleLessons.map(lesson => {
                const completed = isLessonCompleted(lesson.id);
                const isExpanded = expandedLesson === lesson.id;
                const quizPassed = isQuizPassed(lesson);
                const quizAttempted = isQuizAttempted(lesson);

                return (
                  <div key={lesson.id} className={`lesson-card ${completed ? "lesson-completed" : ""} ${isExpanded ? "lesson-expanded" : ""} ${!unlocked ? "lesson-locked" : ""}`}>
                    <div className="lesson-header" onClick={() => unlocked && handleExpandLesson(lesson)}>
                      <div className="lesson-status">
                        {completed ? (
                          <span className="lesson-check">✓</span>
                        ) : !unlocked ? (
                          <span className="lesson-lock">🔒</span>
                        ) : (
                          <span className="lesson-dot" style={{ borderColor: mod.color }} />
                        )}
                      </div>
                      <div className="lesson-info">
                        <h4>{lesson.title}</h4>
                        <span className="lesson-xp-tag">+{lesson.xp} XP</span>
                      </div>
                      {unlocked && <span className="lesson-toggle">{isExpanded ? "▲" : "▼"}</span>}
                    </div>

                    {isExpanded && unlocked && (
                      <div className="lesson-content">
                        {typeof lesson.content === "function" ? lesson.content(liveData[lesson.usesLiveData]) : lesson.content}

                        {lesson.quiz && (
                          <div className="lesson-quiz">
                            <h4>Quick Check</h4>
                            {lesson.quiz.map((q, qi) => {
                              const key = `${lesson.id}-${qi}`;
                              const state = quizState[key];
                              const isCorrect = state?.selected === q.answer;
                              return (
                                <div key={qi} className="quiz-question">
                                  <p className="quiz-q">{q.q}</p>
                                  <div className="quiz-options">
                                    {q.options.map((opt, oi) => {
                                      let cls = "quiz-option";
                                      if (state?.locked) {
                                        if (oi === q.answer) cls += " quiz-correct";
                                        else if (oi === state.selected && !isCorrect) cls += " quiz-wrong";
                                      } else if (state?.selected === oi) {
                                        cls += " quiz-selected";
                                      }
                                      return (
                                        <button key={oi} className={cls} onClick={() => handleQuizAnswer(lesson.id, qi, oi)} disabled={state?.locked}>
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {state?.locked && (
                                    <p className={`quiz-feedback ${isCorrect ? "correct" : "wrong"}`}>
                                      {isCorrect ? "Correct!" : "Not quite -the right answer is highlighted in green."}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!completed && quizAttempted && quizPassed && (
                          <button className="btn primary-btn lesson-complete-btn" onClick={() => handleComplete(lesson)}>
                            Got it! Claim +{lesson.xp} XP
                          </button>
                        )}
                        {!completed && quizAttempted && !quizPassed && (
                          <div className="quiz-fail-msg">Review the lesson and try the quiz again to complete this lesson.</div>
                        )}
                        {!completed && !quizAttempted && lesson.quiz && (
                          <div className="quiz-prompt-msg">Answer the quiz above to complete this lesson.</div>
                        )}
                        {completed && <div className="lesson-done-msg">You've completed this lesson!</div>}

                        {xpAnimation && xpAnimation.lessonId === lesson.id && (
                          <div className="xp-fly-up" style={{ color: mod.color }}>+{xpAnimation.xp} XP</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Module Exam */}
              {unlocked && (
                <div className={`lesson-card exam-card ${examPassed ? "lesson-completed" : ""} ${!allDone ? "lesson-locked" : ""}`}>
                  <div className="lesson-header" onClick={() => allDone && handleExpandLesson({ id: `exam-${mod.num}` })}>
                    <div className="lesson-status">
                      {examPassed ? (
                        <span className="lesson-check">✓</span>
                      ) : !allDone ? (
                        <span className="lesson-lock">🔒</span>
                      ) : (
                        <span className="exam-icon" style={{ borderColor: mod.color }}>📝</span>
                      )}
                    </div>
                    <div className="lesson-info">
                      <h4>{exam.title}</h4>
                      <span className="lesson-xp-tag exam-tag">Pass 80%+ to advance</span>
                    </div>
                    {allDone && <span className="lesson-toggle">{expandedLesson === `exam-${mod.num}` ? "▲" : "▼"}</span>}
                  </div>

                  {expandedLesson === `exam-${mod.num}` && allDone && (
                    <div className="lesson-content exam-content">
                      {!examPassed && (
                        <p className="exam-intro">Answer all 5 questions. You need at least {exam.passingScore}/5 correct (80%) to pass and unlock the next module.</p>
                      )}

                      {exam.questions.map((q, qi) => {
                        const key = `exam-${mod.num}-${qi}`;
                        const state = examState[key];
                        const isCorrect = state?.selected === q.answer;
                        return (
                          <div key={qi} className="quiz-question">
                            <p className="quiz-q">{qi + 1}. {q.q}</p>
                            <div className="quiz-options">
                              {q.options.map((opt, oi) => {
                                let cls = "quiz-option";
                                if (state?.locked) {
                                  if (oi === q.answer) cls += " quiz-correct";
                                  else if (oi === state.selected && !isCorrect) cls += " quiz-wrong";
                                }
                                return (
                                  <button key={oi} className={cls} onClick={() => !examPassed && handleExamAnswer(mod.num, qi, oi)} disabled={state?.locked || examPassed}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {examScore.answered === examScore.total && !examPassed && !isExamCompleted(mod.num) && (
                        <div className="exam-result">
                          {isExamPassed(mod.num) ? (
                            <>
                              <div className="exam-pass">You scored {examScore.correct}/{examScore.total} -Passed!</div>
                              <button className="btn primary-btn lesson-complete-btn" onClick={() => handleExamComplete(mod.num)}>
                                Claim Exam Bonus XP
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="exam-fail">You scored {examScore.correct}/{examScore.total} -Need {exam.passingScore} to pass.</div>
                              <button className="btn secondary lesson-complete-btn" onClick={() => resetExam(mod.num)}>
                                Retry Exam
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {examPassed && (
                        <div className="exam-pass">Exam passed! {mod.num < 3 ? `Module ${mod.num + 1} is unlocked.` : "You've completed the Academy!"}</div>
                      )}

                      {xpAnimation && xpAnimation.lessonId === `exam-${mod.num}` && (
                        <div className="xp-fly-up" style={{ color: mod.color }}>+{xpAnimation.xp} XP</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
