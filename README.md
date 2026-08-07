# 🏆 Torneo Clash Royale — Sistema de Inscripciones AESFACT 2026


## 🌐 Páginas del sitio

| URL | Descripción |
|-----|-------------|
| `https://TU_USUARIO.github.io/aesfact-torneo/` | Formulario público |
| `https://TU_USUARIO.github.io/aesfact-torneo/admin.html` | Panel de admin |

---

## 🔐 Panel de administrador

- **Contraseña por defecto:** `1500`
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
