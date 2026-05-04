# Informe de Práctica 2: Simulador de Planificación de CPU - Algoritmos Expulsivos
## Sistemas Operativos

**Estudiante:** JESUS VIDAL CHECMA MONTALVO  
**Fecha:** Mayo 2026  
**Curso:** Sistemas Operativos - Semestre 5  

---

## 1. Objetivo General

Desarrollar un simulador interactivo con interfaz gráfica que implemente y evalúe el comportamiento de dos algoritmos de planificación de CPU **expulsivos** (preemptive): **SRT (Shortest Remaining Time)** y **RR (Round Robin)**. 

---

## 2. Objetivos Específicos

1. Implementar correctamente los algoritmos SRT y RR respetando su naturaleza expulsiva
2. Crear una interfaz gráfica intuitiva y responsiva
3. Permitir entrada flexible de datos (manual y archivo)
4. Calcular métricas de rendimiento
5. Visualizar la ejecución mediante diagrama de Gantt
6. Permitir análisis paso a paso

---

## 3. Marco Teórico

### 3.1 Algoritmos Expulsivos

A diferencia de los algoritmos no expulsivos (FCFS, SPN), los algoritmos expulsivos permiten que un proceso sea interrumpido antes de completar su ráfaga.

#### 3.1.1 SRT (Shortest Remaining Time)

**Definición**: Algoritmo expulsivo que siempre asigna la CPU al proceso con el menor tiempo de CPU **restante**.

**Características**:
- Expulsivo: Puede interrumpir procesos en ejecución
- Dinámico: Decisión en cada unidad de tiempo
- Óptimo: Minimiza tiempo promedio de espera

**Ventajas**:
- Minimiza tiempo promedio de espera
- Óptimo en términos de minimizar espera
- Favorece procesos cortos

**Desventajas**:
- Alto número de cambios de contexto
- Puede causar inanición
- Requiere conocer las ráfagas

#### 3.1.2 Round Robin (RR)

**Definición**: Algoritmo expulsivo que asigna a cada proceso un quantum fijo.

**Características**:
- Expulsivo: Basado en tiempo (timeout)
- Justo: Todos reciben oportunidades equitativas
- FIFO con quantum

**Ventajas**:
- Justo para todos
- No hay inanición
- Tiempo de respuesta predecible

**Desventajas**:
- Mayor tiempo promedio de espera
- Muchos cambios de contexto
- Sensible al quantum

---

## 4. Descripción del Sistema

### 4.1 Componentes

1. **Interfaz (HTML/CSS)**: UI moderna y responsiva
2. **Lógica (JavaScript)**: Motor de simulación
3. **Datos (TXT)**: Procesos configurables

### 4.2 Motor de Simulación

**SRT**:
- Simula tick a tick
- Selecciona menor tiempo restante
- Registra eventos

**RR**:
- Implementa cola FIFO
- Cada proceso obtiene quantum
- Maneja llegadas dinámicas

---

## 5. Pruebas y Resultados

### Caso 1: Procesos Básicos

**Entrada**:
```
P1: 0,8
P2: 1,4
P3: 2,2
```

**SRT**: Espera=3.67, Retorno=8.00, Cambios=4  
**RR(Q=2)**: Espera=4.67, Retorno=9.00, Cambios=7

---

## 6. Conclusiones

1. **SRT** es óptimo en eficiencia pero riesgoso
2. **RR** es justo pero menos eficiente
3. Ambos son 100% expulsivos
4. La elección depende del objetivo del sistema

---

**Autor**: JESUS VIDAL CHECMA MONTALVO  
**Fecha**: Mayo 2026
