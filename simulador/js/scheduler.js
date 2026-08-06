/**
 * scheduler.js
 * ─────────────────────────────────────────────────────────
 * Responsabilidad única: la política de planificación de CPU.
 * selectNextProcessDynamic() decide, en cada unidad de tiempo, qué
 * proceso (ya residente en RAM) debe ocupar la CPU, según la política
 * activa: FCFS, SJF, SRT, Prioridad o Round Robin.
 *
 * No conoce nada de memoria: solo trabaja sobre procesos que ya
 * tienen memStart !== null (ya fueron asignados por memoryAllocator.js).
 * ─────────────────────────────────────────────────────────
 */

/* ── DISPATCHER DE PLANIFICACIÓN DINÁMICO ── */
function selectNextProcessDynamic(t) {
  // Solo consideramos procesos que ya están cargados exitosamente en la RAM
  let eligible = fProcs.filter(p => p.memStart !== null && p.remaining > 0);
  if (eligible.length === 0) {
    currentRunningProc = null;
    return null;
  }

  if (fPolicy === 'FCFS') {
    // Primero el que llegó antes a la cola de listos (su memStart)
    eligible.sort((a,b) => a.memStart - b.memStart || a.arrival - b.arrival || a.name.localeCompare(b.name));
    return eligible[0];
  }

  if (fPolicy === 'SJF') {
    // Si ya hay uno ejecutándose y no es apropiativo, mantenerlo
    if (currentRunningProc && currentRunningProc.remaining > 0 && currentRunningProc.state === 'executing') {
      return currentRunningProc;
    }
    // De lo contrario, elegir el de menor ráfaga total
    eligible.sort((a,b) => a.burst - b.burst || a.arrival - b.arrival);
    return eligible[0];
  }

  if (fPolicy === 'SRT') {
    // Apropiativo por tiempo restante menor
    eligible.sort((a,b) => a.remaining - b.remaining || a.arrival - b.arrival);
    return eligible[0];
  }

  if (fPolicy === 'PRIORITY') {
    // No apropiativo por prioridad (números más bajos tienen mayor prioridad)
    if (currentRunningProc && currentRunningProc.remaining > 0 && currentRunningProc.state === 'executing') {
      return currentRunningProc;
    }
    eligible.sort((a,b) => a.priority - b.priority || a.arrival - b.arrival);
    return eligible[0];
  }

  if (fPolicy === 'RR') {
    // Añadir nuevos elegibles a la cola FIFO del Round Robin
    eligible.forEach(p => {
      if (!rrQueue.includes(p.name)) {
        rrQueue.push(p.name);
      }
    });

    // Limpiar cola de procesos que ya no están elegibles
    rrQueue = rrQueue.filter(name => eligible.some(p => p.name === name));

    if (rrQueue.length === 0) return null;

    // Verificar quantum (Quantum = 3 ut)
    if (currentRunningProc && rrQueue[0] === currentRunningProc.name && rrQuantumSpent < 3) {
      return currentRunningProc;
    } else {
      if (currentRunningProc && rrQuantumSpent >= 3) {
        // Fin de quantum: rotar cola
        let completed = rrQueue.shift();
        rrQueue.push(completed);
        fLog('exec', `Quantum completado para ${currentRunningProc.name}`, `Cambio de contexto. Se rota al final de la cola.`);
        contextSwitchesCount++;
      }
      rrQuantumSpent = 0;
      let nextName = rrQueue[0];
      return eligible.find(p => p.name === nextName);
    }
  }
  return null;
}
