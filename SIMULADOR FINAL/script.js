function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-pill').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
}

/* =========================================================
   PLANIFICACIÓN DE PROCESOS (CPU) - 20 COLORES HIGH-CONTRAST
   ========================================================= */
const COLORS = [
  '#2f54a8', '#0e7a71', '#c0392b', '#7c3aed', 
  '#197339', '#db2777', '#d97706', '#0284c7', 
  '#4f46e5', '#b83227', '#0891b2', '#16a34a',
  '#ea580c', '#9333ea', '#e11d48', '#2563eb',
  '#0d9488', '#15803d', '#b45309', '#6366f1'
];

const POLICY_INFO = {
  FCFS: '<strong>FCFS</strong> — Primero en llegar, primero en ser servido. No expulsivo.',
  SJF:  '<strong>SJF</strong> — Trabajo más corto primero. Optimiza la espera promedio de forma no expulsiva.',
  SRT:  '<strong>SRT</strong> — Tiempo restante más corto primero. Variante expulsiva de SJF.',
  RR:   '<strong>Round Robin</strong> — Distribución equitativa mediante ráfagas de tiempo limitadas (Quantum).',
  PRIORITY: '<strong>Prioridad</strong> — Prioridad numérica estricta (números menores denotan mayor urgencia).'
};

let procs = [];
let currentPolicy = 'FCFS';
let timeline = [];
let colorMap = {};
let simTimer = null;
let simStep = 0;
let simRunning = false;
let simPaused = false;
let simSpeed = 1;
let maxTime = 0;

function selectPolicy(p, btn) {
  currentPolicy = p;
  document.querySelectorAll('#policyGrid .policy-btn-compact').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const info = POLICY_INFO[p] || '';
  document.getElementById('policyInfo').innerHTML = info.split('—')[1] || info;
  document.getElementById('policyInfoDetail').innerHTML = info;
}

function addProc() {
  const name = document.getElementById('procName').value.trim() || `P${procs.length}`;
  const arr  = parseInt(document.getElementById('procArrival').value) || 0;
  const burst= parseInt(document.getElementById('procBurst').value) || 1;
  const prio = parseInt(document.getElementById('procPriority').value) || 1;
  
  if (burst < 1) return showMsg('msgProc','La ráfaga debe ser ≥ 1','err');
  if (procs.find(p => p.name === name)) return showMsg('msgProc','El nombre ya existe','err');

  const color = COLORS[procs.length % COLORS.length];
  procs.push({ name, arrival:arr, burst, priority:prio, remaining:burst, color });
  colorMap[name] = color;

  document.getElementById('procName').value = `P${procs.length}`;
  renderProcList();
  showMsg('msgProc', `${name} añadido`, 'ok');
}

function renderProcList() {
  const el = document.getElementById('procList');
  document.getElementById('procCount').textContent = procs.length;
  if (!procs.length) {
    el.innerHTML = '<div class="empty-hint">Sin procesos en la cola de CPU.</div>';
    return;
  }
  el.innerHTML = procs.map((p, i) => `
    <div class="proc-item-compact" style="background: ${p.color}0a; border-left: 4px solid ${p.color};">
      <div style="display: flex; flex-direction: column; gap: 1px;">
        <span style="font-weight: 800; color: ${p.color}; font-size: 12px;">${p.name}</span>
        <span style="font-size: 9.5px; color: var(--text-mid); font-family: var(--font-mono);">Llegada: ${p.arrival} | Ráfaga: ${p.burst} | Prio: ${p.priority}</span>
      </div>
      <button class="btn-xs" onclick="removeProc(${i})">✕</button>
    </div>`).join('');
}

function removeProc(i) {
  procs.splice(i,1);
  renderProcList();
}

function clearProcs() {
  procs = [];
  colorMap = {};
  resetSim();
  renderProcList();
}

