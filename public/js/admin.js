/**
 * admin.js
 * Lógica del panel de administrador para el Torneo Clash Royale AESFACT.
 *
 * Responsabilidades:
 * - Autenticación con contraseña (guardada en sessionStorage)
 * - Carga y renderizado de inscripciones en tabla
 * - Búsqueda en tiempo real con debounce
 * - Cambio de estado de pago por inscripción
 * - Exportación a Excel via API del backend
 * - Actualización de estadísticas
 */

'use strict';

// ─────────────────────────────────────────────
// Estado global del panel
// ─────────────────────────────────────────────

let passwordAdmin = '';       // Contraseña en memoria de la sesión
let timerBusqueda = null;     // Debounce timer para el buscador

// ─────────────────────────────────────────────
// Inicialización
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Verificar si hay sesión guardada en sessionStorage
  const sesionGuardada = sessionStorage.getItem('aesfact_admin_pw');
  if (sesionGuardada) {
    passwordAdmin = sesionGuardada;
    mostrarPanel();
  }
});

// ─────────────────────────────────────────────
// Autenticación
// ─────────────────────────────────────────────

/**
 * Maneja el inicio de sesión del administrador.
 * @param {Event} e - Evento submit del formulario
 */
async function iniciarSesion(e) {
  e.preventDefault();
  const input    = document.getElementById('input-password');
  const errorEl  = document.getElementById('login-error');
  const password = input.value;

  try {
    const res = await fetch('/api/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    });

    const data = await res.json();

    if (res.ok && data.ok) {
      // Guardar contraseña en sessionStorage (se borra al cerrar pestaña)
      passwordAdmin = password;
      sessionStorage.setItem('aesfact_admin_pw', password);
      errorEl.classList.remove('visible');
      mostrarPanel();
    } else {
      errorEl.textContent = data.error || 'Contraseña incorrecta.';
      errorEl.classList.add('visible');
      input.value = '';
      input.focus();
    }
  } catch {
    errorEl.textContent = 'Error de conexión con el servidor.';
    errorEl.classList.add('visible');
  }
}

/**
 * Cierra la sesión y regresa a la pantalla de login.
 */
function cerrarSesion() {
  sessionStorage.removeItem('aesfact_admin_pw');
  passwordAdmin = '';
  document.getElementById('pantalla-admin').classList.remove('visible');
  document.getElementById('pantalla-login').style.display = 'flex';
  document.getElementById('input-password').value = '';
}

/**
 * Muestra el panel de administrador y carga los datos iniciales.
 */
function mostrarPanel() {
  document.getElementById('pantalla-login').style.display  = 'none';
  document.getElementById('pantalla-admin').classList.add('visible');
  // Cargar datos
  cargarEstadisticas();
  cargarInscripciones();
}

// ─────────────────────────────────────────────
// Headers de autenticación para las peticiones
// ─────────────────────────────────────────────

/**
 * Retorna los headers con la contraseña de admin para peticiones protegidas.
 */
function headersAdmin() {
  return {
    'Content-Type':    'application/json',
    'X-Admin-Password': passwordAdmin,
  };
}

// ─────────────────────────────────────────────
// Estadísticas
// ─────────────────────────────────────────────

/**
 * Carga y muestra las estadísticas de inscripciones.
 */
async function cargarEstadisticas() {
  try {
    const res  = await fetch('/api/admin/estadisticas', { headers: headersAdmin() });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('stat-total').textContent       = data.total;
      document.getElementById('stat-confirmados').textContent = data.confirmados;
      document.getElementById('stat-pendientes').textContent  = data.pendientes;
    }
  } catch {
    // Silencioso — no interrumpir la UI por esto
  }
}

// ─────────────────────────────────────────────
// Carga y renderizado de inscripciones
// ─────────────────────────────────────────────

/**
 * Carga las inscripciones desde el backend y las renderiza en la tabla.
 * @param {string} [busqueda=''] - Término de búsqueda opcional
 */
