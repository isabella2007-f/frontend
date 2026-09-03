from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


# ── Tarjetas del resumen general ──
class TarjetaResumen(BaseModel):
    valor:         Decimal
    variacion_pct: Optional[float] = None    # None = sin periodo anterior con qué comparar
    subiendo:      Optional[bool]  = None     # True = verde, False = rojo, None = sin comparación


class ResumenGeneral(BaseModel):
    total_ventas:    TarjetaResumen
    total_pedidos:   TarjetaResumen
    total_clientes:  TarjetaResumen
    ticket_promedio: TarjetaResumen


# ── Punto de la gráfica "Ventas en el tiempo" (ingresos) ──
class PuntoVentas(BaseModel):
    etiqueta: str
    actual:   Decimal
    anterior: Optional[Decimal] = None        # None = ese bucket cae fuera del historial


# ── Punto de la gráfica "Flujo de ventas" (conteo de pedidos por estado) ──
class PuntoFlujo(BaseModel):
    etiqueta:        str
    pendiente:       int = 0
    confirmado:      int = 0
    en_proceso:      int = 0
    completada:      int = 0
    en_camino:       int = 0
    entregado:       int = 0
    cancelado:       int = 0
    fecha_propuesta: int = 0


# ── Producto en el ranking / torta ──
class ProductoRanking(BaseModel):
    ID_Producto: int
    nombre:      str
    cantidad:    int
    porcentaje:  float


# ── Estado de disponibilidad de datos ──
class DisponibilidadPeriodo(BaseModel):
    disponible: bool
    parcial:    bool          = False
    mensaje:    Optional[str] = None


class RangoFechas(BaseModel):
    inicio:          datetime
    fin:             datetime
    inicio_anterior: datetime
    fin_anterior:    datetime


# ── Detalle a nivel de fila (para "ver detalles" y exportar) ──
class LineaVentaDetalle(BaseModel):
    nombre:          str
    cantidad:        int
    precio_unitario: Decimal


class VentaDetalle(BaseModel):
    ID_Venta:         int
    fecha_pedido:     Optional[datetime] = None
    fecha_venta:      Optional[datetime] = None
    cliente:          str
    metodo_pago:      Optional[str] = None
    estado:           str
    estado_id:        int
    total:            Decimal
    tiene_devolucion: bool
    productos:        list[LineaVentaDetalle]


class ClienteNuevoDetalle(BaseModel):
    nombre: str
    correo: str
    fecha:  Optional[datetime] = None


class ProductoDetalle(BaseModel):
    ID_Producto: int
    nombre:      str
    cantidad:    int
    ingresos:    Decimal
    porcentaje:  float


class DashboardDetalle(BaseModel):
    ventas:          list[VentaDetalle]
    clientes_nuevos: list[ClienteNuevoDetalle]
    productos:       list[ProductoDetalle]


# ── Respuesta completa del dashboard ──
class DashboardResponse(BaseModel):
    periodo:        str
    granularidad:   str                       # hora | dia | semana | mes | anio
    rango:          RangoFechas
    periodo_actual: DisponibilidadPeriodo
    comparacion:    DisponibilidadPeriodo
    resumen:        ResumenGeneral
    flujo_ventas:   list[PuntoFlujo]
    ventas_tiempo:  list[PuntoVentas]
    productos_top:  list[ProductoRanking]
    detalle:        Optional[DashboardDetalle] = None   # incrustado solo en rangos cortos
