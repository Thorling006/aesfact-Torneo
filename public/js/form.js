/**
 * form.js
 * Lógica del formulario público de inscripción al Torneo Clash Royale AESFACT.
 *
 * Responsabilidades:
 * - Validación en tiempo real de cada campo
 * - Validación completa al enviar
 * - Envío de datos a la API del backend via fetch
 * - Mostrar pantalla de confirmación tras inscripción exitosa
 * - Reiniciar formulario para una nueva inscripción
 */

'use strict';

// ─────────────────────────────────────────────
// Referencias al DOM
// ─────────────────────────────────────────────

const form             = document.getElementById('form-inscripcion');
const btnInscribir     = document.getElementById('btn-inscribir');
const alertaError      = document.getElementById('alerta-error');
const pantallaExito    = document.getElementById('pantalla-exito');
const seccionForm      = document.getElementById('seccion-formulario');
const exitoDatos       = document.getElementById('exito-datos');

// ─────────────────────────────────────────────
// Configuración de validaciones por campo
// ─────────────────────────────────────────────

const campos = {
  nombre_completo: {
    id: 'nombre_completo',
    errorId: 'error-nombre',
    validar(val) {
      if (!val || val.trim().length < 3) return 'Ingresa tu nombre completo (mínimo 3 caracteres).';
      return null;
    },
  },
  codigo_estudiantil: {
    id: 'codigo_estudiantil',
    errorId: 'error-codigo',
    validar(val) {
      if (!val || val.trim().length < 5) return 'Ingresa tu código estudiantil (ej. SMSS029224).';
      return null;
    },
  },
  telefono: {
    id: 'telefono',
    errorId: 'error-telefono',
    validar(val) {
      const limpio = val ? val.replace(/[\s\-\(\)]/g, '') : '';
      if (!limpio || limpio.length < 7) return 'Ingresa un número de teléfono válido.';
      return null;
    },
  },
  nombre_clash_royale: {
    id: 'nombre_clash_royale',
    errorId: 'error-nombre-cr',
    validar(val) {
      if (!val || val.trim().length < 1) return 'Ingresa tu nombre en Clash Royale.';
      return null;
    },
  },
  etiqueta_clash_royale: {
    id: 'etiqueta_clash_royale',
    errorId: 'error-etiqueta',
    validar(val) {
      if (!val || !val.trim().startsWith('#')) return 'La etiqueta debe empezar con "#" (ej. #2PQRLV8CJ).';
      if (val.trim().length < 4) return 'La etiqueta parece demasiado corta.';
      return null;
    },
  },
};

// ─────────────────────────────────────────────
// Helpers de UI
// ─────────────────────────────────────────────

/**
 * Muestra u oculta el mensaje de error debajo de un campo.
 * @param {string} errorId - ID del elemento de error
 * @param {string|null} mensaje - Mensaje a mostrar, o null para ocultar
 */
function setError(errorId, mensaje) {
  const el = document.getElementById(errorId);
  if (!el) return;
  if (mensaje) {
    el.textContent = mensaje;
    el.classList.add('visible');
  } else {
    el.textContent = '';
    el.classList.remove('visible');
  }
}

/**
 * Marca un campo como válido, inválido o sin estado.
 * @param {string} inputId
 * @param {'valido'|'error'|null} estado
 */
function setEstadoCampo(inputId, estado) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.classList.remove('valido', 'error');
  if (estado) el.classList.add(estado);
}

/**
 * Muestra la alerta de error global.
 */
