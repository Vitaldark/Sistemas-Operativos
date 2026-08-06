/**
 * main.js
 * ─────────────────────────────────────────────────────────
 * Punto de entrada de la aplicación. Se ejecuta una única vez, cuando
 * el DOM está listo, y deja la interfaz en su estado inicial:
 * la descripción/pista del tipo de asignación activo, una tanda de
 * procesos de ejemplo generada aleatoriamente, y la tabla de estado
 * renderizada. Debe cargarse DESPUÉS de todos los demás módulos.
 * ─────────────────────────────────────────────────────────
 */

/* ── INIT ── */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('fMemHint').textContent = F_ALLOC_HINT[fAllocType] || '';
  fusionGenerate();
  renderFStateTable();
});
