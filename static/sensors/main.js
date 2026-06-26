// --- 全域變數 ---
let currentSensorId = null;
let myChart = null; // 用於儲存圖表實例，避免重複繪圖報錯

document.addEventListener('DOMContentLoaded', () => {
    // 1. 側邊選單邏輯
    const sidebar = document.getElementById('sidebar');
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
        sidebar.classList.add('active');
    });
    document.getElementById('menu-close')?.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });

    // 2. 移除所有面板的 'limit-view' 限制，確保一開始就顯示
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('limit-view'));

    // 3. 感測器選擇邏輯
    const sensorSelect = document.getElementById('sensor-select');
    if (sensorSelect) {
        sensorSelect.addEventListener('change', (e) => {
            currentSensorId = e.target.value;
            if (currentSensorId) {
                fetchChartData(currentSensorId);
                fetchRawData(currentSensorId);
            }
        });
    }

    // 4. 初始載入
    fetchLatest();

    // 5. 定時自動更新 (每 3 秒)
    setInterval(() => {
        fetchLatest();
        if (currentSensorId) {
            fetchChartData(currentSensorId);
            fetchRawData(currentSensorId);
        }
    }, 3000);
});

// --- 功能函式 ---

// A. 更新即時數值
async function fetchLatest() {
    const latestEl = document.getElementById('latest-values');
    if (!latestEl) return;
    try {
        const res = await fetch('/api/latest/');
        const data = await res.json();
        
        if (data.results) {
            // 清空目前的內容
            latestEl.innerHTML = '';
            
            data.results.forEach(s => {
                // 嘗試解析值 (假設 s.value 是 JSON 字串)
                let parsedValue;
                try {
                    parsedValue = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
                } catch (e) {
                    parsedValue = s.value;
                }

                // 檢查是否為物件，若是則逐行拆解，否則直接顯示
                if (parsedValue && typeof parsedValue === 'object') {
                    Object.entries(parsedValue).forEach(([key, val]) => {
                        const div = document.createElement('div');
                        div.className = 'item';
                        // 這裡定義你想呈現的格式
                        div.innerHTML = `<strong>"${key}"</strong>: ${JSON.stringify(val)}`;
                        latestEl.appendChild(div);
                    });
                } else {
                    const div = document.createElement('div');
                    div.className = 'item';
                    div.innerHTML = `<strong>${s.name}</strong>: ${parsedValue}`;
                    latestEl.appendChild(div);
                }
            });
        }
    } catch (err) { console.error('Fetch Latest Error:', err); }
}

// B. 更新折線圖
async function fetchChartData(sensorId) {
    if (!sensorId) return;
    try {
        const res = await fetch(`/api/history/?sensor_id=${sensorId}&limit=50`);
        const j = await res.json();
        const container = document.getElementById('charts-container');
        
        if (!j.data || j.data.length === 0) return;

        // 動態建立 Canvas
        container.innerHTML = '<canvas id="myChart"></canvas>';
        const ctx = document.getElementById('myChart').getContext('2d');

        // 銷毀舊圖表 (防止重疊與記憶體洩漏)
        if (myChart) myChart.destroy();

        // 繪製新圖表
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: j.data.map(p => p.timestamp.substring(11, 16)), // 只取 HH:mm
                datasets: [{ 
                    label: '數值變化', 
                    data: j.data.map(p => p.value), 
                    borderColor: '#7c4dff',
                    backgroundColor: 'rgba(124, 77, 255, 0.1)',
                    fill: true
                }]
            },
            options: { responsive: true }
        });
    } catch (err) { console.error('Fetch Chart Error:', err); }
}

// C. 更新原始資料表格
async function fetchRawData(sensorId) {
    if (!sensorId) return;
    const tbody = document.querySelector('#raw-table tbody');
    if (!tbody) return;
    try {
        const res = await fetch(`/api/raw/?sensor_id=${sensorId}`);
        const j = await res.json();
        
        if (j.results) {
            let rowsHtml = '';
            
            j.results.forEach(r => {
                // 嘗試解析 JSON 字串
                let valObj;
                try {
                    valObj = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
                } catch (e) {
                    valObj = r.value;
                }

                // 如果是物件格式，則拆解成多行；若不是，則顯示原始值
                if (valObj && typeof valObj === 'object' && !Array.isArray(valObj)) {
                    Object.entries(valObj).forEach(([key, val]) => {
                        rowsHtml += `
                            <tr>
                                <td>${r.id}</td>
                                <td>${key}</td>
                                <td>${JSON.stringify(val).replace(/"/g, '')}</td>
                                <td>${r.timestamp}</td>
                            </tr>`;
                    });
                } else {
                    // 非 JSON 格式的備用顯示
                    rowsHtml += `
                        <tr>
                            <td>${r.id}</td>
                            <td>${r.topic}</td>
                            <td>${valObj}</td>
                            <td>${r.timestamp}</td>
                        </tr>`;
                }
            });
            tbody.innerHTML = rowsHtml;
        }
    } catch (err) { console.error('Fetch Raw Data Error:', err); }
}