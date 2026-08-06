/**
 * memoryAllocator.js
 * ─────────────────────────────────────────────────────────
 * Responsabilidad única: todo lo relativo a la gestión de memoria.
 * Incluye:
 *   - Validación de factibilidad de una solicitud (fIsRequestFeasible)
 *   - Inicialización del mapa de memoria (fusionInitMemory)
 *   - Los 7 motores de asignación: contigua (First/Best/Worst/Buddy),
 *     enlazada, indexada, indexada multinivel, FAT, por extensión y
 *     mapa de bits (fTryAllocate + fPickContiguousTarget)
 *   - Liberación y recompactación de memoria (fDeallocate, fCoalesce,
 *     fCoalesceBuddy)
 *
 * Este módulo no toca el DOM directamente salvo para leer los valores
 * de configuración de memoria (fMemTotal, fBlockSize); el renderizado
 * del mapa de memoria vive en render.js.
 * ─────────────────────────────────────────────────────────
 */

/* ── FACTIBILIDAD DE ASIGNACIÓN ──
   Un proceso cuyo tamaño nunca podrá satisfacerse (incluso con toda
   la RAM libre) se marcaba antes como "pending" para siempre y la
   simulación jamás llegaba al 100%. Ahora se detecta de antemano. */
function fIsRequestFeasible(proc) {
  if (fAllocType === 'contigua' || fAllocType === 'extension') {
    return proc.memSize <= fMemTotal;
  }
  let maxBlocks = Math.max(1, Math.floor(fMemTotal / fBlockSize));
  let dataBlocksNeeded = Math.ceil(proc.memSize / fBlockSize);
  if (fAllocType === 'enlazada') return dataBlocksNeeded <= maxBlocks;
  if (fAllocType === 'indexada') return (dataBlocksNeeded + 1) <= maxBlocks;
  if (fAllocType === 'fat')      return dataBlocksNeeded <= maxBlocks; // la FAT en sí se modela como metadato aparte
  if (fAllocType === 'bitmap')   return dataBlocksNeeded <= maxBlocks;
  if (fAllocType === 'multinivel') {
    let secondNeeded = Math.max(1, Math.ceil(dataBlocksNeeded / F_SECOND_LEVEL_CAP));
    return (dataBlocksNeeded + secondNeeded + 1) <= maxBlocks; // +1 índice maestro
  }
  return true;
}

/* ── INIT MEMORY ── */
const F_ALLOC_LABEL = {
  contigua:'Contigua', enlazada:'Enlazada', indexada:'Indexada',
  multinivel:'Indexada multinivel', fat:'FAT', extension:'Por extensión', bitmap:'Mapa de bits'
};
function fusionInitMemory() {
  fMemTotal  = parseInt(document.getElementById('fMemTotal').value) || 2048;
  fBlockSize = Math.max(8, parseInt(document.getElementById('fBlockSize').value) || 64);
  document.getElementById('fMemTotalLabel').textContent = fMemTotal;
  document.getElementById('fMemStatus').textContent = 'Inicializada · ' + F_ALLOC_LABEL[fAllocType];

  if (fAllocType === 'contigua' || fAllocType === 'extension') {
    fMemBlocks = [{ id:1, start:0, size:fMemTotal, type:'free', process:null }];
  } else {
    // memoria dividida en bloques fijos fBlockSize (enlazada / indexada / multinivel / fat / bitmap)
    let n = Math.max(1, Math.floor(fMemTotal / fBlockSize));
    fMemBlocks = [];
    for (let i = 0; i < n; i++) {
      fMemBlocks.push({
        id:i+1, start:i*fBlockSize, size:fBlockSize, type:'free', process:null,
        role:null, nextBlockId:null, parentId:null, childIds:[]
      });
    }
  }
  renderFMemMap();
  updateFMemStats();
}

