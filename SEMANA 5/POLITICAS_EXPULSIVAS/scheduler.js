// ============================================
// SCHEDULER - Algoritmos Expulsivos (SRT y RR)
// ============================================
// Este archivo contiene la lógica de simulación de planificación de CPU
// con algoritmos expulsivos: SRT (Shortest Remaining Time) y RR (Round Robin)

// ==================== VARIABLES GLOBALES ====================
let currentPolicy = null;              // Almacena la política seleccionada ('srt' o 'rr')
let processes = [];                    // Array de procesos a simular
let simulationResults = null;          // Resultados de la simulación (métricas y timeline)
let isSimulating = false;              // Indica si la simulación está en progreso
let isPaused = false;                  // Indica si la simulación está pausada
let currentTime = 0;                   // Tiempo actual en la simulación
let currentStep = 0;                   // Paso actual en el timeline (para navegación)
let simulationSpeed = 1;               // Velocidad de reproducción (1x, 2x, 3x, etc.)
let executionTimeline = [];            // Timeline de ejecución (array de eventos)

// ==================== UI CONTROLS ====================
// Maneja la selección de la política de planificación (SRT o RR)
function selectPolicy(btn) {
  // Deseleccionar todos los botones de política
  document.querySelectorAll('.policy-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentPolicy = btn.dataset.policy; // Guardamos la política seleccionada
  
  // Descripción detallada de cada algoritmo
  const descriptions = {
    srt: `<strong>SRT (Shortest Remaining Time)</strong><br>
          Algoritmo expulsivo que siempre ejecuta el proceso con el menor tiempo de CPU restante. 
          Si llega un proceso con menos tiempo que lo que falta del actual, lo desplaza (expulsa).
          <br><strong>Ventajas:</strong> Minimiza tiempo de espera promedio<br>
          <strong>Desventajas:</strong> Riesgo de inanición para procesos largos`,
    rr: `<strong>Round Robin (RR)</strong><br>
         Algoritmo expulsivo que asigna a cada proceso un quantum (intervalo de tiempo).
         Si el proceso no termina, se envía al final de la cola.
         <br><strong>Ventajas:</strong> Justo para todos los procesos<br>
         <strong>Desventajas:</strong> Mayor tiempo de espera promedio si quantum es pequeño`
  };
  
  // Mostrar la descripción del algoritmo seleccionado
  document.getElementById('policyInfo').innerHTML = descriptions[currentPolicy];
  
  // Para RR mostramos el campo de quantum (tiempo por proceso)
  // Para SRT lo ocultamos porque no lo necesita
  if (currentPolicy === 'rr') {
    document.getElementById('quantumGroup').style.display = 'block';
  } else {
    document.getElementById('quantumGroup').style.display = 'none';
  }
}

// Cambia entre los tabs de "Ingreso Manual" y "Cargar Archivo"
function switchTab(btn, tabName) {
  // Deseleccionar todos los tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  // Ocultar todo el contenido de tabs
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  
  // Activar el tab clickeado
  btn.classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

// Agrega un nuevo proceso a la lista
function addProcess() {
  // Validar que hay una política seleccionada
  if (!currentPolicy) {
    alert('Selecciona una política primero');
    return;
  }
  
  // Obtener datos del formulario
  const name = document.getElementById('processName').value.trim();
  const arrival = parseInt(document.getElementById('arrivalTime').value) || 0;
  const burst = parseInt(document.getElementById('burstTime').value) || 1;
  
  // Validar que el nombre no esté vacío
  if (!name) {
    alert('Ingresa un nombre para el proceso');
    return;
  }
  
  // Validar que no exista un proceso con el mismo nombre
  if (processes.find(p => p.name === name)) {
    alert('Ya existe un proceso con ese nombre');
    return;
  }
  
  // Agregar el proceso al array con su tiempo restante inicial = ráfaga
  processes.push({ name, arrival, burst, remaining: burst });
  updateProcessList(); // Actualizar visualización
  
  // Auto-llenar el siguiente nombre de proceso (P1, P2, P3, etc.)
  const nextNum = Math.max(...processes.map(p => parseInt(p.name.replace('P', '')) || 0)) + 1;
  document.getElementById('processName').value = 'P' + nextNum;
  document.getElementById('arrivalTime').value = arrival;
  document.getElementById('burstTime').value = 5;
}

// Limpia la lista de procesos y reinicia la simulación
function clearProcesses() {
  processes = [];
  updateProcessList();
  resetSimulation();
}

// Actualiza la visualización de la lista de procesos en el textarea
function updateProcessList() {
  const display = processes.map(p => `${p.name}: Llegada=${p.arrival}, Ráfaga=${p.burst}`).join('\n');
  document.getElementById('processListDisplay').value = display || '(Vacío)';
}

// Carga procesos desde un archivo TXT
function loadFromFile() {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    document.getElementById('filePreview').value = content; // Mostrar contenido del archivo
    
    // Procesar cada línea del archivo (formato: Nombre,Llegada,Ráfaga)
    const lines = content.trim().split('\n');
    processes = [];
    
    lines.forEach(line => {
      const [name, arrivalStr, burstStr] = line.split(',').map(s => s.trim());
      if (name && arrivalStr !== undefined && burstStr !== undefined) {
        const arrival = parseInt(arrivalStr);
        const burst = parseInt(burstStr);
        // Validar que sean números válidos
        if (!isNaN(arrival) && !isNaN(burst)) {
          processes.push({ name, arrival, burst, remaining: burst });
        }
      }
    });
    
    // Validar que se hayan cargado procesos
    if (processes.length === 0) {
      alert('No se encontraron procesos válidos en el archivo');
      return;
    }
    
    updateProcessList();
    // Cambiar al tab de ingreso manual para mostrar los procesos cargados
    document.querySelectorAll('.tab-btn')[0].click();
  };
  reader.readAsText(file);
}

// Inicia la simulación con la política seleccionada
function startSimulation() {
  // Validaciones previas
  if (processes.length === 0) {
    alert('Agrega procesos antes de simular');
    return;
  }
  
  if (!currentPolicy) {
    alert('Selecciona una política');
    return;
  }
  
  // Validar política seleccionada
  if (currentPolicy === 'rr' && processes.length === 0) {
    alert('Ingresa procesos para simular');
    return;
  }
  
  // Limpiar simulación anterior
  resetSimulation();
  isSimulating = true;
  
  // Mostrar controles de simulación (pausa, velocidad, etc.)
  document.getElementById('pauseBtn').style.display = 'inline-flex';
  document.getElementById('controlsContainer').style.display = 'flex';
  document.getElementById('timeDisplay').style.display = 'block';
  
  // Ejecutar la simulación según la política seleccionada
  // JSON.parse(JSON.stringify()) crea una copia profunda de los procesos
  if (currentPolicy === 'srt') {
    simulationResults = runSRT(JSON.parse(JSON.stringify(processes)));
  } else if (currentPolicy === 'rr') {
    const quantum = parseInt(document.getElementById('globalQuantum').value) || 3;
    simulationResults = runRoundRobin(JSON.parse(JSON.stringify(processes)), quantum);
  }
  
  // Guardar el timeline de ejecución para navegación
  executionTimeline = simulationResults.timeline;
  // Mostrar los resultados
  displayResults();
}

// Pausa o reanuda la simulación
function pauseSimulation() {
  isPaused = !isPaused;
  // Cambiar el texto del botón según el estado
  document.getElementById('pauseBtn').textContent = isPaused ? '▶ Reanudar' : '⏸ Pausar';
}

// Reinicia la simulación y limpia el estado
function resetSimulation() {
  isSimulating = false;
  isPaused = false;
  currentTime = 0;
  currentStep = 0;
  
  // Ocultar elementos de control y resultados
  document.getElementById('pauseBtn').style.display = 'none';
  document.getElementById('pauseBtn').textContent = '⏸ Pausar';
  document.getElementById('controlsContainer').style.display = 'none';
  document.getElementById('timeDisplay').style.display = 'none';
  document.getElementById('resultsCard').style.display = 'none';
  
  // Reiniciar el tiempo restante de cada proceso a su valor original (ráfaga)
  processes.forEach(p => p.remaining = p.burst);
}

// Avanza un paso en la simulación
function nextStep() {
  if (executionTimeline.length === 0) return;
  // Limitar el paso al final del timeline
  currentStep = Math.min(currentStep + 1, executionTimeline.length - 1);
  updateTimelineDisplay();
}

// Retrocede un paso en la simulación
function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    updateTimelineDisplay();
  }
}

