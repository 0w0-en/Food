// 全域變數
let currentSensorId = null;
let myChart = null; // 用來存放 Chart.js 實例

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化設定：抓取第一個感測器作為預設值
    const firstSensor = document.querySelector('#sensor-menu li');
    if (firstSensor) {
        currentSensorId = firstSensor.getAttribute('data-sensor-id');
        firstSensor.classList.add('selected'); // 給予高亮
    }

    // 2. 漢堡選單邏輯
    const sidebar = document.getElementById('sidebar');
    document.getElementById('menu-toggle')?.addEventListener('click', () => sidebar.classList.add('active'));
    document.getElementById('menu-close')?.addEventListener('click', () => sidebar.classList.remove('active'));

    // 3. 導航選單 (Nav-Menu) -> 平滑捲動
    document.querySelectorAll('#nav-menu li').forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
            sidebar.classList.remove('active');
        });
    });

    // 4. 感測器選單 (Sensor-Menu) -> 更新資料 + 高亮
    document.querySelectorAll('#sensor-menu li').forEach(item => {
        item.addEventListener('click', () => {
            // UI 更新
            document.querySelectorAll('#sensor-menu li').forEach(li => li.classList.remove('selected'));
            item.classList.add('selected');
            
            // 資料更新
            currentSensorId = item.getAttribute('data-sensor-id');
            fetchChartData(currentSensorId);
            fetchRawData(currentSensorId);
            
            // 互動反饋
            document.getElementById('panel-chart')?.scrollIntoView({ behavior: 'smooth' });
            sidebar.classList.remove('active');
        });
    });

    // 5. 立即執行：初始化所有資料
    fetchAllData();

    // 6. 背景自動更新 (每 3 秒)
    setInterval(fetchAllData, 3000);
});

// --- 功能函數 ---

async function fetchAllData() {
    fetchLatest(); // 總是更新即時數值
    if (currentSensorId) {
        fetchChartData(currentSensorId);
        fetchRawData(currentSensorId);
    }
}

async function fetchLatest() {
    const container = document.getElementById('latest-values');
    if(!container) return;
    try {
        const res = await fetch('/api/latest/');
        const data = await res.json();
        container.innerHTML = data.results.map(s => `
            <div class="item"><strong>${s.name}</strong>: ${s.value}</div>
        `).join('');
    } catch (e) { console.error("Latest fetch error", e); }
}

async function fetchChartData(sensorId) {
    try {
        const res = await fetch(`/api/chart/?sensor_id=${sensorId}`);
        const data = await res.json();
        // 這裡請確保你的圖表初始化邏輯正確，如果 myChart 不存在需建立
        if (myChart) {
            myChart.data.labels = data.labels;
            myChart.data.datasets[0].data = data.values;
            myChart.update();
        }
    } catch (e) { console.error("Chart fetch error", e); }
}

async function fetchRawData(sensorId) {
    const container = document.querySelector('#raw-table tbody');
    if (!container) return;
    try {
        const res = await fetch(`/api/raw/?sensor_id=${sensorId}`);
        const j = await res.json();
        
        // 分組邏輯
        const groups = {};
        j.results.forEach(item => {
            if (!groups[item.topic]) groups[item.topic] = [];
            if (groups[item.topic].length < 5) groups[item.topic].push(item);
        });

        // 渲染
        container.innerHTML = Object.entries(groups).map(([topic, items]) => `
            <tr><td colspan="4" style="background:#f0f0f0; font-weight:bold;">Topic: ${topic}</td></tr>
            ${items.map(i => `<tr><td>${i.id}</td><td>${topic}</td><td>${i.value}</td><td>${i.timestamp.slice(11,16)}</td></tr>`).join('')}
        `).join('');
    } catch (e) { console.error("Raw data fetch error", e); }
}