/**
 * codigo.gs — Google Apps Script
 * Backend para el Torneo Clash Royale AESFACT 2026
 *
 * ════════════════════════════════════════════════════
 *  INSTRUCCIONES DE DESPLIEGUE (hacer UNA sola vez):
 * ════════════════════════════════════════════════════
 * 1. Crea un Google Sheet nuevo en drive.google.com
 * 2. En el sheet: Extensiones → Apps Script
 * 3. Borra el código que viene y pega TODO este archivo
 * 4. Guarda (Ctrl+S)
 * 5. Clic en "Implementar" → "Nueva implementación"
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo (tu cuenta Google)
 *    - Quién tiene acceso: Cualquier usuario
 * 6. Autoriza los permisos cuando te lo pida
 * 7. Copia la URL que aparece y pégala en js/config.js
 * 8. También copia el ID del Sheet de la URL del navegador
 *    (la parte entre /d/ y /edit) y pégalo en js/config.js
 */

// ── Configuración ─────────────────────────────────────
const SHEET_NAME    = 'Inscripciones';
const ADMIN_PASSWORD = 'aesfact2026'; // Debe coincidir con js/config.js

// Índices de columnas (base 1 para getRange, base 0 para arrays)
const COL = {
  ID:            1,
  NOMBRE:        2,
  CODIGO:        3,
  TELEFONO:      4,
  NOMBRE_CR:     5,
  ETIQUETA_CR:   6,
  ACEPTO_REG:    7,
  ACEPTO_FOTOS:  8,
  FECHA:         9,
  ESTADO_PAGO:   10,
};

// ── Inicialización de la hoja ──────────────────────────

/**
 * Obtiene (o crea) la hoja y agrega encabezados si está vacía.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function obtenerHoja() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  let hoja   = ss.getSheetByName(SHEET_NAME);

  if (!hoja) {
    hoja = ss.insertSheet(SHEET_NAME);
  }

  // Si la hoja está vacía, crear encabezados formateados
  if (hoja.getLastRow() === 0) {
    const encabezados = [
      'ID', 'Nombre Completo', 'Código Estudiantil', 'Teléfono',
      'Nombre Clash Royale', 'Etiqueta Clash Royale',
      'Aceptó Reglamento', 'Aceptó Fotos',
      'Fecha/Hora Inscripción', 'Estado de Pago',
    ];
    hoja.appendRow(encabezados);
    const rango = hoja.getRange(1, 1, 1, encabezados.length);
    rango.setBackground('#1a3a8f')
         .setFontColor('#ffffff')
         .setFontWeight('bold')
         .setHorizontalAlignment('center');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(COL.NOMBRE, 200);
    hoja.setColumnWidth(COL.FECHA, 160);
  }

  return hoja;
}

// ── Manejador de peticiones POST ───────────────────────

/**
 * doPost: recibe inscripciones y actualizaciones de pago.
 * Usa Content-Type: text/plain para evitar preflight CORS.
 */
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);

    // Acción: actualizar estado de pago (admin)
    if (datos.action === 'updatePago') {
      if (datos.password !== ADMIN_PASSWORD) {
        return respuestaJSON({ error: 'No autorizado.' });
      }
      return actualizarEstadoPago(Number(datos.id), datos.estado);
    }

    // Acción por defecto: nueva inscripción
    return procesarInscripcion(datos);

  } catch (err) {
    return respuestaJSON({ error: 'Error del servidor: ' + err.message });
  }
}

// ── Manejador de peticiones GET ────────────────────────

/**
 * doGet: lista inscripciones y retorna estadísticas.
 */
