/**
 * simulation.js
 * ─────────────────────────────────────────────────────────
 * Responsabilidad única: orquestar el motor de simulación tick-a-tick
 * (fusionStart, fusionPulse, fusionEnd, fusionPause, fusionReset,
 * fusionSetSpeed) y calcular las métricas finales (computeFMetrics).
 *
 * Este módulo es el "director de orquesta": en cada pulso llama a
 * memoryAllocator.js para cargar procesos en RAM, a scheduler.js para
 * elegir qué proceso corre, y a render.js para reflejar el resultado
 * en pantalla. No implementa la lógica interna de asignación de
 * memoria ni de planificación, solo las invoca.
 * ─────────────────────────────────────────────────────────
 */

/* ── SIMULATION ENGINE (REAL TICK-BY-TICK) ── */
function fusionStart() {
  if (!fProcs.length) return;
  fusionInitMemory();

  // Reset del estado dinámico
  fProcs.forEach(p => {
    p.remaining = p.burst;
    p.state = 'pending';
    p.memStart = null;
    p.startTime = null;
    p.endTime = null;
    p.waitTime = null;
  });

  fDynamicTimeline = [];
  rrQueue = [];
  rrQuantumSpent = 0;
  currentRunningProc = null;
  contextSwitchesCount = 0;

  // Marcar de antemano los procesos que JAMÁS podrán asignarse con la
  // configuración actual (tamaño mayor a la capacidad máxima posible),
  // para que la simulación pueda completarse al 100% en vez de quedarse
  // esperando para siempre.
  let unfeasible = [];
  fProcs.forEach(p => {
    if (!fIsRequestFeasible(p)) {
      p.state = 'error';
      p.remaining = 0;
      unfeasible.push(p.name);
    }
  });

  fSimStep   = 0;
  fDoneCount = 0;
  fSimRunning= true;
  fSimPaused = false;

  document.getElementById('fStartBtn').disabled = true;
  document.getElementById('fPauseBtn').disabled = false;
  document.getElementById('fStatus').textContent = 'Corriendo';
  fSetConfigLocked(true);
  clearFEventLog();
  fLog('exec','Simulación integrada paso a paso iniciada','CPU: '+fPolicy+' | RAM: '+F_ALLOC_LABEL[fAllocType]+' ('+fMemTotal+'KB)');
  if (unfeasible.length) {
    fLog('err', `${unfeasible.length} proceso(s) exceden la capacidad máxima de RAM`,
      unfeasible.join(', ') + ' — no podrán cargarse nunca con esta configuración y se marcan como descartados.');
  }
  fusionPulse();
}

