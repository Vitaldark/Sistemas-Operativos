// Variables globales
let selectedPolicy = null;
let processes = [];
let simulationRunning = false;
let currentTimeStep = 0;
let currentTimeline = [];
let simulationResults = null;

// Colores para los procesos
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

// Seleccionar política
function selectPolicy(policy) {
    selectedPolicy = policy;
    document.querySelectorAll('.policy-card').forEach(card => card.classList.remove('active'));
    event.target.closest('.policy-card').classList.add('active');
    
    const infoBox = document.getElementById('policyInfo');
    if (policy === 'srt') {
        infoBox.innerHTML = '<p><strong>SRT (Shortest Remaining Time)</strong> seleccionado.</p><p>Este algoritmo siempre ejecuta el proceso con el menor tiempo de CPU restante. Es óptimo en tiempo de espera pero puede causar inanición en procesos largos.</p>';
    } else {
        infoBox.innerHTML = '<p><strong>Round Robin (RR)</strong> seleccionado.</p><p>Este algoritmo asigna a cada proceso un quantum de tiempo. Si no termina, vuelve al final de la cola. Es justo pero con mayor tiempo de espera.</p>';
    }
}

// Cambiar entre tabs
function switchTab(event, tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Agregar proceso
function addProcess() {
    if (!selectedPolicy) {
        alert('Selecciona una política primero');
        return;
    }

    const name = document.getElementById('processName').value.trim();
    const arrival = parseInt(document.getElementById('arrivalTime').value) || 0;
    const burst = parseInt(document.getElementById('cpuBurst').value) || 1;

    if (!name) {
        alert('Ingresa un nombre para el proceso');
        return;
    }

    if (processes.find(p => p.name === name)) {
        alert('Ya existe un proceso con ese nombre');
        return;
    }

    if (burst <= 0) {
        alert('La ráfaga debe ser mayor a 0');
        return;
    }

    processes.push({ name, arrival, burst, remaining: burst });
    updateProcessList();

    // Incrementar nombre
    const num = parseInt(name.match(/\d+$/)?.[0] || 0) + 1;
    document.getElementById('processName').value = 'P' + num;
}

// Actualizar lista de procesos
function updateProcessList() {
    const list = document.getElementById('processList');
    list.innerHTML = '';

    processes.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'process-item';
        item.innerHTML = `
            <span>${p.name}: Llegada=${p.arrival}, Ráfaga=${p.burst}</span>
            <button onclick="deleteProcess(${idx})">Eliminar</button>
        `;
        list.appendChild(item);
    });
}

// Eliminar proceso
function deleteProcess(idx) {
    processes.splice(idx, 1);
    updateProcessList();
}

// Limpiar procesos
function clearProcesses() {
    processes = [];
    updateProcessList();
    resetSimulation();
}

// Cargar desde archivo
function loadFromFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        document.getElementById('filePreview').value = content;

        const lines = content.trim().split('\n');
        processes = [];

        lines.forEach(line => {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length === 3) {
                const name = parts[0];
                const arrival = parseInt(parts[1]);
                const burst = parseInt(parts[2]);

                if (!isNaN(arrival) && !isNaN(burst) && name) {
                    processes.push({ name, arrival, burst, remaining: burst });
                }
            }
        });

        if (processes.length > 0) {
            updateProcessList();
            alert(`${processes.length} procesos cargados correctamente`);
        } else {
            alert('No se encontraron procesos válidos');
        }
    };
    reader.readAsText(file);
}

// Actualizar velocidad
function updateSpeed() {
    const speed = document.getElementById('speedControl').value;
    document.getElementById('speedDisplay').textContent = speed + 'x';
}

// Iniciar simulación
function startSimulation() {
    if (!selectedPolicy) {
        alert('Selecciona una política');
        return;
    }

    if (processes.length === 0) {
        alert('Agrega al menos un proceso');
        return;
    }

    resetSimulation();
    simulationRunning = true;

    const quantum = parseInt(document.getElementById('quantum').value) || 2;

    if (selectedPolicy === 'srt') {
        simulationResults = runSRT();
    } else {
        simulationResults = runRoundRobin(quantum);
    }

    currentTimeline = simulationResults.timeline;
    displayResults();
    document.getElementById('stepControls').style.display = 'block';
    document.getElementById('pauseBtn').style.display = 'inline-block';
}