function doGet(e) {
  try {
    const accion   = e.parameter.action   || '';
    const password = e.parameter.password || '';
    const q        = e.parameter.q        || '';

    // Verificar contraseña para operaciones de admin
    if (accion === 'list' || accion === 'stats') {
      if (password !== ADMIN_PASSWORD) {
        return respuestaJSON({ error: 'No autorizado. Contraseña incorrecta.' });
      }
      if (accion === 'list')  return getInscripciones(q);
      if (accion === 'stats') return getEstadisticas();
    }

    // Health check
    return respuestaJSON({ ok: true, mensaje: 'AESFACT Torneo API funcionando.' });

  } catch (err) {
    return respuestaJSON({ error: 'Error del servidor: ' + err.message });
  }
}

// ── Lógica de inscripción ──────────────────────────────

/**
 * Valida e inserta una nueva inscripción en la hoja.
 */
function procesarInscripcion(datos) {
  // Validaciones del servidor
  if (!datos.nombre_completo || datos.nombre_completo.trim().length < 3) {
    return respuestaJSON({ error: 'El nombre completo es obligatorio (mínimo 3 caracteres).' });
  }
  if (!datos.codigo_estudiantil || datos.codigo_estudiantil.trim().length < 5) {
    return respuestaJSON({ error: 'El código estudiantil es obligatorio.' });
  }
  if (!datos.telefono || datos.telefono.trim().replace(/\D/g, '').length < 7) {
    return respuestaJSON({ error: 'El número de teléfono es obligatorio.' });
  }
  if (!datos.nombre_clash_royale || !datos.nombre_clash_royale.trim()) {
    return respuestaJSON({ error: 'El nombre en Clash Royale es obligatorio.' });
  }
  if (!datos.etiqueta_clash_royale || !datos.etiqueta_clash_royale.trim().startsWith('#')) {
    return respuestaJSON({ error: 'La etiqueta de Clash Royale debe empezar con "#".' });
  }
  if (!datos.acepto_reglamento) {
    return respuestaJSON({ error: 'Debes aceptar el reglamento para inscribirte.' });
  }

  const hoja    = obtenerHoja();
  const codigo  = datos.codigo_estudiantil.trim().toUpperCase();
  const lastRow = hoja.getLastRow();

  // Verificar código estudiantil duplicado
  if (lastRow > 1) {
    const codigos = hoja.getRange(2, COL.CODIGO, lastRow - 1, 1).getValues().flat();
    if (codigos.map(c => String(c).toUpperCase()).includes(codigo)) {
      return respuestaJSON({
        error: `El código "${codigo}" ya está registrado. Si crees que es un error, contáctanos vía WhatsApp.`,
      });
    }
  }

  // ID = número de fila de datos (sin header)
  const nuevoId = lastRow; // fila 1=header, fila 2=registro1 → ID=1, etc.
  const ahora   = Utilities.formatDate(
    new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'
  );
  const etiqueta = datos.etiqueta_clash_royale.trim().toUpperCase();

  hoja.appendRow([
    nuevoId,
    datos.nombre_completo.trim(),
    codigo,
    datos.telefono.trim(),
    datos.nombre_clash_royale.trim(),
    etiqueta,
    datos.acepto_reglamento ? 'Sí' : 'No',
    datos.acepto_fotos      ? 'Sí' : 'No',
    ahora,
    'pendiente',
  ]);

  // Colorear la fila recién insertada alternando colores
  const nuevaFila = hoja.getLastRow();
  const color     = (nuevaFila % 2 === 0) ? '#eef2ff' : '#ffffff';
  hoja.getRange(nuevaFila, 1, 1, 10).setBackground(color);

  return respuestaJSON({
    mensaje: '¡Inscripción exitosa! Te esperamos el 28 de agosto.',
    inscripcion: {
      id:                    nuevoId,
      nombre_completo:       datos.nombre_completo.trim(),
      codigo_estudiantil:    codigo,
      nombre_clash_royale:   datos.nombre_clash_royale.trim(),
      etiqueta_clash_royale: etiqueta,
      fecha_hora_inscripcion: ahora,
    },
  });
}

// ── Lógica de administrador ────────────────────────────

