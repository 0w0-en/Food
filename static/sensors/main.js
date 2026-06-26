// --- 全域變數 ---
let currentSensorId = null;
let myChart = null; // 用於儲存圖表實例，避免重複繪圖報錯

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');

    // 1. 漢堡選單控制
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
        sidebar.classList.add('active');
    });
    document.getElementById('menu-close')?.addEventListener('click', () => {
        sidebar.classList.remove('active');
    });

    // 2. [導航選單] 切換面板邏輯 (對應 HTML 的 #nav-menu)
    document.querySelectorAll('#nav-menu li').forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;

            // 隱藏所有面板，顯示目標面板
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.getElementById(targetId)?.classList.add('active');
            
            sidebar.classList.remove('active');
        });
    });

    // 3. [感測器選單] 切換資料邏輯 (對應 HTML 的 #sensor-menu)
    document.querySelectorAll('#sensor-menu li').forEach(item => {
        item.addEventListener('click', () => {
            currentSensorId = item.getAttribute('data-sensor-id');
            
            // 執行資料抓取
            if (currentSensorId) {
                fetchChartData(currentSensorId);
                fetchRawData(currentSensorId);
                
                // 自動跳轉到圖表頁面（假設它是你最常用的功能）
                document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
                document.getElementById('panel-chart')?.classList.add('active');
            }
            
            sidebar.classList.remove('active');
        });
    });

    // 4. 初始化與自動更新
    fetchLatest();
    // ⚠️ 警告：500ms (0.5秒) 對於後端 API 請求太頻繁了，建議改回 3000ms (3秒)
    setInterval(() => {
        fetchLatest();
        if (currentSensorId) {
            fetchChartData(currentSensorId);
            fetchRawData(currentSensorId);
        }
    }, 500); 
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

        // 1. 處理資料：解析 JSON 並取出 mod3_freq
        const processedData = j.data.map(item => {
            let valObj;
            try {
                // 如果 value 是字串，先轉成物件
                valObj = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
            } catch (e) {
                valObj = {};
            }
            
            return {
                timestamp: item.timestamp.substring(11, 16), // 保留 HH:mm
                // 若 mod3_freq 不存在，給予 0 或 null
                value: valObj.mod3_freq !== undefined ? valObj.mod3_freq : null 
            };
        });

        // 動態建立 Canvas
        container.innerHTML = '<canvas id="myChart"></canvas>';
        const ctx = document.getElementById('myChart').getContext('2d');

        if (myChart) myChart.destroy();

        // 2. 繪製新圖表 (只顯示 mod3_freq)
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: processedData.map(p => p.timestamp),
                datasets: [{ 
                    label: 'mod3_freq', 
                    data: processedData.map(p => p.value),
                    borderColor: '#7c4dff',
                    backgroundColor: 'rgba(124, 77, 255, 0.1)',
                    fill: true,
                    tension: 0.3 // 增加一點平滑曲線
                }]
            },
            options: { 
                responsive: true,
                scales: {
                    y: {
                        min: 0,    // 設定 Y 軸最小值
                        max: 140   // 設定 Y 軸最大值
                    }
                }
            }
        });
    } catch (err) { console.error('Fetch Chart Error:', err); }
}

// C. 更新原始資料表格
async function fetchRawData(sensorId) {
    if (!sensorId) return;
    const tbody = document.querySelector('#raw-table tbody');
    if (!tbody) return;
    try {
        // 1. 在 API 請求網址中加入 &limit=10，讓後端只回傳最新的 10 筆
        const res = await fetch(`/api/raw/?sensor_id=${sensorId}&limit=10`);
        const j = await res.json();
        
        if (j.results) {
            let rowsHtml = '';
            
            // 2. 使用 slice(0, 10) 作為第二層防護，確保前端最多只渲染 10 筆
            const dataToShow = j.results.slice(0, 2);
            
            dataToShow.forEach(r => {
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