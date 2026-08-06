/**
 * render.js
 * ─────────────────────────────────────────────────────────
 * Responsabilidad única: pintar el estado actual (fProcs, fMemBlocks,
 * fDynamicTimeline...) en el DOM. Ninguna función de este archivo
 * modifica el estado de la simulación; solo lo lee y genera HTML/SVG.
 *
 * Incluye el mapa de memoria (por tipo de asignación), los enlaces
 * visuales entre bloques, la leyenda de colores, el panel de la tabla
 * FAT, las estadísticas de RAM, la lista de residentes, la tabla de
 * estado de procesos, el "barcode" de ejecución de CPU y los
 * medidores circulares (gauges).
 * ─────────────────────────────────────────────────────────
 */

/* ── RENDER MEMORY MAP ── */
function renderFMemMap() {
  const track = document.getElementById('fMemTrack');
  if(!fMemBlocks.length){ track.innerHTML=''; return; }

  if (fAllocType === 'contigua' || fAllocType === 'extension') {
    track.className = 'mem-track';
    track.style.display = 'flex';
    track.innerHTML = fMemBlocks.map(b => {
      let pct = (b.size/fMemTotal*100).toFixed(2);
      let bg  = b.type==='free'
        ? 'repeating-linear-gradient(45deg,var(--bg),var(--bg) 3px,var(--panel) 3px,var(--panel) 6px)'
        : fColorMap[b.process] || '#4a7cf7';
      let clr = b.type==='free' ? 'var(--text-soft)' : '#fff';
      let extLabel = (fAllocType==='extension' && b.extentIndex) ? (b.process+' #'+b.extentIndex) : b.process;
      let title = b.type==='free' ? 'Libre' : (b.process+' ('+b.size+'KB)'+(b.extentIndex?' — extensión '+b.extentIndex:''));
      return `<div class="mem-seg" style="width:${pct}%;background:${bg};color:${clr};" title="${title}">
        ${parseFloat(pct)>6 ? (b.type==='free'?b.size+'K libres':extLabel) : ''}
      </div>`;
    }).join('');

  } else if (fAllocType === 'bitmap') {
    track.className = 'bitmap-track';
    track.style.display = 'grid';
    let cols = Math.min(26, Math.max(8, Math.ceil(Math.sqrt(fMemBlocks.length * 2.4))));
    track.style.setProperty('--cols', cols);
    track.innerHTML = fMemBlocks.map(b => {
      let used = b.type !== 'free';
      let bg = used ? (fColorMap[b.process]||'#4a7cf7') : '';
      let title = used ? `Bloque ${b.id}: ocupado (1) — ${b.process}` : `Bloque ${b.id}: libre (0)`;
      return `<div class="bit-cell ${used?'bit-used':'bit-free'}" style="${used?('background:'+bg+';'):''}" title="${title}">
        <span>${used?'1':'0'}</span>
      </div>`;
    }).join('');

  } else {
    // enlazada / indexada / multinivel / fat — grilla de bloques fijos
    track.className = 'block-track';
    track.style.display = 'grid';
    let cols = Math.min(20, Math.max(6, Math.ceil(Math.sqrt(fMemBlocks.length * 2))));
    track.style.setProperty('--cols', cols);

    track.innerHTML = fMemBlocks.map(b => {
      let bg = b.type === 'free' ? 'var(--bg)' : fColorMap[b.process];
      let roleClass = b.role==='master' ? 'blk-master' : b.role==='second' ? 'blk-second' : b.role==='index' ? 'blk-index' : '';
      let extraClass = b.type === 'free' ? 'free' : roleClass;

      let content = '', title = '';
      if (b.type === 'allocated') {
        if (b.role === 'master') {
          content = `<span class="blk-tag">M</span><span class="blk-name">${b.process}</span>`;
          title = `Índice maestro — ${b.process}`;
        } else if (b.role === 'second') {
          content = `<span class="blk-tag">S</span><span class="blk-name">${b.process}</span>`;
          title = `Índice de 2º nivel — ${b.process} (padre: bloque ${b.parentId})`;
        } else if (b.role === 'index') {
          content = `<span class="blk-name">${b.process}</span><span class="blk-tag">IDX</span>`;
          title = `Bloque índice — ${b.process}`;
        } else {
          let nextStr = (fAllocType==='enlazada' && b.nextBlockId) ? '→'+b.nextBlockId : '';
          content = `<span class="blk-name">${b.process}</span><span class="blk-sub">${nextStr}</span>`;
          title = `${b.process} (bloque ${b.id})`;
        }
      } else {
        content = `<span class="blk-free-id">${b.id}</span>`;
        title = 'Bloque libre '+b.id;
      }

      return `<div class="block-cell ${extraClass}" data-block-id="${b.id}" title="${title}">${content}</div>`;
    }).join('');

    renderFBlockLinks(track);
  }
  updateFMemStats();
  renderFResidents();
  renderFMemLegend();
  renderFatPanel();
}

