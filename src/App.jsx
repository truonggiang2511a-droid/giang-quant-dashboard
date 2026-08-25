import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setLoading(false);
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
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h1>GIANG QUANT X</h1>
          <p>EA Management Dashboard</p>
        </div>
      </header>

      <main className="main">
        <div className="summary">
          <div className="summary-card">
            <span>Tổng Bot</span>
            <strong>{bots.length}</strong>
          </div>

          <div className="summary-card">
            <span>Online</span>
            <strong>
              {bots.filter((bot) => bot.status === "online").length}
            </strong>
          </div>

          <div className="summary-card">
            <span>Đang Bật</span>
            <strong>
              {bots.filter((bot) => bot.enabled).length}
            </strong>
          </div>
        </div>

        <section className="panel">
          <div className="panel-title">
            <h2>EA Bots</h2>

            <button onClick={loadBots}>
              Làm mới
            </button>
          </div>

          {loading && (
            <div className="empty">
              Đang tải bot...
            </div>
          )}

          {error && (
            <div className="error">
              Supabase Error: {error}
            </div>
          )}

          {!loading && !error && bots.length === 0 && (
            <div className="empty">
              Chưa có EA nào kết nối.
            </div>
          )}

          <div className="bot-list">
            {bots.map((bot) => (
              <div className="bot-card" key={bot.id}>
                <div className="bot-header">
                  <div>
                    <h3>
                      {bot.ea_name || "GIANG QUANT X"}
                    </h3>

                    <p>
                      EA Version: {bot.ea_version || "--"}
                    </p>
                  </div>

                  <span
                    className={
                      bot.status === "online"
                        ? "online"
                        : "offline"
                    }
                  >
                    {bot.status === "online"
                      ? "● ONLINE"
                      : "● OFFLINE"}
                  </span>
                </div>

                <div className="bot-info">
                  <div>
                    <span>MT5 Account</span>
                    <strong>{bot.mt5_account_id}</strong>
                  </div>

                  <div>
                    <span>Symbol</span>
                    <strong>{bot.symbol || "--"}</strong>
                  </div>

                  <div>
                    <span>Balance</span>
                    <strong>{bot.balance ?? 0}</strong>
                  </div>

                  <div>
                    <span>Equity</span>
                    <strong>{bot.equity ?? 0}</strong>
                  </div>

                  <div>
                    <span>Daily Profit</span>
                    <strong>{bot.daily_profit ?? 0}</strong>
                  </div>

                  <div>
                    <span>Drawdown</span>
                    <strong>
                      {bot.drawdown ?? 0}%
                    </strong>
                  </div>
                </div>

                <div className="remote-status">
                  Remote:
                  <strong>
                    {bot.enabled ? " BẬT" : " TẮT"}
                  </strong>
                </div>

                <div className="actions">
                  <button className="btn-enable">
                    BẬT BOT
                  </button>

                  <button className="btn-pause">
                    TẠM DỪNG
                  </button>

                  <button className="btn-close">
                    CLOSE ALL
                  </button>

                  <button className="btn-kill">
                    KILL
                  </button>
                </div>

                <div className="last-seen">
                  Last Seen:{" "}
                  {bot.last_seen
                    ? new Date(
                        bot.last_seen
                      ).toLocaleString("vi-VN")
                    : "--"}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