// Actualiza la velocidad de reproducción
function updateSpeed() {
  simulationSpeed = parseFloat(document.getElementById('speedSlider').value);
  document.getElementById('speedValue').textContent = simulationSpeed.toFixed(2) + 'x';
}

// Actualiza la visualización del timeline según el paso actual
function updateTimelineDisplay() {
  if (executionTimeline.length === 0) return;
  
  // Obtener eventos hasta el paso actual
  const events = executionTimeline.slice(0, currentStep + 1);
  let lastTime = 0;
  
  // Calcular el tiempo actual basado en el último evento
  if (events.length > 0) {
    lastTime = events[events.length - 1].time;
  }
  
  // Actualizar display de tiempo
  document.getElementById('currentTime').textContent = lastTime;
  // Redibujar el Gantt con los eventos hasta este punto
  displayGanttChart(events);
}

// Muestra los resultados de la simulación
function displayResults() {
  // Mostrar la tarjeta de resultados
  document.getElementById('resultsCard').style.display = 'block';
  
  if (!simulationResults) return;
  
  // Mostrar el diagrama de Gantt completo
  displayGanttChart(executionTimeline);
  
  // Mostrar las métricas (tiempo total, espera promedio, etc.)
  displayMetrics(simulationResults);
  
  // Mostrar la tabla de detalles por proceso
  displayResultsTable(simulationResults);
}