async function cargarInscripciones(busqueda = '') {
  const tbody = document.getElementById('cuerpo-tabla');

  // Mostrar estado de carga
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
    const url = busqueda
      ? `/api/admin/inscripciones?q=${encodeURIComponent(busqueda)}`
      : '/api/admin/inscripciones';

    const res  = await fetch(url, { headers: headersAdmin() });

    // Si la sesión expiró (401), redirigir al login
    if (res.status === 401) {
      cerrarSesion();
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Error al cargar inscripciones.');
    }

    renderizarTabla(data.inscripciones);
    cargarEstadisticas(); // Actualizar contadores también

  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="tabla-vacia">
            <p>⚠️</p>
            <p>Error al cargar datos: ${err.message}</p>
          </div>
        </td>
      </tr>`;
  }
}

/**
 * Renderiza las filas de la tabla de inscripciones.
 * @param {Array} inscripciones - Array de objetos de inscripción
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

    // Formatear fecha de forma legible
    const fecha = ins.fecha_hora_inscripcion
      ? ins.fecha_hora_inscripcion.replace('T', ' ').substring(0, 16)
      : '—';

    return `
      <tr>
        <td>${ins.id}</td>
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
            ? `<button class="btn-pago revertir" onclick="cambiarPago(${ins.id}, 'pendiente')" title="Revertir a pendiente">
                ↩ Revertir
               </button>`
            : `<button class="btn-pago confirmar" onclick="cambiarPago(${ins.id}, 'confirmado')" title="Marcar pago como confirmado">
                ✅ Confirmar
               </button>`
          }
        </td>
      </tr>`;
  }).join('');
}

// ─────────────────────────────────────────────
// Cambio de estado de pago
// ─────────────────────────────────────────────

/**
 * Actualiza el estado de pago de una inscripción.
 * @param {number} id     - ID de la inscripción
 * @param {string} estado - 'confirmado' o 'pendiente'
 */
async function cambiarPago(id, estado) {
  try {
    const res = await fetch(`/api/admin/inscripciones/${id}/pago`, {
      method:  'PATCH',
      headers: headersAdmin(),
      body:    JSON.stringify({ estado }),
    });

    const data = await res.json();

    if (res.ok) {
      mostrarToast(`✅ Pago marcado como "${estado}" correctamente.`, 'exito');
      // Recargar la tabla con el mismo término de búsqueda activo
      const busqueda = document.getElementById('buscador').value;
      cargarInscripciones(busqueda);
    } else {
      mostrarToast(`❌ Error: ${data.error}`, 'error');
    }
  } catch {
    mostrarToast('❌ Error de conexión.', 'error');
  }
}

// ─────────────────────────────────────────────
// Búsqueda con debounce
// ─────────────────────────────────────────────

/**
 * Espera 400ms después de la última pulsación antes de buscar.
 * Evita llamadas al servidor en cada letra presionada.
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
 * Descarga el archivo Excel generado por el backend.
 * Se utiliza un enlace temporal para activar la descarga.
 */
function exportarExcel() {
  // Construir URL con la contraseña como parámetro query
  // (necesario porque los navegadores no envían headers en <a download>)
  const url = `/api/admin/exportar?password=${encodeURIComponent(passwordAdmin)}`;

  // Crear enlace temporal e invocar la descarga
  const a    = document.createElement('a');
  a.href     = url;
  a.download = ''; // El backend establece el nombre del archivo
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  mostrarToast('📥 Descargando archivo Excel...', 'exito');
}

// ─────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────

/**
 * Escapa caracteres HTML para prevenir XSS al insertar texto en el DOM.
 * @param {string} str
 * @returns {string}
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
 * Muestra un toast de notificación temporal.
 * @param {string} mensaje
 * @param {'exito'|'error'} tipo
 */
function mostrarToast(mensaje, tipo = 'exito') {
  const toast = document.getElementById('toast');
  toast.textContent = mensaje;
  toast.className   = `toast ${tipo} visible`;

  // Auto-ocultar después de 3.5 segundos
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3500);
}
