import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [message, setMessage] = useState("Đang kết nối...");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from("bot_instances")
        .select("id, ea_name, status, enabled, last_seen")
        .limit(10);

      if (error) {
        setMessage("LỖI SUPABASE: " + error.message);
        return;
      }

      setRows(data || []);
      setMessage("KẾT NỐI SUPABASE THÀNH CÔNG");
    }

    testConnection();
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1>GIANG QUANT X</h1>
      <h2>{message}</h2>

      {rows.map((bot) => (
        <div key={bot.id}>
          {bot.ea_name} — {bot.status} —{" "}
          {bot.enabled ? "ON" : "OFF"}
        </div>
      ))}
    </div>
  );
}