/**
 * Actualiza el estado de pago de una inscripción por su ID.
 */
function actualizarEstadoPago(id, estado) {
  if (!['pendiente', 'confirmado'].includes(estado)) {
    return respuestaJSON({ error: 'Estado inválido. Use: pendiente | confirmado' });
  }

  const hoja    = obtenerHoja();
  const lastRow = hoja.getLastRow();

  if (lastRow <= 1) {
    return respuestaJSON({ error: 'No hay inscripciones registradas.' });
  }

  const ids      = hoja.getRange(2, COL.ID, lastRow - 1, 1).getValues().flat();
  const rowIndex = ids.findIndex(rowId => Number(rowId) === id);

  if (rowIndex === -1) {
    return respuestaJSON({ error: 'Inscripción no encontrada.' });
  }

  // +2: +1 por índice base-0→base-1, +1 por fila de encabezado
  const filaHoja = rowIndex + 2;
  hoja.getRange(filaHoja, COL.ESTADO_PAGO).setValue(estado);

  // Resaltar en verde si está confirmado
  const colorFondo = estado === 'confirmado' ? '#dcfce7' : '#fff7ed';
  hoja.getRange(filaHoja, 1, 1, 10).setBackground(colorFondo);

  return respuestaJSON({ mensaje: `Estado de pago actualizado a "${estado}".` });
}

/**
 * Retorna todas las inscripciones (filtrando por búsqueda si se provee).
 */
function getInscripciones(busqueda) {
  const hoja    = obtenerHoja();
  const lastRow = hoja.getLastRow();

  if (lastRow <= 1) return respuestaJSON({ inscripciones: [] });

  const filas = hoja.getRange(2, 1, lastRow - 1, 10).getValues();

  let inscripciones = filas.map(f => ({
    id:                    f[COL.ID - 1],
    nombre_completo:       f[COL.NOMBRE - 1],
    codigo_estudiantil:    f[COL.CODIGO - 1],
    telefono:              f[COL.TELEFONO - 1],
    nombre_clash_royale:   f[COL.NOMBRE_CR - 1],
    etiqueta_clash_royale: f[COL.ETIQUETA_CR - 1],
    acepto_reglamento:     f[COL.ACEPTO_REG - 1],
    acepto_fotos:          f[COL.ACEPTO_FOTOS - 1],
    fecha_hora_inscripcion: f[COL.FECHA - 1],
    estado_pago:           f[COL.ESTADO_PAGO - 1],
  }));

  // Filtrar por término de búsqueda
  if (busqueda && busqueda.trim()) {
    const b = busqueda.trim().toLowerCase();
    inscripciones = inscripciones.filter(ins =>
      String(ins.nombre_completo).toLowerCase().includes(b)   ||
      String(ins.codigo_estudiantil).toLowerCase().includes(b) ||
      String(ins.etiqueta_clash_royale).toLowerCase().includes(b) ||
      String(ins.nombre_clash_royale).toLowerCase().includes(b)
    );
  }

  // Ordenar más reciente primero
  inscripciones.reverse();

  return respuestaJSON({ inscripciones });
}

/**
 * Retorna contadores de inscripciones y pagos.
 */
function getEstadisticas() {
  const hoja    = obtenerHoja();
  const lastRow = hoja.getLastRow();

  if (lastRow <= 1) return respuestaJSON({ total: 0, confirmados: 0, pendientes: 0 });

  const estados    = hoja.getRange(2, COL.ESTADO_PAGO, lastRow - 1, 1).getValues().flat();
  const total      = estados.length;
  const confirmados = estados.filter(e => e === 'confirmado').length;

  return respuestaJSON({ total, confirmados, pendientes: total - confirmados });
}

// ── Utilidad ───────────────────────────────────────────

/**
 * Retorna una respuesta JSON correctamente formateada para Apps Script.
 * @param {Object} data
 */
function respuestaJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