function fusionPulse() {
  if(!fSimRunning || fSimPaused) return;
  const t = fSimStep;
  document.getElementById('fClock').textContent = t+' ut';
  document.getElementById('fProgress').textContent = fDoneCount+'/'+fProcs.length;

  // — 1. LLEGADAS DE PROCESOS
  // Los procesos que llegan pasan a la cola de "Espera de Memoria" si aún no se han asignado.
  // Se excluyen 'error' y 'done' para no resucitar un proceso que (por alguna otra vía)
  // ya hubiese sido resuelto antes de que el reloj alcance su tiempo de llegada.
  fProcs.filter(p => p.arrival === t && p.state !== 'error' && p.state !== 'done').forEach(p => {
    p.state = 'pending';
    fLog('idle', `${p.name} llegó al sistema`, `Requiere ${p.memSize}KB · ráfaga ${p.burst}ut`);
  });

  // — 2. CARGA DINÁMICA DE RAM
  // Intentar cargar todos los procesos pendientes que ya llegaron (arrival <= t).
  // La condición arrival<=t es la que impide que un proceso "adivine" memoria y
  // se ejecute antes de haber llegado formalmente al sistema.
  fProcs.filter(p => p.state === 'pending' && p.memStart === null && p.arrival <= t).forEach(p => {
    let ok = fTryAllocate(p);
    if(ok){
      p.state = 'ready';
      p.memStart = t;
      fLog('alloc',p.name+' cargado en RAM',`Bloques asignados. Memoria ocupada: ${p.memSize}KB`);
    } else {
      fLog('err',p.name+' en espera de memoria',`Insuficiente RAM libre para ${p.memSize}KB`);
    }
  });

  // — 3. DESPACHADOR CPU (DECISIÓN DEL PLANIFICADOR)
  let nextProc = selectNextProcessDynamic(t);

  if (nextProc) {
    if (nextProc.startTime === null) {
      nextProc.startTime = t;
    }

    // Registrar Cambio de Contexto en el log
    if (currentRunningProc && currentRunningProc.name !== nextProc.name) {
      fLog('exec',`Cambio de contexto`,`${currentRunningProc.name} → ${nextProc.name}`);
      contextSwitchesCount++;
    }

    currentRunningProc = nextProc;
    nextProc.state = 'executing';
    nextProc.remaining--;

    if (fPolicy === 'RR') {
      rrQuantumSpent++;
    }

    document.getElementById('fRunning').textContent = nextProc.name;
    document.getElementById('fRunning').style.background = nextProc.color;
    document.getElementById('fRunning').style.color = '#fff';

    // Grabar en la Secuencia Dinámica de Línea de Tiempo
    if (fDynamicTimeline.length > 0 && fDynamicTimeline[fDynamicTimeline.length - 1].name === nextProc.name) {
      fDynamicTimeline[fDynamicTimeline.length - 1].end = t + 1;
    } else {
      fDynamicTimeline.push({ name: nextProc.name, start: t, end: t + 1 });
    }

    // — 4. DETECTAR TÉRMINO DEL PROCESO
    if (nextProc.remaining === 0) {
      nextProc.state = 'done';
      nextProc.endTime = t + 1;
      // Espera = Retorno - Ráfaga = (Fin - Llegada) - Ráfaga Original
      nextProc.waitTime = Math.max(0, (nextProc.endTime - nextProc.arrival) - nextProc.burst);
      fDoneCount++;

      fLog('done',`${nextProc.name} terminado`,`Retorno: ${(nextProc.endTime - nextProc.arrival)}ut · Espera: ${nextProc.waitTime}ut`);

      // LIBERACIÓN AUTOMÁTICA DE MEMORIA
      fDeallocate(nextProc.name);
      fLog('free',`RAM liberada de ${nextProc.name}`,`Espacio devuelto al pool de memoria libre.`);

      if (fPolicy === 'RR') {
        rrQuantumSpent = 0;
      }
      currentRunningProc = null;

      // Intentar meter de inmediato un proceso pendiente que ahora sí quepa (y que ya haya llegado)
      fProcs.filter(p => p.state === 'pending' && p.memStart === null && p.arrival <= t + 1).forEach(p => {
        let ok = fTryAllocate(p);
        if(ok){
          p.state = 'ready';
          p.memStart = t + 1;
          fLog('alloc',p.name+' cargado en RAM (post-liberación)',`Asignados ${p.memSize}KB`);
        }
      });
    }

  } else {
    // Estado IDLE (CPU Desocupado)
    currentRunningProc = null;
    document.getElementById('fRunning').textContent = 'IDLE';
    document.getElementById('fRunning').style.background = 'var(--panel)';
    document.getElementById('fRunning').style.color = 'var(--text-soft)';

    if (fDynamicTimeline.length > 0 && fDynamicTimeline[fDynamicTimeline.length - 1].name === 'IDLE') {
      fDynamicTimeline[fDynamicTimeline.length - 1].end = t + 1;
    } else {
      fDynamicTimeline.push({ name: 'IDLE', start: t, end: t + 1 });
    }
  }

  // — 5. ACTUALIZAR ESTADOS DE OTROS RESIDENTES EN RAM (in-ram)
  fProcs.forEach(p => {
    if (p.state !== 'done' && p.state !== 'pending') {
      if (p === currentRunningProc) {
        p.state = 'executing';
      } else if (p.memStart !== null) {
        p.state = 'ready';
      }
    }
  });

  // — 6. RENDERIZADO Y AVANCE DE RELOJ
  renderFMemMap();
  renderFBarcodeDynamic(t + 1);
  renderFStateTable();
  updateFPipelineCounts(t);
  updateGauges();

  // Control de término general (los procesos "error" están descartados
  // de antemano y cuentan como resueltos para poder cerrar la simulación)
  const allFinished = fProcs.every(p => p.state === 'done' || p.state === 'error');
  if (allFinished) {
    fusionEnd();
  } else if (fSimStep > 5000) {
    // Salvaguarda: nunca debería alcanzarse si la factibilidad se validó bien,
    // pero evita que la simulación quede corriendo indefinidamente.
    fLog('err','Límite de seguridad alcanzado (5000 ut)','La simulación se detuvo para evitar un bucle indefinido.');
    fusionEnd();
  } else {
    fSimStep++;
    fSimTimer = setTimeout(fusionPulse, 1000 / fSpeed);
  }
}

function updateFPipelineCounts(t) {
  let ready    = fProcs.filter(p => p.memStart !== null && p.state !== 'done' && p !== currentRunningProc).length;
  let exec     = currentRunningProc ? 1 : 0;
  let done     = fProcs.filter(p => p.state==='done').length;
  let pending  = fProcs.filter(p => p.memStart === null && p.state !== 'error');

  document.getElementById('fq-ready').textContent = ready;
  document.getElementById('fq-exec').textContent  = exec;
  document.getElementById('fq-done').textContent  = done;
  document.getElementById('fm-done').textContent  = done;

  let pb = document.getElementById('fq-pending');
  pb.innerHTML = pending.slice(0,20).map(p=>`
    <span class="q-badge" style="background:${p.color}33;color:${p.color};border:1px solid ${p.color}55;">
      ${p.name} @${p.arrival}ut
    </span>`).join('') + (pending.length>20?`<span style="font-size:9px;color:var(--text-soft)">+${pending.length-20} más</span>`:'');
}

