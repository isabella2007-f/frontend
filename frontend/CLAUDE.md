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
- No modificar algo que ya funciona/se ve bien solo por estilo o preferencia.

## Separación de responsabilidades por módulo
- Un componente de `features/<módulo>/` **no** llama a `fetch`/`apiFetch` directamente: toda llamada HTTP pasa por su archivo en `src/services/`. Ese archivo es también donde se adapta la respuesta (PascalCase → lo que use el componente) antes de guardarla en state.
- CSS por módulo: cada `features/<módulo>/*.css` es propio de ese módulo. Si necesitas un estilo para varias vistas, o va a `src/shared/` o creas una clase nueva y específica — **no** cuelgues estilos de otro módulo de una clase que ya usa otra vista.
- Componentes reutilizables viven en `src/shared/components/` (`DateRangeFilter`, `SearchableSelect`, `CampoMonto`, `EmojiPicker`, …). Revísalos antes de crear uno nuevo.
- La UI puede ocultar/deshabilitar acciones por permiso o por estado, pero eso es solo UX: el backend siempre revalida. Nunca dejes una regla de negocio (permiso, estado, stock, monto, fecha) como única barrera en el frontend.
- Hoy **no hay** componente de paginación compartido: cada listado implementa el suyo. Si tocas paginación en varios a la vez, evalúa extraer uno a `src/shared/` (ver [`../prompts/prompt-todos.md`](../prompts/prompt-todos.md), 3.2).

## Zonas de peligro (frontend)
- **Formularios de editar** — al guardar sin cambios no debe dispararse `PUT`/`PATCH`; mostrar "No se hicieron cambios". No relajes validaciones por implementar esto.
- **Comprobantes de pago / imágenes** — son URLs de Cloudinary (string plano). El frontend sube a Cloudinary y solo manda la URL. Nunca base64.
- **Vistas del cliente** (`features/client/`, catálogo público, carrito, perfil) — el cliente se identifica por `ID_Rol === 3`, no por permisos. No condiciones funcionalidad de cliente a permisos del rol.
- **Órdenes de producción ligadas a un pedido** (`orden.idVenta`) — no se editan ni se cancelan desde la UI de órdenes; su avance manual (iniciar/completar) solo se habilita cuando el pedido ya está confirmado o en producción (`ESTADOS_VENTA_PRODUCIENDO`). Cada bloqueo se explica con su motivo y con un enlace al pedido (`/admin/pedidos?search=<idVenta>`). Ver [`../prompts/prompt-orden-produccion.md`](../prompts/prompt-orden-produccion.md).
- **Rango de fechas invertido** (`DateRangeFilter` y filtros de listados) — si `inicio > fin`, no bloquear: ordenar las dos fechas y consultar igual.
