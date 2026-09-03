from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime, date


# ── Tarifas ──────────────────────────────────────────────────────────────────

class TarifaCreate(BaseModel):
    ID_Empleado:  int
    Tarifa_Hora:  float
    Fecha_Inicio: datetime

    @field_validator("Tarifa_Hora")
    @classmethod
    def tarifa_positiva(cls, v):
        if v is None or v <= 0:
            raise ValueError("La tarifa por hora debe ser mayor a cero")
        return v


class TarifaResponse(BaseModel):
    ID_Tarifa:    int
    ID_Empleado:  int
    nombre_empleado: Optional[str] = None
    Tarifa_Hora:  float
    Fecha_Inicio: datetime
    Fecha_Fin:    Optional[datetime] = None
    vigente:      bool = False


# ── Registros de horas ────────────────────────────────────────────────────────

class RegistroHorasCreate(BaseModel):
    ID_Empleado:         int
    ID_Orden_Produccion: Optional[int] = None
    ID_Domicilio:        Optional[int] = None
    Fecha:               datetime
    Hora_Inicio:         datetime
    Hora_Fin:            datetime

    @model_validator(mode="after")
    def hora_fin_posterior(self):
        if self.Hora_Fin <= self.Hora_Inicio:
            raise ValueError("La hora de fin debe ser posterior a la hora de inicio")
        return self


class RegistroHorasResponse(BaseModel):
    ID_Registro:         int
    ID_Empleado:         int
    nombre_empleado:     Optional[str] = None
    ID_Orden_Produccion: Optional[int] = None
    ID_Domicilio:        Optional[int] = None
    origen_label:        Optional[str] = None
    Fecha:               datetime
    Hora_Inicio:         datetime
    Hora_Fin:            datetime
    Horas_Trabajadas:    float
    Estado:              str
    ID_Liquidacion:      Optional[int] = None


class RegistroHorasListResponse(BaseModel):
    items:     List[RegistroHorasResponse]
    total:     int
    pagina:    int
    por_pagina: int


# ── Liquidaciones ─────────────────────────────────────────────────────────────

class LiquidacionCreate(BaseModel):
    ID_Empleado:  int
    Fecha_Inicio: datetime
    Fecha_Fin:    datetime

    @model_validator(mode="after")
    def rango_valido(self):
        if self.Fecha_Fin < self.Fecha_Inicio:
            raise ValueError("Fecha_Fin debe ser posterior o igual a Fecha_Inicio")
        return self


class LiquidacionEdit(BaseModel):
    registros_agregar: List[int] = []
    registros_quitar:  List[int] = []


class LiquidacionPago(BaseModel):
    Metodo_Pago: str
    Fecha_Pago:  datetime

    @field_validator("Metodo_Pago")
    @classmethod
    def metodo_no_vacio(cls, v):
        if not v or not v.strip():
            raise ValueError("El método de pago es obligatorio")
        return v.strip()

    @field_validator("Fecha_Pago")
    @classmethod
    def fecha_no_futura(cls, v):
        from datetime import timezone
        hoy = datetime.now()
        if v.date() > hoy.date():
            raise ValueError("La fecha de pago no puede ser posterior a hoy")
        return v


class LiquidacionAnulacion(BaseModel):
    Motivo_Anulacion: str

    @field_validator("Motivo_Anulacion")
    @classmethod
    def motivo_suficiente(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError("El motivo de anulación debe tener al menos 10 caracteres")
        return v.strip()


class RegistroDesglose(BaseModel):
    ID_Registro:      int
    Fecha:            datetime
    Hora_Inicio:      datetime
    Hora_Fin:         datetime
    Horas_Trabajadas: float
    origen_label:     Optional[str] = None
    tarifa_aplicada:  float
    subtotal:         float


class LiquidacionResponse(BaseModel):
    ID_Liquidacion:   int
    ID_Empleado:      int
    nombre_empleado:  Optional[str] = None
    Fecha_Inicio:     datetime
    Fecha_Fin:        datetime
    Total:            float
    Estado:           str
    Motivo_Anulacion: Optional[str] = None
    Fecha_Anulacion:  Optional[datetime] = None
    Metodo_Pago:      Optional[str] = None
    Fecha_Pago:       Optional[datetime] = None
    Fecha_Creacion:   datetime
    registros:        Optional[List[RegistroDesglose]] = None


class LiquidacionListResponse(BaseModel):
    items:     List[LiquidacionResponse]
    total:     int
    pagina:    int
    por_pagina: int
