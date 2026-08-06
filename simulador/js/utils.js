/**
 * utils.js
 * ─────────────────────────────────────────────────────────
 * Responsabilidad única: utilidades transversales de UI que no
 * pertenecen a ningún dominio concreto: el registro de eventos
 * (bitácora de la simulación) y los mensajes flotantes de
 * confirmación/error (fShowMsg).
 * ─────────────────────────────────────────────────────────
 */

/* ── EVENT LOG ── */
function fLog(type, msg, detail='') {
  const log = document.getElementById('fEventLog');
  let div = document.createElement('div');
  div.className = 'ev '+type;
  div.innerHTML = `<strong>${msg}</strong>${detail?`<div class="ev-detail">${detail}</div>`:''}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function clearFEventLog() {
  document.getElementById('fEventLog').innerHTML = '';
}

function fShowMsg(id, txt, type) {
  let el = document.getElementById(id);
  el.textContent = txt;
  el.className = 'msg show msg-'+type;
  setTimeout(()=>el.classList.remove('show'), 2500);
}
