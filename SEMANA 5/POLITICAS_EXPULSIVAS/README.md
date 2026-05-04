# Práctica 2: Simulador de Planificación de CPU - Algoritmos Expulsivos

## Descripción General

Este proyecto implementa un simulador interactivo para dos algoritmos de planificación de CPU **expulsivos**:
- **SRT (Shortest Remaining Time)**: Algoritmo expulsivo que siempre ejecuta el proceso con el menor tiempo de CPU restante
- **RR (Round Robin)**: Algoritmo expulsivo que asigna un quantum de tiempo a cada proceso

## Características

✅ **Interfaz gráfica web responsiva** con HTML5, CSS3 y JavaScript puro  
✅ **Entrada de datos flexible**: Manual o mediante archivo TXT  
✅ **Simulación en tiempo real** con visualización del diagrama de Gantt  
✅ **Métricas de rendimiento** detalladas  
✅ **Exportación de resultados** en formato CSV  
✅ **Controles de simulación**: Play/Pause, Paso a paso, Velocidad ajustable  

## Cómo Usar

### 1. Abrir la Aplicación
```bash
# Abre index.html en tu navegador web
```

### 2. Seleccionar Política
Elige entre SRT o Round Robin. Cada opción tiene una descripción detallada de su funcionamiento.

### 3. Ingresar Datos de Procesos

#### Opción A: Ingreso Manual
1. Completa los campos: Nombre, Tiempo de Llegada, Ráfaga de CPU
2. Haz clic en "+ Agregar Proceso"
3. Repite para cada proceso

#### Opción B: Cargar desde Archivo TXT
1. Crea un archivo de texto con el formato:
```
P1,0,8
P2,1,4
P3,2,2
```
Donde: `NombreProceso,TiempoLlegada,RáfagaCPU`

2. Haz clic en "Cargar Archivo TXT"
3. Selecciona tu archivo

### 4. Configurar Parámetros
- **Quantum (para RR)**: Define el intervalo de tiempo que cada proceso recibe
- Para SRT no es necesario

### 5. Ejecutar Simulación
1. Haz clic en "▶ Ejecutar Simulación"
2. Usa los controles para:
   - ⏮ Anterior / Siguiente ⏭: Navegar paso a paso
   - Velocidad: Ajusta la velocidad de reproducción

### 6. Analizar Resultados
- **Diagrama de Gantt**: Visualiza el orden de ejecución
- **Métricas**: Tiempo de espera, retorno, utilización, etc.
- **Tabla detallada**: Información por proceso

## Algoritmos Implementados

### SRT (Shortest Remaining Time)
**Tipo**: Expulsivo (Preemptive)

**Funcionamiento**:
- La CPU siempre atiende al proceso con el menor tiempo de CPU restante
- Si llega un proceso con menor tiempo que lo que falta del actual, lo desplaza
- Genera cambios frecuentes de contexto

**Ventajas**:
- Minimiza el tiempo promedio de espera
- Optimiza el throughput

**Desventajas**:
- Alto número de cambios de contexto
- Riesgo de inanición para procesos largos si llegan continuamente procesos cortos

### Round Robin (RR)
**Tipo**: Expulsivo (Preemptive)

**Funcionamiento**:
- Cada proceso recibe un quantum (intervalo de tiempo fijo)
- Ejecuta hasta completar su ráfaga o agotar el quantum
- Si no termina, va al final de la cola

**Ventajas**:
- Justo para todos los procesos
- No hay inanición

**Desventajas**:
- Mayor tiempo de espera promedio
- Muchos cambios de contexto si el quantum es muy pequeño

## Formato del Archivo TXT

El archivo debe tener el formato CSV simple:
```
NombreProceso,TiempoLlegada,RáfagaCPU
```

**Ejemplo (ejemplo.txt)**:
```
P1,0,8
P2,1,4
P3,2,2
P4,3,4
P5,4,3
```

**Notas**:
- Cada línea representa un proceso
- Los valores deben estar separados por comas
- No incluyas encabezados
- El tiempo de llegada y ráfaga deben ser enteros positivos

## Métricas Calculadas

### Tiempo de Espera
Tiempo que pasa un proceso en la cola antes de ser ejecutado

### Tiempo de Retorno (Turnaround Time)
Tiempo total desde que llega hasta que termina: `Retorno = Fin - Llegada`

### CPU Utilización
Porcentaje de tiempo que la CPU está ejecutando procesos (no en idle)

### Cambios de Contexto
Número de veces que se cambia de un proceso a otro

### Throughput
Número de procesos completados por unidad de tiempo

## Estructura del Proyecto

```
POLITICAS_EXPULSIVAS/
├── index.html           # Interfaz gráfica
├── scheduler.js         # Lógica de simulación
├── ejemplo.txt          # Archivo de ejemplo
├── README.md            # Este archivo
└── resultados/          # Carpeta para descargas (generada automáticamente)
```

## Navegadores Soportados

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Autor

**JESUS VIDAL CHECMA MONTALVO**  
Sistemas Operativos - Semestre 5  
Abril - Mayo 2026