/* ── ALLOCATION ENGINES ── */
function fTryAllocate(proc) {

  /* 1) CONTIGUA — un único bloque, con First/Best/Worst Fit o Buddy */
  if (fAllocType === 'contigua') {
    let target = fPickContiguousTarget(proc.memSize, fMemAlgo, true);
    if (!target) return false;
    let idx = fMemBlocks.indexOf(target);
    if (fMemAlgo !== 'buddy' && target.size > proc.memSize) {
      let newFree = {id:Date.now(), start:target.start+proc.memSize, size:target.size-proc.memSize, type:'free', process:null};
      fMemBlocks.splice(idx+1, 0, newFree);
      target.size = proc.memSize;
    }
    target.type = 'allocated';
    target.process = proc.name;
    return true;

  /* 2) POR EXTENSIÓN — intenta un solo tramo contiguo (según algoritmo elegido);
        si no cabe entero, reparte en el menor número de fragmentos grandes */
  } else if (fAllocType === 'extension') {
    let single = fPickContiguousTarget(proc.memSize, fMemAlgo === 'buddy' ? 'first' : fMemAlgo, false);
    if (single) {
      let idx = fMemBlocks.indexOf(single);
      if (single.size > proc.memSize) {
        let newFree = {id:Date.now()+Math.random(), start:single.start+proc.memSize, size:single.size-proc.memSize, type:'free', process:null};
        fMemBlocks.splice(idx+1, 0, newFree);
        single.size = proc.memSize;
      }
      single.type = 'allocated'; single.process = proc.name; single.extentIndex = 1;
      return true;
    }
    let totalFree = fMemBlocks.filter(b=>b.type==='free').reduce((a,b)=>a+b.size,0);
    if (totalFree < proc.memSize) return false;
    let remaining = proc.memSize, n = 0;
    while (remaining > 0) {
      let cands = fMemBlocks.filter(b => b.type==='free' && b.size>0);
      cands.sort((a,b)=>b.size-a.size);
      let target = cands[0];
      let idx = fMemBlocks.indexOf(target);
      let take = Math.min(target.size, remaining);
      if (take < target.size) {
        let newFree = {id:Date.now()+Math.random()+n, start:target.start+take, size:target.size-take, type:'free', process:null};
        fMemBlocks.splice(idx+1, 0, newFree);
        target.size = take;
      }
      n++;
      target.type = 'allocated'; target.process = proc.name; target.extentIndex = n;
      remaining -= take;
    }
    return true;

  /* 3) ENLAZADA / FAT — misma cadena de bloques dispersos; sólo cambia
        dónde se "ve" el puntero (embebido en el bloque, o en tabla aparte) */
  } else if (fAllocType === 'enlazada' || fAllocType === 'fat') {
    let blocksNeeded = Math.ceil(proc.memSize / fBlockSize);
    let freeBlocks = fMemBlocks.filter(b => b.type === 'free');
    if (freeBlocks.length < blocksNeeded) return false;
    let allocated = freeBlocks.slice(0, blocksNeeded);
    for (let i = 0; i < blocksNeeded; i++) {
      let b = allocated[i];
      b.type = 'allocated'; b.process = proc.name; b.role = 'data';
      b.nextBlockId = (i < blocksNeeded - 1) ? allocated[i+1].id : null;
    }
    return true;

  /* 4) INDEXADA — 1 bloque índice de un solo nivel + bloques de datos */
  } else if (fAllocType === 'indexada') {
    let dataBlocksNeeded = Math.ceil(proc.memSize / fBlockSize);
    let totalNeeded = dataBlocksNeeded + 1;
    let freeBlocks = fMemBlocks.filter(b => b.type === 'free');
    if (freeBlocks.length < totalNeeded) return false;

    let indexBlock = freeBlocks[0];
    indexBlock.type = 'allocated'; indexBlock.process = proc.name; indexBlock.role = 'index';

    let dataBlocks = freeBlocks.slice(1, totalNeeded);
    dataBlocks.forEach(b => { b.type='allocated'; b.process=proc.name; b.role='data'; b.parentId=indexBlock.id; });
    indexBlock.childIds = dataBlocks.map(b=>b.id);
    return true;

  /* 5) INDEXADA MULTINIVEL — 1 índice maestro → N índices de 2º nivel → datos */
  } else if (fAllocType === 'multinivel') {
    let dataBlocksNeeded = Math.ceil(proc.memSize / fBlockSize);
    let secondNeeded = Math.max(1, Math.ceil(dataBlocksNeeded / F_SECOND_LEVEL_CAP));
    let totalNeeded = dataBlocksNeeded + secondNeeded + 1;
    let freeBlocks = fMemBlocks.filter(b => b.type === 'free');
    if (freeBlocks.length < totalNeeded) return false;

    let master = freeBlocks[0];
    master.type = 'allocated'; master.process = proc.name; master.role = 'master'; master.childIds = [];

    let cursor = 1, dataRemaining = dataBlocksNeeded;
    for (let s = 0; s < secondNeeded; s++) {
      let secondBlk = freeBlocks[cursor++];
      secondBlk.type = 'allocated'; secondBlk.process = proc.name; secondBlk.role = 'second';
      secondBlk.parentId = master.id; secondBlk.childIds = [];
      master.childIds.push(secondBlk.id);
      let take = Math.min(F_SECOND_LEVEL_CAP, dataRemaining);
      for (let d = 0; d < take; d++) {
        let dataBlk = freeBlocks[cursor++];
        dataBlk.type = 'allocated'; dataBlk.process = proc.name; dataBlk.role = 'data'; dataBlk.parentId = secondBlk.id;
        secondBlk.childIds.push(dataBlk.id);
      }
      dataRemaining -= take;
    }
    return true;

  /* 6) MAPA DE BITS — racha contigua de bloques libres localizada explorando
        el vector de bits (first-fit sobre bits en 0) */
  } else if (fAllocType === 'bitmap') {
    let dataBlocksNeeded = Math.ceil(proc.memSize / fBlockSize);
    let n = fMemBlocks.length, start = -1;
    for (let i = 0; i <= n - dataBlocksNeeded; i++) {
      let ok = true;
      for (let k = 0; k < dataBlocksNeeded; k++) {
        if (fMemBlocks[i+k].type !== 'free') { ok = false; break; }
      }
      if (ok) { start = i; break; }
    }
    if (start === -1) return false;
    for (let k = start; k < start + dataBlocksNeeded; k++) {
      fMemBlocks[k].type = 'allocated'; fMemBlocks[k].process = proc.name; fMemBlocks[k].role = 'data';
    }
    return true;
  }
  return false;
}

