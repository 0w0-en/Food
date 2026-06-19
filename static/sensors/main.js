const latestEl = document.getElementById('latest-values');
const sensorSelect = document.getElementById('sensor-select');
const rawTbody = document.querySelector('#raw-table tbody');

async function fetchLatest(){
  const r = await fetch('/api/latest/');
  const j = await r.json();
  latestEl.innerHTML = '';
  j.results.forEach(s =>{
    const d = document.createElement('div'); d.className='item';
    d.innerText = `${s.name}: ${s.value} ${s.unit||''}`;
    latestEl.appendChild(d);
  })
}

async function fetchHistory(sensor_id){
  if(!sensor_id) return;
  const r = await fetch(`/api/history/?sensor_id=${sensor_id}&limit=200`);
  const j = await r.json();
  const labels = j.data.map(p => new Date(p.timestamp).toLocaleTimeString());
  const values = j.data.map(p => p.value);
  renderChart(labels, values);
  renderRaw(sensor_id);
}

async function renderRaw(sensor_id){
  const r = await fetch(`/api/raw/?sensor_id=${sensor_id}&per=25`);
  const j = await r.json();
  rawTbody.innerHTML = '';
  j.results.forEach(row =>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.id}</td><td>${row.value}</td><td>${new Date(row.timestamp).toLocaleString()}</td>`;
    rawTbody.appendChild(tr);
  })
}

let chart=null;
function renderChart(labels, data){
  const ctx = document.getElementById('chart').getContext('2d');
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type:'line',
    data:{labels:labels, datasets:[{label:'value',data:data, borderColor:'#7c4dff', backgroundColor:'rgba(124,77,255,0.08)'}]},
    options:{scales:{x:{display:true}, y:{display:true}}}
  })
}

sensorSelect.addEventListener('change', (e)=>{
  fetchHistory(e.target.value);
});

fetchLatest();
setInterval(fetchLatest, 3000);
