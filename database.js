/**
 * database.js
 * Módulo de base de datos SQLite para el sistema de inscripciones AESFACT.
 *
 * Usa sql.js (SQLite compilado a JavaScript puro — sin binarios nativos).
 * La base de datos vive en memoria y se persiste a disco en cada escritura.
 */

const initSqlJs = require('sql.js'); // SQLite puro JS, sin compilación nativa
const fs        = require('fs');
const path      = require('path');

// Ruta del archivo de base de datos en disco
const DB_PATH = path.join(__dirname, 'inscripciones.db');

// Instancia de la base de datos (se llena en inicializarDB)
let db = null;

// ─────────────────────────────────────────────
// Inicialización
// ─────────────────────────────────────────────

/**
 * Inicializa sql.js y carga (o crea) la base de datos.
 * Es asíncrona porque sql.js carga un módulo WASM.
 */
async function inicializarDB() {
  // Cargar el motor SQLite compilado a JS
  const SQL = await initSqlJs();

  // Si ya existe un archivo .db, cargarlo; si no, crear base de datos nueva
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('✅ Base de datos cargada desde:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('✅ Base de datos nueva creada en:', DB_PATH);
  }

  // Crear tabla si no existe
  db.run(`
    CREATE TABLE IF NOT EXISTS inscripciones (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_completo           TEXT    NOT NULL,
      codigo_estudiantil        TEXT    NOT NULL UNIQUE,
      telefono                  TEXT    NOT NULL,
      nombre_clash_royale       TEXT    NOT NULL,
      etiqueta_clash_royale     TEXT    NOT NULL,
      acepto_reglamento         INTEGER NOT NULL DEFAULT 0,
      acepto_fotos              INTEGER NOT NULL DEFAULT 0,
      fecha_hora_inscripcion    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime')),
      estado_pago               TEXT    NOT NULL DEFAULT 'pendiente'
    )
  `);

  // Guardar en disco tras crear la tabla
  guardarEnDisco();
}

// ─────────────────────────────────────────────
// Persistencia en disco
// ─────────────────────────────────────────────

/**
 * Exporta la base de datos en memoria al archivo .db en disco.
 * Se llama después de cada operación de escritura.
 */
function guardarEnDisco() {
  const datos  = db.export();               // Uint8Array con el contenido del DB
  const buffer = Buffer.from(datos);
  fs.writeFileSync(DB_PATH, buffer);
}

// ─────────────────────────────────────────────
// Helpers de consulta
// ─────────────────────────────────────────────

/**
 * Ejecuta un SELECT y retorna todas las filas como array de objetos.
 * @param {string} sql    - Consulta SQL
 * @param {Array}  params - Parámetros posicionales
 * @returns {Array<Object>}
 */
function consultar(sql, params = []) {
  const stmt  = db.prepare(sql);
  stmt.bind(params);
  const filas = [];
  while (stmt.step()) {
    filas.push(stmt.getAsObject());
  }
  stmt.free();
  return filas;
}

/**
 * Ejecuta un INSERT/UPDATE/DELETE y guarda en disco.
 * @param {string} sql
 * @param {Array}  params
 */
function modificar(sql, params = []) {
  db.run(sql, params);
  guardarEnDisco();
}

// ─────────────────────────────────────────────
// Funciones CRUD
// ─────────────────────────────────────────────

/**
 * Inserta una nueva inscripción.
 * @param {Object} datos
 * @returns {Object} El registro recién insertado
 * @throws {Error} Si el código ya existe (UNIQUE constraint)
 */
function insertarInscripcion(datos) {
  const codigoNorm   = datos.codigo_estudiantil.trim().toUpperCase();
  const etiquetaNorm = datos.etiqueta_clash_royale.trim().toUpperCase();

  modificar(
    `INSERT INTO inscripciones
       (nombre_completo, codigo_estudiantil, telefono,
        nombre_clash_royale, etiqueta_clash_royale,
        acepto_reglamento, acepto_fotos)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.nombre_completo.trim(),
      codigoNorm,
      datos.telefono.trim(),
      datos.nombre_clash_royale.trim(),
      etiquetaNorm,
      datos.acepto_reglamento ? 1 : 0,
      datos.acepto_fotos      ? 1 : 0,
    ]
  );

  // Recuperar el registro por código estudiantil (único), más confiable que rowid en sql.js
  const filas = consultar(
    'SELECT * FROM inscripciones WHERE codigo_estudiantil = ?',
    [codigoNorm]
  );
  return filas[0];
}

/**
 * Busca por código estudiantil (para detectar duplicados).
 * @param {string} codigo
 * @returns {Object|undefined}
 */
function buscarPorCodigo(codigo) {
  const filas = consultar(
    'SELECT * FROM inscripciones WHERE codigo_estudiantil = ?',
    [codigo.trim().toUpperCase()]
  );
  return filas[0];
}

/**
 * Retorna todas las inscripciones, con búsqueda opcional.
 * @param {string} busqueda
 * @returns {Array}
 */
function listarTodas(busqueda = '') {
  if (busqueda && busqueda.trim()) {
    const t = `%${busqueda.trim()}%`;
    return consultar(
      `SELECT * FROM inscripciones
       WHERE nombre_completo       LIKE ?
          OR codigo_estudiantil    LIKE ?
          OR etiqueta_clash_royale LIKE ?
          OR nombre_clash_royale   LIKE ?
       ORDER BY fecha_hora_inscripcion DESC`,
      [t, t, t, t]
    );
  }
  return consultar('SELECT * FROM inscripciones ORDER BY fecha_hora_inscripcion DESC');
}

/**
 * Actualiza el estado de pago de una inscripción.
 * @param {number} id
 * @param {string} estado - 'pendiente' | 'confirmado'
 * @returns {boolean}
 */
function actualizarEstadoPago(id, estado) {
  if (!['pendiente', 'confirmado'].includes(estado)) {
    throw new Error('Estado inválido. Use: pendiente | confirmado');
  }
  modificar('UPDATE inscripciones SET estado_pago = ? WHERE id = ?', [estado, id]);
  // Verificar que se actualizó algo
  const fila = consultar('SELECT id FROM inscripciones WHERE id = ?', [id]);
  return fila.length > 0;
}

/**
 * Retorna estadísticas básicas.
 * @returns {{ total: number, confirmados: number, pendientes: number }}
 */
function obtenerEstadisticas() {
  const total       = consultar("SELECT COUNT(*) AS c FROM inscripciones")[0]?.c || 0;
  const confirmados = consultar("SELECT COUNT(*) AS c FROM inscripciones WHERE estado_pago = 'confirmado'")[0]?.c || 0;
  return {
    total:       Number(total),
    confirmados: Number(confirmados),
    pendientes:  Number(total) - Number(confirmados),
  };
}

module.exports = {
  inicializarDB,
  insertarInscripcion,
  buscarPorCodigo,
  listarTodas,
  actualizarEstadoPago,
  obtenerEstadisticas,
};
