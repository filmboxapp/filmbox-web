# FilmBox Web

Plataforma pública de películas y series con diseño minimalista y modo oscuro.

## Características

- Interfaz limpia y minimalista
- Modo oscuro/claro
- Buscador en tiempo real
- Cards optimizadas para móviles y web
- Reproducción de contenido desde servidores configurables
- Categorización de contenido
- Iconos SVG minimalistas

## Archivos

- `index.html` - Estructura HTML
- `index.css` - Estilos completos (incluye temas claro y oscuro)
- `index.js` - Lógica JavaScript (API, UI, Temas, Búsqueda)
- `README.md` - Documentación

## API Endpoints Requeridos

- `GET /api/movies` - Obtener películas
- `GET /api/movies/:id` - Obtener detalles de película
- `GET /api/series` - Obtener series
- `GET /api/series/:id` - Obtener detalles de serie
- `GET /api/categories` - Obtener categorías
- `GET /api/search` - Buscar contenido
- `GET /api/featured` - Obtener contenido destacado

## Instalación

1. Clonar el repositorio
2. Servir con un servidor HTTP local
3. Configurar `API_BASE_URL` en `index.js` (línea 1)