// Dibuja el diagrama de Gantt en formato tabla
// Mostrará qué proceso se ejecuta en cada unidad de tiempo
function displayGanttChart(timeline) {
  const gantt = document.getElementById('ganttChart');
  gantt.innerHTML = ''; // Limpiar contenido anterior
  
  // Mostrar mensaje si el timeline está vacío
  if (!timeline || timeline.length === 0) {
    gantt.innerHTML = '<div style="padding:20px;text-align:center;color:#5a6080;">Sin ejecutar aún...</div>';
    return;
  }
  
  // Calcular el tiempo máximo de la simulación
  const maxTime = timeline.length > 0 ? Math.max(...timeline.map(e => e.time + (e.duration || 1))) : 10;
  
  // Generar colores para cada proceso
  const colors = generateColors(processes.length);
  const processColorMap = {}; // Mapeo de nombre de proceso -> color
  
  // Asignar un color único a cada proceso
  processes.forEach((p, i) => {
    processColorMap[p.name] = colors[i];
  });
  
  // ===== Crear tabla HTML =====
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.backgroundColor = '#fafbfe';
  
  // ===== Encabezado con escala de tiempo =====
  const headerRow = table.insertRow();
  
  // Primera celda: "Proceso"
  const headerCell = headerRow.insertCell();
  headerCell.textContent = 'Proceso';
  headerCell.style.fontWeight = '600';
  headerCell.style.padding = '10px';
  headerCell.style.border = '1.5px solid #cdd2e4';
  headerCell.style.background = '#0c9488';
  headerCell.style.color = 'white';
  headerCell.style.fontSize = '12px';
  headerCell.style.textTransform = 'uppercase';
  headerCell.style.letterSpacing = '0.4px';
  
  // Crear columnas para cada unidad de tiempo (0, 1, 2, ..., maxTime)
  for (let t = 0; t <= maxTime; t++) {
    const cell = headerRow.insertCell();
    cell.textContent = t;
    cell.style.fontWeight = '600';
    cell.style.padding = '8px';
    cell.style.textAlign = 'center';
    cell.style.border = '1.5px solid #cdd2e4';
    cell.style.background = '#0c9488';
    cell.style.color = 'white';
    cell.style.minWidth = '40px';
    cell.style.fontSize = '11px';
  }
  
  // ===== Filas por cada proceso =====
  processes.forEach(p => {
    const row = table.insertRow();
    
    // Primera celda: nombre del proceso
    const nameCell = row.insertCell();
    nameCell.textContent = p.name;
    nameCell.style.fontWeight = '600';
    nameCell.style.padding = '10px';
    nameCell.style.border = '1.5px solid #cdd2e4';
    nameCell.style.background = '#f9fafb';
    nameCell.style.color = '#1e2132';
    nameCell.style.fontSize = '13px';
    
    // Crear celdas para cada unidad de tiempo
    for (let t = 0; t <= maxTime; t++) {
      const cell = row.insertCell();
      cell.style.padding = '5px';
      cell.style.border = '1.5px solid #cdd2e4';
      cell.style.minWidth = '40px';
      cell.style.height = '40px';
      cell.style.textAlign = 'center';
      cell.style.backgroundColor = '#ffffff';
      
      // Buscar si este proceso se ejecutó en este tiempo
      const activity = timeline.find(tl => tl.process === p.name && tl.time === t);
      if (activity) {
        // Si hay actividad, colorear la celda con el color del proceso
        cell.style.background = processColorMap[p.name];
        cell.style.color = 'white';
        cell.style.fontWeight = '600';
        cell.style.fontSize = '12px';
        cell.textContent = p.name;
      }
    }
  });
  
  // Agregar la tabla al contenedor
  gantt.appendChild(table);
}

