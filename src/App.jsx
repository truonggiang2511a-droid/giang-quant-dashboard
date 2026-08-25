import "./style.css";

function App() {
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
        <div className="menu">Cài đặt</div>
      </aside>

      <main className="content">
        <header>
          <div>
            <h1>Bot Management Dashboard</h1>
            <p>Quản lý EA và tài khoản khách hàng</p>
          </div>

          <button className="logout">Đăng xuất</button>
        </header>

        <section className="stats">
          <div className="card">
            <span>Tổng khách hàng</span>
            <strong>0</strong>
          </div>

          <div className="card">
            <span>EA đang chạy</span>
            <strong>0</strong>
          </div>

          <div className="card">
            <span>EA đang tắt</span>
            <strong>0</strong>
          </div>

          <div className="card">
            <span>License hết hạn</span>
            <strong>0</strong>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>EA Bot</h2>
            <button className="add">+ Thêm Bot</button>
          </div>

          <div className="empty">
            Chưa có EA nào trong hệ thống
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
