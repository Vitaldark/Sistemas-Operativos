/**
 * state.js
 * ─────────────────────────────────────────────────────────
 * Estado global de la aplicación y constantes compartidas.
 * Única fuente de verdad para: configuración activa (política de
 * planificación, algoritmo/tipo de asignación de memoria), la lista
 * de procesos simulados, el mapa de bloques de memoria y las
 * variables de control del reloj de simulación.
 *
 * Ningún otro módulo debe duplicar estas variables: solo las lee
 * o las muta a través de las funciones expuestas en los demás
 * archivos (processManager.js, memoryAllocator.js, simulation.js…).
 * ─────────────────────────────────────────────────────────
 */

const COLORS = [
  '#4a7cf7','#22c9b7','#f05252','#a78bfa',
  '#3ecf8e','#f5a623','#e879f9','#60a5fa',
  '#34d399','#fbbf24','#f87171','#818cf8',
  '#2dd4bf','#c084fc','#fb923c','#4ade80',
  '#38bdf8','#e879f9','#a3e635','#f472b6'
];

const F_SECOND_LEVEL_CAP = 3;  // punteros a bloques de datos por cada bloque índice de 2º nivel (Multinivel)

let fPolicy   = 'FCFS';
let fMemAlgo  = 'first';
let fAllocType= 'contigua';   // 'contigua' | 'enlazada' | 'indexada' | 'multinivel' | 'fat' | 'extension' | 'bitmap'
let fBlockSize= 64;           // KB por bloque (métodos de bloques fijos)
let fProcs   = [];        // Proceso completo
let fDynamicTimeline= []; // Secuencia dinámica de ejecución [{name,start,end}]
let fMemBlocks = [];      // [{id,start,size,type,process,isIndex,nextBlockId}]
let fMemTotal  = 2048;
let fColorMap  = {};
let fSimTimer  = null;
let fSimStep   = 0;
let fSimRunning= false;
let fSimPaused = false;
let fSpeed     = 1;
let fDoneCount = 0;

// Variables de estado del planificador dinámico
let rrQueue = [];
let rrQuantumSpent = 0;
let currentRunningProc = null;
let contextSwitchesCount = 0;
