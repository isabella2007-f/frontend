# TostonApp — CLAUDE.md (raíz)

Guía de orientación para Claude Code en este repositorio. Este archivo es el punto de entrada: da el mapa general, los comandos comunes y las zonas de peligro que cruzan varios módulos. **Para el detalle de cada mitad del proyecto, lee además el CLAUDE.md propio de cada una — tienen prioridad sobre este archivo en su propio dominio:**

- Frontend: [`frontend/CLAUDE.md`](./frontend/CLAUDE.md)
- Backend: [`backend/API_TostonAPP-main/CLAUDE.md`](./backend/API_TostonAPP-main/CLAUDE.md)

---

## Mapa del repositorio

Este directorio (`frontend/`, raíz del repo git) contiene **dos proyectos**, a pesar del nombre de la carpeta:

```
frontend/                          ← raíz del repo git
├── CLAUDE.md                      ← este archivo
├── frontend/                      ← app React (el frontend real)
│   ├── CLAUDE.md
│   ├── package.json
│   └── src/
└── backend/
    └── API_TostonAPP-main/        ← API FastAPI (el backend real)
        ├── CLAUDE.md
        ├── requirements.txt
        └── src/
```

No confundas `frontend/frontend/` (la app) con `frontend/` (la raíz del repo, que también contiene el backend). Si vas a ejecutar comandos, verifica siempre en qué carpeta estás.

---

## Comandos comunes

### Frontend (`frontend/frontend/`)
```bash
npm run dev      # servidor de desarrollo, puerto 5173
npm run build    # build de producción (vite build --logLevel info)
npm run lint     # eslint .
npm run preview  # sirve el build ya generado
```
No hay script de tests automatizados en el frontend — la verificación es manual/visual, más lint y build.

### Backend (`frontend/backend/API_TostonAPP-main/`)
```bash
pip install -r requirements.txt
uvicorn src.main:app --reload      # servidor local, docs en /docs
python -m unittest discover tests  # correr toda la suite de tests
python -m unittest tests.test_ordenes_produccion   # un archivo puntual
```
`pytest` no está en `requirements.txt`; los tests están escritos con `unittest` + `TestClient` de FastAPI (ver `tests/`).

---

## Arquitectura y separación de responsabilidades por módulo

Ambos proyectos siguen una organización por *feature* (dominio de negocio), no por tipo de archivo:

- **Backend**: `src/features/<área>/<módulo>/services/{router,service,schemas}.py`. `router.py` define endpoints, `service.py` tiene la lógica de negocio, `schemas.py` los modelos Pydantic. Los modelos SQLAlchemy están **todos centralizados** en `src/shared/services/models.py` — no crear modelos duplicados dentro de un módulo.
- **Frontend**: `src/features/<área>/<módulo>/` agrupa los componentes de ese módulo; `src/services/` tiene un archivo de llamadas a la API por módulo.
- Un módulo de frontend no debe llamar directamente a `fetch`/`apiFetch` fuera de su archivo en `src/services/` — mantener esa capa como única fuente de las llamadas HTTP.
- Un cambio de reglas de negocio (permisos, estados, stock, montos) **siempre** se valida en backend. El frontend puede deshabilitar/ocultar UI por UX, pero nunca es la única barrera — el backend debe rechazar la operación igual si se salta el frontend.
- Los módulos con lógica transaccional (Compras, Órdenes de Producción, Ventas) comparten el sistema de lotes FEFO documentado en el CLAUDE.md del backend — cualquier cambio ahí debe respetar esa regla salvo que se pida explícitamente lo contrario.
- Hay acoplamiento intencional entre módulos que no siempre es obvio por la carpeta: por ejemplo, la generación automática de una Orden de Producción a partir de un Pedido vive en `ventas/gestion_ventas/services/service.py`, no en `produccion/ordenes_produccion/`. No asumas que la lógica de un flujo vive solo en la carpeta de su nombre — verifica con una búsqueda en todo el repo antes de dar por hecho dónde está algo.

---

## Glosario y convenciones de nombres (para evitar ambigüedad)

- **"Permiso" = "privilegio"**: son el mismo concepto en este proyecto. El backend los llama `permiso` (`Rol_x_Permiso`, `requiere_permiso()`); el frontend a veces los llama `privilegio` (ej. `PrivilegiosModal.jsx`). Son sinónimos exactos, no dos sistemas distintos.
- **"Eliminar"** (acción CRUD) = borrado físico/definitivo de un registro (`DELETE`). Se está retirando de módulos operativos sensibles (ver Orden de Producción) en favor de "anular".
- **"Anular"** = cambiar el estado de un registro a un estado terminal que lo invalida para efectos de negocio (stock, reportes, flujo), **conservando su historial** en la base de datos. Nunca implica `DELETE` físico.
- **"Cambiar estado"** ≠ **"anular"**: tener el permiso genérico de cambiar estado no debe habilitar por sí solo la acción de anular en los módulos donde ambos existen como permisos separados, aunque anular sea, técnicamente, un caso particular de cambio de estado.
- **"Cancelar"** puede ser un estado propio y distinto de "Anular" según el módulo (ej. Compras distingue `Completada`/`Anulada`; Órdenes de Producción usa `Cancelada` como su estado terminal equivalente a "anular", no crea un estado nuevo). No asumas que todos los módulos usan el mismo nombre de estado para el mismo concepto — verifica siempre contra la tabla `Estados` real.
- IDs de `Estados` documentados en el CLAUDE.md del backend (pueden ampliarse): `1=Activo 2=Inactivo 3=Pendiente 4=Confirmado 5=Cancelado 6=Aprobada 7=Rechazada 8=Entregado 9=En camino 10=Asignado 11=Completada 12=Anulada 13=En proceso 14=Stock bajo 15=Agotado`.

