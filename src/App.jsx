import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "./supabase";
import { signIn, signOut } from "./auth";

/* =========================================================
   COMMANDS
========================================================= */

const COMMANDS = {
  ENABLE: "ENABLE",
  PAUSE: "PAUSE",
  CLOSE_ALL: "CLOSE_ALL",
  KILL: "KILL",
};

/* =========================================================
   BOT STATUS
========================================================= */

function getBotStatus(
  bot,
  now = Date.now()
) {
  if (!bot?.last_seen) {
    return {
      key: "offline",
      label: "OFFLINE",
      seconds: null,
    };
  }

  const lastSeen =
    new Date(
      bot.last_seen
    ).getTime();

  if (Number.isNaN(lastSeen)) {
    return {
      key: "offline",
      label: "OFFLINE",
      seconds: null,
    };
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (now - lastSeen) / 1000
    )
  );

  if (seconds > 60) {
    return {
      key: "offline",
      label: "OFFLINE",
      seconds,
    };
  }

  if (seconds > 15) {
    return {
      key: "warning",
      label: "WARNING",
      seconds,
    };
  }

  if (bot.enabled === false) {
    return {
      key: "paused",
      label: "PAUSED",
      seconds,
    };
  }

  return {
    key: "online",
    label: "ONLINE",
    seconds,
  };
}

/* =========================================================
   FORMAT
========================================================= */

