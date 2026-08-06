/**
 * processManager.js
 * ─────────────────────────────────────────────────────────
 * Responsabilidad única: gestión del ciclo de vida de los procesos
 * (alta manual, generación aleatoria, eliminación) y de las
 * selecciones de configuración hechas por el usuario en la UI
 * (política de CPU, algoritmo de memoria, tipo de asignación).
 * También controla el bloqueo de los controles de configuración
 * mientras la simulación está corriendo.
 *
 * No contiene lógica de asignación de memoria ni de planificación:
 * eso vive en memoryAllocator.js y scheduler.js respectivamente.
 * ─────────────────────────────────────────────────────────
 */

/* ── POLICY ── */
function fusionSelectPolicy(p, btn) {
  if (fSimRunning) return;
  fPolicy = p;
  document.querySelectorAll('#fusionPolicyGrid .policy-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ── MEM ALGO ── */
function fusionSelectMemAlgo(a, btn) {
  if (fSimRunning) return;
  fMemAlgo = a;
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ── TIPO DE ASIGNACIÓN DE MEMORIA (7 métodos) ── */
const F_ALLOC_DESC = {
  contigua  : 'Bloque único y contiguo por proceso. Usa el algoritmo de ajuste (First/Best/Worst Fit) o Buddy.',
  enlazada  : 'El proceso se divide en bloques de tamaño fijo, dispersos por la RAM y enlazados mediante punteros almacenados dentro de cada bloque — como una lista enlazada. No requiere espacio contiguo.',
  indexada  : 'El proceso se divide en bloques de datos dispersos + 1 bloque índice adicional que guarda las direcciones de todos sus bloques (tabla de índices de un solo nivel).',
  multinivel: 'Un bloque índice maestro apunta a varios bloques índice de segundo nivel, y cada uno de éstos apunta a hasta '+F_SECOND_LEVEL_CAP+' bloques de datos. Permite indexar archivos grandes sin un único índice enorme.',
  fat       : 'Los bloques de datos se encadenan igual que en la asignación enlazada, pero los punteros "siguiente bloque" no se guardan dentro de cada bloque: viven en una tabla central (la FAT) que el SO recorre para reconstruir la cadena de cualquier proceso.',
  extension : 'A cada proceso se le reservan una o varias extensiones (rachas contiguas de tamaño variable). El sistema intenta primero un único tramo contiguo con el algoritmo de ajuste elegido; si no existe, reparte el proceso en el menor número posible de fragmentos grandes.',
  bitmap    : 'El espacio se divide en bloques fijos y su estado se representa con un vector de bits (1 bloque = 1 bit: 0 = libre, 1 = ocupado). Para asignar, se recorre el mapa buscando la primera racha contigua de bits en 0 con longitud suficiente.'
};
const F_ALLOC_HINT = {
  contigua  : '',
  enlazada  : 'Las líneas punteadas muestran el puntero "siguiente bloque" de cada archivo.',
  indexada  : 'Los bloques con borde blanco discontinuo (IDX) son el índice de cada proceso.',
  multinivel: 'Borde sólido = índice maestro (M) · borde discontinuo = índice de 2º nivel (S) · sin etiqueta = bloque de datos.',
  fat       : 'Los bloques no muestran punteros: consulta la tabla FAT de abajo para ver la cadena de cada proceso.',
  extension : 'Un mismo proceso puede ocupar más de un tramo; el número tras el nombre indica el índice de la extensión.',
  bitmap    : 'Cada celda es 1 bit del vector de bits — 0 = libre, 1 = ocupado.'
};
function fusionSelectAllocType(t, btn) {
  if (fSimRunning) return; // evita corromper la RAM cambiando el modelo en pleno vuelo
  fAllocType = t;
  document.querySelectorAll('.alloc-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const algoApplies = (t === 'contigua' || t === 'extension');
  document.getElementById('fAlgoGrid').classList.toggle('disabled', !algoApplies);
  document.getElementById('fAlgoBuddy').disabled = (t === 'extension');
  if (t === 'extension' && fMemAlgo === 'buddy') {
    fMemAlgo = 'first';
    document.querySelectorAll('#fAlgoGrid .algo-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('fAlgoFirst').classList.add('active');
  }

  document.getElementById('fAllocDesc').textContent = F_ALLOC_DESC[t];
  document.getElementById('fMemHint').textContent = F_ALLOC_HINT[t];
  fusionInitMemory();
  renderFatPanel();
}

/* ── GENERATE ── */
function fusionGenerate() {
  if (fSimRunning) return;
  fusionClear();
  const n        = parseInt(document.getElementById('fProcCount').value) || 20;
  const bMin     = parseInt(document.getElementById('fBurstMin').value)  || 2;
  const bMax     = parseInt(document.getElementById('fBurstMax').value)  || 10;
  const aMax     = parseInt(document.getElementById('fArrivalMax').value)|| 30;
  const memMin   = parseInt(document.getElementById('fMemMin').value)    || 64;
  const memMax   = parseInt(document.getElementById('fMemMax').value)    || 256;

  for (let i = 0; i < n; i++) {
    const name    = `P${i}`;
    const arrival = Math.floor(Math.random() * (aMax + 1));
    const burst   = bMin + Math.floor(Math.random() * (bMax - bMin + 1));
    const priority= Math.floor(Math.random() * 4) + 1;
    const memSize = memMin + Math.floor(Math.random() * (memMax - memMin + 1));
    const color   = COLORS[i % COLORS.length];
    fProcs.push({ name, arrival, burst, priority, memSize, color,
                  remaining: burst, state: 'pending',
                  memStart: null, startTime: null, endTime: null, waitTime: null });
    fColorMap[name] = color;
  }
  renderFProcList();
  fShowMsg('fMsgProc', `${n} procesos generados`, 'ok');
}

/* ── ADD MANUAL ── */
function fusionAddManual() {
  if (fSimRunning) return;
  const name    = document.getElementById('fPName').value.trim() || `P${fProcs.length}`;
  const arrival = parseInt(document.getElementById('fArrival').value)   || 0;
  const burst   = parseInt(document.getElementById('fBurst').value)     || 4;
  const priority= parseInt(document.getElementById('fPriority').value)  || 1;
  const memSize = parseInt(document.getElementById('fMemSize').value)   || 128;
  if (fProcs.find(p => p.name === name)) return fShowMsg('fMsgProc','Nombre duplicado','err');
  const color = COLORS[fProcs.length % COLORS.length];
  fProcs.push({ name, arrival, burst, priority, memSize, color,
                remaining: burst, state: 'pending',
                memStart: null, startTime: null, endTime: null, waitTime: null });
  fColorMap[name] = color;
  document.getElementById('fPName').value = `P${fProcs.length}`;
  renderFProcList();
  fShowMsg('fMsgProc', `${name} agregado`, 'ok');
}

/* ── RENDER PROC LIST ── */
function renderFProcList() {
  const el = document.getElementById('fProcList');
  document.getElementById('fProcCount2').textContent = fProcs.length;
  document.getElementById('fTableBadge').textContent = fProcs.length + ' procesos';
  if (!fProcs.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-soft);font-size:11px;padding:10px;">Sin procesos.</div>';
    return;
  }
  el.innerHTML = fProcs.map((p, i) => `
    <div class="proc-item" style="border-left:3px solid ${p.color};">
      <div>
        <span style="font-weight:800;color:${p.color};font-size:12px;">${p.name}</span>
        <span style="font-size:9px;color:var(--text-soft);display:block;font-family:var(--font-mono);">
          arr:${p.arrival} cpu:${p.burst}ut mem:${p.memSize}KB
        </span>
      </div>
      <button class="btn-xs" onclick="fusionRemoveProc(${i})">✕</button>
    </div>`).join('');
}

function fusionRemoveProc(i) {
  if (fSimRunning) return;
  fProcs.splice(i,1); renderFProcList();
}

function fusionClear() {
  if (fSimRunning) return;
  fusionReset();
  fProcs = [];
  fColorMap = {};
  renderFProcList();
  renderFStateTable();
}

/* ── BLOQUEO DE CONFIGURACIÓN MIENTRAS CORRE LA SIMULACIÓN ──
   Evita que el usuario cambie el tipo de asignación, el algoritmo,
   la capacidad de RAM o la lista de procesos a mitad de una corrida,
   lo cual dejaba bloques "huérfanos" y procesos desincronizados. */
function fSetConfigLocked(locked) {
  const ids = ['fMemTotal','fBlockSize','fMemMin','fMemMax','fProcCount','fBurstMin','fBurstMax',
               'fArrivalMax','fPName','fArrival','fBurst','fPriority','fMemSize',
               'fGenerateBtn','fAddManualBtn','fClearBtn'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = locked; });
  document.querySelectorAll('.alloc-btn, .algo-btn, .policy-btn').forEach(b => b.disabled = locked);
}