---

## Zonas de peligro

No tocar, o tocar solo con confirmación explícita del usuario antes de escribir código:

- **`backend/.../configuracion/control_acceso/services/`** — módulo existente marcado como "no modificar sin consultar" en el CLAUDE.md del backend. Varios cambios de permisos (ver [`prompts/prompt-roles.md`](./prompts/prompt-roles.md)) pueden requerir tocarlo — si es así, detente y pide confirmación aunque el resto del plan ya esté aprobado.
- **`backend/.../configuracion/descuentos/`** — módulo postergado, no implementar ni modificar.
- **`bcrypt==4.0.1`** en `requirements.txt` — no actualizar, versiones superiores rompen el hashing existente.
- **Sistema de lotes FEFO** (`LoteInsumo`, `LoteProducto`) y **fichas técnicas** (`FichaTecnica`) — lógica transaccional crítica de inventario. No reimplementar ni alterar el orden de consumo (FEFO estricto) salvo que se pida explícitamente.
- **Reserva/"pisado" de insumos al pasar una Orden de Producción a "En proceso"** — cambio de comportamiento transaccional nuevo (ver [`prompts/prompt-orden-produccion.md`](./prompts/prompt-orden-produccion.md), punto 3.7); requiere que el usuario apruebe explícitamente el mecanismo elegido antes de tocar `service.py`.
- **Sincronización Pedido ↔ Orden de Producción automática** (`ventas/gestion_ventas/services/service.py`) — cualquier cambio debe mantener la propiedad "una orden generada por un pedido no cambia de estado por sí sola" y la cancelación en cadena.
- **CORS** en el backend — actualmente `allow_origins=["*"]` con `allow_credentials=False`; está pendiente corregir a los orígenes reales de producción (ver CLAUDE.md del backend). No lo cambies como efecto colateral de otro cambio sin decirlo explícitamente.
- **Contraseñas/secrets** — nunca hardcodear; siempre variables de entorno vía `python-dotenv`.
- **Migraciones de base de datos** (nuevas tablas/columnas, ej. historial de emojis de Roles) — preséntalas en el plan antes de aplicarlas, nunca las apliques silenciosamente dentro de una tanda más grande de cambios.

---

## Prompts de corrección pendientes

Hay una lista de cambios pendientes, ya convertidos en prompts listos para ejecutar uno por uno (uno por módulo, pensados para conversaciones independientes de Claude Pro) en [`prompts/`](./prompts/):

- [`prompts/prompt-dashboard.md`](./prompts/prompt-dashboard.md)
- [`prompts/prompt-roles.md`](./prompts/prompt-roles.md)
- [`prompts/prompt-compras.md`](./prompts/prompt-compras.md)
- [`prompts/prompt-orden-produccion.md`](./prompts/prompt-orden-produccion.md)

Si te piden implementar alguno de esos cambios directamente en una sesión de Claude Code (en vez de en Claude Pro), usa el prompt correspondiente como base del plan: define el alcance exacto, las reglas de negocio y el protocolo (plan → confirmación → implementación → hallazgos adicionales con permiso → verificación).

---

## Reglas generales de trabajo en este repo

1. Antes de tocar cualquier archivo, leerlo completo — no editar a ciegas ni asumir su forma por el nombre.
2. Antes de tocar lógica de base de datos, pedir/leer `models.py` (backend) completo.
3. No asumir que un campo es `NOT NULL` u opcional — revisar el modelo real.
4. No instalar dependencias nuevas (frontend o backend) sin preguntar antes.
5. No dejar código muerto, comentado, `TODO` sin resolver, ni componentes/funciones sin usar.
6. Toda regla de negocio (permisos, stock, estados, montos, fechas) se valida en backend, nunca solo en frontend.
7. Al terminar un cambio: correr lint y build del frontend, y los tests relevantes del backend — reportar el resultado real, no asumir que pasó.
8. Ser eficiente con tokens (no releer lo ya leído en la misma sesión, no repetir código sin cambios) sin sacrificar exactitud, validaciones ni pruebas.
9. Este archivo puede quedar desactualizado a medida que el código cambia — si algo aquí contradice lo que ves en el código real, el código real manda; avísalo en vez de asumir cuál de los dos está desactualizado.
