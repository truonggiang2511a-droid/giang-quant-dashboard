import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [bots, setBots] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadBots() {
    setError("");

    const { data, error } = await supabase
      .from("bot_instances")
      .select(`
        id,
        mt5_account_id,
        ea_name,
        ea_version,
        symbol,
        timeframe,
        status,
        enabled,
        last_seen,
        balance,
        equity,
        daily_profit,
        drawdown
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setBots(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadBots();

    const timer = setInterval(loadBots, 10000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>GIANG QUANT</h2>

        <div className="menu active">Dashboard</div>
        <div className="menu">Khách hàng</div>
        <div className="menu">EA Bots</div>
        <div className="menu">License</div>
        <div className="menu">Tài khoản MT5</div>
        <div className="menu">Lịch sử hoạt động</div>
      </aside>

      <main className="content">
        <header>
          <div>
            <h1>Bot Management</h1>
            <p>Giang Quant X — quản lý EA từ xa</p>
          </div>
        </header>

        {error && (
          <div className="panel">
            <strong>Lỗi Supabase:</strong> {error}
          </div>
        )}

        {loading && <p>Đang tải bot...</p>}

        {!loading && bots.length === 0 && (
          <section className="panel">
            Chưa có bot nào.
          </section>
        )}

        {bots.map((bot) => (
          <section className="panel" key={bot.id}>
            <div className="panel-header">
              <div>
                <h2>{bot.ea_name || "GIANG QUANT X"}</h2>
                <p>
                  MT5 ID: {bot.mt5_account_id}
                </p>
              </div>

              <div>
                <strong>
                  {bot.status === "online"
                    ? "🟢 ONLINE"
                    : "🔴 OFFLINE"}
                </strong>
              </div>
            </div>

            <div className="stats">
              <div className="card">
                <span>EA</span>
                <strong>{bot.ea_version}</strong>
              </div>

              <div className="card">
                <span>Balance</span>
                <strong>{bot.balance}</strong>
              </div>

              <div className="card">
                <span>Equity</span>
                <strong>{bot.equity}</strong>
              </div>

              <div className="card">
                <span>DD</span>
                <strong>{bot.drawdown}%</strong>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <strong>
                Remote: {bot.enabled ? "🟢 BẬT" : "🔴 TẮT"}
              </strong>
            </div>

            <p>
              Last Seen:{" "}
              {bot.last_seen
                ? new Date(bot.last_seen).toLocaleString("vi-VN")
                : "Chưa có"}
            </p>
          </section>
        ))}
      </main>
    </div>
  );
}
