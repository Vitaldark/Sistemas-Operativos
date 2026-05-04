# Simulador de Planificación de CPU - Algoritmos Expulsivos

## 📋 Descripción

Simulador interactivo que implementa dos algoritmos de planificación de CPU expulsivos:
- **SRT (Shortest Remaining Time)**: Algoritmo que siempre ejecuta el proceso con el menor tiempo de CPU restante
- **RR (Round Robin)**: Algoritmo que asigna un quantum (intervalo de tiempo) a cada proceso

## ✨ Características

✅ Interfaz gráfica moderna y responsiva  
✅ Entrada flexible (manual o desde archivo TXT)  
✅ Simulación en tiempo real con Gantt chart  
✅ Cálculo de métricas de rendimiento  
✅ Exportación de resultados en CSV  
✅ Sin dependencias externas (HTML/CSS/JavaScript puro)  

## 🚀 Cómo Usar

### 1. Abrir la aplicación
```bash
Abre index.html en tu navegador web
```

### 2. Seleccionar algoritmo
- Clic en SRT o Round Robin

### 3. Agregar procesos

**Opción A: Manual**
```
1. Ingresa nombre (ej: P1)
2. Tiempo de llegada (ej: 0)
3. Ráfaga de CPU (ej: 8)
4. Clic en "Agregar Proceso"
```

**Opción B: Desde archivo TXT**
```
Formato: Nombre,Llegada,Ráfaga
Ejemplo:
P1,0,8
P2,1,4
P3,2,2
```

### 4. Ejecutar
- Clic en "Ejecutar Simulación"

### 5. Analizar
- Observar Gantt chart
- Revisar métricas
- Ver tabla de detalles

## 📊 Algoritmos

### SRT (Shortest Remaining Time)
- **Tipo**: Expulsivo
- **Característica**: Siempre ejecuta el proceso con menor tiempo restante
- **Ventaja**: Minimiza tiempo de espera promedio
- **Desventaja**: Riesgo de inanición para procesos largos

### Round Robin (RR)
- **Tipo**: Expulsivo
- **Característica**: Cada proceso obtiene un quantum de tiempo
- **Ventaja**: Justo para todos los procesos
- **Desventaja**: Mayor tiempo de espera promedio

## 📁 Archivos Incluidos

```
- index.html       : Interfaz gráfica
- scheduler.js     : Lógica de simulación
- README.md        : Este archivo
- ejemplo.txt      : Ejemplo de datos
- casos_*.txt      : Casos de prueba adicionales
```

## 📈 Métricas Calculadas

- **Tiempo Total**: Duración total de la simulación
- **Espera Promedio**: Tiempo promedio que esperan los procesos
- **Retorno Promedio**: Tiempo promedio desde llegada hasta terminación
- **Cambios de Contexto**: Número de cambios entre procesos

## 🔧 Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- Sin dependencias externas

## 📝 Formato de Archivo

```
Nombre_Proceso,Tiempo_Llegada,Rafaga_CPU
P1,0,8
P2,1,4
P3,2,2
```

## 👤 Autor

JESUS VIDAL CHECMA MONTALVO  
Sistemas Operativos - Semestre 5  
Mayo 2026
