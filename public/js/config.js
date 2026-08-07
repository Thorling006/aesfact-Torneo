/**
 * config.js
 * ─────────────────────────────────────────────────────────
 * Configuración centralizada del sitio AESFACT.
 *
 * ⚠️  DEBES actualizar este archivo con tus propios valores:
 *
 *  1. APPS_SCRIPT_URL → La URL que obtienes al desplegar el
 *     Apps Script como "Aplicación web" en Google.
 *
 *  2. SHEET_ID → El ID de tu Google Sheet. Lo encuentras en
 *     la URL: docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit
 *
 * La contraseña del admin debe coincidir con ADMIN_PASSWORD
 * en apps-script/codigo.gs
 * ─────────────────────────────────────────────────────────
 */
const CONFIG = {
  // URL de tu Google Apps Script (reemplaza este valor)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/TU_ID_DEL_APPS_SCRIPT/exec',

  // ID de tu Google Sheet (para exportar a Excel directamente)
  SHEET_ID: 'TU_SHEET_ID_AQUI',

  // Contraseña del panel de administrador
  // (debe coincidir con ADMIN_PASSWORD en apps-script/codigo.gs)
  ADMIN_PASSWORD: 'aesfact2026',
};
