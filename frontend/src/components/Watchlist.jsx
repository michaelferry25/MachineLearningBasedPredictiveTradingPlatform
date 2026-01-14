import { useState } from "react";

export default function Watchlist({ onSelectStock }) {
  const [watchlist, setWatchlist] = useState(['AAPL', 'GOOGL', 'MSFT', 'TSLA']);
  const [newSymbol, setNewSymbol] = useState('');

  const addToWatchlist = () => {
    const trimmed = newSymbol.trim().toUpperCase();
    if (trimmed && !watchlist.includes(trimmed) && trimmed.length <= 5) {
      setWatchlist([...watchlist, trimmed]);
      setNewSymbol('');
    }
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  return (
    <div className="watchlist-card">
      <h3>⭐ My Watchlist</h3>
      
      <div className="watchlist-add">
        <input
          type="text"
          placeholder="Add ticker..."
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && addToWatchlist()}
          maxLength={5}
        />
        <button className="add-btn" onClick={addToWatchlist}>
          Add
        </button>
      </div>

      <div className="watchlist-grid">
        {watchlist.map((symbol, idx) => (
          <div key={idx} className="watch-item">
            <span 
              className="watch-symbol" 
              onClick={() => onSelectStock(symbol)}
            >
              {symbol}
            </span>
            <button 
              className="watch-remove"
              onClick={() => removeFromWatchlist(symbol)}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}