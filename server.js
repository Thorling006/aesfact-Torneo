/**
 * server.js
 * Servidor Express principal para el sistema de inscripciones AESFACT.
 *
 * Rutas públicas:
 *   POST /api/inscripcion          → Registrar un nuevo participante
 *
 * Rutas protegidas (requieren X-Admin-Password en headers):
 *   POST   /api/admin/login                     → Validar contraseña de admin
 *   GET    /api/admin/inscripciones             → Listar inscritos (con búsqueda ?q=)
 *   PATCH  /api/admin/inscripciones/:id/pago    → Cambiar estado de pago
 *   GET    /api/admin/estadisticas              → Contadores totales
 *   GET    /api/admin/exportar                  → Descargar Excel (.xlsx)
 */

require('dotenv').config(); // Cargar variables de entorno desde .env

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const XLSX    = require('xlsx');

const {
  inicializarDB,
  insertarInscripcion,
  buscarPorCodigo,
  listarTodas,
  actualizarEstadoPago,
  obtenerEstadisticas,
} = require('./database');

// ─────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────

const app           = express();
const PORT          = process.env.PORT          || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'aesfact2026';

// La inicialización de sql.js es asíncrona (carga un módulo WASM).
// El servidor arrancará solo después de que la DB esté lista.
// (El resto del código se ejecuta dentro del IIFE al final del archivo)

// ─────────────────────────────────────────────
// Middlewares globales
// ─────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (tanto de la raíz como de /public)
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// ─────────────────────────────────────────────
// Middleware de autenticación para rutas admin
// ─────────────────────────────────────────────

/**
 * Verifica que el header X-Admin-Password coincida con la contraseña configurada.
 */
function requireAdmin(req, res, next) {
  const password = req.headers['x-admin-password'] || req.query.password;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado. Contraseña incorrecta.' });
  }
  next();
}

// ─────────────────────────────────────────────
// Helpers de validación
// ─────────────────────────────────────────────

/**
 * Valida los datos del formulario de inscripción.
 * Retorna un array de errores (vacío si todo está bien).
 */
function validarInscripcion(datos) {
  const errores = [];

  if (!datos.nombre_completo || datos.nombre_completo.trim().length < 3) {
    errores.push('El nombre completo es obligatorio (mínimo 3 caracteres).');
  }

  if (!datos.codigo_estudiantil || datos.codigo_estudiantil.trim().length < 5) {
    errores.push('El código estudiantil es obligatorio.');
  }

  if (!datos.telefono || datos.telefono.trim().length < 7) {
    errores.push('El número de teléfono es obligatorio (mínimo 7 dígitos).');
  }

  if (!datos.nombre_clash_royale || datos.nombre_clash_royale.trim().length < 1) {
    errores.push('El nombre en Clash Royale es obligatorio.');
  }

  if (!datos.etiqueta_clash_royale || !datos.etiqueta_clash_royale.trim().startsWith('#')) {
    errores.push('La etiqueta de Clash Royale es obligatoria y debe empezar con "#".');
  }

  if (!datos.acepto_reglamento || datos.acepto_reglamento === false || datos.acepto_reglamento === 'false') {
    errores.push('Debes aceptar el reglamento del torneo para inscribirte.');
  }

  return errores;
}

// ─────────────────────────────────────────────
// Rutas públicas
// ─────────────────────────────────────────────

/**
 * POST /api/inscripcion
 * Registra un nuevo participante en el torneo.
 */
app.post('/api/inscripcion', (req, res) => {
  try {
    const datos = req.body;

    // 1. Validar campos requeridos
    const errores = validarInscripcion(datos);
    if (errores.length > 0) {
      return res.status(400).json({ error: errores.join(' ') });
    }

    // 2. Verificar que no exista ya ese código estudiantil
    const existente = buscarPorCodigo(datos.codigo_estudiantil);
    if (existente) {
      return res.status(409).json({
        error: `El código estudiantil "${datos.codigo_estudiantil.toUpperCase()}" ya está registrado. Si crees que es un error, contáctanos vía WhatsApp.`,
      });
    }

    // 3. Insertar en la base de datos
    const nuevo = insertarInscripcion(datos);

    return res.status(201).json({
      mensaje: '¡Inscripción exitosa! Te esperamos el 28 de agosto.',
      inscripcion: {
        id:                    nuevo.id,
        nombre_completo:       nuevo.nombre_completo,
        codigo_estudiantil:    nuevo.codigo_estudiantil,
        nombre_clash_royale:   nuevo.nombre_clash_royale,
        etiqueta_clash_royale: nuevo.etiqueta_clash_royale,
        fecha_hora_inscripcion: nuevo.fecha_hora_inscripcion,
      },
    });

  } catch (err) {
    console.error('Error en /api/inscripcion:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor. Intenta de nuevo.' });
  }
});

