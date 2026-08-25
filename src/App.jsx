import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [bots, setBots] = useState([]);
  const [error, setError] = useState("");

  async function loadBots() {
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
  }

  useEffect(() => {
    loadBots();

    const timer = setInterval(loadBots, 10000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>GIANG QUANT X</h1>

      {error && (
        <div style={{ color: "red", marginBottom: 20 }}>
          Database error: {error}
        </div>
      )}

      {bots.length === 0 ? (
        <p>Chưa có bot nào kết nối.</p>
      ) : (
        bots.map((bot) => (
          <div
            key={bot.id}
            style={{
              marginBottom: 15,
              padding: 20,
              border: "1px solid #ddd",
              borderRadius: 10
            }}
          >
            <h3>{bot.ea_name}</h3>

            <p>EA: {bot.ea_version}</p>
            <p>Symbol: {bot.symbol}</p>
            <p>
              Trạng thái:{" "}
              <strong>
                {bot.enabled ? "ĐANG BẬT" : "ĐANG TẮT"}
              </strong>
            </p>

            <p>MT5 Account ID: {bot.mt5_account_id}</p>
            <p>Balance: {bot.balance}</p>
            <p>Equity: {bot.equity}</p>
            <p>Daily Profit: {bot.daily_profit}</p>
            <p>DD: {bot.drawdown}%</p>

            <p>
              Last Seen: {bot.last_seen || "Chưa kết nối"}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
