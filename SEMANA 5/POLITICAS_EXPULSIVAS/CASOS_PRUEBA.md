# Casos de Prueba - Simulador de Planificación

## Caso 1: Procesos Básicos (Recomendado para comenzar)

Archivo: `ejemplo.txt`

```
P1,0,8
P2,1,4
P3,2,2
```

### Análisis SRT
- Espera Promedio: 3.67 UT
- Retorno Promedio: 8.00 UT
- Cambios Contexto: 4

### Análisis RR (Q=2)
- Espera Promedio: 4.67 UT
- Retorno Promedio: 9.00 UT
- Cambios Contexto: 7

---

## Caso 2: Procesos de Igual Tamaño

Archivo: `caso_procesos_iguales.txt`

```
P1,0,5
P2,0,5
P3,0,5
```

### Análisis SRT
- Espera Promedio: 6.67 UT
- Cambios Contexto: 0

### Análisis RR (Q=3)
- Espera Promedio: 6.67 UT
- Cambios Contexto: 3

---

## Caso 3: Un Proceso Largo

Archivo: `caso_proceso_largo.txt`

```
P1,0,20
P2,1,2
P3,2,2
P4,3,2
```

### Análisis SRT
- Espera Promedio: 8.75 UT
- Cambios Contexto: 6

### Análisis RR (Q=2)
- Espera Promedio: 12.25 UT
- Cambios Contexto: 10+

---

## Caso 4: Procesos Cortos

Archivo: `caso_procesos_cortos.txt`

```
P1,0,1
P2,0,1
P3,0,1
P4,0,1
P5,0,1
```

### Análisis SRT
- Espera Promedio: 4.00 UT
- Cambios Contexto: 0

### Análisis RR (Q=1)
- Espera Promedio: 4.00 UT
- Cambios Contexto: 4

---

## Caso 5: Extremo

Archivo: `caso_extremo.txt`

```
P1,0,100
P2,1,1
P3,2,1
P4,3,1
```

Demuestra riesgo de inanición en SRT.

---

## Caso 6: Realista

Archivo: `caso_realista.txt`

Sistema típico con procesos realistas.

---

**Total de casos**: 6  
**Procesos totales**: 3-10  
**Complejidad**: Básica a Alta
