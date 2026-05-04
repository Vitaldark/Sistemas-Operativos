# Guía Rápida - Simulador de Planificación de CPU

## ⚡ Inicio Rápido

### Paso 1: Abrir la Aplicación
```
Doble clic en: index.html
```

### Paso 2: Seleccionar Algoritmo
- **SRT**: Para minimizar tiempo de espera
- **RR**: Para justicia entre procesos

### Paso 3: Agregar Procesos

#### Opción A (Manual)
```
1. Ingresa nombre: P1
2. Llegada: 0
3. Ráfaga: 8
4. Clic en "+ Agregar"
```

#### Opción B (Desde Archivo)
```
1. Clic en "Cargar Archivo TXT"
2. Selecciona archivo (formato: P1,0,8)
3. Resultados se cargan automáticamente
```

### Paso 4: Ejecutar
```
1. Clic en "▶ Ejecutar Simulación"
2. Observa el diagrama de Gantt
3. Lee las métricas calculadas
```

### Paso 5: Analizar
```
- Observa tiempo de espera promedio
- Compara cambios de contexto
- Revisa tabla de detalles
```

---

## 📊 Interpretando Resultados

### Diagrama de Gantt
```
Bloques horizontales = Ejecución de procesos
Color diferente = Proceso diferente
Tiempo = Eje horizontal
```

### Métricas Clave

| Métrica | Significado | Ideal |
|---------|-----------|--------|
| **Espera Promedio** | Tiempo en cola | Bajo |
| **Retorno Promedio** | Tiempo total proceso | Bajo |
| **CPU Utilizado** | % activa | Alto (100%) |
| **Cambios Contexto** | Switches procesos | Bajo (SRT) |

---

## 📁 Formato de Archivo TXT

```
P1,0,8
P2,1,4
P3,2,2
P4,3,4
```

**Estructura**: `NombreProceso,LlegadaUT,RáfagaUT`

---

## 🔍 Ejemplos de Entrada

### Caso 1: Procesos Variados
```
P1,0,10
P2,2,5
P3,5,3
```

### Caso 2: Todos Iguales
```
P1,0,5
P2,0,5
P3,0,5
```

### Caso 3: Llegadas Escalonadas
```
P1,0,8
P2,1,4
P3,2,2
P4,3,3
P5,4,1
```

---

## ⚙️ Parámetros Importantes

### Quantum (RR)
- **Pequeño** (1-2): Más equitativo, más cambios
- **Grande** (4-5): Menos cambios, menos equitativo
- **Recomendado**: 2-4

### Tiempo de Llegada
- Determina cuándo llega el proceso
- 0 = Presente desde el inicio
- >0 = Llega después

### Ráfaga de CPU
- Tiempo total que necesita ejecutar
- En unidades de tiempo (UT)
- Mínimo: 1 UT

---

## 🐛 Solución de Problemas

### No carga el archivo
✓ Verifica formato CSV (Nombre,Número,Número)  
✓ Sin espacios extras  
✓ Línea por proceso  

### Resultados inesperados
✓ Valida tiempos de llegada  
✓ Verifica ráfagas positivas  
✓ Recarga página (F5)  

### Quantum no funciona
✓ RR requiere quantum definido  
✓ Mínimo = 1  
✓ Revisa que esté en input correcto  

---

## 📌 Comparación Rápida

### SRT
```
✅ Mejor espera promedio
✅ Óptimo teórico
❌ Muchos cambios contexto
❌ Riesgo inanición
```

### RR
```
✅ Justo para procesos
✅ No hay inanición
✅ Predecible
❌ Espera más larga
```

---

## 💡 Consejos

1. **Comienza con SRT** para entender el concepto
2. **Usa el archivo ejemplo.txt** para pruebas
3. **Compara mismo caso** con ambos algoritmos
4. **Navega paso a paso** para entender la ejecución
5. **Exporta resultados** para análisis posterior

---

**Última actualización**: Mayo 2026