/* ── ENLACES VISUALES ENTRE BLOQUES ──
   enlazada = cadena secuencial · indexada = índice→datos · multinivel = maestro→2ºnivel→datos
   (fat y bitmap no dibujan enlaces: fat expone su cadena en la tabla FAT; bitmap es contiguo) */
function renderFBlockLinks(track) {
  if (fAllocType !== 'enlazada' && fAllocType !== 'indexada' && fAllocType !== 'multinivel') return;

  const cellCenter = (id) => {
    const el = track.querySelector(`.block-cell[data-block-id="${id}"]`);
    if (!el) return null;
    return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  };
  const line = (a,c,color,dash,w) => a && c
    ? `<line x1="${a.x}" y1="${a.y}" x2="${c.x}" y2="${c.y}" stroke="${color}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''} opacity="0.9"/>` : '';

  let byProc = {};
  fMemBlocks.forEach(b => {
    if (b.type === 'allocated') (byProc[b.process] = byProc[b.process] || []).push(b);
  });

  let lines = '';
  Object.keys(byProc).forEach(name => {
    const color = fColorMap[name] || '#4a7cf7';
    const blocks = byProc[name];
    if (fAllocType === 'enlazada') {
      blocks.forEach(b => { if (b.nextBlockId) lines += line(cellCenter(b.id), cellCenter(b.nextBlockId), color, '4,3', 2); });

    } else if (fAllocType === 'indexada') {
      const idxBlock = blocks.find(b => b.role === 'index');
      if (idxBlock) {
        const idxC = cellCenter(idxBlock.id);
        blocks.filter(b => b.role !== 'index').forEach(b => { lines += line(idxC, cellCenter(b.id), color, '2,2', 1.4); });
      }

    } else if (fAllocType === 'multinivel') {
      const master = blocks.find(b => b.role === 'master');
      const seconds = blocks.filter(b => b.role === 'second');
      if (master) {
        const mC = cellCenter(master.id);
        seconds.forEach(s => { lines += line(mC, cellCenter(s.id), color, '', 2.2); });
      }
      seconds.forEach(s => {
        const sC = cellCenter(s.id);
        blocks.filter(b => b.role === 'data' && b.parentId === s.id).forEach(d => { lines += line(sC, cellCenter(d.id), color, '2,2', 1.2); });
      });
    }
  });

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'block-links');
  svg.style.width  = track.scrollWidth + 'px';
  svg.style.height = track.scrollHeight + 'px';
  svg.innerHTML = lines;
  track.appendChild(svg);
}

/* ── LEYENDA DE COLORES POR PROCESO EN RAM ── */
function renderFMemLegend() {
  const el = document.getElementById('fMemLegend');
  if (!el) return;
  let names = [...new Set(fMemBlocks.filter(b => b.type === 'allocated').map(b => b.process))];
  if (!names.length) { el.innerHTML = ''; return; }
  el.innerHTML = names.map(name => `
    <span style="display:inline-flex;align-items:center;gap:3px;color:${fColorMap[name]||'#4a7cf7'};font-weight:700;">
      <span style="width:9px;height:9px;border-radius:2px;background:${fColorMap[name]||'#4a7cf7'};display:inline-block;"></span>${name}
    </span>`).join('');
}

/* ── TABLA FAT — sólo visible en modo FAT; reconstruye la cadena de cada
   proceso a partir de nextBlockId (idéntico modelo que enlazada, pero
   expuesto como tabla central en vez de punteros dentro del bloque) ── */
