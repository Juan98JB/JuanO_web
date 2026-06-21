# Documentación del Proyecto — Juan O. Uribe (ESFM)

Sitio web personal de Juan O. Uribe, estudiante de la ESFM.  
Publicado en: [https://juan98jb.github.io/JuanO_web/](https://juan98jb.github.io/JuanO_web/)

---

## 1. Visión General

Página web de una sola página (SPA) construida con HTML, CSS y JavaScript vanilla (sin frameworks ni librerías externas). El sitio funciona completamente del lado del cliente y se despliega en GitHub Pages.

### Stack tecnológico

| Tecnología | Uso |
|---|---|
| **HTML5** | Estructura semántica, meta tags para Open Graph |
| **CSS3** | Variables CSS (temas claro/oscuro), Flexbox, Grid, animaciones 3D (flip), media queries responsives |
| **JavaScript (ES6+)** | SPA con hash routing, render dinámico de tarjetas, persistencia en localStorage, modo administrador, modal, eventos |
| **JSON** | Archivo `data.json` con contenido inicial de todas las tarjetas y secciones |
| **GitHub Pages** | Hosting gratuito con HTTPS automático |

### Archivos del proyecto

```
web_Juan/
├── .gitignore          # Archivos ignorados por Git
├── index.html          # Página principal (SPA)
├── styles.css          # Todos los estilos CSS
├── script.js           # Toda la lógica JavaScript
├── data.json           # Contenido inicial de tarjetas
├── server.js           # Servidor local de desarrollo (NO va a producción)
└── images/             # Carpeta para imágenes subidas (vacía)
```

---

## 2. Estructura del HTML (`index.html`)

El sitio es una **SPA (Single Page Application)**. Todas las "páginas" están en un solo archivo HTML y se muestran/ocultan con JavaScript.

### Secciones principales

```
<body>
  <header class="navbar">         → Barra de navegación fija
  <main>
    <section id="page-novedades"> → Página de inicio (Novedades)
    <section id="page-matematicas"> → Materia: Matemáticas
    <section id="page-fisica">    → Materia: Física
    <section id="page-computacion"> → Materia: Computación
    <section id="page-datos">     → Materia: Datos
    <section id="page-recomendaciones"> → Currículum (vacía)
  </main>
  <div id="content-modal">        → Modal para contenido completo
</body>
```

### Navbar

```html
<header class="navbar">
  <div class="navbar__brand">     <!-- Logo ESFM + nombre -->
  <nav class="navbar_menu">       <!-- Enlaces: Matemáticas, Física, Computación, Datos, Currículum -->
  <button class="theme-toggle">   <!-- Alternar modo oscuro/claro -->
```

- Los enlaces tienen `data-page="..."` que el JS usa para navegar entre secciones.
- El logo tiene doble función: **click** → volver a inicio, **doble click** → login de administrador.

### Homepage (Novedades)

```html
<section id="page-novedades">
  <div class="presentation">          ← Dos columnas flex
    <div class="presentation_cont">   ← 30%: Nombre + descripción
    <div class="presentation_panel">  ← 70%: Panel de Novedades con tabs
  </div>
  <section class="recommendations">   ← Sección de Recomendaciones
```

### Páginas de materias

```html
<section id="page-matematicas">
  <div class="subject-grid" data-category="matematicas"></div>
```

El `<div class="subject-grid">` se llena dinámicamente desde `data.json` mediante JavaScript.

---

## 3. Estilos CSS (`styles.css`)

### Sistema de temas claro/oscuro

Usa **variables CSS** en `:root` (tema claro) y `[data-theme="dark"]` (tema oscuro).

```css
:root {
  --bg-primary: #f0f2f5;
  --accent: #4f46e5;
  --text-primary: #1a1a2e;
  /* ... más variables */
}

[data-theme="dark"] {
  --bg-primary: #1e1e1e;
  --accent: #569cd6;
  /* ... colores oscuros */
}
```

El cambio de tema se hace cambiando el atributo `data-theme` en el `<html>`.

### Layout de la homepage

```
.presentation {
  display: flex;          ← Columnas lado a lado
  gap: 2rem;
}

.presentation_cont {
  flex: 0 0 30%;          ← 30% del ancho
  position: sticky;       ← Se queda fijo al hacer scroll
}

.presentation_panel {
  flex: 0 0 70%;          ← 70% del ancho
}
```

### Sistema de tarjetas con flip 3D

Cada tarjeta (`.subcard`) tiene un contenedor `.card-inner` con dos caras:

- `.card-front`: visible por defecto, con fondo gradiente, título y descripción
- `.card-back`: oculta, con formulario de edición

La animación 3D se logra con:
```css
.card-inner {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.card-front, .card-back {
  backface-visibility: hidden;
}

.card-back {
  transform: rotateY(180deg);
}

.subcard.flipped .card-inner {
  transform: rotateY(180deg);
}
```

### Puntos de quiebre (responsive)

| Breakpoint | Cambios principales |
|---|---|
| **1024px** | Panel de novedades se reduce a 65% |
| **768px** | Columnas apiladas (flex-direction: column), grids de 2 columnas, navbar envuelve |
| **480px** | Grids más pequeños, tabs envueltos, tamaños de fuente reducidos |

---

## 4. Lógica JavaScript (`script.js`)

### 4.1 Inicialización

```js
document.addEventListener('DOMContentLoaded', () => {
  // 1. Configurar modo admin (ocultar/mostrar engranajes)
  // 2. Configurar navegación SPA
  // 3. Cargar data.json y renderizar tarjetas
  // 4. Restaurar datos guardados (localStorage)
  // 5. Configurar tabs, modal, tema oscuro, eventos
});
```

### 4.2 Navegación SPA

```js
function showPage(pageId) {
  // Oculta todas las .page
  // Muestra la página con id="page-${pageId}"
  // Activa el nav-link correspondiente
}
```

Las transiciones de página se hacen mediante:
- Click en enlaces del navbar
- Hash en la URL (`window.location.hash`)
- Click en el logo (vuelve a `novedades`)

### 4.3 Carga de datos

```js
fetch('data.json')
  .then(r => r.json())
  .then(data => {
    Object.assign(DATA, data);  // Guarda en objeto global DATA
    renderSubjectCards();       // Renderiza tarjetas de materias
    renderNovedadesCards();     // Renderiza tarjetas de Novedades
    applyGearVisibility();      // Aplica visibilidad de engranajes
  });
```

### 4.4 Sistema de tarjetas

**Subject cards** (materias): se renderizan en `.subject-grid` con `data-category`.

```js
function renderSubjectCards() {
  // Para cada .subject-grid, busca DATA[category]
  // Crea subcards con: título, descripción, contenido, gradiente, ícono
  // Formulario edita: título, descripción, contenido
}
```

**Novedades cards**: se renderizan en `#novedades-cards` con 4 categorías.

```js
function renderNovedadesCards() {
  // Crea .section-cards para cada categoría (proyectos, notas, ejercicios, divulgacion)
  // Cada subcard tiene: título, descripción, url, imagen, opacidad
  // Formulario edita: imagen (file), título, desc, url, url imagen, opacidad
}
```

### 4.5 Modo administrador

**Acceso**: Doble click en el logo ESFM.

**Autenticación**: El JS calcula el hash SHA-256 de la contraseña ingresada y lo compara con un hash almacenado. La contraseña real **no está en el código**.

```js
const ADMIN_HASH = '77473b09a7543e9fa3caba8e6afb9ace3d8dcbac027c0c2af39f628fbce4cc25';

async function loginAdmin() {
  const pass = prompt('Ingresa la contraseña de administrador:');
  const hash = await sha256(pass);
  if (hash === ADMIN_HASH) {
    sessionStorage.setItem('webjuan_admin', 'true');
    applyGearVisibility();  // Muestra los engranajes
  }
}
```

**Engranajes (gears)**: Solo visibles en modo admin. Al hacer clic, voltean la tarjeta para mostrar el formulario de edición.

**Cierre de sesión**: Segundo doble click en el logo (estando en modo admin) → confirmación → oculta engranajes.

### 4.6 Persistencia (localStorage)

Toda la edición de tarjetas se guarda en `localStorage` bajo la clave `webjuan_cards`.

```js
const STORAGE_KEY = 'webjuan_cards';

function loadLocalData() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
}

function saveLocalData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
```

Flujo de guardado:
1. Usuario edita campos en el formulario (cara trasera)
2. Click en "Guardar"
3. JS lee los valores, los guarda en localStorage
4. Actualiza el frente de la tarjeta (título, descripción, fondo)
5. Voltea la tarjeta de vuelta

### 4.7 Modal

Para las tarjetas de materias, al hacer click en el frente (sin estar volteada), se abre un modal con el contenido completo.

```js
function openModal(title, content) {
  modalTitle.textContent = title;
  modalBody.textContent = content;
  modal.classList.add('open');
}
```

### 4.8 Tema oscuro/claro

```js
themeBtn.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});
```

### 4.9 Funciones auxiliares importantes

| Función | Propósito |
|---|---|
| `escapeHtml(str)` | Escapa caracteres HTML para prevenir inyección |
| `cardBg(saved, item)` | Calcula el fondo de una tarjeta (imagen guardada + opacidad, o gradiente original) |
| `cardId(cardEl)` | Obtiene el ID único de una tarjeta (desde dataset.id o por posición) |
| `applyBgWithOpacity(front, bgUrl, opacity)` | Aplica un fondo con overlay oscuro según la opacidad |
| `resetForm(card)` | Restaura el formulario a los valores originales (data.json o último guardado) |
| `findOriginalData(id)` | Busca los datos originales de una tarjeta en data.json |

### 4.10 Manejo de eventos

Un solo listener `click` en `document` maneja todas las interacciones (delegación de eventos):

1. Click en gear → voltear tarjeta
2. Click en save-btn → guardar datos
3. Click en subject-subcard → abrir modal
4. Click en subcard con URL → abrir enlace

---

## 5. Contenido (`data.json`)

Archivo JSON con todos los datos iniciales del sitio.

### Estructura

```json
{
  "proyectos": [ ... ],      → Tarjetas de la pestaña Proyectos
  "notas": [ ... ],          → Tarjetas de la pestaña Notas
  "ejercicios": [ ... ],     → Tarjetas de la pestaña Ejercicios
  "divulgacion": [ ... ],    → Tarjetas de la pestaña Divulgación
  "matematicas": [ ... ],    → Tarjetas de la página Matemáticas
  "fisica": [ ... ],         → Tarjetas de la página Física
  "computacion": [ ... ],    → Tarjetas de la página Computación
  "datos": [ ... ],          → Tarjetas de la página Datos
  "lecturas": [ ... ],       → Tarjetas de Lecturas (recomendaciones)
  "recomendaciones": [ ... ] → Tarjetas de Canales, Webs, Cine
}
```

### Campos de cada tarjeta

| Campo | Descripción | Ejemplo |
|---|---|---|
| `id` | Identificador único | `"mat_calculo"` |
| `title` | Título de la tarjeta | `"Cálculo Diferencial"` |
| `desc` | Descripción breve | `"Límites, derivadas y aplicaciones..."` |
| `content` | Contenido completo (solo materias) | `"Contenido pendiente..."` |
| `url` | Enlace externo (Novedades, Lecturas) | `"https://..."` |
| `gradient` | Fondo gradiente CSS | `"linear-gradient(135deg, #667eea 0%, #764ba2 100%)"` |
| `icon` | Ícono/emojii (solo materias) | `"∫"` |
| `opacity` | Opacidad del fondo (0-1) | `1` |

---

## 6. Git y Despliegue

### .gitignore

```
server.js      → Servidor de desarrollo (no necesario en producción)
images/        → Imágenes subidas por usuarios (datos locales)
*.log          → Archivos de log
.DS_Store      → Archivos del sistema macOS
Thumbs.db      → Archivos del sistema Windows
```

### Flujo de publicación

```bash
# Hacer cambios locales
git add .
git commit -m "Descripción del cambio"
git push
# GitHub Pages redeploy automático (~1-2 minutos)
```

### ¿Por qué server.js NO va a producción?

`server.js` es un servidor HTTP local que:
- Sirve archivos estáticos (HTML, CSS, JS)
- Tiene un endpoint `POST /api/save` que modifica `data.json` en el disco
- Maneja subida de imágenes (base64 → archivos en `/images/`)

El frontend **nunca llama a este endpoint**. Toda la persistencia se hace con `localStorage` del navegador. Por lo tanto, `server.js` es innecesario y potencialmente inseguro en producción.

### Consideraciones de seguridad

- **Contraseña**: Se almacena como hash SHA-256, no en texto plano. Sin embargo, al ser validación del lado del cliente, sigue siendo una barrera visual, no un sistema de seguridad real.
- **No hay backend**: No hay base de datos, APIs externas, ni tokens expuestos.
- **HTTPS**: GitHub Pages proporciona HTTPS automático y gratuito.

---

## 7. Glosario rápido

### Clases CSS principales

| Clase | Uso |
|---|---|
| `.navbar` | Barra de navegación fija superior |
| `.navbar__brand` | Logo + nombre (click → home, doble click → admin) |
| `.nav-link` | Enlace de navegación |
| `.page` | Sección de página (oculta por defecto) |
| `.page.active` | Página visible |
| `.presentation` | Contenedor flex de dos columnas (homepage) |
| `.subcard` | Tarjeta con flip 3D |
| `.subject-subcard` | Tarjeta de materia (variante de subcard) |
| `.card-front` | Cara frontal de la tarjeta |
| `.card-back` | Cara trasera con formulario |
| `.gear` | Icono de engranaje (modo admin) |
| `.card-form` | Formulario de edición |
| `.section-cards` | Grid de tarjetas dentro de un tab |
| `.card-grid` | Grid de 3 columnas (Canales, Webs, Cine) |
| `.reading-grid` | Grid de 4 columnas (Lecturas) |
| `.modal-overlay` | Fondo oscuro del modal |
| `.theme-toggle` | Botón de cambio de tema |
| `.tab` | Pestaña de Novedades |
| `.save-btn` | Botón guardar en formularios |

### IDs importantes

| ID | Elemento |
|---|---|
| `#page-novedades` | Sección de inicio |
| `#page-matematicas` | Página de Matemáticas |
| `#page-fisica` | Página de Física |
| `#page-computacion` | Página de Computación |
| `#page-datos` | Página de Datos |
| `#page-recomendaciones` | Página de Currículum (vacía) |
| `#novedades-cards` | Contenedor de tarjetas de Novedades |
| `#content-modal` | Modal de contenido completo |

### Funciones JavaScript clave

| Función | Archivo:línea | Propósito |
|---|---|---|
| `showPage(pageId)` | `script.js:70` | Navegación SPA |
| `renderSubjectCards()` | `script.js:102` | Renderiza tarjetas de materias |
| `renderNovedadesCards()` | `script.js:151` | Renderiza tarjetas de Novedades |
| `loginAdmin()` | `script.js:24` | Inicia sesión admin (con hash) |
| `logoutAdmin()` | `script.js:39` | Cierra sesión admin |
| `applyGearVisibility()` | `script.js:13` | Muestra/oculta engranajes |
| `sha256(str)` | `script.js:18` | Calcula hash SHA-256 |
| `loadLocalData()` | `script.js:236` | Lee localStorage |
| `saveLocalData(data)` | `script.js:240` | Guarda en localStorage |
| `resetForm(card)` | `script.js:557` | Restaura formulario a valores originales |
| `openModal(title, content)` | `script.js:216` | Abre modal de contenido |
| `closeModal()` | `script.js:223` | Cierra modal |
| `cardBg(saved, item)` | `script.js:141` | Calcula fondo con imagen/opacidad |
| `applyBgWithOpacity()` | `script.js:248` | Aplica fondo con overlay oscuro |

---

## 8. Recursos para aprender

Si estás tomando cursos de HTML, CSS, JS y Git, estos son los conceptos clave que aparecen en este proyecto:

| Concepto | ¿Dónde se usa? |
|---|---|
| **Flexbox** | `.presentation`, `.navbar`, `.reading-grid` |
| **CSS Grid** | `.section-cards`, `.subject-grid`, `.card-grid` |
| **Variables CSS** | Tema claro/oscuro (`--bg-primary`, `--accent`, etc.) |
| **Media queries** | Diseño responsive en 3 breakpoints |
| **Animaciones 3D** | Flip de tarjetas (`transform: rotateY`, `perspective`, `backface-visibility`) |
| **Eventos** | Click, doble click, submit, change, input, keydown |
| **Promesas / Fetch** | Carga de `data.json` |
| **Async / Await** | Función `sha256()` y `loginAdmin()` |
| **localStorage** | Persistencia de datos del usuario |
| **sessionStorage** | Estado de sesión admin |
| **SPA (hash routing)** | Navegación sin recargar la página |
| **Delegación de eventos** | Un solo listener `click` en `document` |
| **Template literals** | Renderizado de HTML dinámico |
| **JSON** | Archivo `data.json` con contenido estructurado |
| **Git / GitHub** | Control de versiones y despliegue |
| **SHA-256** | Hash de contraseña (Web Crypto API) |