function fusionEnd() {
  fSimRunning = false;
  document.getElementById('fStartBtn').disabled = false;
  document.getElementById('fPauseBtn').disabled = true;
  document.getElementById('fStatus').textContent = 'Completado';
  document.getElementById('fStatus').style.color = 'var(--green)';
  fSetConfigLocked(false);
  computeFMetrics();
  let discarded = fProcs.filter(p => p.state === 'error').length;
  fLog('done','Simulación completada',
    discarded
      ? `${fProcs.length - discarded} proceso(s) terminados. ${discarded} descartado(s) por RAM insuficiente.`
      : 'Todos los procesos terminados y memoria liberada con éxito.');
  renderFMemMap();
  renderFStateTable();
}

function fusionPause() {
  fSimPaused = !fSimPaused;
  document.getElementById('fPauseBtn').textContent = fSimPaused ? 'Reanudar' : 'Pausar';
  if(!fSimPaused) fusionPulse();
}

function fusionReset() {
  clearTimeout(fSimTimer);
  fSimRunning = false; fSimPaused = false;
  fSimStep = 0; fDoneCount = 0;
  rrQueue = [];
  rrQuantumSpent = 0;
  currentRunningProc = null;
  contextSwitchesCount = 0;

  fProcs.forEach(p => {
    p.remaining=p.burst; p.state='pending';
    p.memStart=null; p.startTime=null; p.endTime=null; p.waitTime=null;
  });
  fDynamicTimeline = [];
  fMemBlocks= [];

  document.getElementById('fClock').textContent = '0 ut';
  document.getElementById('fRunning').textContent = '—';
  document.getElementById('fRunning').style.background = 'var(--panel)';
  document.getElementById('fRunning').style.color = 'var(--text-mid)';
  document.getElementById('fStatus').textContent = 'Listo';
  document.getElementById('fStatus').style.color = 'var(--amber)';
  document.getElementById('fProgress').textContent = '0/0';
  document.getElementById('fStartBtn').disabled = false;
  document.getElementById('fPauseBtn').disabled = true;
  document.getElementById('fPauseBtn').textContent = 'Pausar';
  fSetConfigLocked(false);

  document.getElementById('fBarcodeTrack').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;color:var(--text-soft);font-size:11px;">Inicia la simulación para ver la secuencia de ejecución</div>';
  document.getElementById('fMemTrack').innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;color:var(--text-soft);font-size:11px;">Memoria sin inicializar</div>';
  document.getElementById('fMemStatus').textContent = 'Sin init.';
  document.getElementById('fResidentList').innerHTML = '<div style="text-align:center;color:var(--text-soft);font-size:10px;padding:10px;">RAM vacía</div>';
  document.getElementById('fFreeList').innerHTML = '';
  document.getElementById('fFreeCount').textContent = 0;

  ['fm-total','fm-util','fm-wait','fm-return','fm-ctx','fm-done','fm-used','fm-free'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent='—';
  });
  ['fq-ready','fq-ram','fq-exec','fq-done'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.textContent='0';
  });
  document.getElementById('fq-pending').innerHTML='';
  document.getElementById('fm-fill-ram').style.width='0%';
  document.getElementById('fm-pct-ram').textContent='0%';
  document.getElementById('fFatBody').innerHTML='';
  document.getElementById('fFatBadge').textContent='0 entradas';
  document.getElementById('fFatCard').style.display = (fAllocType==='fat') ? '' : 'none';
  document.getElementById('fMemHint').textContent = F_ALLOC_HINT[fAllocType] || '';

  updateGauges();
  renderFStateTable();
  clearFEventLog();
}

function fusionSetSpeed(v) {
  fSpeed = parseFloat(v);
  document.getElementById('fSpeedVal').textContent = v+'x';
}

/* ── METRICS ── */
function computeFMetrics() {
  if(!fDynamicTimeline.length) return;
  let total   = fSimStep;
  let idle    = fDynamicTimeline.filter(s=>s.name==='IDLE').reduce((a,s)=>a+(s.end-s.start),0);
  let util    = total > 0 ? (((total-idle)/total)*100).toFixed(1) : 0;
  
  let finished= fProcs.filter(p=>p.endTime!==null);
  let avgWait = finished.length ? (finished.reduce((a,p)=>a+p.waitTime,0)/finished.length).toFixed(1) : '—';
  let avgReturn= finished.length ? (finished.reduce((a,p)=>a+(p.endTime-p.arrival),0)/finished.length).toFixed(1) : '—';

  document.getElementById('fm-total').textContent = total;
  document.getElementById('fm-util').textContent  = util;
  document.getElementById('fm-wait').textContent  = avgWait;
  document.getElementById('fm-return').textContent= avgReturn;
  document.getElementById('fm-ctx').textContent   = contextSwitchesCount;
  document.getElementById('fm-done').textContent  = finished.length;
}
