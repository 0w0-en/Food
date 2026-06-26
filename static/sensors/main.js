const latestEl = document.getElementById('latest-values');
const sensorSelect = document.getElementById('sensor-select');
const rawTbody = document.querySelector('#raw-table tbody');


// 👈 核心新增：用來記錄目前網頁畫面上選中的感測器 ID
let currentSensorId = ''; 

async function fetchLatest(){
  try {
    const r = await fetch('/api/latest/');
    const j = await r.json();
    latestEl.innerHTML = '';
    if (j.error) {
      latestEl.innerHTML = `<div style="color: #ef4444; font-weight: 500;">資料庫錯誤: ${j.error}</div>`;
      return;
    }
    if (!j.results || j.results.length === 0) {
      latestEl.innerHTML = `<div style="color: #6b7280; font-weight: 500;">無感測器資料</div>`;
      return;
    }
    j.results.forEach(s =>{
      const d = document.createElement('div'); d.className='item';
      d.innerText = `${s.name}: ${s.value} ${s.unit||''}`;
      latestEl.appendChild(d);
    });
  } catch (err) {
    console.error('Error fetching latest values:', err);
    latestEl.innerHTML = `<div style="color: #ef4444; font-weight: 500;">無法連線至 API</div>`;
  }
}

async function fetchHistory(sensor_id){
  if(!sensor_id) return;
  try {
    const r = await fetch(`/api/history/?sensor_id=${sensor_id}&limit=200`);
    const j = await r.json();
    if (j.error) {
      console.error('Error fetching history:', j.error);
      return;
    }
    const labels = j.data.map(p => new Date(p.timestamp).toLocaleTimeString());
    const values = j.data.map(p => p.value);
    renderChart(labels, values);
    renderRaw(sensor_id);
  } catch (err) {
    console.error('Error fetching history:', err);
  }
}