// Ejecutar SRT
function runSRT() {
    const procs = JSON.parse(JSON.stringify(processes));
    procs.sort((a, b) => a.arrival - b.arrival);

    let time = 0;
    let timeline = [];
    let completed = 0;
    const details = {};

    procs.forEach(p => {
        details[p.name] = {
            name: p.name,
            arrival: p.arrival,
            burst: p.burst,
            startTime: null,
            endTime: null,
            waitTime: 0,
            turnAroundTime: 0
        };
    });

    while (completed < procs.length) {
        const available = procs.filter(p => p.arrival <= time && p.remaining > 0);

        if (available.length === 0) {
            time = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.arrival));
            continue;
        }

        const selected = available.reduce((a, b) => a.remaining < b.remaining ? a : b);

        if (details[selected.name].startTime === null) {
            details[selected.name].startTime = time;
        }

        selected.remaining--;
        timeline.push({ process: selected.name, time: time, duration: 1 });
        time++;

        if (selected.remaining === 0) {
            details[selected.name].endTime = time;
            completed++;
        }
    }

    let totalWait = 0;
    let totalTurnAround = 0;

    Object.values(details).forEach(d => {
        d.waitTime = d.startTime - d.arrival;
        d.turnAroundTime = d.endTime - d.arrival;
        totalWait += d.waitTime;
        totalTurnAround += d.turnAroundTime;
    });

    return {
        timeline,
        details: Object.values(details),
        totalTime: time,
        avgWait: totalWait / procs.length,
        avgTurnAround: totalTurnAround / procs.length,
        contextSwitches: timeline.filter((t, i) => i === 0 || t.process !== timeline[i-1].process).length
    };
}

// Ejecutar Round Robin
function runRoundRobin(quantum) {
    const procs = JSON.parse(JSON.stringify(processes));
    procs.sort((a, b) => a.arrival - b.arrival);

    let time = 0;
    let queue = [];
    let timeline = [];
    let completed = 0;
    const details = {};

    procs.forEach(p => {
        details[p.name] = {
            name: p.name,
            arrival: p.arrival,
            burst: p.burst,
            startTime: null,
            endTime: null,
            waitTime: 0,
            turnAroundTime: 0
        };
    });

    while (completed < procs.length) {
        procs.forEach(p => {
            if (p.arrival === time && p.remaining > 0 && !queue.includes(p)) {
                queue.push(p);
            }
        });

        if (queue.length === 0 && completed < procs.length) {
            time = Math.min(...procs.filter(p => p.remaining > 0).map(p => p.arrival));
            continue;
        }

        const current = queue.shift();
        if (details[current.name].startTime === null) {
            details[current.name].startTime = time;
        }

        const executeTime = Math.min(quantum, current.remaining);

        for (let i = 0; i < executeTime; i++) {
            timeline.push({ process: current.name, time: time + i, duration: 1 });
            current.remaining--;
        }

        time += executeTime;

        if (current.remaining > 0) {
            procs.forEach(p => {
                if (p.arrival <= time && p.remaining > 0 && !queue.includes(p) && p !== current) {
                    queue.push(p);
                }
            });
            queue.push(current);
        } else {
            details[current.name].endTime = time;
            completed++;
        }
    }

    let totalWait = 0;
    let totalTurnAround = 0;

    Object.values(details).forEach(d => {
        d.waitTime = d.startTime - d.arrival;
        d.turnAroundTime = d.endTime - d.arrival;
        totalWait += d.waitTime;
        totalTurnAround += d.turnAroundTime;
    });

    return {
        timeline,
        details: Object.values(details),
        totalTime: time,
        avgWait: totalWait / procs.length,
        avgTurnAround: totalTurnAround / procs.length,
        contextSwitches: timeline.filter((t, i) => i === 0 || t.process !== timeline[i-1].process).length
    };
}

