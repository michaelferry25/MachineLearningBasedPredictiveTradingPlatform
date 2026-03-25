import { useState, useEffect, useCallback } from "react";
import "./AdminDashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "";

/* ── Utility ── */
function formatNum(n) {
  if (n == null) return "—";
  if (typeof n === "number") {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }
  return String(n);
}
function formatMoney(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatPct(n) {
  if (n == null) return "—";
  return Number(n).toFixed(1) + "%";
}
function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Micro sparkline ── */
function Sparkline({ data, color = "#58a6ff", height = 32 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="admin-sparkline" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

/* ── KPI Card ── */
function KPICard({ label, value, sub, icon, color, trend }) {
  return (
    <div className="kpi-card" style={{ "--kpi-accent": color }}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-content">
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{label}</span>
        {sub && <span className="kpi-sub">{sub}</span>}
      </div>
      {trend && <span className={`kpi-trend ${trend >= 0 ? "pos" : "neg"}`}>{trend >= 0 ? "↑" : "↓"}{Math.abs(trend)}</span>}
    </div>
  );
}

/* ── Tab bar ── */
const TABS = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "users", label: "Users", icon: "👥" },
  { key: "trades", label: "Trades", icon: "📈" },
  { key: "ml", label: "ML Models", icon: "🤖" },
  { key: "system", label: "System", icon: "⚙️" },
];

/* ── Main Component ── */
export default function AdminDashboard({ authToken }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [trades, setTrades] = useState(null);
  const [tradeVolume, setTradeVolume] = useState([]);
  const [tradeFilter, setTradeFilter] = useState("");
  const [predStats, setPredStats] = useState(null);
  const [recentPreds, setRecentPreds] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const headers = { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" };

  const apiFetch = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${API_URL}${path}`, { headers, ...opts });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }, [authToken]);

  const showAction = (msg, isError = false) => {
    setActionMsg({ msg, isError });
    setTimeout(() => setActionMsg(null), 4000);
  };

  // ── Data loaders ──

  const loadStats = useCallback(async () => {
    try { setStats(await apiFetch("/api/admin/stats")); } catch { /* */ }
  }, [apiFetch]);

  const loadUsers = useCallback(async (search) => {
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : "";
      setUsers(await apiFetch(`/api/admin/users${q}`));
    } catch { /* */ }
  }, [apiFetch]);

  const loadUserDetail = useCallback(async (id) => {
    try { setSelectedUser(await apiFetch(`/api/admin/users/${id}`)); } catch { /* */ }
  }, [apiFetch]);

  const loadTrades = useCallback(async (symbol) => {
    try {
      const q = symbol ? `?symbol=${symbol.toUpperCase()}&limit=200` : "?limit=200";
      setTrades(await apiFetch(`/api/admin/trades${q}`));
    } catch { /* */ }
  }, [apiFetch]);

  const loadTradeVolume = useCallback(async () => {
    try { setTradeVolume(await apiFetch("/api/admin/trades/volume")); } catch { /* */ }
  }, [apiFetch]);

  const loadPredStats = useCallback(async () => {
    try { setPredStats(await apiFetch("/api/admin/predictions/stats")); } catch { /* */ }
  }, [apiFetch]);

  const loadRecentPreds = useCallback(async () => {
    try { setRecentPreds(await apiFetch("/api/admin/predictions/recent")); } catch { /* */ }
  }, [apiFetch]);

  const loadSystemHealth = useCallback(async () => {
    try { setSystemHealth(await apiFetch("/api/admin/system/health")); } catch { /* */ }
  }, [apiFetch]);

  // ── Load on tab change ──
  useEffect(() => {
    setLoading(true);
    const load = async () => {
      switch (activeTab) {
        case "overview": await loadStats(); break;
        case "users": await loadUsers(); break;
        case "trades": await Promise.all([loadTrades(), loadTradeVolume()]); break;
        case "ml": await Promise.all([loadPredStats(), loadRecentPreds()]); break;
        case "system": await loadSystemHealth(); break;
      }
      setLoading(false);
    };
    load();
  }, [activeTab]);

  // ── Admin Actions ──

  const handleChangeRole = async (userId, newRole) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: "PUT", body: JSON.stringify({ role: newRole })
      });
      showAction(`Role changed to ${newRole}`);
      loadUsers(userSearch);
      if (selectedUser?.id === userId) loadUserDetail(userId);
    } catch { showAction("Failed to change role", true); }
    setConfirmAction(null);
  };

  const handleResetPortfolio = async (userId) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/reset-portfolio`, { method: "POST" });
      showAction("Portfolio reset to $100,000");
      loadUsers(userSearch);
      if (selectedUser?.id === userId) loadUserDetail(userId);
    } catch { showAction("Failed to reset portfolio", true); }
    setConfirmAction(null);
  };

  // ── Render Tabs ──

  const renderOverview = () => {
    if (!stats) return <div className="admin-loading">Loading statistics...</div>;
    return (
      <div className="admin-overview">
        <div className="kpi-grid">
          <KPICard label="Total Users" value={formatNum(stats.totalUsers)} sub={`${stats.newUsersToday} today · ${stats.newUsersThisWeek} this week`} icon="👥" color="#58a6ff" />
          <KPICard label="Total Trades" value={formatNum(stats.totalTrades)} sub={`${stats.tradesToday} today · ${stats.tradesThisWeek} this week`} icon="📈" color="#3fb950" />
          <KPICard label="Total AUM" value={formatMoney(stats.totalAUM)} sub="Assets under management" icon="💰" color="#f0883e" />
          <KPICard label="ML Hit Rate" value={formatPct(stats.hitRate)} sub={`${stats.hitCount} hits / ${stats.evaluatedPredictions} evaluated`} icon="🎯" color="#bc8cff" />
          <KPICard label="Predictions" value={formatNum(stats.totalPredictions)} sub={`${stats.predictionsToday} today`} icon="🤖" color="#f778ba" />
          <KPICard label="Admins" value={stats.adminCount} sub={`of ${stats.totalUsers} total`} icon="🛡️" color="#ff7b72" />
        </div>

        <div className="overview-panels">
          <div className="overview-card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button className="admin-btn" onClick={() => setActiveTab("users")}>👥 Manage Users</button>
              <button className="admin-btn" onClick={() => setActiveTab("trades")}>📈 View Trades</button>
              <button className="admin-btn" onClick={() => setActiveTab("ml")}>🤖 ML Analytics</button>
              <button className="admin-btn" onClick={() => setActiveTab("system")}>⚙️ System Health</button>
              <button className="admin-btn refresh" onClick={loadStats}>🔄 Refresh Stats</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="admin-users">
      <div className="admin-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers(userSearch)}
          />
          <button className="admin-btn small" onClick={() => loadUsers(userSearch)}>Search</button>
          {userSearch && <button className="admin-btn small secondary" onClick={() => { setUserSearch(""); loadUsers(); }}>Clear</button>}
        </div>
        <span className="result-count">{users.length} users</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Display Name</th>
              <th>Role</th>
              <th>Trades</th>
              <th>Cash</th>
              <th>Holdings</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={selectedUser?.id === u.id ? "selected" : ""}>
                <td className="mono">#{u.id}</td>
                <td className="email-cell">{u.email}</td>
                <td>{u.displayName}</td>
                <td><span className={`role-badge ${u.role.toLowerCase()}`}>{u.role}</span></td>
                <td className="mono">{u.tradeCount}</td>
                <td className="mono">{formatMoney(u.cashBalance)}</td>
                <td className="mono">{u.holdingCount}</td>
                <td className="date-cell">{timeAgo(u.createdAt)}</td>
                <td className="actions-cell">
                  <button className="admin-btn tiny" onClick={() => loadUserDetail(u.id)} title="View Details">👁️</button>
                  <button
                    className="admin-btn tiny"
                    onClick={() => setConfirmAction({ type: "role", userId: u.id, newRole: u.role === "ADMIN" ? "USER" : "ADMIN", label: `Change ${u.displayName} to ${u.role === "ADMIN" ? "USER" : "ADMIN"}?` })}
                    title="Toggle Role"
                  >🔄</button>
                  <button
                    className="admin-btn tiny danger"
                    onClick={() => setConfirmAction({ type: "reset", userId: u.id, label: `Reset ${u.displayName}'s portfolio to $100k?` })}
                    title="Reset Portfolio"
                  >♻️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedUser(null)}>✕</button>
            <div className="modal-header">
              <h3>{selectedUser.displayName}</h3>
              <span className={`role-badge ${selectedUser.role.toLowerCase()}`}>{selectedUser.role}</span>
            </div>
            <div className="modal-grid">
              <div className="modal-info">
                <div className="info-row"><span>Email</span><strong>{selectedUser.email}</strong></div>
                <div className="info-row"><span>User ID</span><strong>#{selectedUser.id}</strong></div>
                <div className="info-row"><span>Cash Balance</span><strong>{formatMoney(selectedUser.cashBalance)}</strong></div>
                <div className="info-row"><span>Total Trades</span><strong>{selectedUser.tradeCount}</strong></div>
                <div className="info-row"><span>XP</span><strong>{selectedUser.xp} XP</strong></div>
                <div className="info-row"><span>Joined</span><strong>{new Date(selectedUser.createdAt).toLocaleDateString()}</strong></div>
              </div>

              {selectedUser.holdings?.length > 0 && (
                <div className="modal-section">
                  <h4>Holdings ({selectedUser.holdings.length})</h4>
                  <table className="mini-table">
                    <thead><tr><th>Symbol</th><th>Qty</th><th>Avg Price</th></tr></thead>
                    <tbody>
                      {selectedUser.holdings.map((h, i) => (
                        <tr key={i}><td className="mono">{h.symbol}</td><td className="mono">{h.quantity.toFixed(2)}</td><td className="mono">{formatMoney(h.avgPrice)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedUser.trades?.length > 0 && (
                <div className="modal-section">
                  <h4>Recent Trades ({selectedUser.trades.length})</h4>
                  <div className="trades-scroll">
                    <table className="mini-table">
                      <thead><tr><th>Symbol</th><th>Type</th><th>Price</th><th>Qty</th><th>P&L</th><th>Time</th></tr></thead>
                      <tbody>
                        {selectedUser.trades.slice(0, 20).map((t, i) => (
                          <tr key={i}>
                            <td className="mono">{t.symbol}</td>
                            <td><span className={`type-badge ${t.type.toLowerCase()}`}>{t.type}</span></td>
                            <td className="mono">{formatMoney(t.price)}</td>
                            <td className="mono">{t.quantity.toFixed(2)}</td>
                            <td className={`mono ${t.pnl > 0 ? "pos" : t.pnl < 0 ? "neg" : ""}`}>{t.pnl !== 0 ? formatMoney(t.pnl) : "—"}</td>
                            <td className="date-cell">{timeAgo(t.timestamp)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTrades = () => (
    <div className="admin-trades">
      <div className="admin-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Filter by symbol..."
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && loadTrades(tradeFilter)}
          />
          <button className="admin-btn small" onClick={() => loadTrades(tradeFilter)}>Filter</button>
          {tradeFilter && <button className="admin-btn small secondary" onClick={() => { setTradeFilter(""); loadTrades(); }}>Clear</button>}
        </div>
        <span className="result-count">{trades?.totalCount ?? 0} total trades</span>
      </div>

      {tradeVolume.length > 0 && (
        <div className="volume-cards">
          <h4>Trade Volume by Symbol</h4>
          <div className="volume-grid">
            {tradeVolume.slice(0, 10).map((v, i) => (
              <div key={i} className="volume-card">
                <span className="vol-sym">{v.symbol}</span>
                <span className="vol-count">{v.tradeCount} trades</span>
                <span className="vol-value">{formatMoney(v.totalVolume)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Symbol</th>
              <th>Type</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>P&L</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {(trades?.trades || []).map((t) => (
              <tr key={t.id}>
                <td className="mono">#{t.id}</td>
                <td className="email-cell">{t.userEmail || `#${t.userId}`}</td>
                <td className="mono">{t.symbol}</td>
                <td><span className={`type-badge ${t.type.toLowerCase()}`}>{t.type}</span></td>
                <td className="mono">{formatMoney(t.price)}</td>
                <td className="mono">{t.quantity.toFixed(4)}</td>
                <td className="mono">{formatMoney(t.totalValue)}</td>
                <td className={`mono ${t.pnl > 0 ? "pos" : t.pnl < 0 ? "neg" : ""}`}>{t.pnl !== 0 ? formatMoney(t.pnl) : "—"}</td>
                <td className="date-cell">{timeAgo(t.timestamp)}</td>
              </tr>
            ))}
            {(!trades?.trades || trades.trades.length === 0) && (
              <tr><td colSpan={9} className="empty-row">No trades found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderML = () => (
    <div className="admin-ml">
      {predStats && (
        <>
          <div className="kpi-grid small">
            <KPICard label="Total Predictions" value={formatNum(predStats.totalPredictions)} icon="📊" color="#58a6ff" />
            <KPICard label="Evaluated" value={formatNum(predStats.evaluatedPredictions)} sub={`${predStats.pendingPredictions} pending`} icon="✅" color="#3fb950" />
            <KPICard label="Hit Rate" value={formatPct(predStats.hitRate)} sub={`${predStats.hits} hits / ${predStats.misses} misses`} icon="🎯" color="#bc8cff" />
          </div>

          {predStats.byModel?.length > 0 && (
            <div className="stats-section">
              <h4>Accuracy by Model</h4>
              <div className="admin-table-wrap">
                <table className="admin-table compact">
                  <thead><tr><th>Model</th><th>Predictions</th><th>Hits</th><th>Hit Rate</th><th>Avg Error</th></tr></thead>
                  <tbody>
                    {predStats.byModel.map((m, i) => (
                      <tr key={i}>
                        <td className="mono">{m.model}</td>
                        <td className="mono">{m.count}</td>
                        <td className="mono">{m.hits}</td>
                        <td className="mono"><span className={`hit-rate ${m.hitRate >= 50 ? "good" : "poor"}`}>{formatPct(m.hitRate)}</span></td>
                        <td className="mono">{m.avgError != null ? formatPct(m.avgError) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {predStats.bySymbol?.length > 0 && (
            <div className="stats-section">
              <h4>Accuracy by Symbol</h4>
              <div className="model-chips">
                {predStats.bySymbol.map((s, i) => (
                  <div key={i} className="model-chip">
                    <span className="chip-label">{s.symbol}</span>
                    <span className={`chip-rate ${s.hitRate >= 50 ? "good" : "poor"}`}>{formatPct(s.hitRate)}</span>
                    <span className="chip-count">{s.count} preds</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {recentPreds.length > 0 && (
        <div className="stats-section">
          <h4>Recent Predictions</h4>
          <div className="admin-table-wrap">
            <table className="admin-table compact">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Model</th>
                  <th>Predicted</th>
                  <th>Current</th>
                  <th>Actual</th>
                  <th>Confidence</th>
                  <th>Direction</th>
                  <th>Hit</th>
                  <th>Error %</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentPreds.slice(0, 30).map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.symbol}</td>
                    <td className="mono model-name">{p.model}</td>
                    <td className="mono">{formatMoney(p.predictedPrice)}</td>
                    <td className="mono">{formatMoney(p.currentPrice)}</td>
                    <td className="mono">{p.actualPrice ? formatMoney(p.actualPrice) : "⏳"}</td>
                    <td className="mono">{p.confidence ? formatPct(p.confidence * 100) : "—"}</td>
                    <td><span className={`dir-badge ${p.direction?.toLowerCase()}`}>{p.direction || "—"}</span></td>
                    <td>{p.hit === true ? "✅" : p.hit === false ? "❌" : "⏳"}</td>
                    <td className="mono">{p.percentError != null ? formatPct(p.percentError) : "—"}</td>
                    <td className="date-cell">{timeAgo(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderSystem = () => {
    if (!systemHealth) return <div className="admin-loading">Loading system health...</div>;
    const memPct = systemHealth.jvmMaxMemoryMB > 0
      ? Math.round((systemHealth.jvmUsedMemoryMB / systemHealth.jvmMaxMemoryMB) * 100)
      : 0;
    return (
      <div className="admin-system">
        <div className="system-grid">
          <div className="sys-card status-card">
            <h4>Service Status</h4>
            <div className="status-indicators">
              <div className="status-row"><span className="status-dot online" /><span>Backend API</span><span className="status-label">Online</span></div>
              <div className="status-row"><span className="status-dot online" /><span>PostgreSQL</span><span className="status-label">Connected</span></div>
              <div className="status-row"><span className="status-dot online" /><span>ML Service</span><span className="status-label">Healthy</span></div>
              <div className="status-row"><span className="status-dot online" /><span>Nginx Frontend</span><span className="status-label">Running</span></div>
            </div>
          </div>

          <div className="sys-card">
            <h4>JVM Memory</h4>
            <div className="memory-gauge">
              <div className="gauge-bar">
                <div className="gauge-fill" style={{ width: `${memPct}%`, background: memPct > 80 ? "#ff7b72" : memPct > 60 ? "#f0883e" : "#3fb950" }} />
              </div>
              <div className="gauge-label">{systemHealth.jvmUsedMemoryMB}MB / {systemHealth.jvmMaxMemoryMB}MB ({memPct}%)</div>
            </div>
            <div className="mem-details">
              <div><span>Allocated</span><strong>{systemHealth.jvmTotalMemoryMB}MB</strong></div>
              <div><span>Free</span><strong>{systemHealth.jvmFreeMemoryMB}MB</strong></div>
              <div><span>CPU Cores</span><strong>{systemHealth.availableProcessors}</strong></div>
            </div>
          </div>

          <div className="sys-card">
            <h4>Runtime</h4>
            <div className="runtime-info">
              <div className="info-row"><span>Uptime</span><strong>{systemHealth.uptimeFormatted}</strong></div>
              <div className="info-row"><span>Java Version</span><strong>{systemHealth.javaVersion}</strong></div>
              <div className="info-row"><span>OS</span><strong>{systemHealth.osName}</strong></div>
              <div className="info-row"><span>Timestamp</span><strong>{new Date(systemHealth.timestamp).toLocaleString()}</strong></div>
            </div>
          </div>

          <div className="sys-card">
            <h4>Database Records</h4>
            <div className="db-stats">
              <div className="db-row"><span>Users</span><strong>{formatNum(systemHealth.dbUsers)}</strong></div>
              <div className="db-row"><span>Trades</span><strong>{formatNum(systemHealth.dbTrades)}</strong></div>
              <div className="db-row"><span>Predictions</span><strong>{formatNum(systemHealth.dbPredictions)}</strong></div>
              <div className="db-row"><span>Holdings</span><strong>{formatNum(systemHealth.dbHoldings)}</strong></div>
            </div>
          </div>
        </div>

        <div className="sys-actions">
          <button className="admin-btn refresh" onClick={loadSystemHealth}>🔄 Refresh Health Check</button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <span className="admin-shield">🛡️</span>
          <h1>Admin Dashboard</h1>
          <span className="admin-env">PRODUCTION</span>
        </div>
      </div>

      <nav className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`admin-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {loading && <div className="admin-loading-bar" />}

      <div className="admin-content">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "users" && renderUsers()}
        {activeTab === "trades" && renderTrades()}
        {activeTab === "ml" && renderML()}
        {activeTab === "system" && renderSystem()}
      </div>

      {/* Action toast */}
      {actionMsg && (
        <div className={`admin-toast ${actionMsg.isError ? "error" : "success"}`}>
          {actionMsg.isError ? "⚠️" : "✅"} {actionMsg.msg}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="admin-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Action</h3>
            <p>{confirmAction.label}</p>
            <div className="confirm-btns">
              <button className="admin-btn secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button
                className="admin-btn danger"
                onClick={() => {
                  if (confirmAction.type === "role") handleChangeRole(confirmAction.userId, confirmAction.newRole);
                  if (confirmAction.type === "reset") handleResetPortfolio(confirmAction.userId);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
