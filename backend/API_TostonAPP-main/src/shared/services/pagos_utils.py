"""Cómo se paga un pedido y qué falta por cobrar o por aprobar.

Espeja `frontend/src/utils/metodosPago.js` (web) y `lib/utils/metodos_pago.dart`
(app móvil). Las tres capas tienen que contestar lo mismo: si la app le muestra
al repartidor el botón de cobrar y el servidor no exige ese cobro, el pedido se
entrega sin la plata; y al revés, si el servidor exige algo que la app no sabe
pedir, el repartidor se queda trabado sin entender por qué.

Antes cada módulo preguntaba por su cuenta con `.lower()` y `in`, y el pedido
mixto no coincidía con ninguna de las preguntas: llevaba comprobante Y efectivo
en mano, pero se leía como si no llevara ninguno de los dos.
"""
import re

_RE_MIXTO         = re.compile(r"mixto", re.IGNORECASE)
_RE_TRANSFERENCIA = re.compile(r"transf|nequi|daviplata|bancol|qr", re.IGNORECASE)
_RE_EFECTIVO      = re.compile(r"efectiv|contra|cash", re.IGNORECASE)


def es_pago_mixto(metodo: str | None) -> bool:
    """El pedido se reparte entre efectivo y transferencia.

    Lleva las dos cargas a la vez —comprobante por lo transferido, plata en
    mano por lo demás—, así que las dos preguntas de abajo le dicen que sí.
    """
    return bool(_RE_MIXTO.search(metodo or ""))


def es_pago_transferencia(metodo: str | None) -> bool:
    """¿Hay un comprobante que revisar?"""
    return bool(_RE_TRANSFERENCIA.search(metodo or "")) or es_pago_mixto(metodo)


def es_pago_efectivo(metodo: str | None) -> bool:
    """¿Hay plata que cobrar en mano?"""
    return bool(_RE_EFECTIVO.search(metodo or "")) or es_pago_mixto(metodo)


# Estados en los que el cobro en mano ya quedó resuelto: o entró la plata, o el
# repartidor declaró por qué no entró (con motivo, que queda auditado).
#
# `anticipo_pagado` NO entra: en un pedido mixto significa que se aprobó la
# transferencia, y la parte en efectivo sigue sin cobrarse. Contarlo como
# resuelto es lo que dejaba entregar sin recibir la plata.
COBRO_RESUELTO = frozenset({
    "efectivo_recibido",
    "no_recibido",
    "pagado_completo",
})

# Estados en los que el comprobante ya pasó por el admin.
COMPROBANTE_APROBADO = frozenset({
    "pagado_completo",
    "anticipo_pagado",
})


def _estado_pago(venta) -> str:
    return (getattr(venta, "Estado_Pago", None) or "pendiente").strip()


def cobro_efectivo_pendiente(venta) -> bool:
    """¿Queda plata por recibir en mano en este pedido?"""
    if not es_pago_efectivo(venta.Metodo_Pago):
        return False
    if _estado_pago(venta) in COBRO_RESUELTO:
        return False
    # En un mixto el efectivo tiene su propio registro: el admin puede cobrarlo
    # antes de que se apruebe el comprobante, y ahí el estado queda en
    # "anticipo_pagado" aunque la plata ya haya entrado.
    if es_pago_mixto(venta.Metodo_Pago) and getattr(venta, "Pago_Final_Registrado", 0):
        return False
    return True


def comprobante_sin_aprobar(venta) -> bool:
    """¿Hay un comprobante adjunto que el admin todavía no aprobó?

    Se mira `Comprobante_Pago` y no el del anticipo a propósito: ese es el
    único que `aprobar_comprobante` sabe aprobar, así que es el único que se
    puede exigir sin dejar el pedido sin salida.
    """
    if not es_pago_transferencia(venta.Metodo_Pago):
        return False
    if not (venta.Comprobante_Pago or "").strip():
        return False
    return _estado_pago(venta) not in COMPROBANTE_APROBADO