function formatMoney(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatDate(value) {
  if (!value) return "--";

  try {
    return new Date(
      value
    ).toLocaleString(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );
  } catch {
    return "--";
  }
}

function formatAgo(seconds) {
  if (
    seconds === null ||
    seconds === undefined
  ) {
    return "--";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  return `${Math.floor(seconds / 60)}m`;
}

/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const [
    session,
    setSession,
  ] = useState(null);

  const [
    checkingAuth,
    setCheckingAuth,
  ] = useState(true);

  const [
    page,
    setPage,
  ] = useState("dashboard");

  const [bots, setBots] =
    useState([]);

  const [
    commands,
    setCommands,
  ] = useState([]);

  const [
    pendingCommands,
    setPendingCommands,
  ] = useState({});

  const [
    commandLoading,
    setCommandLoading,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [now, setNow] =
    useState(Date.now());

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    commandFilter,
    setCommandFilter,
  ] = useState("ALL");

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (!supabase) {
          throw new Error(
            "SUPABASE_NOT_CONFIGURED"
          );
        }

        const {
          data,
          error: authError,
        } =
          await supabase.auth.getSession();

        if (authError) {
          throw authError;
        }

        if (mounted) {
          setSession(
            data?.session || null
          );
        }
      } catch (err) {
        console.error(
          "AUTH INIT ERROR:",
          err
        );

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    init();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (mounted) {
            setSession(
              newSession || null
            );
          }
        }
      );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  /* =======================================================
     CLOCK
  ======================================================= */

  useEffect(() => {
    const timer =
      setInterval(() => {
        setNow(Date.now());
      }, 1000);

    return () =>
      clearInterval(timer);
  }, []);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function loadData(
    showLoading = false
  ) {
    if (!supabase) {
      setError(
        "Supabase chưa được cấu hình."
      );
      setLoading(false);
      return;
    }

    if (showLoading) {
      setLoading(true);
    }

    try {
      setError("");

      /* ---------------------------------------------------
         BOT INSTANCES
      --------------------------------------------------- */

      const {
        data: botData,
        error: botError,
      } =
        await supabase
          .from(
            "bot_instances"
          )
          .select(
            `
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
            drawdown,
            created_at
          `
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (botError) {
        throw botError;
      }

      /* ---------------------------------------------------
         COMMANDS
      --------------------------------------------------- */

      const {
        data: commandData,
        error: commandError,
      } =
        await supabase
          .from(
            "bot_commands"
          )
          .select(
            `
            id,
            bot_instance_id,
            command,
            status,
            message,
            created_at,
            executed_at
          `
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(300);

      if (commandError) {
        throw commandError;
      }

      const safeBots =
        Array.isArray(
          botData
        )
          ? botData
          : [];

      const safeCommands =
        Array.isArray(
          commandData
        )
          ? commandData
          : [];

      setBots(safeBots);
      setCommands(
        safeCommands
      );

      /* ---------------------------------------------------
         PENDING MAP
      --------------------------------------------------- */

      const pendingMap = {};

      for (
        const command of
          safeCommands
      ) {
        if (
          command.status ===
            "pending" &&
          !pendingMap[
            command.bot_instance_id
          ]
        ) {
          pendingMap[
            command.bot_instance_id
          ] = command;
        }
      }

      setPendingCommands(
        pendingMap
      );

      /* ---------------------------------------------------
         CLEAR WAITING MESSAGE
      --------------------------------------------------- */

      if (
        Object.keys(
          pendingMap
        ).length === 0
      ) {
        setMessage(
          (current) => {
            if (
              current.includes(
                "Đang chờ EA xác nhận"
              )
            ) {
              return "";
            }

            return current;
          }
        );
      }
    } catch (err) {
      console.error(
        "DATABASE LOAD ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể tải dữ liệu."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     AUTO REFRESH
  ======================================================= */

  useEffect(() => {
    if (!session) {
      return;
    }

    loadData(true);

    const timer =
      setInterval(
        () => {
          loadData(false);
        },
        5000
      );

    return () =>
      clearInterval(timer);
  }, [session]);

  /* =======================================================
     REFRESH
  ======================================================= */

  async function handleRefresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadData(false);
    } finally {
      setRefreshing(false);
    }
  }

  /* =======================================================
     COMMAND
  ======================================================= */

  async function sendCommand(
    bot,
    command
  ) {
    if (
      commandLoading ||
      pendingCommands[bot.id]
    ) {
      return;
    }

    setError("");
    setMessage("");

    if (
      command ===
        COMMANDS.CLOSE_ALL ||
      command ===
        COMMANDS.KILL
    ) {
      const confirmed =
        window.confirm(
          command ===
            COMMANDS.CLOSE_ALL
            ? `Đóng tất cả lệnh của ${
                bot.ea_name ||
                "GIANG QUANT X"
              }?`
            : `KILL ${
                bot.ea_name ||
                "GIANG QUANT X"
              }?`
        );

      if (!confirmed) {
        return;
      }
    }

    setCommandLoading(
      `${bot.id}-${command}`
    );

    try {
      /* ----------------------------------------------------
         CHECK PENDING
      ---------------------------------------------------- */

      const {
        data: pending,
        error: pendingError,
      } =
        await supabase
          .from(
            "bot_commands"
          )
          .select(
            "id, command, status"
          )
          .eq(
            "bot_instance_id",
            bot.id
          )
          .eq(
            "status",
            "pending"
          )
          .limit(1);

      if (pendingError) {
        throw pendingError;
      }

      if (
        pending &&
        pending.length > 0
      ) {
        setError(
          `Bot đang có lệnh ${pending[0].command} chờ EA xử lý.`
        );

        return;
      }

      /* ----------------------------------------------------
         INSERT
      ---------------------------------------------------- */

      const {
        error: insertError,
      } =
        await supabase
          .from(
            "bot_commands"
          )
          .insert({
            bot_instance_id:
              bot.id,
            command,
            status: "pending",
            message:
              `Dashboard command: ${command}`,
          });

      if (insertError) {
        throw insertError;
      }

      setMessage(
        `🟡 ${command} đã được gửi. Đang chờ EA xác nhận...`
      );

      await loadData(false);
    } catch (err) {
      console.error(
        "COMMAND ERROR:",
        err
      );

      setError(
        err?.message ||
          "Không thể gửi lệnh."
      );
    } finally {
      setCommandLoading(null);
    }
  }

  /* =======================================================
     STATUS
  ======================================================= */

  const preparedBots =
    useMemo(() => {
      return bots.map(
        (bot) => ({
          ...bot,
          liveStatus:
            getBotStatus(
              bot,
              now
            ),
        })
      );
    }, [bots, now]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats =
    useMemo(() => {
      return {
        total:
          preparedBots.length,

        online:
          preparedBots.filter(
            (bot) =>
              bot.liveStatus
                .key ===
              "online"
          ).length,

        warning:
          preparedBots.filter(
            (bot) =>
              bot.liveStatus
                .key ===
              "warning"
          ).length,

        paused:
          preparedBots.filter(
            (bot) =>
              bot.liveStatus
                .key ===
              "paused"
          ).length,

        offline:
          preparedBots.filter(
            (bot) =>
              bot.liveStatus
                .key ===
              "offline"
          ).length,
      };
    }, [preparedBots]);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredBots =
    useMemo(() => {
      const q =
        search
          .trim()
          .toLowerCase();

      return preparedBots.filter(
        (bot) => {
          const searchable =
            [
              bot.ea_name,
              bot.ea_version,
              bot.symbol,
              bot.timeframe,
              bot.mt5_account_id,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchSearch =
            !q ||
            searchable.includes(
              q
            );

          const matchStatus =
            statusFilter ===
              "ALL" ||
            bot.liveStatus.key ===
              statusFilter;

          return (
            matchSearch &&
            matchStatus
          );
        }
      );
    }, [
      preparedBots,
      search,
      statusFilter,
    ]);

  const filteredCommands =
    useMemo(() => {
      if (
        commandFilter ===
        "ALL"
      ) {
        return commands;
      }

      return commands.filter(
        (item) =>
          String(
            item.status
          ).toUpperCase() ===
          commandFilter
      );
    }, [
      commands,
      commandFilter,
    ]);

  /* =======================================================
     AUTH LOADING
  ======================================================= */

  if (checkingAuth) {
    return (
      <div className="screen-center">
        <div className="loading-card">
          <div className="brand-mark">
            GQ
          </div>

          <div className="spinner" />

          <p>
            Đang kiểm tra đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     LOGIN
  ======================================================= */

  if (!session) {
    return (
      <LoginScreen />
    );
  }

  /* =======================================================
     APP UI
  ======================================================= */

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        onLogout={signOut}
      />

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              GIANG QUANT X
            </div>

            <h1>
              {page ===
              "dashboard"
                ? "Control Dashboard"
                : page ===
                    "bots"
                  ? "EA Bots"
                  : page ===
                      "commands"
                    ? "Commands"
                    : page ===
                        "mt5"
                      ? "MT5 Accounts"
                      : page ===
                          "licenses"
                        ? "Licenses"
                        : "Activity Logs"}
            </h1>

            <p>
              Quản lý hệ thống EA MT5.
            </p>
          </div>

          <div className="top-actions">
            <span className="admin-pill">
              ● ADMIN
            </span>

            <button
              className="refresh"
              onClick={
                handleRefresh
              }
              disabled={
                refreshing
              }
            >
              {refreshing
                ? "Đang tải..."
                : "↻ Làm mới"}
            </button>
          </div>
        </header>

        {message && (
          <div className="alert success">
            {message}
          </div>
        )}

        {error && (
          <div className="alert error">
            <span>
              {error}
            </span>

            <button
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* ==================================================
            DASHBOARD
        ================================================== */}

        {page ===
          "dashboard" && (
          <DashboardPage
            stats={stats}
            bots={
              preparedBots
            }
            loading={
              loading
            }
            setPage={
              setPage
            }
          />
        )}

        {/* ==================================================
            EA BOTS
        ================================================== */}

        {page === "bots" && (
          <BotsPage
            bots={
              filteredBots
            }
            search={search}
            setSearch={
              setSearch
            }
            statusFilter={
              statusFilter
            }
            setStatusFilter={
              setStatusFilter
            }
            pendingCommands={
              pendingCommands
            }
            commandLoading={
              commandLoading
            }
            sendCommand={
              sendCommand
            }
            loading={
              loading
            }
          />
        )}

        {/* ==================================================
            COMMANDS
        ================================================== */}

        {page ===
          "commands" && (
          <CommandsPage
            commands={
              filteredCommands
            }
            filter={
              commandFilter
            }
            setFilter={
              setCommandFilter
            }
          />
        )}

        {/* ==================================================
            SAFE PLACEHOLDERS
        ================================================== */}

        {page === "mt5" && (
          <SafePage
            icon="◎"
            title="MT5 Accounts"
            description="Khu vực quản lý tài khoản MT5."
          />
        )}

        {page ===
          "licenses" && (
          <SafePage
            icon="◇"
            title="Licenses"
            description="Khu vực quản lý License."
          />
        )}

        {page === "logs" && (
          <SafePage
            icon="◌"
            title="Activity Logs"
            description="Khu vực nhật ký hệ thống."
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  page,
  setPage,
  onLogout,
}) {
  const items = [
    ["dashboard", "▦", "Dashboard"],
    ["bots", "◉", "EA Bots"],
    ["mt5", "◎", "MT5 Accounts"],
    ["licenses", "◇", "Licenses"],
    ["commands", "↯", "Commands"],
    ["logs", "◌", "Activity Logs"],
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          GQ
        </div>

        <div>
          <div className="brand-title">
            GIANG QUANT
          </div>

          <div className="brand-sub">
            CONTROL CENTER
          </div>
        </div>
      </div>

      <nav className="nav">
        {items.map(
          (item) => (
            <button
              key={
                item[0]
              }
              className={`nav-item ${
                page ===
                item[0]
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setPage(
                  item[0]
                )
              }
            >
              <span className="nav-icon">
                {item[1]}
              </span>

              {item[2]}
            </button>
          )
        )}
      </nav>

      <div className="sidebar-bottom">
        <div className="online-dot">
          <span />
          SYSTEM ONLINE
        </div>

        <div className="location">
          Production · Singapore
        </div>

        <button
          className="logout"
          onClick={
            onLogout
          }
        >
          ĐĂNG XUẤT
        </button>
      </div>
    </aside>
  );
}

/* =========================================================
   DASHBOARD PAGE
========================================================= */

function DashboardPage({
  stats,
  bots,
  loading,
  setPage,
}) {
  return (
    <>
      <section className="stats">
        <StatCard
          title="TOTAL BOTS"
          value={
            stats.total
          }
          note="Bot đã đăng ký"
        />

        <StatCard
          title="ONLINE"
          value={
            stats.online
          }
          note="Đang heartbeat"
          color="green"
        />

        <StatCard
          title="PAUSED"
          value={
            stats.paused
          }
          note="EA đang tạm dừng"
          color="orange"
        />

        <StatCard
          title="OFFLINE"
          value={
            stats.offline
          }
          note="Mất heartbeat"
          color="red"
        />
      </section>

      <section className="hero">
        <div>
          <span>
            GIANG QUANT X
          </span>

          <h2>
            EA COMMAND CENTER
          </h2>

          <p>
            Theo dõi và điều khiển hệ thống
            EA MT5 từ một giao diện duy nhất.
          </p>
        </div>

        <button
          className="hero-button"
          onClick={() =>
            setPage("bots")
          }
        >
          QUẢN LÝ EA BOTS →
        </button>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              Bot đang hoạt động
            </h2>

            <p>
              Dữ liệu trực tiếp từ Supabase.
            </p>
          </div>

          <span className="live">
            ● LIVE
          </span>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : bots.length ===
          0 ? (
          <EmptyBlock
            title="Chưa có bot"
            text="Chạy EA trên MT5 để bot xuất hiện."
          />
        ) : (
          <div className="mini-grid">
            {bots
              .slice(0, 6)
              .map((bot) => (
                <MiniBot
                  bot={bot}
                  key={
                    bot.id
                  }
                />
              ))}
          </div>
        )}
      </section>
    </>
  );
}

/* =========================================================
   BOTS PAGE
========================================================= */

function BotsPage({
  bots,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  pendingCommands,
  commandLoading,
  sendCommand,
  loading,
}) {
  return (
    <section className="panel">
      <div className="toolbar">
        <div className="search">
          <span>
            ⌕
          </span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Tìm EA, MT5, server..."
          />
        </div>

        <select
          value={
            statusFilter
          }
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
        >
          <option value="ALL">
            Tất cả
          </option>

          <option value="online">
            Online
          </option>

          <option value="warning">
            Warning
          </option>

          <option value="paused">
            Paused
          </option>

          <option value="offline">
            Offline
          </option>
        </select>
      </div>

      {loading ? (
        <LoadingBlock />
      ) : bots.length ===
        0 ? (
        <EmptyBlock
          title="Không tìm thấy bot"
          text="Thử thay đổi từ khóa hoặc bộ lọc."
        />
      ) : (
        <div className="bot-list">
          {bots.map((bot) => (
            <BotCard
              key={
                bot.id
              }
              bot={bot}
              pending={
                pendingCommands[
                  bot.id
                ]
              }
              commandLoading={
                commandLoading
              }
              sendCommand={
                sendCommand
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   BOT CARD
========================================================= */

function BotCard({
  bot,
  pending,
  commandLoading,
  sendCommand,
}) {
  const status =
    bot.liveStatus;

  const enabled =
    bot.enabled === true;

  const busy =
    commandLoading !==
      null ||
    pending !==
      undefined;

  let state =
    enabled
      ? "RUNNING"
      : "PAUSED";

  let stateClass =
    enabled
      ? "running"
      : "paused";

  if (pending) {
    state =
      `${pending.command} REQUESTED`;

    stateClass =
      "requested";
  }

  return (
    <article className="bot-card">
      <div className="bot-header">
        <div>
          <div className="bot-name">
            <div className="bot-avatar">
              GQ
            </div>

            <div>
              <h3>
                {bot.ea_name ||
                  "GIANG QUANT X"}
              </h3>

              <p>
                V
                {bot.ea_version ||
                  "--"}
                {" · "}
                {bot.symbol ||
                  "--"}
                {" · "}
                {bot.timeframe ||
                  "--"}
              </p>
            </div>
          </div>
        </div>

        <div className="bot-badges">
          <span
            className={`status ${status.key}`}
          >
            ●{" "}
            {
              status.label
            }
          </span>

          <span
            className={`state ${stateClass}`}
          >
            {state}
          </span>
        </div>
      </div>

      <div className="metrics">
        <Metric
          label="MT5 LOGIN"
          value={
            bot.mt5_account_id ||
            "--"
          }
        />

        <Metric
          label="BALANCE"
          value={formatMoney(
            bot.balance
          )}
        />

        <Metric
          label="EQUITY"
          value={formatMoney(
            bot.equity
          )}
        />

        <Metric
          label="DAILY PNL"
          value={formatMoney(
            bot.daily_profit
          )}
        />

        <Metric
          label="DRAWDOWN"
          value={`${Number(
            bot.drawdown ||
              0
          ).toFixed(2)}%`}
        />

        <Metric
          label="HEARTBEAT"
          value={
            status.seconds ===
            null
              ? "--"
              : `${formatAgo(
                  status.seconds
                )} ago`
          }
        />

        <Metric
          label="SYMBOL"
          value={
            bot.symbol ||
            "--"
          }
        />

        <Metric
          label="TIMEFRAME"
          value={
            bot.timeframe ||
            "--"
          }
        />
      </div>

      <div className="bot-footer">
        <span>
          REMOTE
          <strong
            className={
              enabled
                ? "on"
                : "off"
            }
          >
            {enabled
              ? " BẬT"
              : " TẮT"}
          </strong>
        </span>

        <span>
          LAST SEEN
          {" · "}
          {formatDate(
            bot.last_seen
          )}
        </span>
      </div>

      <div className="actions">
        {enabled ? (
          <button
            className="pause-button"
            disabled={
              busy
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
              : "TẮT BOT"}
          </button>
        ) : (
          <button
            className="enable-button"
            disabled={
              busy
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
        )}

        <button
          className="close-button"
          disabled={
            busy
          }
          onClick={() =>
            sendCommand(
              bot,
              COMMANDS.CLOSE_ALL
            )
          }
        >
          ĐÓNG TẤT CẢ
        </button>

        <button
          className="kill-button"
          disabled={
            busy
          }
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
    </article>
  );
}

/* =========================================================
   COMMANDS
========================================================= */

function CommandsPage({
  commands,
  filter,
  setFilter,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>
            Command History
          </h2>

          <p>
            Lịch sử lệnh remote của EA.
          </p>
        </div>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(
              event.target.value
            )
          }
        >
          <option value="ALL">
            Tất cả
          </option>

          <option value="PENDING">
            Pending
          </option>

          <option value="EXECUTED">
            Executed
          </option>
        </select>
      </div>

      {commands.length ===
        0 ? (
        <EmptyBlock
          title="Chưa có command"
          text="Lệnh từ Dashboard sẽ xuất hiện tại đây."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  TIME
                </th>

                <th>
                  BOT ID
                </th>

                <th>
                  COMMAND
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  EXECUTED
                </th>
              </tr>
            </thead>

            <tbody>
              {commands.map(
                (command) => (
                  <tr
                    key={
                      command.id
                    }
                  >
                    <td>
                      {formatDate(
                        command.created_at
                      )}
                    </td>

                    <td className="mono">
                      {String(
                        command.bot_instance_id
                      ).slice(
                        0,
                        12
                      )}
                      ...
                    </td>

                    <td>
                      <span
                        className={`command ${String(
                          command.command
                        ).toLowerCase()}`}
                      >
                        {
                          command.command
                        }
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          command.status ===
                          "executed"
                            ? "status-success"
                            : "status-pending"
                        }
                      >
                        {String(
                          command.status
                        ).toUpperCase()}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        command.executed_at
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   SAFE PAGE
========================================================= */

function SafePage({
  icon,
  title,
  description,
}) {
  return (
    <section className="panel safe-page">
      <div className="safe-icon">
        {icon}
      </div>

      <h2>
        {title}
      </h2>

      <p>
        {description}
      </p>

      <span>
        MODULE READY
      </span>
    </section>
  );
}

/* =========================================================
   MINI BOT
========================================================= */

function MiniBot({
  bot,
}) {
  const status =
    bot.liveStatus;

  return (
    <div className="mini-bot">
      <div className="mini-header">
        <div className="mini-avatar">
          GQ
        </div>

        <div className="mini-title">
          <strong>
            {bot.ea_name ||
              "GIANG QUANT X"}
          </strong>

          <span>
            MT5
            {" "}
            {bot.mt5_account_id ||
              "--"}
          </span>
        </div>

        <span
          className={`status ${status.key}`}
        >
          ●{" "}
          {status.label}
        </span>
      </div>

      <div className="mini-data">
        <div>
          <span>
            BALANCE
          </span>

          <strong>
            {formatMoney(
              bot.balance
            )}
          </strong>
        </div>

        <div>
          <span>
            EQUITY
          </span>

          <strong>
            {formatMoney(
              bot.equity
            )}
          </strong>
        </div>

        <div>
          <span>
            DD
          </span>

          <strong>
            {Number(
              bot.drawdown ||
                0
            ).toFixed(2)}
            %
          </strong>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function StatCard({
  title,
  value,
  note,
  color,
}) {
  return (
    <div className="stat-card">
      <span>
        {title}
      </span>

      <strong
        className={
          color
            ? color
            : ""
        }
      >
        {value}
      </strong>

      <small>
        {note}
      </small>
    </div>
  );
}

function Metric({
  label,
  value,
}) {
  return (
    <div className="metric">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function EmptyBlock({
  title,
  text,
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">
        ◈
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="loading">
      <div className="spinner" />
      <p>
        Đang tải dữ liệu...
      </p>
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function LoginScreen() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [loginError, setLoginError] =
    useState("");

  async function handleLogin(
    event
  ) {
    event.preventDefault();

    setLoading(true);
    setLoginError("");

    try {
      if (!supabase) {
        throw new Error(
          "SUPABASE_NOT_CONFIGURED"
        );
      }

      const {
        error,
      } = await signIn(
        email.trim(),
        password
      );

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error(
        "LOGIN ERROR:",
        err
      );

      setLoginError(
        "Email hoặc mật khẩu không chính xác."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-bg-one" />
      <div className="login-bg-two" />

      <div className="login-card">
        <div className="login-logo">
          GQ
        </div>

        <div className="login-brand">
          GIANG QUANT
        </div>

        <div className="login-caption">
          EA CONTROL CENTER
        </div>

        <div className="login-line" />

        <h1>
          Welcome Back
        </h1>

        <p>
          Đăng nhập để quản lý và điều khiển
          EA MT5.
        </p>

        <form
          onSubmit={
            handleLogin
          }
        >
          <label>
            EMAIL
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="admin@example.com"
            required
          />

          <label>
            PASSWORD
          </label>

          <input
            type="password"
            value={
              password
            }
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="••••••••"
            required
          />

          {loginError && (
            <div className="login-error">
              {loginError}
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={
              loading
            }
          >
            {loading
              ? "ĐANG ĐĂNG NHẬP..."
              : "ĐĂNG NHẬP"}
          </button>
        </form>

        <div className="login-secure">
          ● SECURE ADMIN ACCESS
        </div>
      </div>
    </div>
  );
}
