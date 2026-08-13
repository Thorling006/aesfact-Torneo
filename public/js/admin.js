/**
 * admin.js
 * Lógica del panel de administrador — soporte híbrido:
 * - Servidor Express local (cuando se ejecuta con node server.js)
 * - Google Apps Script (cuando se ejecuta en GitHub Pages o modo estático)
 */

'use strict';

// ─────────────────────────────────────────────
// Estado global del panel
// ─────────────────────────────────────────────

let timerBusqueda = null; // Debounce timer para el buscador
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ─────────────────────────────────────────────
// Inicialización
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Verificar si hay sesión guardada en sessionStorage
  const sesionGuardada = sessionStorage.getItem('aesfact_admin_ok');
  if (sesionGuardada === 'true') {
    mostrarPanel();
  }
});

// ─────────────────────────────────────────────
// Autenticación
// ─────────────────────────────────────────────

/**
 * Verifica la contraseña.
 * @param {Event} e
 */
async function iniciarSesion(e) {
  e.preventDefault();
  const input    = document.getElementById('input-password');
  const errorEl  = document.getElementById('login-error');
  const password = input.value.trim();

  // Validación rápida local
  if (password === CONFIG.ADMIN_PASSWORD) {
    sessionStorage.setItem('aesfact_admin_ok', 'true');
    errorEl.classList.remove('visible');
    mostrarPanel();
  } else {
    errorEl.textContent = 'Contraseña incorrecta. Intenta de nuevo.';
    errorEl.classList.add('visible');
    input.value = '';
    input.focus();
  }
}

/**
 * Cierra la sesión y regresa al login.
 */
function cerrarSesion() {
  sessionStorage.removeItem('aesfact_admin_ok');
  document.getElementById('pantalla-admin').classList.remove('visible');
  document.getElementById('pantalla-login').style.display = 'flex';
  document.getElementById('input-password').value = '';
}

/**
 * Muestra el panel principal y carga datos iniciales.
 */
function mostrarPanel() {
  document.getElementById('pantalla-login').style.display  = 'none';
  document.getElementById('pantalla-admin').classList.add('visible');
  cargarEstadisticas();
  cargarInscripciones();
}

// ─────────────────────────────────────────────
// Estadísticas
// ─────────────────────────────────────────────

/**
 * Carga contadores y los muestra en las tarjetas.
 */
async function cargarEstadisticas() {
  try {
    let data;
    if (isLocal) {
      try {
        const res = await fetch('/api/admin/estadisticas', {
          headers: { 'X-Admin-Password': CONFIG.ADMIN_PASSWORD }
        });
        if (res.ok) data = await res.json();
      } catch (_) {}
    }

    if (!data) {
      const url = `${CONFIG.APPS_SCRIPT_URL}?action=stats&password=${encodeURIComponent(CONFIG.ADMIN_PASSWORD)}`;
      const res = await fetch(url, { redirect: 'follow' });
      data = await res.json();
    }

    if (data && !data.error) {
      document.getElementById('stat-total').textContent       = data.total ?? '0';
      document.getElementById('stat-confirmados').textContent = data.confirmados ?? '0';
      document.getElementById('stat-pendientes').textContent  = data.pendientes ?? '0';
    }
  } catch (err) {
    console.warn('No se pudieron cargar las estadísticas:', err);
  }
}

// ─────────────────────────────────────────────
// Carga y renderizado de inscripciones
// ─────────────────────────────────────────────

/**
 * Carga las inscripciones y las muestra en la tabla.
 * @param {string} [busqueda='']
 */
async function cargarInscripciones(busqueda = '') {
  const tbody = document.getElementById('cuerpo-tabla');

  tbody.innerHTML = `
    <tr>
      <td colspan="9">
        <div class="loading">
          <span class="spinner" aria-hidden="true"></span>
          Cargando inscripciones...
        </div>
      </td>
    </tr>`;

  try {
    let inscripciones = null;

    if (isLocal) {
      try {
        const res = await fetch(`/api/admin/inscripciones?q=${encodeURIComponent(busqueda)}`, {
          headers: { 'X-Admin-Password': CONFIG.ADMIN_PASSWORD }
        });
        if (res.ok) {
          const data = await res.json();
          inscripciones = data.inscripciones || [];
        }
      } catch (_) {}
    }

    if (inscripciones === null) {
      const params = new URLSearchParams({
        action:   'list',
        password: CONFIG.ADMIN_PASSWORD,
        q:        busqueda,
      });
      const res  = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params}`, { redirect: 'follow' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      inscripciones = data.inscripciones || [];
    }

    renderizarTabla(inscripciones);
    cargarEstadisticas();

  } catch (err) {
    console.error('Error al cargar inscripciones:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="tabla-vacia">
            <p>⚠️</p>
            <p>Error al cargar: ${escaparHTML(err.message)}</p>
          </div>
        </td>
      </tr>`;
  }
}