function renderFatPanel() {
  const card = document.getElementById('fFatCard');
  if (!card) return;
  if (fAllocType !== 'fat') { card.style.display = 'none'; return; }
  card.style.display = '';
  document.getElementById('fFatBadge').textContent = fMemBlocks.length + ' entradas';
  document.getElementById('fFatBody').innerHTML = fMemBlocks.map(b => {
    let procCell = b.type === 'allocated'
      ? `<span style="background:${fColorMap[b.process]};color:#fff;padding:1px 7px;border-radius:3px;font-weight:700;">${b.process}</span>`
      : '<span style="color:var(--text-soft)">—</span>';
    let nextCell = b.type === 'allocated' ? (b.nextBlockId ? b.nextBlockId : 'FIN') : 'LIBRE';
    return `<tr><td style="font-family:var(--font-mono)">${b.id}</td><td>${procCell}</td>
      <td style="font-family:var(--font-mono);color:${b.type==='allocated'?'var(--text)':'var(--text-soft)'}">${nextCell}</td></tr>`;
  }).join('');
}

function updateFMemStats() {
  const isByteGranular = (fAllocType === 'contigua' || fAllocType === 'extension');
  let used = 0;
  if (isByteGranular) {
    used = fMemBlocks.filter(b=>b.type==='allocated').reduce((a,b)=>a+b.size,0);
  } else {
    used = fMemBlocks.filter(b=>b.type==='allocated').length * fBlockSize;
  }
  let free = fMemTotal - used;
  let pct  = fMemTotal > 0 ? (used/fMemTotal*100).toFixed(1) : 0;
  document.getElementById('fm-used').textContent = used;
  document.getElementById('fm-free').textContent = free;
  document.getElementById('fm-fill-ram').style.width = pct+'%';
  document.getElementById('fm-pct-ram').textContent  = pct+'%';

  let freeSegs = fMemBlocks.filter(b=>b.type==='free');
  document.getElementById('fFreeCount').textContent = freeSegs.length;
  if (isByteGranular) {
    document.getElementById('fFreeList').innerHTML = freeSegs.map(b=>`<div>• Base: ${b.start}KB | Tam: ${b.size}KB</div>`).join('');
  } else {
    document.getElementById('fFreeList').innerHTML = freeSegs.map(b=>`<div>• Bloque ${b.id} (${fBlockSize}KB)</div>`).join('');
  }

  let inRam = fProcs.filter(p=>p.memStart!==null && p.state !== 'done').length;
  document.getElementById('fq-ram').textContent = inRam;
}

function renderFResidents() {
  const el = document.getElementById('fResidentList');
  let inRamProcs = fProcs.filter(p=>p.memStart!==null && p.state !== 'done');
  if(!inRamProcs.length){ el.innerHTML='<div style="text-align:center;color:var(--text-soft);font-size:10px;padding:10px;">RAM vacía</div>'; return; }
  let currentExec = getCurrentExec();
  el.innerHTML = inRamProcs.map(p=>`
    <div class="resident-row ${p.name===currentExec?'executing':''}">
      <span style="background:${p.color};color:#fff;padding:1px 7px;border-radius:3px;font-size:9px;font-weight:800;font-family:var(--font-mono);">${p.name}</span>
      <span style="color:var(--text-soft);font-size:9px;font-family:var(--font-mono);">Cargado en: t=${p.memStart}ut</span>
      <span style="color:var(--teal);font-size:9px;">${p.memSize}KB</span>
    </div>`).join('');
}

function getCurrentExec() {
  return (currentRunningProc) ? currentRunningProc.name : null;
}

