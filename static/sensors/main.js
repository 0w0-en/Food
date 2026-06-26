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
    }, 3000); 
});

// --- 功能函式 (保持不動) ---

async function fetchLatest() {
    const latestEl = document.getElementById('latest-values');
    if (!latestEl) return;
    try {
        const res = await fetch('/api/latest/');
        const data = await res.json();
        if (data.results) {
            latestEl.innerHTML = data.results.map(s => `
                <div class="item"><strong>${s.name}</strong>: ${s.value}</div>
            `).join('');
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
        const res = await fetch(`/api/raw/?sensor_id=${sensorId}&limit=10`);
        const j = await res.json();
        if (j.results) {
            tbody.innerHTML = j.results.map(r => `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.topic}</td>
                    <td>${r.value}</td>
                    <td>${r.timestamp}</td>
                </tr>
            `).join('');
        }
    } catch (err) { console.error('Fetch Raw Data Error:', err); }
}