function mostrarAlertaGlobal(mensaje) {
  alertaError.textContent = mensaje;
  alertaError.classList.add('visible');
  alertaError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Oculta la alerta de error global.
 */
function ocultarAlertaGlobal() {
  alertaError.classList.remove('visible');
  alertaError.textContent = '';
}

// ─────────────────────────────────────────────
// Validación en tiempo real (al salir del campo)
// ─────────────────────────────────────────────

Object.values(campos).forEach(({ id, errorId, validar }) => {
  const input = document.getElementById(id);
  if (!input) return;

  input.addEventListener('blur', () => {
    const error = validar(input.value);
    setError(errorId, error);
    setEstadoCampo(id, error ? 'error' : (input.value.trim() ? 'valido' : null));
  });

  // Limpiar error mientras escribe
  input.addEventListener('input', () => {
    setError(errorId, null);
    if (input.classList.contains('error')) {
      setEstadoCampo(id, null);
    }
  });
});

// Agregar # automáticamente al campo de etiqueta
const inputEtiqueta = document.getElementById('etiqueta_clash_royale');
inputEtiqueta.addEventListener('input', () => {
  let val = inputEtiqueta.value;
  if (val.length > 0 && !val.startsWith('#')) {
    inputEtiqueta.value = '#' + val;
  }
});

// ─────────────────────────────────────────────
// Validación completa del formulario
// ─────────────────────────────────────────────

/**
 * Valida todos los campos y retorna si el formulario es válido.
 * @returns {boolean}
 */
function validarFormulario() {
  let valido = true;

  // Validar campos de texto
  Object.values(campos).forEach(({ id, errorId, validar }) => {
    const input = document.getElementById(id);
    const error = validar(input ? input.value : '');
    setError(errorId, error);
    setEstadoCampo(id, error ? 'error' : 'valido');
    if (error) valido = false;
  });

  // Validar checkbox de reglamento (obligatorio)
  const checkReglamento  = document.getElementById('acepto_reglamento');
  const errorReglamento  = document.getElementById('error-reglamento');
  if (!checkReglamento.checked) {
    errorReglamento.style.display = 'block';
    errorReglamento.textContent   = 'Debes aceptar el reglamento para inscribirte.';
    valido = false;
  } else {
    errorReglamento.style.display = 'none';
  }

  return valido;
}

// ─────────────────────────────────────────────
// Envío del formulario
// ─────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlertaGlobal();

  // Validar antes de enviar
  if (!validarFormulario()) {
    mostrarAlertaGlobal('Por favor completa todos los campos obligatorios.');
    return;
  }

  // Deshabilitar botón y mostrar spinner
  btnInscribir.disabled   = true;
  btnInscribir.innerHTML  = '<span class="spinner"></span> Registrando...';

  // Recopilar datos del formulario
  const datos = {
    nombre_completo:       document.getElementById('nombre_completo').value.trim(),
    codigo_estudiantil:    document.getElementById('codigo_estudiantil').value.trim().toUpperCase(),
    telefono:              document.getElementById('telefono').value.trim(),
    nombre_clash_royale:   document.getElementById('nombre_clash_royale').value.trim(),
    etiqueta_clash_royale: document.getElementById('etiqueta_clash_royale').value.trim().toUpperCase(),
    acepto_reglamento:     document.getElementById('acepto_reglamento').checked,
    acepto_fotos:          document.getElementById('acepto_fotos').checked,
  };

  try {
    // Detectar si estamos en entorno local o remoto
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const url = isLocal ? '/api/inscripcion' : CONFIG.APPS_SCRIPT_URL;
    const headers = isLocal ? { 'Content-Type': 'application/json' } : { 'Content-Type': 'text/plain;charset=utf-8' };

    // Enviar al backend (Express local o Google Apps Script)
    const respuesta = await fetch(url, {
      method:   'POST',
      headers:  headers,
      body:     JSON.stringify(datos),
      redirect: 'follow',
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      // Error del servidor (ej. duplicado, validación)
      mostrarAlertaGlobal(resultado.error || 'Ocurrió un error. Intenta de nuevo.');
      btnInscribir.disabled  = false;
      btnInscribir.innerHTML = '⚔️ Inscribirme al Torneo';
      return;
    }

    // ¡Éxito! Mostrar pantalla de confirmación
    mostrarPantallaExito(resultado.inscripcion);

  } catch (err) {
    // Error de red
    mostrarAlertaGlobal('Error de conexión. Verifica tu internet e intenta de nuevo.');
    btnInscribir.disabled  = false;
    btnInscribir.innerHTML = '⚔️ Inscribirme al Torneo';
  }
});

// ─────────────────────────────────────────────
// Pantalla de éxito
// ─────────────────────────────────────────────

/**
 * Muestra la pantalla de confirmación con los datos del inscrito.
 * @param {Object} inscripcion - Datos retornados por el backend
 */
function mostrarPantallaExito(inscripcion) {
  // Llenar datos en la pantalla de éxito
  exitoDatos.innerHTML = `
    <p>👤 Nombre: <span>${inscripcion.nombre_completo}</span></p>
    <p>🎓 Código: <span>${inscripcion.codigo_estudiantil}</span></p>
    <p>🎮 Nick CR: <span>${inscripcion.nombre_clash_royale}</span></p>
    <p>🏷️ Etiqueta: <span>${inscripcion.etiqueta_clash_royale}</span></p>
    <p>🕒 Registrado: <span>${inscripcion.fecha_hora_inscripcion || 'Ahora'}</span></p>
    <p>💰 Estado pago: <span style="color:#fb923c;">Pendiente</span></p>
  `;

  // Ocultar formulario y mostrar pantalla de éxito
  seccionForm.style.display  = 'none';
  pantallaExito.classList.add('visible');

  // Scroll al inicio
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─────────────────────────────────────────────
// Reiniciar formulario
// ─────────────────────────────────────────────

/**
 * Oculta la pantalla de éxito y vuelve al formulario limpio.
 * Llamada desde el botón "Inscribir a otra persona".
 */
function reiniciarFormulario() {
  // Limpiar formulario
  form.reset();

  // Remover clases de validación
  Object.values(campos).forEach(({ id, errorId }) => {
    setEstadoCampo(id, null);
    setError(errorId, null);
  });

  document.getElementById('error-reglamento').style.display = 'none';
  ocultarAlertaGlobal();

  // Restaurar botón
  btnInscribir.disabled  = false;
  btnInscribir.innerHTML = '⚔️ Inscribirme al Torneo';

  // Mostrar formulario, ocultar éxito
  seccionForm.style.display   = 'block';
  pantallaExito.classList.remove('visible');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