/**
 * Renderiza las filas de inscripciones en la tabla.
 * @param {Array} inscripciones
 */
function renderizarTabla(inscripciones) {
  const tbody = document.getElementById('cuerpo-tabla');

  if (!inscripciones || inscripciones.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="tabla-vacia">
            <p>📭</p>
            <p>No se encontraron inscripciones.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = inscripciones.map((ins) => {
    const esConfirmado = ins.estado_pago === 'confirmado';
    const fecha        = ins.fecha_hora_inscripcion
      ? String(ins.fecha_hora_inscripcion).substring(0, 16)
      : '—';

    return `
      <tr>
        <td>${escaparHTML(String(ins.id))}</td>
        <td><strong>${escaparHTML(ins.nombre_completo)}</strong></td>
        <td class="col-codigo"><code>${escaparHTML(ins.codigo_estudiantil)}</code></td>
        <td class="col-telefono">${escaparHTML(ins.telefono)}</td>
        <td>${escaparHTML(ins.nombre_clash_royale)}</td>
        <td><span class="etiqueta-cr">${escaparHTML(ins.etiqueta_clash_royale)}</span></td>
        <td class="col-fecha"><span class="fecha-small">${fecha}</span></td>
        <td>
          <span class="badge ${esConfirmado ? 'confirmado' : 'pendiente'}">
            ${esConfirmado ? '✅ Confirmado' : '⏳ Pendiente'}
          </span>
        </td>
        <td>
          ${esConfirmado
            ? `<button class="btn-pago revertir" onclick="cambiarPago(${ins.id}, 'pendiente')">↩ Revertir</button>`
            : `<button class="btn-pago confirmar" onclick="cambiarPago(${ins.id}, 'confirmado')">✅ Confirmar</button>`
          }
        </td>
      </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────
// Cambio de estado de pago
// ─────────────────────────────────────────────

/**
 * Envía actualización de pago al backend.
 * @param {number} id
 * @param {string} estado - 'confirmado' | 'pendiente'
 */
async function cambiarPago(id, estado) {
  try {
    let exito = false;

    if (isLocal) {
      try {
        const res = await fetch(`/api/admin/inscripciones/${id}/pago`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': CONFIG.ADMIN_PASSWORD,
          },
          body: JSON.stringify({ estado }),
        });
        if (res.ok) exito = true;
      } catch (_) {}
    }

    if (!exito) {
      const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method:   'POST',
        headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
        body:     JSON.stringify({ action: 'updatePago', id, estado, password: CONFIG.ADMIN_PASSWORD }),
        redirect: 'follow',
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    }

    mostrarToast(`✅ Pago marcado como "${estado}".`, 'exito');
    const busqueda = document.getElementById('buscador').value;
    cargarInscripciones(busqueda);

  } catch (err) {
    console.error('Error al cambiar estado de pago:', err);
    mostrarToast('❌ ' + (err.message || 'Error al actualizar el pago.'), 'error');
  }
}

// ─────────────────────────────────────────────
// Búsqueda con debounce
// ─────────────────────────────────────────────

/**
 * Espera 400ms antes de buscar para evitar peticiones continuas.
 */
function buscarConDelay() {
  clearTimeout(timerBusqueda);
  timerBusqueda = setTimeout(() => {
    const busqueda = document.getElementById('buscador').value.trim();
    cargarInscripciones(busqueda);
  }, 400);
}

// ─────────────────────────────────────────────
// Exportación a Excel
// ─────────────────────────────────────────────

/**
 * Descarga el archivo Excel.
 */
function exportarExcel() {
  if (isLocal) {
    window.location.href = `/api/admin/exportar?password=${encodeURIComponent(CONFIG.ADMIN_PASSWORD)}`;
    return;
  }

  if (!CONFIG.SHEET_ID || CONFIG.SHEET_ID === 'TU_SHEET_ID_AQUI') {
    alert('Configura SHEET_ID en js/config.js para habilitar la descarga de Excel.');
    return;
  }

  window.open(`https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=xlsx`, '_blank');
}

// ─────────────────────────────────────────────
// Utilidades de UI
// ─────────────────────────────────────────────

let timerToast = null;

/**
 * Muestra una notificación emergente tipo toast.
 * @param {string} mensaje
 * @param {'exito'|'error'} [tipo='exito']
 */
function mostrarToast(mensaje, tipo = 'exito') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  clearTimeout(timerToast);

  toast.textContent = mensaje;
  toast.className   = `toast visible ${tipo}`;

  timerToast = setTimeout(() => {
    toast.classList.remove('visible');
  }, 3500);
}

/**
 * Escapa caracteres HTML especiales para evitar XSS.
 * @param {string} str
 * @returns {string}
 */
function escaparHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
