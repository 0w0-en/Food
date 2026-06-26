// --- 全域變數 ---
let currentSensorId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 側欄邏輯 (Sidebar)
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    const allPanels = document.querySelectorAll('.panels .panel');

    menuToggle?.addEventListener('click', () => sidebar.classList.add('active'));
    menuClose?.addEventListener('click', () => sidebar.classList.remove('active'));

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            allPanels.forEach(panel => {
                panel.style.display = (panel.id === targetId) ? 'block' : 'none';
                if(panel.id === targetId) panel.classList.remove('limit-view');
            });
            sidebar.classList.remove('active'); 
        });
    });

    // 2. 感測器選擇邏輯
    const sensorSelect = document.getElementById('sensor-select');
    sensorSelect?.addEventListener('change', (e) => {
        currentSensorId = e.target.value;
        if (currentSensorId) {
            updateDashboard(currentSensorId);
        }
    });

    // 3. 初始化執行
    fetchLatest(); // 更新最上方的即時數值

    // 4. 設定定時自動更新 (每 3 秒)
    setInterval(() => {
        fetchLatest(); // 永遠更新即時數值
        if (currentSensorId) {
            fetchRawData(currentSensorId); // 有選感測器時，更新表格
            // 若有圖表需求，可在此處呼叫 fetchChartData(currentSensorId);
        }
    }, 3000);
});

// --- 核心工具函式 (定義在外面) ---

// 獲取即時數據
async function fetchLatest() {
    try {
        const response = await fetch('/api/latest/');
        const data = await response.json();
        const display = document.getElementById('latest-values');
        if (display && data.results) {
            display.innerHTML = data.results.map(s => 
                `<div class="item" style="color: black;">${s.name}: ${s.value} ${s.unit||''}</div>`
            ).join('');
        }
    } catch (err) { console.error('fetchLatest error:', err); }
}

// 更新原始資料表格
async function fetchRawData(sensorId) {
    try {
        const response = await fetch(`/api/raw/?sensor_id=${sensorId}`);
        const data = await response.json();
        const tbody = document.querySelector('#raw-table tbody');
        if (tbody && data.results) {
            tbody.innerHTML = data.results.map(row => `
                <tr>
                    <td style="color: black;">${row.id}</td>
                    <td style="color: black;">${row.topic}</td>
                    <td style="color: black;">${row.value}</td>
                    <td style="color: black;">${row.timestamp}</td>
                </tr>
            `).join('');
        }
    } catch (err) { console.error('fetchRawData error:', err); }
}

// 綜合更新介面
function updateDashboard(sensorId) {
    fetchRawData(sensorId);
    // 如果有圖表功能，這裡繼續呼叫 fetchChartData(sensorId)
}