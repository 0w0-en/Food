const latestEl = document.getElementById('latest-values');
const sensorSelect = document.getElementById('sensor-select');
const rawTbody = document.querySelector('#raw-table tbody');
const piTbody = document.querySelector('#pi-table tbody');

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

async function fetchPiData(){
  if (!piTbody) return;
  try {
    const r = await fetch('/api/pi-data/');
    const j = await r.json();
    piTbody.innerHTML = '';
    
    if (j.error) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" style="color: #ef4444; text-align: center; font-weight: 500; padding: 15px;">${j.error}</td>`;
      piTbody.appendChild(tr);
      return;
    }
    
    if (!j.results || j.results.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" style="text-align: center; color: #6b7280; padding: 15px;">暫無資料</td>`;
      piTbody.appendChild(tr);
      return;
    }
    
    j.results.forEach(row => {
      const tr = document.createElement('tr');
      const timeStr = row.timestamp ? row.timestamp : 'N/A';
      tr.innerHTML = `<td>${row.id}</td><td>${row.value}</td><td>${timeStr}</td>`;
      piTbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error fetching Pi data:', err);
    piTbody.innerHTML = `<tr><td colspan="3" style="color: #ef4444; text-align: center; font-weight: 500; padding: 15px;">無法連線至 API</td></tr>`;
  }
}

let chart=null;
function renderChart(labels, data){
  const ctx = document.getElementById('chart').getContext('2d');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:'line',
    data:{labels:labels, datasets:[{label:'value',data:data, borderColor:'#7c4dff', backgroundColor:'rgba(124,77,255,0.08)'}]},
    options:{scales:{x:{display:true}, y:{display:true}}}
  });
}

sensorSelect.addEventListener('change', (e)=>{
  fetchHistory(e.target.value);
});

// Initial fetch
fetchLatest();
fetchPiData();

// Periodic fetch
setInterval(fetchLatest, 3000);
setInterval(fetchPiData, 5000);

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

  // 1. 點擊漢堡按鈕 ➔ 打開側邊欄
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
    });
  }

  // 2. 點擊 X 按鈕 ➔ 關閉側邊欄
  if (menuClose) {
    menuClose.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }

  // 3. 點擊選項 ➔ 隱藏其他區塊，且點中的區塊要顯示全部 9 個模組
menuItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetId = item.getAttribute('data-target');
    
    allPanels.forEach(panel => {
      if (panel.id === targetId) {
        panel.style.display = 'block'; 
        panel.classList.remove('limit-view'); // 👈 關鍵：單獨顯示時，移除限制，秀出 9 個！
      } else {
        panel.style.display = 'none';  
      }
    });
    
    sidebar.classList.remove('active'); 
  });
});

// 4. 點擊選單頂部的「📊 顯示全部」 ➔ 恢復四個全部秀出來，且每個只秀 3 個
if (showAllBtn) {
  showAllBtn.addEventListener('click', () => {
    allPanels.forEach(panel => {
      panel.style.display = 'block';
      panel.classList.add('limit-view'); // 👈 關鍵：全部顯示時，重新加上限制，只秀 3 個！
    });
    sidebar.classList.remove('active');
  });
}
});