async function renderRaw(sensor_id){
  try {
    const r = await fetch(`/api/raw/?sensor_id=${sensor_id}&per=25`);
    const j = await r.json();
    rawTbody.innerHTML = '';
    if (j.error) {
      rawTbody.innerHTML = `<tr><td colspan="3" style="color: #ef4444; text-align: center; font-weight: 500; padding: 15px;">資料庫錯誤: ${j.error}</td></tr>`;
      return;
    }
    if (!j.results || j.results.length === 0) {
      rawTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #6b7280; padding: 15px;">暫無資料</td></tr>`;
      return;
    }
    j.results.forEach(row =>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${row.id}</td><td>${row.value}</td><td>${new Date(row.timestamp).toLocaleString()}</td>`;
      rawTbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error rendering raw data:', err);
    rawTbody.innerHTML = `<tr><td colspan="3" style="color: #ef4444; text-align: center; font-weight: 500; padding: 15px;">無法連線至 API</td></tr>`;
  }
}



// 儲存所有圖表實例的物件，方便之後更新或銷毀
let chartInstances = {};

// 1. 負責建立與畫出單張圖表的 function
function renderSingleChart(containerEl, canvasId, labelName, labels, data) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.height = 200; // 設定圖表高度
    containerEl.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: labelName,
        data: data,
        borderColor: '#7c4dff',
        backgroundColor: 'rgba(124,77,255,0.08)',
        borderWidth: 2,
        tension: 0.2
      }]
    },
    options: {
    responsive: true,
    plugins: {
        title: {
            display: true,
            text: '感測器名稱：' + sensorName // 這裡顯示名稱
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            suggestedMax: 100, // 設定一個預設的最大值
            min: 0             // 設定最小值
        }
    }
}
  });
}

// 2. 負責跑迴圈抓取 3 個或全部 9 個感測器資料並塞進容器的 function
async function loadMultipleCharts(sensorIds, sensorNames) {
  const container = document.getElementById('charts-container');
  if (!container) return;
  
  // 如果沒有傳特定的 ID（代表是全部顯示狀態），就自動抓下拉選單前幾個項目
  if (!sensorIds || sensorIds.length === 0) {
    const options = Array.from(document.querySelectorAll('#sensor-select option')).filter(opt => opt.value !== "");
    
    // 如果折線圖面板目前有限制類別 (limit-view)，就只抓前 3 個；不然就抓全部 9 個
    const targetOptions = document.getElementById('panel-chart').classList.contains('limit-view') 
                          ? options.slice(0, 3) 
                          : options;

    sensorIds = targetOptions.map(opt => opt.value);
    sensorNames = targetOptions.map(opt => opt.innerText);
  }

  container.innerHTML = ''; // 清空舊畫布

  for (let i = 0; i < sensorIds.length; i++) {
    const id = sensorIds[i];
    const name = sensorNames[i];
    if (!id) continue;

    try {
      const r = await fetch(`/api/history/?sensor_id=${id}&limit=50`);
      const j = await r.json();
      if (j.error || !j.data) continue;

      const labels = j.data.map(p => new Date(p.timestamp).toLocaleTimeString());
      const values = j.data.map(p => p.value);

      const wrapper = document.createElement('div');
      wrapper.className = 'chart-wrapper';
      wrapper.innerHTML = `<h4 style="margin: 5px 0; color: #4c1d95; font-size: 13px;">📊 ${name}</h4>`;
      container.appendChild(wrapper);

      renderSingleChart(wrapper, `chart-${id}`, '數值', labels, values);
    } catch (err) {
      console.error(`無法載入感測器 ${name} 的圖表:`, err);
    }
  }
}

// 在 main.js 中
sensorSelect.addEventListener('change', (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
        // 呼叫更新圖表的函數 (你自己原本寫的)
        fetchChartData(selectedId); 
        
        // 呼叫剛剛新增的原始資料更新函數
        fetchRawData(selectedId); 
    }
});

// Initial fetch (初始化抓取)
fetchLatest();
fetchPiData();
loadMultipleCharts(); // 👈 換成這行，一進網頁自動秀 3 張圖

// Periodic fetch (定時自動更新)
setInterval(fetchLatest, 3000);

// 👈 換成這段定時器：如果沒有手動選單一感測器，每 6 秒在背景自動重抓並刷新多個圖表
setInterval(() => {
  if (!currentSensorId) {
    loadMultipleCharts();
  } else {
    // 如果有選單一，就單獨更新那一張
    const selectedName = sensorSelect.options[sensorSelect.selectedIndex].text;
    loadMultipleCharts([currentSensorId], [selectedName]);
    renderRaw(currentSensorId);
  }
}, 6000);


// ==========================================================================
// 側邊選單切換與面板單獨顯示控制邏輯
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const menuClose = document.getElementById('menu-close');
  const menuItems = document.querySelectorAll('.sidebar-menu li');
  const showAllBtn = document.getElementById('show-all-btn');
  const allPanels = document.querySelectorAll('.panels .panel');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
    });
  }

  if (menuClose) {
    menuClose.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      
      allPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.style.display = 'block'; 
          panel.classList.remove('limit-view'); 
        } else {
          panel.style.display = 'none';  
        }
      });
      
      sidebar.classList.remove('active'); 
    });
  });

  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      allPanels.forEach(panel => {
        panel.style.display = 'block';
        panel.classList.add('limit-view'); 
      });
      sidebar.classList.remove('active');
    });
  }
});

// 在 main.js 最下方加入
setInterval(fetchLatest, 3000); // 每 3 秒呼叫一次 fetchLatest

// 將此段程式碼放入 main.js 最下方
async function fetchRawData(sensorId) {
    if (!sensorId) return; // 如果沒選感測器就跳過
    try {
        const response = await fetch(`/api/raw/?sensor_id=${sensorId}`);
        const data = await response.json();
        const tbody = document.querySelector('#raw-table tbody');
        
        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        // 清空舊資料
        tbody.innerHTML = '';

        // 渲染新資料
        data.results.forEach(row => {
            const tr = document.createElement('tr');
            // 注意：這裡是對應 HTML 表格的四個欄位
            tr.innerHTML = `
                <td style="color: black;">${row.id}</td>
                <td style="color: black;">${row.topic}</td>
                <td style="color: black;">${row.value}</td>
                <td style="color: black;">${row.timestamp}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching raw data:', err);
    }
}