// Muestra las métricas de desempeño de la simulación
function displayMetrics(results) {
  const metricsGrid = document.getElementById('metricsGrid');
  metricsGrid.innerHTML = ''; // Limpiar métricas anteriores
  
  // Array de métricas a mostrar
  const metrics = [
    { label: 'Tiempo Total', value: results.totalTime, unit: 'ut' },           // Tiempo que toma completar todos los procesos
    { label: 'Espera Promedio', value: results.avgWaitTime.toFixed(2), unit: 'ut' },    // Promedio de tiempo que espera cada proceso
    { label: 'Retorno Promedio', value: results.avgTurnAroundTime.toFixed(2), unit: 'ut' }, // Promedio del tiempo desde llegada hasta terminación
    { label: 'CPU Utilizado', value: results.cpuUtilization.toFixed(1), unit: '%' },   // Porcentaje de tiempo que la CPU está activa
    { label: 'Procesos', value: results.processCount, unit: '' },              // Cantidad de procesos simulados
    { label: 'Cambios Contexto', value: results.contextSwitches, unit: '' }    // Cuántas veces se cambió de proceso
  ];
  
  // Crear una tarjeta para cada métrica
  metrics.forEach(m => {
    const card = document.createElement('div');
    card.className = 'metric-card';
    card.innerHTML = `
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value} <span style="font-size:14px;">${m.unit}</span></div>
    `;
    metricsGrid.appendChild(card);
  });
}

