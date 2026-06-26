// 全域變數
let currentSensorId = null;
let chartInstances = {}; // 儲存圖表實例

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化 DOM 元素監聽
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const sensorSelect = document.getElementById('sensor-select');
    
    if (menuToggle) menuToggle.addEventListener('click', () => sidebar.classList.add('active'));
    if (menuClose) menuClose.addEventListener('click', () => sidebar.classList.remove('active'));

    // 選單切換邏輯
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            document.querySelectorAll('.panel').forEach(panel => {
                panel.style.display = (panel.id === targetId) ? 'block' : 'none';
                panel.classList.remove('limit-view');
            });
            sidebar.classList.remove('active');
        });
    });

    // 感測器選擇邏輯
    if (sensorSelect) {
        sensorSelect.addEventListener('change', (e) => {
            currentSensorId = e.target.value;
            if (currentSensorId) {
                fetchChartData(currentSensorId);
                fetchRawData(currentSensorId);
            }
        });
    }

    // 初始載入
    fetchLatest();

    // 定時自動更新 (每 3 秒)
    setInterval(() => {
        fetchLatest();
        if (currentSensorId) {
            fetchRawData(currentSensorId);
            // 若想讓圖表自動更新，可在此呼叫 fetchChartData(currentSensorId);
        }
    }, 3000);
});

// A. 更新即時數值
async function fetchLatest() {
    const latestEl = document.getElementById('latest-values');
    if (!latestEl) return;
    try {
        const r = await fetch('/api/latest/');
        const j = await r.json();
        if (j.results) {
            latestEl.innerHTML = j.results.map(s => 
                `<div class="item"><strong>${s.name}</strong>: ${s.value} ${s.unit||''}</div>`
            ).join('');
        }
    } catch (err) { console.error('Error fetching latest:', err); }
}

// B. 更新折線圖
async function fetchChartData(sensorId) {
    try {
        const r = await fetch(`/api/history/?sensor_id=${sensorId}&limit=50`);
        const j = await r.json();
        if (!j.data) return;

        const container = document.getElementById('charts-container');
        container.innerHTML = '<canvas id="myChart"></canvas>';
        const ctx = document.getElementById('myChart').getContext('2d');

        // 銷毀舊圖表
        if (chartInstances['myChart']) chartInstances['myChart'].destroy();

        chartInstances['myChart'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: j.data.map(p => new Date(p.timestamp).toLocaleTimeString()),
                datasets: [{ label: '數值', data: j.data.map(p => p.value), borderColor: '#7c4dff' }]
            }
        });
    } catch (err) { console.error('Error fetching chart:', err); }
}

// C. 更新原始資料
async function fetchRawData(sensorId) {
    const tbody = document.querySelector('#raw-table tbody');
    if (!tbody) return;
    try {
        const r = await fetch(`/api/raw/?sensor_id=${sensorId}`);
        const j = await r.json();
        if (j.results) {
            tbody.innerHTML = j.results.map(row => `
                <tr>
                    <td>${row.id}</td>
                    <td>${row.topic}</td>
                    <td>${row.value}</td>
                    <td>${row.timestamp}</td>
                </tr>
            `).join('');
        }
    } catch (err) { console.error('Error fetching raw data:', err); }
}