import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const COMMANDS = {
  ENABLE: "ENABLE",
  PAUSE: "PAUSE",
  DISABLE: "DISABLE",
  CLOSE_ALL: "CLOSE_ALL",
  KILL: "KILL",
};

export default function App() {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commandLoading, setCommandLoading] = useState(null);
  const [message, setMessage] = useState("");

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

  async function sendCommand(bot, command) {
    const dangerous = ["CLOSE_ALL", "KILL"];

    if (dangerous.includes(command)) {
      const confirmed = window.confirm(
        `Xác nhận lệnh ${command} cho ${bot.ea_name || "EA"}?`
      );

      if (!confirmed) return;
    }

    setCommandLoading(`${bot.id}-${command}`);
    setMessage("");
    setError("");

    // Tránh gửi cùng một lệnh khi lệnh trước vẫn pending
    const { data: pending, error: pendingError } = await supabase
      .from("bot_commands")
      .select("id")
      .eq("bot_instance_id", bot.id)
      .eq("status", "pending")
      .limit(1);

    if (pendingError) {
      setError(pendingError.message);
      setCommandLoading(null);
      return;
    }

    if (pending && pending.length > 0) {
      setError(
        "Bot đang có một lệnh chờ xử lý. Hãy chờ EA nhận lệnh trước."
      );
      setCommandLoading(null);
      return;
    }

    const { error: insertError } = await supabase
      .from("bot_commands")
      .insert({
        bot_instance_id: bot.id,
        command,
        status: "pending",
        message: `Dashboard command: ${command}`,
      });

    if (insertError) {
      setError(insertError.message);
      setCommandLoading(null);
      return;
    }

    setMessage(
      `${command} đã được gửi. EA sẽ nhận ở heartbeat tiếp theo.`
    );

    setCommandLoading(null);

    // Cập nhật trạng thái hiển thị nếu là ENABLE/PAUSE
    setBots((current) =>
      current.map((item) => {
        if (item.id !== bot.id) return item;

        if (command === COMMANDS.ENABLE) {
          return { ...item, enabled: true };
        }

        if (
          command === COMMANDS.PAUSE ||
          command === COMMANDS.DISABLE ||
          command === COMMANDS.CLOSE_ALL ||
          command === COMMANDS.KILL
        ) {
          return { ...item, enabled: false };
        }

        return item;
      })
    );
  }

  useEffect(() => {
    loadBots();

    const timer = setInterval(loadBots, 10000);

    return () => clearInterval(timer);
  }, []);

  const onlineCount = bots.filter(
    (bot) => bot.status === "online"
  ).length;

  const enabledCount = bots.filter(
    (bot) => bot.enabled === true
  ).length;

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h1>GIANG QUANT X</h1>
          <p>EA Remote Management Dashboard</p>
        </div>

        <button className="refresh-btn" onClick={loadBots}>
          ↻ Làm mới
        </button>
      </header>

      <main className="main">
        <div className="summary">
          <div className="summary-card">
            <span>Tổng Bot</span>
            <strong>{bots.length}</strong>
          </div>

          <div className="summary-card">
            <span>Online</span>
            <strong>{onlineCount}</strong>
          </div>

          <div className="summary-card">
            <span>Đang Bật</span>
            <strong>{enabledCount}</strong>
          </div>
        </div>

        {message && (
          <div className="success-box">
            {message}
          </div>
        )}

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <section className="panel">
          <div className="panel-title">
            <div>
              <h2>EA Bots</h2>
              <p>
                Điều khiển EA đang chạy trên MT5
              </p>
            </div>
          </div>

          {loading && (
            <div className="empty">
              Đang tải bot...
            </div>
          )}

          {!loading && bots.length === 0 && (
            <div className="empty">
              Chưa có bot nào kết nối.
            </div>
          )}

          <div className="bot-list">
            {bots.map((bot) => {
              const isOnline = bot.status === "online";
              const isEnabled = bot.enabled === true;

              return (
                <div className="bot-card" key={bot.id}>
                  <div className="bot-header">
                    <div>
                      <h3>
                        {bot.ea_name || "GIANG QUANT X"}
                      </h3>

                      <p>
                        Version {bot.ea_version || "--"} ·{" "}
                        {bot.symbol || "--"} ·{" "}
                        {bot.timeframe || "--"}
                      </p>
                    </div>

                    <div
                      className={
                        isOnline
                          ? "status online"
                          : "status offline"
                      }
                    >
                      {isOnline ? "● ONLINE" : "● OFFLINE"}
                    </div>
                  </div>

                  <div className="bot-grid">
                    <div>
                      <span>MT5 Account ID</span>
                      <strong>{bot.mt5_account_id}</strong>
                    </div>

                    <div>
                      <span>Balance</span>
                      <strong>
                        {Number(bot.balance || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <span>Equity</span>
                      <strong>
                        {Number(bot.equity || 0).toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <span>Daily Profit</span>
                      <strong>
                        {Number(
                          bot.daily_profit || 0
                        ).toFixed(2)}
                      </strong>
                    </div>

                    <div>
                      <span>Drawdown</span>
                      <strong>
                        {Number(bot.drawdown || 0).toFixed(2)}%
                      </strong>
                    </div>

                    <div>
                      <span>Remote</span>
                      <strong
                        className={
                          isEnabled
                            ? "text-green"
                            : "text-red"
                        }
                      >
                        {isEnabled ? "BẬT" : "TẮT"}
                      </strong>
                    </div>
                  </div>

                  <div className="control-box">
                    <button
                      className="btn-enable"
                      disabled={
                        commandLoading !== null ||
                        isEnabled
                      }
                      onClick={() =>
                        sendCommand(
                          bot,
                          COMMANDS.ENABLE
                        )
                      }
                    >
                      {commandLoading ===
                      `${bot.id}-ENABLE`
                        ? "ĐANG GỬI..."
                        : "BẬT BOT"}
                    </button>

                    <button
                      className="btn-pause"
                      disabled={
                        commandLoading !== null ||
                        !isEnabled
                      }
                      onClick={() =>
                        sendCommand(
                          bot,
                          COMMANDS.PAUSE
                        )
                      }
                    >
                      {commandLoading ===
                      `${bot.id}-PAUSE`
                        ? "ĐANG GỬI..."
                        : "TẠM DỪNG"}
                    </button>

                    <button
                      className="btn-close"
                      disabled={commandLoading !== null}
                      onClick={() =>
                        sendCommand(
                          bot,
                          COMMANDS.CLOSE_ALL
                        )
                      }
                    >
                      CLOSE ALL
                    </button>

                    <button
                      className="btn-kill"
                      disabled={commandLoading !== null}
                      onClick={() =>
                        sendCommand(
                          bot,
                          COMMANDS.KILL
                        )
                      }
                    >
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
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