/* ── RENDER STATE TABLE ── */
function renderFStateTable() {
  const tbody = document.getElementById('fTableBody');
  if(!fProcs.length){
    tbody.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--text-soft);padding:20px;">Sin datos.</td></tr>';
    return;
  }
  tbody.innerHTML = fProcs.map(p => {
    let stateColor = {
      'pending':'var(--text-soft)', 'ready':'var(--blue)',
      'executing':'var(--green)', 'in-ram':'var(--teal)',
      'done':'var(--amber)', 'error':'var(--red)'
    }[p.state] || 'var(--text-soft)';
    let stateLabel = {
      'pending':'Espera de RAM','ready':'Listo (en RAM)','executing':'Ejecutando',
      'in-ram':'En RAM','done':'Terminado','error':'RAM insuficiente'
    }[p.state] || p.state;
    let ramState = p.memStart!==null ? `<span style="color:var(--teal)">${p.memSize}KB</span>` : `<span style="color:var(--text-soft)">—</span>`;
    return `<tr>
      <td><span style="background:${p.color};color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:800;">${p.name}</span></td>
      <td style="font-family:var(--font-mono)">${p.arrival}</td>
      <td style="font-family:var(--font-mono)">${p.burst}</td>
      <td style="font-family:var(--font-mono)">${p.priority}</td>
      <td style="font-family:var(--font-mono)">${p.memSize}</td>
      <td style="color:${stateColor};font-weight:700;font-size:11px;">${stateLabel}</td>
      <td>${ramState}</td>
      <td style="font-family:var(--font-mono)">${p.startTime!==null?p.startTime+'ut':'—'}</td>
      <td style="font-family:var(--font-mono)">${p.endTime!==null?p.endTime+'ut':'—'}</td>
      <td style="font-family:var(--font-mono);color:var(--amber)">${p.waitTime!==null?p.waitTime+'ut':'—'}</td>
    </tr>`;
  }).join('');
}

/* ── BARCODE ── */
function renderFBarcodeDynamic(step) {
  const track = document.getElementById('fBarcodeTrack');
  if(!fDynamicTimeline.length) return;
  let total = Math.max(step, 1);
  let html  = '';
  fDynamicTimeline.forEach(seg => {
    let renderEnd = Math.min(seg.end, step);
    let duration = renderEnd - seg.start;
    if(duration > 0) {
      let pct = (duration / total * 100).toFixed(2);
      let bg = seg.name==='IDLE' ? '#1a1f2e' : fColorMap[seg.name];
      html += `<div class="bc-seg" style="width:${pct}%;background:${bg};" title="${seg.name}: ${seg.start}ut - ${seg.end}ut">
        ${parseFloat(pct)>4?seg.name:''}
      </div>`;
    }
  });
  track.innerHTML = html || '<div style="flex:1;background:var(--surface);"></div>';
  document.getElementById('fTimelineLabel').textContent = `${step} ut`;
}

/* ── UPDATE CIRCULAR GAUGES ── */
function updateGauges() {
  const procRing = document.getElementById('fGaugeProcRing');
  const ramRing  = document.getElementById('fGaugeRamRing');
  const procNum  = document.getElementById('fGaugeProcNum');
  const ramNum   = document.getElementById('fGaugeRamNum');

  const circ = 144.51; // Circunferencia del anillo r=23

  // 1. Progreso de Simulación (Procesos resueltos / Total)
  // "Resuelto" = terminado exitosamente o descartado por RAM insuficiente,
  // así el anillo siempre puede llegar al 100% al cerrar la simulación.
  const total    = fProcs.length;
  const resolved = fProcs.filter(p => p.state === 'done' || p.state === 'error').length;
  const procPct  = total > 0 ? (resolved / total) * 100 : 0;

  if (procRing && procNum) {
    let offset = circ - (procPct / 100) * circ;
    procRing.style.strokeDashoffset = offset;
    procNum.textContent = Math.round(procPct) + '%';
  }

  // 2. Porcentaje de RAM Utilizada
  let used = 0;
  if (fAllocType === 'contigua' || fAllocType === 'extension') {
    used = fMemBlocks.filter(b=>b.type==='allocated').reduce((a,b)=>a+b.size,0);
  } else {
    used = fMemBlocks.filter(b=>b.type==='allocated').length * fBlockSize;
  }
  const ramPct = fMemTotal > 0 ? (used / fMemTotal) * 100 : 0;

  if (ramRing && ramNum) {
    let offset = circ - (ramPct / 100) * circ;
    ramRing.style.strokeDashoffset = offset;
    ramNum.textContent = Math.round(ramPct) + '%';
  }
}
