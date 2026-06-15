from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── Auth ──
from src.features.auth.services.router import router as auth_router

# ── Configuración ──
from src.features.configuracion.usuarios.services.router           import router as usuarios_router
from src.features.configuracion.roles.services.router              import router as roles_router
from src.features.configuracion.notificaciones.services.router     import router as notificaciones_router
from src.features.configuracion.salidas.services.router            import router as salidas_router
from src.features.configuracion.control_acceso.services.router     import router as control_acceso_router

# ── Compras ──
from src.features.compras.insumos.services.router           import router as insumos_router
from src.features.compras.categoria_insumos.services.router import router as cat_insumos_router
from src.features.compras.proveedores.services.router       import router as proveedores_router
from src.features.compras.compras.services.router           import router as compras_router

# ── Producción ──
from src.features.produccion.productos.services.router           import router as productos_router
from src.features.produccion.categoria_productos.services.router import router as cat_productos_router
from src.features.produccion.ordenes_produccion.services.router  import router as ordenes_router

# ── Ventas ──
from src.features.ventas.clientes.services.router       import router as clientes_router
from src.features.ventas.pedidos.services.router        import router as pedidos_router
from src.features.ventas.gestion_ventas.services.router import router as ventas_router
from src.features.ventas.devoluciones.services.router   import router as devoluciones_router
from src.features.ventas.domicilios.services.router     import router as domicilios_router

# ── Dashboard ──
from src.features.dashboard.services.router import router as dashboard_router


app = FastAPI(
    title="API Proyecto",
    version="1.0.0",
    description="API para gestión de producción y ventas"
)


@app.on_event("startup")
def migrate_db():
    """Agrega columnas nuevas y tablas si no existen (migraciones manuales)."""
    from sqlalchemy import text
    from src.shared.services.database import engine
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE Orden_Produccion ADD COLUMN ID_Venta INT NULL",
            "ALTER TABLE Orden_Produccion MODIFY COLUMN ID_Insumo INT NULL",
            "ALTER TABLE Orden_Produccion MODIFY COLUMN ID_Ficha  INT NULL",
            "ALTER TABLE Ficha_Tecnica ADD COLUMN Dias_Vida_Util INT NULL",
            "ALTER TABLE Compras ADD COLUMN Fecha_Llegada DATETIME NULL",
            """CREATE TABLE IF NOT EXISTS Ficha_Tecnica_Insumo (
                ID_Ficha_Insumo INT AUTO_INCREMENT PRIMARY KEY,
                ID_Ficha        INT NOT NULL,
                ID_Insumo       INT NOT NULL,
                Cantidad        DECIMAL(10,2),
                Unidad          VARCHAR(50),
                FOREIGN KEY (ID_Ficha)  REFERENCES Ficha_Tecnica(ID_Ficha),
                FOREIGN KEY (ID_Insumo) REFERENCES Insumos(ID_Insumo)
            )""",
            "ALTER TABLE Productos ADD COLUMN Fecha_Creacion DATETIME NULL",
            "ALTER TABLE Compras ADD COLUMN Notas TEXT NULL",
            "ALTER TABLE Compras ADD COLUMN Costo_Transporte DECIMAL(30,2) NULL",
            "ALTER TABLE Compras ADD COLUMN IVA_Porcentaje DECIMAL(5,2) NULL",
            "ALTER TABLE Compras ADD COLUMN Descuento_Porcentaje DECIMAL(5,2) NULL",
            "ALTER TABLE Compras ADD COLUMN Otros_Costos DECIMAL(30,2) NULL",
            """INSERT IGNORE INTO Permisos (ID_Permiso, Permiso, Descripcion)
               VALUES (60, 'ver_landing_page', 'Ver la landing page desde el panel')""",
            """CREATE TABLE IF NOT EXISTS Lote_Producto (
                ID_Lote_Producto    INT AUTO_INCREMENT PRIMARY KEY,
                ID_Orden_Produccion INT,
                ID_Producto         INT,
                Numero_Lote         VARCHAR(50),
                Fecha_Produccion    DATETIME,
                Fecha_Vencimiento   DATETIME,
                Cantidad            INT,
                Estado              INT DEFAULT 1,
                FOREIGN KEY (ID_Orden_Produccion) REFERENCES Orden_Produccion(ID_Orden_Produccion),
                FOREIGN KEY (ID_Producto)         REFERENCES Productos(ID_Producto),
                FOREIGN KEY (Estado)              REFERENCES Estados(ID_Estados)
            )""",
            """CREATE TABLE IF NOT EXISTS Codigos_Reset (
                ID_Codigo INT AUTO_INCREMENT PRIMARY KEY,
                Correo    VARCHAR(255),
                Codigo    VARCHAR(6),
                Expira_En DATETIME,
                Usado     TINYINT(1) DEFAULT 0
            )""",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # ya existe

    # Comprobante_Pago: LONGTEXT para soportar imágenes en base64
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE Ventas ADD COLUMN Comprobante_Pago LONGTEXT NULL"))
            conn.commit()
        except Exception:
            try:
                conn.rollback()
                conn.execute(text("ALTER TABLE Ventas MODIFY COLUMN Comprobante_Pago LONGTEXT NULL"))
                conn.commit()
            except Exception:
                pass

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://frontend-ten-xi-31.vercel.app", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Registro de routers ──
PREFIX = "/api"

app.include_router(auth_router,            prefix=PREFIX)
app.include_router(usuarios_router,        prefix=PREFIX)
app.include_router(roles_router,           prefix=PREFIX)
app.include_router(notificaciones_router,  prefix=PREFIX)
app.include_router(salidas_router,         prefix=PREFIX)
app.include_router(control_acceso_router,  prefix=PREFIX)

app.include_router(insumos_router,         prefix=PREFIX)
app.include_router(cat_insumos_router,     prefix=PREFIX)
app.include_router(proveedores_router,     prefix=PREFIX)
app.include_router(compras_router,         prefix=PREFIX)
app.include_router(productos_router,     prefix=PREFIX)
app.include_router(cat_productos_router, prefix=PREFIX)
app.include_router(ordenes_router,       prefix=PREFIX)
app.include_router(clientes_router,      prefix=PREFIX)
app.include_router(pedidos_router,       prefix=PREFIX)
app.include_router(ventas_router,        prefix=PREFIX)
app.include_router(devoluciones_router,  prefix=PREFIX)
app.include_router(domicilios_router,    prefix=PREFIX)
app.include_router(dashboard_router,     prefix=PREFIX)


@app.get("/")
def root():
    return {"mensaje": "API funcionando ✅"}