// Mostrar resultados
function displayResults() {
    if (!simulationResults) return;

    document.getElementById('resultsSection').style.display = 'block';

    // Gantt chart
    drawGantt();

    // Métricas
    displayMetrics();

    // Tabla
    displayTable();

    // Scroll a resultados
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Dibujar Gantt
function drawGantt() {
    const ganttChart = document.getElementById('ganttChart');
    ganttChart.innerHTML = '';

    if (currentTimeline.length === 0) return;

    const maxTime = Math.max(...currentTimeline.map(t => t.time + t.duration));
    const colorMap = {};
    processes.forEach((p, i) => {
        colorMap[p.name] = colors[i % colors.length];
    });

    // Crear tabla de Gantt
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.backgroundColor = '#f9f9f9';

    // Encabezado con escala de tiempo
    const headerRow = table.insertRow();
    const headerCell = headerRow.insertCell();
    headerCell.textContent = 'Proceso';
    headerCell.style.fontWeight = 'bold';
    headerCell.style.padding = '10px';
    headerCell.style.border = '1px solid #ddd';
    headerCell.style.background = '#667eea';
    headerCell.style.color = 'white';

    for (let t = 0; t <= maxTime; t++) {
        const cell = headerRow.insertCell();
        cell.textContent = t;
        cell.style.fontWeight = 'bold';
        cell.style.padding = '8px';
        cell.style.textAlign = 'center';
        cell.style.border = '1px solid #ddd';
        cell.style.background = '#667eea';
        cell.style.color = 'white';
        cell.style.minWidth = '30px';
    }

    // Filas por proceso
    processes.forEach(p => {
        const row = table.insertRow();
        
        const nameCell = row.insertCell();
        nameCell.textContent = p.name;
        nameCell.style.fontWeight = 'bold';
        nameCell.style.padding = '10px';
        nameCell.style.border = '1px solid #ddd';
        nameCell.style.background = '#f0f0f0';

        for (let t = 0; t <= maxTime; t++) {
            const cell = row.insertCell();
            cell.style.padding = '5px';
            cell.style.border = '1px solid #ddd';
            cell.style.minWidth = '30px';
            cell.style.height = '40px';
            cell.style.textAlign = 'center';

            // Buscar si hay un proceso en este tiempo
            const activity = currentTimeline.find(tl => tl.process === p.name && tl.time === t);
            if (activity) {
                cell.style.background = colorMap[p.name];
                cell.style.color = 'white';
                cell.style.fontWeight = 'bold';
                cell.textContent = p.name;
            }
        }
    });

    ganttChart.appendChild(table);
}

// Mostrar métricas
function displayMetrics() {
    const container = document.getElementById('metricsContainer');
    container.innerHTML = '';

    const metrics = [
        { label: 'Tiempo Total', value: simulationResults.totalTime, unit: 'UT' },
        { label: 'Espera Promedio', value: simulationResults.avgWait.toFixed(2), unit: 'UT' },
        { label: 'Retorno Promedio', value: simulationResults.avgTurnAround.toFixed(2), unit: 'UT' },
        { label: 'Cambios Contexto', value: simulationResults.contextSwitches, unit: '' }
    ];

    metrics.forEach(m => {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.innerHTML = `
            <h3>${m.label}</h3>
            <div class="metric-value">${m.value}<span class="metric-unit">${m.unit}</span></div>
        `;
        container.appendChild(card);
    });
}

// Mostrar tabla
function displayTable() {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    simulationResults.details.forEach(d => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${d.name}</strong></td>
            <td>${d.arrival}</td>
            <td>${d.burst}</td>
            <td>${d.startTime}</td>
            <td>${d.endTime}</td>
            <td>${d.waitTime}</td>
            <td>${d.turnAroundTime}</td>
        `;
        tbody.appendChild(row);
    });
}

// Pausa
function pauseSimulation() {
    simulationRunning = !simulationRunning;
    document.getElementById('pauseBtn').textContent = simulationRunning ? '⏸️ Pausar' : '▶️ Reanudar';
}

// Siguiente paso
function nextStep() {
    if (currentTimeStep < currentTimeline.length - 1) {
        currentTimeStep++;
        updateTimeDisplay();
    }
}

// Paso anterior
function previousStep() {
    if (currentTimeStep > 0) {
        currentTimeStep--;
        updateTimeDisplay();
    }
}

// Actualizar visualización del tiempo
function updateTimeDisplay() {
    if (currentTimeline.length > 0) {
        document.getElementById('timeDisplay').textContent = 'Tiempo: ' + currentTimeline[currentTimeStep].time;
    }
}

// Reiniciar
function resetSimulation() {
    simulationRunning = false;
    currentTimeStep = 0;
    currentTimeline = [];
    simulationResults = null;
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('stepControls').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
}

// Exportar a CSV
function exportToCSV() {
    if (!simulationResults) return;

    let csv = 'Simulación de Planificación de CPU\n';
    csv += `Política: ${selectedPolicy.toUpperCase()}\n`;
    csv += `Fecha: ${new Date().toLocaleString()}\n\n`;
    csv += `Tiempo Total,${simulationResults.totalTime}\n`;
    csv += `Espera Promedio,${simulationResults.avgWait.toFixed(2)}\n`;
    csv += `Retorno Promedio,${simulationResults.avgTurnAround.toFixed(2)}\n`;
    csv += `Cambios Contexto,${simulationResults.contextSwitches}\n\n`;
    csv += 'Proceso,Llegada,Ráfaga,Inicio,Fin,Espera,Retorno\n';

    simulationResults.details.forEach(d => {
        csv += `${d.name},${d.arrival},${d.burst},${d.startTime},${d.endTime},${d.waitTime},${d.turnAroundTime}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_${selectedPolicy}_${Date.now()}.csv`;
    a.click();
}

// Imprimir
function printResults() {
    window.print();
}