/* Búsqueda de un hueco contiguo único (usada por Contigua y por el
   primer intento de Por Extensión). allowBuddy habilita el algoritmo Buddy. */
function fPickContiguousTarget(size, algo, allowBuddy) {
  let target = null;
  if (algo === 'first') {
    target = fMemBlocks.find(b => b.type==='free' && b.size>=size);
  } else if (algo === 'best') {
    let cands = fMemBlocks.filter(b => b.type==='free' && b.size>=size);
    cands.sort((a,b)=>a.size-b.size);
    target = cands[0];
  } else if (algo === 'worst') {
    let cands = fMemBlocks.filter(b => b.type==='free' && b.size>=size);
    cands.sort((a,b)=>b.size-a.size);
    target = cands[0];
  } else if (algo === 'buddy' && allowBuddy) {
    let needed = Math.pow(2, Math.ceil(Math.log2(size)));
    needed = Math.max(32, needed);
    target = fMemBlocks.find(b => b.type==='free' && b.size>=needed);
    if (target) {
      while (target.size > needed) {
        let idx = fMemBlocks.indexOf(target);
        let half = target.size/2;
        target.size = half;
        let buddy = { id:Date.now()+idx, start:target.start+half, size:half, type:'free', process:null };
        fMemBlocks.splice(idx+1, 0, buddy);
      }
    }
  }
  return target || null;
}

function fDeallocate(procName) {
  if (fAllocType === 'contigua') {
    let blk = fMemBlocks.find(b => b.process === procName);
    if (!blk) return;
    blk.type = 'free';
    blk.process = null;
    if (fMemAlgo === 'buddy') {
      fCoalesceBuddy();
    } else {
      fCoalesce();
    }
  } else if (fAllocType === 'extension') {
    fMemBlocks.forEach(b => {
      if (b.process === procName) { b.type='free'; b.process=null; b.extentIndex=null; }
    });
    fCoalesce();
  } else {
    // enlazada, indexada, multinivel, fat, bitmap: liberar todos los bloques fijos asociados
    fMemBlocks.forEach(b => {
      if (b.process === procName) {
        b.type = 'free'; b.process = null; b.role = null;
        b.nextBlockId = null; b.parentId = null; b.childIds = [];
      }
    });
  }
}

function fCoalesce() {
  for(let i=0;i<fMemBlocks.length-1;i++){
    if(fMemBlocks[i].type==='free'&&fMemBlocks[i+1].type==='free'){
      fMemBlocks[i].size+=fMemBlocks[i+1].size;
      fMemBlocks.splice(i+1,1); i--;
    }
  }
}

function fCoalesceBuddy() {
  let coalesced = true;
  while (coalesced) {
    coalesced = false;
    for (let i = 0; i < fMemBlocks.length - 1; i++) {
      let b1 = fMemBlocks[i];
      let b2 = fMemBlocks[i + 1];
      if (b1.type === 'free' && b2.type === 'free' && b1.size === b2.size) {
        let buddySize = b1.size * 2;
        if (b1.start % buddySize === 0 && b2.start === b1.start + b1.size) {
          b1.size = buddySize;
          fMemBlocks.splice(i + 1, 1);
          coalesced = true;
          break;
        }
      }
    }
  }
}