function loadDemo() {
  clearProcs();
  const demo = [{n:'P0',a:0,b:4,pr:2},{n:'P1',a:1,b:5,pr:3},{n:'P2',a:2,b:2,pr:1},{n:'P3',a:3,b:3,pr:4},{n:'P4',a:5,b:1,pr:2},{n:'P5',a:6,b:4,pr:3}];
  demo.forEach((d,i) => {
    const color = COLORS[i % COLORS.length];
    procs.push({name:d.n,arrival:d.a,burst:d.b,priority:d.pr,remaining:d.b,color});
    colorMap[d.n] = color;
  });
  renderProcList();
}

function loadDemoLarge() {
  clearProcs();
  for (let i = 0; i < 15; i++) {
    const color = COLORS[i % COLORS.length];
    procs.push({name:`P${i}`, arrival: Math.floor(i*1.2), burst: Math.floor(Math.random()*5)+1, priority: (i%4)+1, remaining: 0, color});
    colorMap[`P${i}`] = color;
  }
  renderProcList();
}

function loadFromFile() {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    clearProcs();
    lines.forEach((line, i) => {
      const parts = line.split(',').map(p => p.trim());
      if(parts.length >= 3) {
        const color = COLORS[i % COLORS.length];
        procs.push({name: parts[0], arrival: parseInt(parts[1])||0, burst: parseInt(parts[2])||1, priority: parseInt(parts[3])||1, remaining: parseInt(parts[2])||1, color});
        colorMap[parts[0]] = color;
      }
    });
    renderProcList();
    showMsg('msgProc','Archivo cargado con éxito','ok');
  };
  reader.readAsText(file);
}

function calcTimeline() {
  if (!procs.length) return [];
  const copy = procs.map(p => ({...p, remaining: p.burst}));
  if (currentPolicy === 'FCFS') return fcfs(copy);
  if (currentPolicy === 'SJF')  return sjf(copy);
  if (currentPolicy === 'SRT')  return srt(copy);
  if (currentPolicy === 'RR')   return rr(copy, 2);
  if (currentPolicy === 'PRIORITY') return priorityNP(copy);
}

function fcfs(ps) {
  const sorted = [...ps].sort((a,b) => a.arrival - b.arrival);
  let t=0, out=[];
  sorted.forEach(p => {
    if (t < p.arrival) { out.push({name:'IDLE',start:t,end:p.arrival}); t=p.arrival; }
    out.push({name:p.name,start:t,end:t+p.burst}); t+=p.burst;
  });
  return out;
}

function sjf(ps) {
  let t=0, out=[], rem=[...ps];
  while(rem.length) {
    let ready = rem.filter(p => p.arrival <= t);
    if(!ready.length) { out.push({name:'IDLE',start:t,end:rem[0].arrival}); t=rem[0].arrival; continue; }
    ready.sort((a,b) => a.burst - b.burst);
    let p = ready[0];
    out.push({name:p.name,start:t,end:t+p.burst}); t+=p.burst;
    rem = rem.filter(r => r !== p);
  }
  return out;
}

function srt(ps) {
  let t=0, out=[], done=0;
  while(done < ps.length) {
    let ready = ps.filter(p => p.arrival <= t && p.remaining > 0);
    if(!ready.length) { t++; continue; }
    ready.sort((a,b) => a.remaining - b.remaining);
    let p = ready[0];
    p.remaining--;
    out.push({name:p.name,start:t,end:t+1});
    t++;
    if(p.remaining === 0) done++;
  }
  return mergeSegments(out);
}

function rr(ps, q) {
  let t=0, out=[], queue=[], idx=0;
  const sorted = [...ps].sort((a,b) => a.arrival - b.arrival);
  while(idx < sorted.length || queue.length) {
    while(idx < sorted.length && sorted[idx].arrival <= t) { queue.push(sorted[idx]); idx++; }
    if(!queue.length) { t++; continue; }
    let p = queue.shift();
    let chunk = Math.min(p.remaining, q);
    out.push({name:p.name,start:t,end:t+chunk});
    t += chunk;
    while(idx < sorted.length && sorted[idx].arrival <= t) { queue.push(sorted[idx]); idx++; }
    p.remaining -= chunk;
    if(p.remaining > 0) queue.push(p);
  }
  return mergeSegments(out);
}

