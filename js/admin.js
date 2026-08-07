/**
 * admin.js
 * Lógica del panel de administrador — versión GitHub Pages.
 * Conecta con Google Apps Script en lugar del servidor Node.js local.
 *
 * Lo que cambió respecto a la versión local:
 *  - iniciarSesion(): verifica contraseña contra CONFIG.ADMIN_PASSWORD (lado cliente)
 *  - cargarInscripciones(): fetch a Apps Script GET ?action=list
 *  - cargarEstadisticas(): fetch a Apps Script GET ?action=stats
 *  - cambiarPago(): POST a Apps Script con action=updatePago
 *  - exportarExcel(): enlace de descarga directa de Google Sheets (.xlsx)
 *
 * Lo que NO cambió: toda la lógica de UI, tabla, toast, búsqueda, etc.
 */

'use strict';

// ─────────────────────────────────────────────
// Estado global del panel
// ─────────────────────────────────────────────

let timerBusqueda = null; // Debounce timer para el buscador

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
// Autenticación (verificación local + Apps Script valida en cada llamada)
// ─────────────────────────────────────────────

/**
 * Verifica la contraseña localmente contra CONFIG.ADMIN_PASSWORD.
 * La contraseña también se valida en cada llamada a Apps Script del lado servidor.
 * @param {Event} e
 */
function iniciarSesion(e) {
  e.preventDefault();
  const input    = document.getElementById('input-password');
  const errorEl  = document.getElementById('login-error');
  const password = input.value.trim();

  if (password === CONFIG.ADMIN_PASSWORD) {
    // Guardar sesión (se borra al cerrar la pestaña)
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
 * Carga contadores desde Apps Script y los muestra en las tarjetas.
 */
async function cargarEstadisticas() {
  try {
    const url = `${CONFIG.APPS_SCRIPT_URL}?action=stats&password=${encodeURIComponent(CONFIG.ADMIN_PASSWORD)}`;
    const res  = await fetch(url, { redirect: 'follow' });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    document.getElementById('stat-total').textContent       = data.total;
    document.getElementById('stat-confirmados').textContent = data.confirmados;
    document.getElementById('stat-pendientes').textContent  = data.pendientes;
  } catch {
    // Silencioso — no interrumpir la UI
  }
}

// ─────────────────────────────────────────────
// Carga y renderizado de inscripciones
// ─────────────────────────────────────────────

/**
 * Carga las inscripciones desde Apps Script y las muestra en la tabla.
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
    const params = new URLSearchParams({
      action:   'list',
      password: CONFIG.ADMIN_PASSWORD,
      q:        busqueda,
    });
    const res  = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params}`, { redirect: 'follow' });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    renderizarTabla(data.inscripciones || []);
    cargarEstadisticas();

  } catch (err) {
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
            <p>No hay inscripciones aún.</p>
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
        <td>${escaparHTML(ins.nombre_completo)}</td>
        <td class="col-codigo"><code style="font-size:0.82rem;">${escaparHTML(ins.codigo_estudiantil)}</code></td>
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
 * Envía actualización de pago a Apps Script mediante POST.
 * @param {number} id
 * @param {string} estado - 'confirmado' | 'pendiente'
 */
async function cambiarPago(id, estado) {
  try {
    // Enviamos como POST con Content-Type: text/plain para evitar preflight CORS
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'text/plain;charset=utf-8' },
      body:     JSON.stringify({ action: 'updatePago', id, estado, password: CONFIG.ADMIN_PASSWORD }),
      redirect: 'follow',
    });

    const data = await res.json();

    if (data.error) {
      mostrarToast(`❌ ${data.error}`, 'error');
    } else {
      mostrarToast(`✅ Pago marcado como "${estado}".`, 'exito');
      const busqueda = document.getElementById('buscador').value;
      cargarInscripciones(busqueda);
    }
  } catch (err) {
    mostrarToast('❌ Error de conexión.', 'error');
  }
}

// ─────────────────────────────────────────────
// Búsqueda con debounce
// ─────────────────────────────────────────────

/**
 * Espera 500ms antes de buscar para no sobrecargar Apps Script.
 */
function buscarConDelay() {
  clearTimeout(timerBusqueda);
  timerBusqueda = setTimeout(() => {
    const busqueda = document.getElementById('buscador').value.trim();
    cargarInscripciones(busqueda);
  }, 500);
}

// ─────────────────────────────────────────────
// Exportación a Excel
// ─────────────────────────────────────────────

/**
 * Abre la URL de descarga directa de Google Sheets en formato .xlsx.
 * No requiere servidor — Google Sheets genera el archivo.
 */
function exportarExcel() {
  if (!CONFIG.SHEET_ID || CONFIG.SHEET_ID === 'TU_SHEET_ID_AQUI') {
    mostrarToast('⚠️ Configura el SHEET_ID en js/config.js primero.', 'error');
    return;
  }

  // URL de exportación directa de Google Sheets a Excel
  const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=xlsx&sheet=Inscripciones`;
  window.open(url, '_blank');
  mostrarToast('📥 Descargando Excel desde Google Sheets...', 'exito');
}

// ─────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str
 */
function escaparHTML(str) {
  if (!str) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Muestra un toast de notificación temporal (3.5 segundos).
 * @param {string} mensaje
 * @param {'exito'|'error'} tipo
 */
function mostrarToast(mensaje, tipo = 'exito') {
  const toast       = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.className   = `toast ${tipo} visible`;
  setTimeout(() => toast.classList.remove('visible'), 3500);
}
