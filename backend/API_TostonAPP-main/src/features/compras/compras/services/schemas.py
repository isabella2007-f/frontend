from pydantic import BaseModel, model_validator
from typing import Optional, Literal
from datetime import datetime
from decimal import Decimal

METODOS_PAGO_COMPRA = {"Efectivo", "Transferencia", "Crédito", "Cheque"}


# ── Detalle de un ítem dentro de la compra ──
class DetalleCompraInput(BaseModel):
    ID_Insumo:         int
    Cantidad:          int
    Precio_Und:        Decimal
    Notas:             Optional[str] = None
    Fecha_Vencimiento: Optional[datetime] = None  # para crear el LoteCompra


# ── Crear compra ──
class CompraCreate(BaseModel):
    ID_Proveedor: int
    Metodo_Pago:  str                              # ver METODOS_PAGO_COMPRA
    Fecha_Compra: Optional[datetime] = None        # si no se envía, se usa datetime.now()
    detalles:     list[DetalleCompraInput]

    @model_validator(mode="after")
    def validar_campos(self):
        if self.Metodo_Pago not in METODOS_PAGO_COMPRA:
            opciones = ", ".join(sorted(METODOS_PAGO_COMPRA))
            raise ValueError(f"Método de pago inválido. Opciones: {opciones}")
        if not self.detalles:
            raise ValueError("La compra debe tener al menos un ítem en detalles")
        for d in self.detalles:
            if d.Cantidad <= 0:
                raise ValueError(f"La cantidad del insumo {d.ID_Insumo} debe ser mayor a cero")
            if d.Precio_Und <= 0:
                raise ValueError(f"El precio unitario del insumo {d.ID_Insumo} debe ser mayor a cero")
        return self


# ── Respuesta de un detalle ──
class DetalleCompraResponse(BaseModel):
    ID_Detalle_Compra: int
    ID_Insumo:         Optional[int]     = None
    nombre_insumo:     Optional[str]     = None
    ID_Lote_Compra:    Optional[int]     = None
    Cantidad:          Optional[int]     = None
    Precio_Und:        Optional[Decimal] = None
    Notas:             Optional[str]     = None

    class Config:
        from_attributes = True


# ── Respuesta de una compra ──
class CompraResponse(BaseModel):
    ID_Compra:    int
    ID_Proveedor: Optional[int]      = None
    nombre_proveedor: Optional[str]  = None
    Total_Pago:   Optional[Decimal]  = None
    Fecha_Compra: Optional[datetime] = None
    Estado:       Optional[int]      = None
    estado_label: Optional[str]      = None
    Metodo_Pago:  Optional[str]      = None
    detalles:     list[DetalleCompraResponse] = []

    class Config:
        from_attributes = True


# ── Respuesta paginada ──
class CompraListResponse(BaseModel):
    total:      int
    pagina:     int
    por_pagina: int
    compras:    list[CompraResponse]