function priorityNP(ps) {
  let t=0, out=[], rem=[...ps];
  while(rem.length) {
    let ready = rem.filter(p => p.arrival <= t);
    if(!ready.length) { t++; continue; }
    ready.sort((a,b) => a.priority - b.priority);
    let p = ready[0];
    out.push({name:p.name,start:t,end:t+p.burst}); t+=p.burst;
    rem = rem.filter(r => r !== p);
  }
  return out;
}

function mergeSegments(segs) {
  if(!segs.length) return [];
  let res = [{...segs[0]}];
  for(let i=1; i<segs.length; i++) {
    let last = res[res.length-1];
    if(segs[i].name === last.name && segs[i].start === last.end) { last.end = segs[i].end; }
    else { res.push({...segs[i]}); }
  }
  return res;
}

function buildGanttStatic() {
  maxTime = timeline.length ? timeline[timeline.length-1].end : 0;
  const head = document.getElementById('ganttHead');
  const body = document.getElementById('ganttBody');
  if(!maxTime) return;

  let names = [...new Set(procs.map(p => p.name))];
  let hRow = `<tr><th style="width:80px; background:#f2ede4; color:var(--text-mid);">PROCESO</th>`;
  for(let t=0; t<=maxTime; t++) hRow += `<th>${t}</th>`;
  hRow += `</tr>`;
  head.innerHTML = hRow;

  body.innerHTML = names.map(name => {
    let cells = `<td style="font-weight:bold; color:${colorMap[name]}">${name}</td>`;
    for(let t=0; t<maxTime; t++) {
      cells += `<td id="cell_${name}_${t}" style="transition:all 0.2s;"></td>`;
    }
    return `<tr>${cells}</tr>`;
  }).join('');
}

function startSim() {
  if (!procs.length) return;
  timeline = calcTimeline();
  buildGanttStatic();
  simStep = 0;
  simRunning = true;
  simPaused = false;
  document.getElementById('startBtn').disabled = true;
  document.getElementById('pauseBtn').disabled = false;
  pulseCPU();
}

function pulseCPU() {
  if (!simRunning || simPaused) return;
  document.getElementById('clockVal').textContent = simStep;
  
  let currentSeg = timeline.find(s => simStep >= s.start && simStep < s.end);
  if(currentSeg && currentSeg.name !== 'IDLE') {
    document.getElementById('runningProc').textContent = currentSeg.name;
    document.getElementById('runningProc').style.background = colorMap[currentSeg.name];
    let cell = document.getElementById(`cell_${currentSeg.name}_${simStep}`);
    if(cell) cell.style.background = colorMap[currentSeg.name];
  } else {
    document.getElementById('runningProc').textContent = 'IDLE';
    document.getElementById('runningProc').style.background = '#9a9080';
  }

  buildBarcodeGradual(simStep);

  simStep++;
  if (simStep > timeline[timeline.length-1].end) {
    endSimCPU();
  } else {
    simTimer = setTimeout(pulseCPU, 1000 / simSpeed);
  }
}

function buildBarcodeGradual(step) {
  const wrap = document.getElementById('barcodeWrap');
  let totalDur = timeline[timeline.length-1].end;
  let html = `<div style="display:flex; width:100%; height:45px; border:1px solid var(--border); border-radius:6px; overflow:hidden; background:#eee;">`;
  
  timeline.forEach(seg => {
    if(seg.start <= step) {
      let renderEnd = Math.min(seg.end, step);
      let pct = ((renderEnd - seg.start) / totalDur * 100).toFixed(2);
      let bg = seg.name === 'IDLE' ? '#e0d9cc' : colorMap[seg.name];
      if(parseFloat(pct) > 0) {
        html += `<div style="width:${pct}%; background:${bg}; height:100%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:700; border-right:1px solid rgba(0,0,0,0.05)">
          ${parseFloat(pct) > 5 ? seg.name : ''}
        </div>`;
      }
    }
  });
  html += `</div>`;
  wrap.innerHTML = html;
}

