# 🏆 Torneo Clash Royale — Sistema de Inscripciones AESFACT 2026

Sistema de inscripción en línea usando **GitHub Pages** (frontend gratis) y **Google Apps Script + Google Sheets** (backend + base de datos, gratis).

---

## ⚡ Configuración (hacer UNA sola vez)

### Paso 1 — Crear el Google Sheet y el Apps Script

1. Ve a [drive.google.com](https://drive.google.com) y crea una **hoja de cálculo** nueva  
   (nómbrala "Inscripciones AESFACT 2026" o como quieras)
2. Copia el **ID del Sheet** desde la URL:  
   `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`
3. En el sheet: **Extensiones → Apps Script**
4. Borra el código que viene y **pega TODO el contenido** de `apps-script/codigo.gs`
5. Guarda (Ctrl+S) y ponle un nombre al proyecto (ej. "AESFACT Torneo API")

### Paso 2 — Desplegar el Apps Script como Web App

1. Clic en **"Implementar"** → **"Nueva implementación"**
2. En "Seleccionar tipo" elige **Aplicación web**
3. Configura así:
   - **Descripción:** AESFACT Torneo 2026
   - **Ejecutar como:** Yo (tu cuenta de Google)
   - **Quién tiene acceso:** Cualquier usuario
4. Clic en **"Implementar"** → Autoriza los permisos
5. Copia la **URL de la aplicación web** (empieza con `https://script.google.com/macros/s/...`)

### Paso 3 — Actualizar `public/js/config.js`

Abre [public/js/config.js](public/js/config.js) y reemplaza los dos valores:

```javascript
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/TU_ID/exec', // ← pega tu URL aquí
  SHEET_ID: 'TU_SHEET_ID_AQUI',                                       // ← pega el ID del Sheet
  ADMIN_PASSWORD: 'aesfact2026',                                       // ← cambia si quieres
};
```

> ⚠️ Si cambias `ADMIN_PASSWORD`, también debes cambiarlo en `apps-script/codigo.gs` (línea `const ADMIN_PASSWORD = ...`) y re-desplegar el Apps Script.

### Paso 4 — Subir a GitHub y activar Pages

```bash
# Inicializar repositorio (si es la primera vez)
git init
git add .
git commit -m "Torneo Clash Royale AESFACT 2026"

# Crear repo en github.com y subir
git remote add origin https://github.com/TU_USUARIO/aesfact-torneo.git
git push -u origin main
```

En GitHub:
1. Ve a **Settings → Pages**
2. Source: **GitHub Actions**
3. El workflow `.github/workflows/pages.yml` se ejecuta automáticamente
4. En ~1 minuto tu sitio estará en: `https://TU_USUARIO.github.io/aesfact-torneo`

---

## 🌐 Páginas del sitio

| URL | Descripción |
|-----|-------------|
| `https://TU_USUARIO.github.io/aesfact-torneo/` | Formulario público |
| `https://TU_USUARIO.github.io/aesfact-torneo/admin.html` | Panel de admin |

---

## 🔐 Panel de administrador

- **Contraseña por defecto:** `aesfact2026`
- Cambiar en `public/js/config.js` Y en `apps-script/codigo.gs`

### Funciones:
- 📊 Ver todos los inscritos en tabla
- 🔍 Buscar por nombre, código o etiqueta CR
- ✅ Confirmar / revertir estado de pago
- 📥 Exportar directamente a Excel (desde Google Sheets)

---

## 🗂️ Estructura del proyecto

```
aesfact/
├── public/                   ← Sitio estático (desplegado en GitHub Pages)
│   ├── index.html            ← Formulario público de inscripción
│   ├── admin.html            ← Panel de administrador
│   ├── css/
│   │   ├── style.css         ← Estilos (temática Clash Royale)
│   │   └── admin.css         ← Estilos del panel admin
│   └── js/
│       ├── config.js         ← ⚠️ DEBES editar este archivo
│       ├── form.js           ← Lógica del formulario
│       └── admin.js          ← Lógica del panel admin
│
├── apps-script/
│   └── codigo.gs             ← Código del backend (Google Apps Script)
│
├── .github/workflows/
│   └── pages.yml             ← Deploy automático a GitHub Pages
│
├── .gitignore
└── README.md
```

> Los archivos `server.js`, `database.js` y `package.json` son la versión local (Node.js) que también funciona para desarrollo.

---

## 📦 Versión local (desarrollo sin internet)

```bash
npm install
node server.js
# Abrir http://localhost:3000
```

> En la versión local se usa SQLite. En GitHub Pages se usa Google Sheets.

---

## 🗄️ Google Sheets como base de datos

La hoja "Inscripciones" tiene estas columnas:

| Columna | Descripción |
|---------|-------------|
| ID | Número de inscripción |
| Nombre Completo | Nombre del participante |
| Código Estudiantil | Ej. SMSS029224 (único) |
| Teléfono | Número de contacto |
| Nombre Clash Royale | Nick del juego |
| Etiqueta Clash Royale | Ej. #2PQRLV8CJ |
| Aceptó Reglamento | Sí / No |
| Aceptó Fotos | Sí / No |
| Fecha/Hora Inscripción | Automático |
| Estado de Pago | pendiente / confirmado |
