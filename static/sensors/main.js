// --- 全域變數 ---
let currentSensorId = null;
let myChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化設定：設定下拉選單監聽
    const sensorSelect = document.getElementById('sensor-select');
    
    // 如果有選單，監聽變化
    if (sensorSelect) {
        sensorSelect.addEventListener('change', (e) => {
            currentSensorId = e.target.value;
            if (currentSensorId) {
                fetchChartData(currentSensorId);
                fetchRawData(currentSensorId);
            }
        });
        
        // 如果選單有預設值，初始化時直接抓取
        if (sensorSelect.value) {
            currentSensorId = sensorSelect.value;
        }
    }

    // 2. 初始化抓取資料
    fetchLatest();
    if (currentSensorId) {
        fetchChartData(currentSensorId);
        fetchRawData(currentSensorId);
    }

    // 3. 背景持續更新 (每 3 秒)
    setInterval(() => {
        fetchLatest(); 
        if (currentSensorId) {
            fetchChartData(currentSensorId);
            fetchRawData(currentSensorId);
        }
    }, 500); 
});

// --- 功能函式 (保持不動) ---

async function fetchLatest() {
    const latestEl = document.getElementById('latest-values');
    if (!latestEl) return;
    try {
        const res = await fetch('/api/latest/');
        const data = await res.json();
        
        if (data.results) {
            latestEl.innerHTML = ''; // 清空舊資料
            data.results.forEach(s => {
                let parsedValue;
                try {
                    // 嘗試解析字串為物件
                    parsedValue = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
                } catch(e) { parsedValue = s.value; }

                // 如果是物件，展開顯示；如果不是，直接顯示
                if (parsedValue !== null && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
                    Object.entries(parsedValue).forEach(([k, v]) => {
                        latestEl.innerHTML += `<div class="item"><strong>${k}</strong>: ${JSON.stringify(v)}</div>`;
                    });
                } else {
                    latestEl.innerHTML += `<div class="item"><strong>${s.name}</strong>: ${parsedValue}</div>`;
                }
            });
        }
    } catch (err) { console.error('Fetch Latest Error:', err); }
}

async function fetchChartData(sensorId) {
    if (!sensorId) return;
    try {
        const res = await fetch(`/api/history/?sensor_id=${sensorId}&limit=50`);
        const j = await res.json();
        if (!j.data || j.data.length === 0) return;

        const labels = j.data.map(item => item.timestamp.substring(11, 16));
        const values = j.data.map(item => {
            try {
                const valObj = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
                return valObj.mod3_freq !== undefined ? valObj.mod3_freq : 0;
            } catch { return 0; }
        });

        if (myChart) {
            myChart.data.labels = labels;
            myChart.data.datasets[0].data = values;
            myChart.update('none');
        } else {
            const ctx = document.getElementById('sensorChart').getContext('2d');
            myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{ label: 'mod3_freq', data: values, borderColor: '#7c4dff', fill: true }]
                },
                options: { responsive: true, scales: { y: { min: 0, max: 140 } } }
            });
        }
    } catch (err) { console.error('Fetch Chart Error:', err); }
}

async function fetchRawData(sensorId) {
    if (!sensorId) return;
    const tbody = document.querySelector('#raw-table tbody');
    if (!tbody) return;
    try {
        // API 呼叫時 limit=2，讓後端直接只給 2 筆
        const res = await fetch(`/api/raw/?sensor_id=${sensorId}&limit=2`);
        const j = await res.json();
        
        if (j.results) {
            let rowsHtml = '';
            
            // 使用 slice(0, 2) 確保前端處理的絕對是前 2 筆
            j.results.slice(0, 2).forEach(r => {
                let valObj;
                try {
                    valObj = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
                } catch (e) { valObj = r.value; }

                // 處理 JSON 物件拆解
                if (valObj !== null && typeof valObj === 'object' && !Array.isArray(valObj)) {
                    Object.entries(valObj).forEach(([key, val]) => {
                        rowsHtml += `
                            <tr>
                                <td>${r.id}</td>
                                <td>${key}</td>
                                <td>${Array.isArray(val) ? JSON.stringify(val) : val}</td>
                                <td>${r.timestamp}</td>
                            </tr>`;
                    });
                } else {
                    rowsHtml += `
                        <tr>
                            <td>${r.id}</td>
                            <td>${r.topic || 'N/A'}</td>
                            <td>${valObj}</td>
                            <td>${r.timestamp}</td>
                        </tr>`;
                }
            });
            tbody.innerHTML = rowsHtml;
        }
    } catch (err) { console.error('Fetch Raw Data Error:', err); }
}