// Muestra la tabla detallada de resultados por cada proceso
function displayResultsTable(results) {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = ''; // Limpiar tabla anterior
  
  // Crear una fila para cada proceso con sus detalles
  results.processes.forEach(p => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${p.name}</strong></td>
      <td>${p.arrival}</td>
      <td>${p.burst}</td>
      <td>${p.startTime}</td>
      <td>${p.endTime}</td>
      <td>${p.waitTime}</td>
      <td>${p.turnAroundTime}</td>
      <td><span class="status-badge completed">✓ Completado</span></td>
    `;
    tbody.appendChild(row);
  });
}

// Exporta los resultados de la simulación a un archivo CSV
function exportResults() {
  if (!simulationResults) return;
  
  // Construir el contenido del archivo CSV
  let csv = 'Simulación de Planificación de CPU\n';
  csv += `Política: ${currentPolicy.toUpperCase()}\n`;
  csv += `Fecha: ${new Date().toLocaleString()}\n\n`;
  
  // Agregar métricas generales
  csv += 'Métricas Generales:\n';
  csv += `Tiempo Total,${simulationResults.totalTime}\n`;
  csv += `Espera Promedio,${simulationResults.avgWaitTime.toFixed(2)}\n`;
  csv += `Retorno Promedio,${simulationResults.avgTurnAroundTime.toFixed(2)}\n`;
  csv += `Utilización CPU,${simulationResults.cpuUtilization.toFixed(1)}%\n`;
  csv += `Cambios de Contexto,${simulationResults.contextSwitches}\n\n`;
  
  // Agregar detalles por proceso
  csv += 'Detalles por Proceso:\n';
  csv += 'Proceso,Tiempo de Llegada,Ráfaga,Inicio,Fin,Espera,Retorno\n';
  
  simulationResults.processes.forEach(p => {
    csv += `${p.name},${p.arrival},${p.burst},${p.startTime},${p.endTime},${p.waitTime},${p.turnAroundTime}\n`;
  });
  
  // Crear y descargar el archivo
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simulacion_${currentPolicy}_${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ==================== ALGORITMOS ====================

/**
 * ALGORITMO SRT (Shortest Remaining Time)
 * 
 * Selecciona siempre el proceso con el menor tiempo de CPU restante.
 * Es un algoritmo EXPULSIVO, lo que significa que puede interrumpir un proceso
 * si llega uno con menos tiempo restante.
 * 
 * CARACTERÍSTICAS:
 * - Óptimo para minimizar el tiempo de espera promedio
 * - Puede causar INANICIÓN (starvation) en procesos largos
 * - Requiere conocer el tiempo de ráfaga exacto (poco realista)
 */
function runSRT(procs) {
  // Ordenar procesos por tiempo de llegada
  procs.sort((a, b) => a.arrival - b.arrival);
  
  let currentTime = 0;          // Tiempo actual de simulación
  let completed = 0;            // Procesos completados
  let timeline = [];            // Timeline de ejecución (qué proceso en qué tiempo)
  const processData = {};       // Datos de cada proceso (inicio, fin, espera, etc.)
  let contextSwitches = 0;      // Contador de cambios de proceso
  let lastProcess = null;       // Último proceso ejecutado (para detectar cambios)
  
  // Inicializar datos de cada proceso
  procs.forEach(p => {
    processData[p.name] = {
      name: p.name,
      arrival: p.arrival,
      burst: p.burst,
      startTime: null,          // Cuando comienza a ejecutarse
      endTime: null,            // Cuando termina
      waitTime: 0,              // Tiempo que estuvo esperando
      turnAroundTime: 0         // Tiempo desde llegada hasta terminación
    };
  });
  
  // BUCLE PRINCIPAL: Hasta que todos los procesos terminen
  while (completed < procs.length) {
    // Obtener procesos disponibles en este tiempo
    // (han llegado y todavía no terminan)
    const available = procs.filter(p => p.arrival <= currentTime && p.remaining > 0);
    
    // Si no hay procesos disponibles, saltar al siguiente que llega
    if (available.length === 0) {
      const nextArrival = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.arrival));
      currentTime = nextArrival;
      continue;
    }
    
    // SELECCIONAR: Elegir el proceso con MENOR tiempo restante
    const selected = available.reduce((a, b) => a.remaining < b.remaining ? a : b);
    
    // Contar cambio de contexto (cuando cambiamos de proceso)
    if (lastProcess !== selected.name) {
      contextSwitches++;
      lastProcess = selected.name;
    }
    
    // Registrar el tiempo de inicio (solo la primera vez que se ejecuta)
    if (processData[selected.name].startTime === null) {
      processData[selected.name].startTime = currentTime;
    }
    
    // EJECUTAR: 1 unidad de tiempo
    selected.remaining--;
    currentTime++;
    
    // Agregar al timeline
    timeline.push({
      time: currentTime - 1,
      process: selected.name,
      duration: 1
    });
    
    // Verificar si el proceso terminó
    if (selected.remaining === 0) {
      processData[selected.name].endTime = currentTime;
      completed++;
      lastProcess = null;
    }
  }
  
  // CALCULAR MÉTRICAS después de la simulación
  let totalWait = 0;
  let totalTurnAround = 0;
  
  procs.forEach(p => {
    const data = processData[p.name];
    data.waitTime = data.startTime - p.arrival;              // Espera = Inicio - Llegada
    data.turnAroundTime = data.endTime - p.arrival;          // Retorno = Fin - Llegada
    totalWait += data.waitTime;
    totalTurnAround += data.turnAroundTime;
  });
  
  // RETORNAR RESULTADOS
  return {
    timeline,                                      // Qué proceso en qué tiempo
    processes: Object.values(processData),         // Detalles de cada proceso
    totalTime: currentTime,                        // Tiempo total de simulación
    avgWaitTime: totalWait / procs.length,        // Promedio de espera
    avgTurnAroundTime: totalTurnAround / procs.length,  // Promedio de retorno
    cpuUtilization: (currentTime / currentTime * 100),  // Utilización (siempre 100% si hay procesos)
    contextSwitches: contextSwitches,             // Cuántas veces cambió de proceso
    processCount: procs.length                    // Cantidad de procesos
  };
}

/**
 * ALGORITMO ROUND ROBIN (RR)
 * 
 * Cada proceso obtiene un quantum (intervalo) de tiempo.
 * Si no termina, va al final de la cola.
 * Es un algoritmo EXPULSIVO y MÁS JUSTO que SRT.
 * 
 * CARACTERÍSTICAS:
 * - Justo: todos los procesos obtienen tiempo de CPU
 * - Mayor tiempo de espera promedio
 * - Mejor para sistemas interactivos
 * - El quantum determina el comportamiento (pequeño = más cambios de contexto)
 */
function runRoundRobin(procs, quantum) {
  // Ordenar procesos por tiempo de llegada
  procs.sort((a, b) => a.arrival - b.arrival);
  
  let currentTime = 0;          // Tiempo actual de simulación
  let queue = [];               // Cola de procesos listos para ejecutar
  let timeline = [];            // Timeline de ejecución
  const processData = {};       // Datos de cada proceso
  let contextSwitches = 0;      // Contador de cambios de contexto
  
  // Inicializar datos de cada proceso
  procs.forEach(p => {
    processData[p.name] = {
      name: p.name,
      arrival: p.arrival,
      burst: p.burst,
      startTime: null,
      endTime: null,
      waitTime: 0,
      turnAroundTime: 0
    };
  });
  
  let completed = 0;  // Procesos completados
  
  // BUCLE PRINCIPAL: Hasta que todos los procesos terminen
  while (completed < procs.length) {
    // AGREGAR PROCESOS A LA COLA que llegan en este tiempo
    procs.forEach(p => {
      if (p.arrival === currentTime && p.remaining > 0 && !queue.includes(p)) {
        queue.push(p);
      }
    });
    
    // Si la cola está vacía pero hay procesos pendientes, saltar al siguiente que llega
    if (queue.length === 0 && completed < procs.length) {
      const nextArrival = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.arrival));
      currentTime = nextArrival;
      continue;
    }
    
    if (queue.length === 0) break;
    
    // OBTENER: El primer proceso de la cola
    const current = queue.shift();
    contextSwitches++;
    
    // Registrar el tiempo de inicio (solo la primera vez)
    if (processData[current.name].startTime === null) {
      processData[current.name].startTime = currentTime;
    }
    
    // EJECUTAR: El quantum o lo que le queda (lo que sea menor)
    const executeTime = Math.min(quantum, current.remaining);
    
    for (let i = 0; i < executeTime; i++) {
      timeline.push({
        time: currentTime,
        process: current.name,
        duration: 1
      });
      current.remaining--;
      currentTime++;
    }
    
    // Si el proceso NO terminó, vuelve al final de la cola
    if (current.remaining > 0) {
      // Agregar nuevos procesos que llegaron mientras se ejecutaba
      procs.forEach(p => {
        if (p.arrival <= currentTime && p.remaining > 0 && !queue.includes(p) && p !== current) {
          queue.push(p);
        }
      });
      // Agregar el proceso actual al final de la cola
      queue.push(current);
    } else {
      // El proceso terminó
      processData[current.name].endTime = currentTime;
      completed++;
    }
  }
  
  // CALCULAR MÉTRICAS después de la simulación
  let totalWait = 0;
  let totalTurnAround = 0;
  
  procs.forEach(p => {
    const data = processData[p.name];
    data.waitTime = data.startTime - p.arrival;
    data.turnAroundTime = data.endTime - p.arrival;
    totalWait += data.waitTime;
    totalTurnAround += data.turnAroundTime;
  });
  
  // RETORNAR RESULTADOS
  return {
    timeline,
    processes: Object.values(processData),
    totalTime: currentTime,
    avgWaitTime: totalWait / procs.length,
    avgTurnAroundTime: totalTurnAround / procs.length,
    cpuUtilization: 100,                         // Siempre 100% si hay procesos
    contextSwitches: contextSwitches,
    processCount: procs.length
  };
}

// ==================== UTILIDADES ====================

/**
 * Genera un array de colores para diferenciar procesos en la visualización
 * @param {number} count - Cantidad de colores necesarios
 * @return {array} Array de colores en formato hex
 */
function generateColors(count) {
  // Paleta base de colores (se repiten si hay más procesos que colores)
  const baseColors = [
    '#3b5bdb', '#0c9488', '#16a34a', '#b45309',
    '#dc2626', '#7c3aed', '#db2777', '#ea580c',
    '#0891b2', '#059669'
  ];
  
  // Crear array de colores replicando la paleta según sea necesario
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}

// ==================== INICIALIZACIÓN ====================
// Se ejecuta cuando la página se carga completamente
document.addEventListener('DOMContentLoaded', () => {
  // Por defecto, seleccionar SRT como política inicial
  selectPolicy(document.querySelector('[data-policy="srt"]'));
});
