# 🏆 Torneo Clash Royale — Sistema de Inscripciones AESFACT

Sistema completo de inscripción para el Torneo de Clash Royale organizado por AESFACT.

## 🗂️ Estructura del Proyecto

```
aesfact/
├── server.js          # Servidor Express (API + archivos estáticos)
├── database.js        # Módulo SQLite (CRUD de inscripciones)
├── .env               # Variables de entorno (NO subir a Git)
├── .env.example       # Plantilla de variables de entorno
├── package.json       # Dependencias del proyecto
├── inscripciones.db   # Base de datos (se crea automáticamente)
└── public/
    ├── index.html     # Formulario público de inscripción
    ├── admin.html     # Panel de administrador
    ├── css/
    │   ├── style.css  # Estilos del formulario (temática CR)
    │   └── admin.css  # Estilos del panel admin
    └── js/
        ├── form.js    # Lógica del formulario público
        └── admin.js   # Lógica del panel admin
```

---

## ⚙️ Instalación y puesta en marcha

### Requisitos previos
- [Node.js](https://nodejs.org/) versión 18 o superior

### Pasos

```bash
# 1. Entrar a la carpeta del proyecto
cd aesfact

# 2. Instalar dependencias
npm install

# 3. (Opcional) Cambiar la contraseña del admin en el archivo .env
#    Edita la línea: ADMIN_PASSWORD=aesfact2025

# 4. Iniciar el servidor
node server.js
```

El servidor arrancará en **http://localhost:3000**

---

## 🌐 Páginas disponibles

| URL | Descripción |
|-----|-------------|
| `http://localhost:3000` | Formulario público de inscripción |
| `http://localhost:3000/admin` | Panel de administrador |

---

## 🔐 Panel de administrador

- **URL:** `http://localhost:3000/admin`
- **Contraseña por defecto:** `aesfact2028888`
- Cambia la contraseña editando `.env` → `ADMIN_PASSWORD=tu_nueva_contraseña`

### Funciones del panel:
- 📊 Ver todos los inscritos en tabla
- 🔍 Buscar por nombre, código estudiantil o etiqueta CR
- ✅ Confirmar o revertir estado de pago por inscripción
- 📥 Exportar todos los datos a un archivo Excel (`.xlsx`)

---

## 🗄️ Base de datos

Se usa **SQLite** mediante el paquete `better-sqlite3`. El archivo `inscripciones.db`
se crea automáticamente la primera vez que arranca el servidor.

Para hacer una copia de seguridad, basta con copiar ese archivo `.db`.

### Estructura de la tabla `inscripciones`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PK | Autoincremental |
| `nombre_completo` | TEXT | Nombre del participante |
| `codigo_estudiantil` | TEXT UNIQUE | Ej. SMSS029224 |
| `telefono` | TEXT | Número de contacto |
| `nombre_clash_royale` | TEXT | Nick del juego |
| `etiqueta_clash_royale` | TEXT | Etiqueta del jugador (ej. #2PQRL) |
| `acepto_reglamento` | INTEGER | 1 = sí, 0 = no |
| `acepto_fotos` | INTEGER | 1 = sí, 0 = no |
| `fecha_hora_inscripcion` | TEXT | Timestamp automático |
| `estado_pago` | TEXT | `pendiente` o `confirmado` |

---

## 📦 Dependencias

| Paquete | Uso |
|---------|-----|
| `express` | Servidor web y API REST |
| `better-sqlite3` | Base de datos SQLite (síncrona) |
| `xlsx` | Generación de archivos Excel |
| `dotenv` | Variables de entorno desde `.env` |
| `cors` | Cabeceras CORS |

---

## 🚀 API Endpoints

### Públicos
- `POST /api/inscripcion` — Registrar nuevo participante

### Protegidos (requieren header `X-Admin-Password`)
- `POST /api/admin/login` — Validar contraseña
- `GET /api/admin/inscripciones` — Listar inscritos (`?q=búsqueda`)
- `PATCH /api/admin/inscripciones/:id/pago` — Cambiar estado de pago
- `GET /api/admin/estadisticas` — Obtener contadores
- `GET /api/admin/exportar` — Descargar Excel (`?password=xxx`)

---

## 📝 Notas

- Las inscripciones duplicadas por **código estudiantil** son rechazadas automáticamente.
- La base de datos se guarda en el mismo directorio del proyecto.
- La contraseña del admin nunca se almacena en el cliente más allá de la sesión activa.
