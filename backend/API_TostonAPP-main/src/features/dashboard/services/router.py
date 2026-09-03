from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import requiere_permiso
from .schemas import DashboardResponse, DashboardDetalle
from .service import obtener_dashboard, obtener_detalle

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardResponse)
def vista_general(
    periodo: str                     = Query("hoy", description="hoy | semana | mes | custom"),
    fecha_inicio: Optional[datetime] = Query(None, description="Inicio del rango custom (ISO)"),
    fecha_fin:    Optional[datetime] = Query(None, description="Fin del rango custom (ISO)"),
    db:          Session             = Depends(get_db),
    _:           dict                = Depends(requiere_permiso("ver_dashboard")),
):
    """
    Toda la información del dashboard en una sola llamada:

    - Resumen general (4 tarjetas, con variación vs periodo anterior de igual duración)
    - Flujo de ventas (conteo de pedidos por estado, apilado)
    - Ventas en el tiempo (ingresos actual vs anterior)
    - Top 5 productos
    - Detalle a nivel de fila (solo en rangos cortos; ver /dashboard/detalle)

    Reglas: ninguna fecha puede ser futura; un rango custom invertido se corrige
    solo; si el periodo (actual o de comparación) se sale del historial se informa
    y se muestra lo que haya disponible.
    """
    # Un rango custom necesita ambas fechas; si llega solo una, se ignora y se
    # trata como preset (nunca se bloquea la consulta).
    if (fecha_inicio is None) or (fecha_fin is None):
        fecha_inicio = fecha_fin = None
    return obtener_dashboard(db, periodo, fecha_inicio, fecha_fin)


@router.get("/detalle", response_model=DashboardDetalle)
def detalle(
    periodo: str                     = Query("hoy", description="hoy | semana | mes | custom"),
    fecha_inicio: Optional[datetime] = Query(None),
    fecha_fin:    Optional[datetime] = Query(None),
    db:          Session             = Depends(get_db),
    _:           dict                = Depends(requiere_permiso("ver_dashboard")),
):
    """
    Detalle a nivel de fila del periodo: ventas (fecha, cliente, método, estado,
    total, productos), clientes nuevos y ranking completo de productos. Se usa
    para "ver detalles" y para exportar en rangos largos, donde el detalle no
    viaja incrustado en la respuesta principal.
    """
    if (fecha_inicio is None) or (fecha_fin is None):
        fecha_inicio = fecha_fin = None
    return obtener_detalle(db, periodo, fecha_inicio, fecha_fin)