// ─────────────────────────────────────────────
// Rutas de administrador (protegidas)
// ─────────────────────────────────────────────

/**
 * POST /api/admin/login
 * Valida la contraseña del administrador.
 */
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ ok: true, mensaje: 'Acceso concedido.' });
  }
  return res.status(401).json({ ok: false, error: 'Contraseña incorrecta.' });
});

/**
 * GET /api/admin/inscripciones
 * Retorna todas las inscripciones. Acepta ?q=término para búsqueda.
 */
app.get('/api/admin/inscripciones', requireAdmin, (req, res) => {
  const busqueda     = req.query.q || '';
  const inscripciones = listarTodas(busqueda);
  return res.json({ inscripciones });
});

/**
 * PATCH /api/admin/inscripciones/:id/pago
 * Actualiza el estado de pago de una inscripción.
 * Body: { estado: 'confirmado' | 'pendiente' }
 */
app.patch('/api/admin/inscripciones/:id/pago', requireAdmin, (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const estado = req.body.estado;

  if (!['pendiente', 'confirmado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido. Use: pendiente | confirmado' });
  }

  const actualizado = actualizarEstadoPago(id, estado);
  if (!actualizado) {
    return res.status(404).json({ error: 'Inscripción no encontrada.' });
  }

  return res.json({ mensaje: `Estado de pago actualizado a "${estado}".` });
});

/**
 * GET /api/admin/estadisticas
 * Retorna contadores de inscripciones y pagos.
 */
app.get('/api/admin/estadisticas', requireAdmin, (req, res) => {
  const stats = obtenerEstadisticas();
  return res.json(stats);
});

/**
 * GET /api/admin/exportar
 * Genera y descarga un archivo Excel con todas las inscripciones.
 * Acepta ?password= como alternativa al header para facilitar la descarga directa.
 */
app.get('/api/admin/exportar', requireAdmin, (req, res) => {
  try {
    // Obtener todos los datos
    const inscripciones = listarTodas();

    // Mapear a formato legible para Excel
    const datos = inscripciones.map((ins) => ({
      'ID':                       ins.id,
      'Nombre Completo':          ins.nombre_completo,
      'Código Estudiantil':       ins.codigo_estudiantil,
      'Teléfono':                 ins.telefono,
      'Nombre Clash Royale':      ins.nombre_clash_royale,
      'Etiqueta Clash Royale':    ins.etiqueta_clash_royale,
      'Aceptó Reglamento':        ins.acepto_reglamento ? 'Sí' : 'No',
      'Aceptó Fotos':             ins.acepto_fotos      ? 'Sí' : 'No',
      'Fecha de Inscripción':     ins.fecha_hora_inscripcion,
      'Estado de Pago':           ins.estado_pago,
    }));

    // Crear libro de Excel con SheetJS
    const libro = XLSX.utils.book_new();
    const hoja  = XLSX.utils.json_to_sheet(datos);

    // Ajustar ancho de columnas automáticamente
    const anchos = Object.keys(datos[0] || {}).map((clave) => ({
      wch: Math.max(clave.length, 15),
    }));
    hoja['!cols'] = anchos;

    XLSX.utils.book_append_sheet(libro, hoja, 'Inscripciones');

    // Generar buffer del archivo
    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });

    // Nombre del archivo con fecha
    const fecha    = new Date().toISOString().split('T')[0];
    const filename = `inscripciones_torneo_${fecha}.xlsx`;

    // Enviar archivo
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);

  } catch (err) {
    console.error('Error al exportar Excel:', err.message);
    return res.status(500).json({ error: 'Error al generar el archivo Excel.' });
  }
});

// ─────────────────────────────────────────────
// Ruta catch-all: servir index.html para SPA
// ─────────────────────────────────────────────

app.get('*', (req, res) => {
  // Si la ruta empieza con /admin, servir admin.html
  if (req.path === '/admin' || req.path === '/admin.html') {
    return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
// Iniciar servidor (async — sql.js carga WASM)
// ─────────────────────────────────────────────

(async () => {
  try {
    // Esperar a que sql.js cargue y la BD esté lista antes de aceptar peticiones
    await inicializarDB();

    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║   🏆 AESFACT — Torneo Clash Royale               ║');
      console.log('║   Sistema de Inscripciones                       ║');
      console.log('╠══════════════════════════════════════════════════╣');
      console.log(`║   Servidor: http://localhost:${PORT}                 ║`);
      console.log(`║   Admin:    http://localhost:${PORT}/admin           ║`);
      console.log('╚══════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (err) {
    console.error('❌ Error fatal al iniciar:', err.message);
    process.exit(1);
  }
})();