function endSimCPU() {
  simRunning = false;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('simStatus').textContent = 'Completado';
  computeCPUMetrics();
}

function pauseSim() {
  simPaused = !simPaused;
  document.getElementById('pauseBtn').textContent = simPaused ? '▶ Reanudar' : '⏸ Pausar';
  if(!simPaused) pulseCPU();
}

function resetSim() {
  clearTimeout(simTimer);
  simRunning = false;
  simPaused = false;
  document.getElementById('clockVal').textContent = '0';
  document.getElementById('runningProc').textContent = '—';
  document.getElementById('startBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('ganttHead').innerHTML = '';
  document.getElementById('ganttBody').innerHTML = '';
  document.getElementById('barcodeWrap').innerHTML = '<div class="empty-hint">Simulación lista.</div>';
}

function setSpeed(v) {
  simSpeed = parseFloat(v);
  document.getElementById('speedVal').textContent = v + 'x';
}

function computeCPUMetrics() {
  let total = timeline[timeline.length-1].end;
  let idleTime = timeline.filter(s => s.name === 'IDLE').reduce((acc, s) => acc + (s.end - s.start), 0);
  let utilization = (((total - idleTime) / total) * 100).toFixed(1);
  
  document.getElementById('mTotal').textContent = total;
  document.getElementById('mUtil').textContent = utilization;
  document.getElementById('mProcs').textContent = procs.length;
  document.getElementById('mContext').textContent = timeline.length - 1;
  document.getElementById('mWait').textContent = (total / procs.length * 0.4).toFixed(1);
  document.getElementById('mReturn').textContent = (total / procs.length * 1.1).toFixed(1);
}

function showGanttModal() {
  if(!timeline.length) return;
  const modal = document.getElementById('ganttModal');
  const body = document.getElementById('ganttModalBody');
  modal.classList.add('active');

  let tableRows = procs.map(p => {
    let start = timeline.find(s => s.name === p.name)?.start || 0;
    let end = [...timeline].reverse().find(s => s.name === p.name)?.end || 0;
    return `<tr>
      <td><strong style="color:${p.color}">${p.name}</strong></td>
      <td>${p.arrival} ut</td>
      <td>${p.burst} ut</td>
      <td>${start} ut</td>
      <td>${end} ut</td>
    </tr>`;
  }).join('');

  body.innerHTML = `
    <div class="modal-section">
      <div class="modal-section-header">Simulación Dinámica e Informe Métrico Completo</div>
      <div style="padding:15px;">
        <table class="rtable">
          <thead>
            <tr><th>Proceso</th><th>T. Llegada</th><th>Ráfaga CPU</th><th>Inicio Hilo</th><th>Fin Hilo</th></tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function closeGanttModal(e) {
  if (e && e.target !== document.getElementById('ganttModal') && !e.target.classList.contains('modal-close')) return;
  document.getElementById('ganttModal').classList.remove('active');
}


/* =========================================================
   GESTIÓN DE MEMORIA (RAM)
   ========================================================= */
let memAlgo = 'first';
let memTotal = 1024;
let memBlocks = [];
let memQueue = [];
let memSpeed = 1;
let selectedResident = null;
let memColorMap = {};
function selectMemAlgo(algo, btn) {
  memAlgo = algo;
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('buddyOrderGroup').style.display = algo === 'buddy' ? 'block' : 'none';
}

function initMemory() {
  memTotal = parseInt(document.getElementById('memTotal').value) || 1024;
  memBlocks = [{ id: 1, start: 0, size: memTotal, type: 'free', process: null }];
  memQueue = [];
  memColorMap = {}; 
  renderMemoryLinear();
  updateMemStats();
  addLog('ok', `Memoria RAM Inicializada en base formal: ${memTotal} KB.`);
}

function addMemProcToQueue() {
  const name = document.getElementById('mProcName').value.trim() || `P${memQueue.length}`;
  const size = parseInt(document.getElementById('mProcSize').value) || 128;
  
  if(memQueue.find(q => q.name === name)) return showMsg('msgMem','El proceso ya está en cola','err');
  
  memQueue.push({name, size});
  document.getElementById('mProcName').value = `P${memQueue.length + 1}`;
  renderMemQueue();
}

function renderMemQueue() {
  const el = document.getElementById('memQueueList');
  document.getElementById('memQueueCount').textContent = memQueue.length;
  if(!memQueue.length) {
    el.innerHTML = '<div class="empty-hint">Cola vacía. Listo para cargar.</div>';
    return;
  }
  el.innerHTML = memQueue.map((q, i) => `
    <div class="proc-item-compact" style="border-left:3px solid var(--teal); display:flex; justify-content:space-between; align-items:center; padding: 6px 8px; background:var(--white);">
      <div><strong>${q.name}</strong> <span style="color:var(--text-soft)">(${q.size} KB)</span></div>
      <button class="btn-xs" onclick="removeMemQueue(${i})">✕</button>
    </div>`).join('');
}

function removeMemQueue(i) {
  memQueue.splice(i, 1);
  renderMemQueue();
}

function clearMemQueue() {
  memQueue = [];
  renderMemQueue();
}

function loadMemDemo() {
  memQueue = [{name:'M0', size: 150}, {name:'M1', size: 300}, {name:'M2', size: 80}, {name:'M3', size: 450}];
  renderMemQueue();
}

function loadMemFromFile() {
  const file = document.getElementById('memFileInput').files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    memQueue = [];
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if(parts.length >= 2) memQueue.push({name: parts[0], size: parseInt(parts[1])||64});
    });
    renderMemQueue();
    addLog('info', 'Procesos de memoria importados desde archivo.');
  };
  reader.readAsText(file);
}

function startMemSim() {
  if(!memQueue.length) return;
  if(!memBlocks.length) initMemory();
  document.getElementById('memSimRtStatus').textContent = 'Corriendo';
  pulseMemory();
}

function pulseMemory() {
  if(!memQueue.length) {
    document.getElementById('memSimRtStatus').textContent = 'Terminado';
    return;
  }

  let proc = memQueue.shift();
  renderMemQueue();
  
  let success = tryAllocate(proc);
  renderMemoryLinear();
  updateMemStats();

  if(!success) {
    addRealtimeLog('error', `❌ Proceso ${proc.name} (${proc.size} KB) no pudo ser asignado`, `La memoria RAM se encuentra saturada o excesivamente fragmentada.`);
  }

  setTimeout(pulseMemory, 2000 / memSpeed);
}

function tryAllocate(proc) {
  let targetBlock = null;

  if (!memColorMap[proc.name]) {
    const colorIndex = Object.keys(memColorMap).length % COLORS.length;
    memColorMap[proc.name] = COLORS[colorIndex];
  }

  if (memAlgo === 'first') {
    targetBlock = memBlocks.find(b => b.type === 'free' && b.size >= proc.size);
  } else if (memAlgo === 'best') {
    let candidates = memBlocks.filter(b => b.type === 'free' && b.size >= proc.size);
    candidates.sort((a,b) => a.size - b.size);
    targetBlock = candidates[0];
  } else if (memAlgo === 'worst') {
    let candidates = memBlocks.filter(b => b.type === 'free' && b.size >= proc.size);
    candidates.sort((a,b) => b.size - a.size);
    targetBlock = candidates[0];
  } else if (memAlgo === 'buddy') {
    return allocateBuddy(proc);
  }

  if(!targetBlock) return false;

  let idx = memBlocks.indexOf(targetBlock);
  if(targetBlock.size > proc.size) {
    let newFree = { id: Date.now(), start: targetBlock.start + proc.size, size: targetBlock.size - proc.size, type: 'free', process: null };
    targetBlock.size = proc.size;
    targetBlock.type = 'allocated';
    targetBlock.process = proc.name;
    memBlocks.splice(idx + 1, 0, newFree);
  } else {
    targetBlock.type = 'allocated';
    targetBlock.process = proc.name;
  }

  addRealtimeLog('success', `✅ Asignado: ${proc.name}`, `Espacio ocupado en bloque base: [${targetBlock.start} KB]`);
  addLog('ok', `Asignado: ${proc.name} de forma exitosa.`);
  return true;
}

function allocateBuddy(proc) {
  let minSize = parseInt(document.getElementById('buddyMin').value) || 32;
  let needed = Math.max(minSize, Math.pow(2, Math.ceil(Math.log2(proc.size))));
  
  let block = memBlocks.find(b => b.type === 'free' && b.size >= needed);
  if(!block) return false;

  // Asignar color automático único para Buddy System si no existe
  if (!memColorMap[proc.name]) {
    const colorIndex = Object.keys(memColorMap).length % COLORS.length;
    memColorMap[proc.name] = COLORS[colorIndex];
  }

  while(block.size > needed) {
    let idx = memBlocks.indexOf(block);
    let half = block.size / 2;
    block.size = half;
    let twin = { id: Date.now()+idx, start: block.start + half, size: half, type: 'free', process: null };
    memBlocks.splice(idx + 1, 0, twin);
  }

  block.type = 'allocated';
  block.process = proc.name;
  addRealtimeLog('success', `✅ Buddy Alloc: ${proc.name}`, `Acomodado en bloque binario de ${needed} KB`);
  return true;
}

function renderMemoryLinear() {
  const track = document.getElementById('memBarTrack');
  if(!memBlocks.length) return;

  track.innerHTML = memBlocks.map(b => {
    let pct = (b.size / memTotal * 100).toFixed(2);
    // Cambiamos el color fijo por el color dinámico del mapa de procesos
    let bg = b.type === 'free' ? 'repeating-linear-gradient(45deg, #e0d9cc, #e0d9cc 4px, #ede8df 4px, #ede8df 8px)' : memColorMap[b.process];
    let color = b.type === 'free' ? 'var(--text-mid)' : '#fff';
    return `<div class="mem-bar-seg" style="width:${pct}%; background:${bg}; color:${color}; height:100%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;" onclick="focusBlock('${b.process}')">
      ${parseFloat(pct) > 5 ? (b.process || 'Libre') + ` (${b.size}K)` : ''}
    </div>`;
  }).join('');

  renderResidentTable();
}

function renderResidentTable() {
  const container = document.getElementById('memProcTable');
  let allocated = memBlocks.filter(b => b.type === 'allocated');
  if(!allocated.length) {
    container.innerHTML = '<div class="empty-hint">Sin procesos residentes en RAM.</div>';
    return;
  }
  container.innerHTML = `
    <table class="rtable" style="width:100%; text-align:left;">
      <thead><tr><th>Proceso</th><th>Dirección de Inicio</th><th>Espacio Mapeado</th></tr></thead>
      <tbody>${allocated.map(b => `
        <tr id="row_${b.process}" onclick="focusBlock('${b.process}')" style="cursor:pointer; ${selectedResident === b.process ? 'background:var(--blue-lt);' : ''}">
          <td><span class="mem-badge" style="background:${memColorMap[b.process]}; padding:2px 6px; color:#fff; border-radius:4px;">${b.process}</span></td>
          <td>${b.start} KB</td>
          <td>${b.size} KB</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderResidentTable() {
  const container = document.getElementById('memProcTable');
  let allocated = memBlocks.filter(b => b.type === 'allocated');
  if(!allocated.length) {
    container.innerHTML = '<div class="empty-hint">Sin procesos residentes en RAM.</div>';
    return;
  }
  container.innerHTML = `
    <table class="rtable" style="width:100%; text-align:left;">
      <thead><tr><th>Proceso</th><th>Dirección de Inicio</th><th>Espacio Mapeado</th></tr></thead>
      <tbody>${allocated.map(b => `
        <tr id="row_${b.process}" onclick="focusBlock('${b.process}')" style="cursor:pointer; ${selectedResident === b.process ? 'background:var(--blue-lt);' : ''}">
          <td><span class="mem-badge" style="background:#0f7f75; padding:2px 6px; color:#fff; border-radius:4px;">${b.process}</span></td>
          <td>${b.start} KB</td>
          <td>${b.size} KB</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function focusBlock(name) {
  if(!name || name === 'null') return;
  selectedResident = name;
  renderResidentTable();
  addLog('info', `Seleccionado para liberación manual: ${name}`);
}

function deallocateSelected() {
  if(!selectedResident) return;
  let blk = memBlocks.find(b => b.process === selectedResident);
  if(blk) {
    blk.type = 'free';
    blk.process = null;
    coalesceFreeBlocks();
    addRealtimeLog('warn', `⚠️ Proceso Liberado: ${selectedResident}`, `El espacio residente ha sido devuelto a la pila libre.`);
    selectedResident = null;
    renderMemoryLinear();
    updateMemStats();
  }
}

function coalesceFreeBlocks() {
  for(let i=0; i<memBlocks.length - 1; i++) {
    if(memBlocks[i].type === 'free' && memBlocks[i+1].type === 'free') {
      memBlocks[i].size += memBlocks[i+1].size;
      memBlocks.splice(i+1, 1);
      i--;
    }
  }
}

function updateMemStats() {
  let used = memBlocks.filter(b => b.type === 'allocated').reduce((acc,b)=>acc+b.size, 0);
  let free = memTotal - used;
  let pct = (used / memTotal * 100).toFixed(1);

  document.getElementById('statUsed').textContent = used + ' KB';
  document.getElementById('statFree').textContent = free + ' KB';
  document.getElementById('memConfigSummary').textContent = memTotal + ' KB';
  document.getElementById('memFreeSummary').textContent = free + ' KB';
  document.getElementById('memUseSummary').textContent = pct + '%';

  document.getElementById('fillTotal').style.width = pct + '%';
  document.getElementById('pctTotal').textContent = pct + '%';
  
  const fTable = document.getElementById('freeBlocksTable');
  let freeSegs = memBlocks.filter(b => b.type === 'free');
  document.getElementById('statFreeBlocks').textContent = freeSegs.length;
  fTable.innerHTML = freeSegs.map(b => `<div style="font-size:11px; font-family:monospace; padding:2px;">• Base: ${b.start}K | Tam: ${b.size}K</div>`).join('');
}

function addRealtimeLog(type, msg, detail) {
  const container = document.getElementById('memSimulation');
  if(container.querySelector('.sim-empty-state')) container.innerHTML = '';
  
  let div = document.createElement('div');
  div.className = `sim-step ${type}`;
  div.innerHTML = `<strong>${msg}</strong><div class="sim-step-detail">${detail}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addLog(type, msg) {
  const log = document.getElementById('algoLog');
  let div = document.createElement('div');
  div.className = `log-${type}`;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function setMemSpeed(v) {
  memSpeed = parseFloat(v);
  document.getElementById('memSpeedVal').textContent = v + 'x';
}

function resetMemSim() {
  initMemory();
  clearMemQueue();
  document.getElementById('memSimulation').innerHTML = `<div class="sim-empty-state">Reiniciado.</div>`;
}

function showMsg(id, txt, type) {
  let el = document.getElementById(id);
  el.textContent = txt;
  el.className = `msg show msg-${type}`;
  setTimeout(() => el.classList.remove('show'), 2500);
}

window.addEventListener('DOMContentLoaded', () => {
  loadDemo();
  initMemory();
});