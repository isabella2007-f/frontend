# TostonApp — Frontend

App de gestión para una empresa de tostones. React SPA conectada a una API FastAPI en Render.

## Stack
- **Frontend:** React 19 + Vite 5 (JavaScript puro, sin TypeScript)
- **Routing:** React Router v7
- **Estilos:** CSS modules propios por módulo (Tailwind disponible pero no se usa principalmente)
- **Charts:** Recharts
- **Backend:** FastAPI (Python) — `https://api-tostonapp.onrender.com/api`
- **Auth:** JWT Bearer token guardado en `localStorage`

## Comandos
- Dev:   `npm run dev`   (puerto 5173)
- Build: `npm run build`
- Lint:  `npm run lint`

## Estructura clave
```
src/
  config/api.js          — API_URL base
  utils/api.js           — apiFetch() con Bearer token, redirige /login en 401
  services/              — un archivo por módulo (productosService.js, etc.)
  features/              — componentes por módulo
  AppContext.jsx          — contexto global (algunos módulos aún lo usan)
  shared/components/     — Sidebar, Layout, etc.
```

## Convenciones API
- El backend devuelve campos PascalCase para IDs y datos (`ID_Producto`, `Nombre`, `Estado`)
- Excepciones: nombres de joins son snake_case (`nombre_producto`, `nombre_categoria`)
- El campo `nombre` del producto viene en **minúscula** (`p.nombre`), no `p.Nombre`
- Insumos sí usan `i.Nombre` (mayúscula)
- Siempre adaptar la respuesta en el service antes de guardar en state

## Reglas
- JavaScript, no TypeScript. Sin `any`, sin tipos explícitos.
- El backend SÍ tiene `/api/compras/` (GET, POST, GET /{id}). `GestionCompras.jsx` puede migrarse.
- Clientes en la API tienen `tipo: "cliente"`, empleados tienen `tipo: "empleado"`.
- `GET /api/productos/` es público (sin auth). Los demás endpoints requieren Bearer.
- `por_pagina` máximo es **100** en todos los endpoints.
- `apiFetch` no sirve para el login (redirige en 401). Usar `fetch` directo en `authService`.
- Respuestas cortas. No summarizar lo que ya se ve en el diff.
- No instalar dependencias sin preguntar.
