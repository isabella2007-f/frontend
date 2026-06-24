import os
import json

# In-memory FCM token store: maps id_usuario → token.
# Tokens survive the process lifetime but are lost on server restart.
# A DB column (Usuario.FCM_Token) would make them persistent — add when ready.
_fcm_tokens: dict = {}


def guardar_token_fcm(id_usuario: int, token: str) -> None:
    _fcm_tokens[id_usuario] = token


def _firebase_app():
    """Initializes Firebase Admin SDK on first call; returns None if not configured."""
    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            return firebase_admin.get_app()

        cred_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
        if not cred_json:
            return None

        cred = credentials.Certificate(json.loads(cred_json))
        return firebase_admin.initialize_app(cred)
    except Exception:
        return None


def notificar_nuevo_pedido_push(
    id_venta: int,
    nombre_cliente: str,
    total: float,
    admin_ids: list,
) -> None:
    """Sends FCM push to all admins registered in _fcm_tokens.

    Silent no-op if:
      - firebase-admin is not installed (ImportError)
      - FIREBASE_CREDENTIALS_JSON env var is not set
      - No admin device tokens are registered
    Never raises — must not block order creation.
    """
    try:
        from firebase_admin import messaging

        app = _firebase_app()
        if app is None:
            return

        tokens = [_fcm_tokens[uid] for uid in admin_ids if uid in _fcm_tokens]
        if not tokens:
            return

        msg = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(
                title=f"\U0001f6cd️ Nuevo pedido #{id_venta:05d}",
                body=f"{nombre_cliente}  ·  ${total:,.0f}",
            ),
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="pedidos_channel",
                    sound="default",
                    icon="@mipmap/ic_launcher",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default"),
                ),
            ),
        )
        messaging.send_each_for_multicast(msg, app=app)

    except ImportError:
        pass  # firebase-admin not installed — notifications disabled
    except Exception:
        pass  # Never propagate FCM errors to the caller


_LABELS_ESTADO_CLIENTE = {
    4:  ("Tu pedido fue confirmado ✅",         "Confirmado ✅"),
    5:  ("Tu pedido fue cancelado ❌",          "Cancelado ❌"),
    8:  ("Tu pedido fue entregado \U0001f4e6",       "Entregado \U0001f4e6"),
    9:  ("Tu domicilio está en camino \U0001f6f5", "En camino \U0001f6f5"),
}


def notificar_cambio_pedido_push(
    id_usuario_cliente: int,
    id_venta: int,
    nuevo_estado: int,
) -> None:
    """Push al cliente cuando su pedido cambia de estado.
    Silent no-op si firebase-admin no está instalado, el token no existe,
    o el estado no tiene etiqueta definida. Nunca propaga excepciones."""
    try:
        from firebase_admin import messaging

        app = _firebase_app()
        if app is None:
            return

        token = _fcm_tokens.get(id_usuario_cliente)
        if not token:
            return

        label_info = _LABELS_ESTADO_CLIENTE.get(nuevo_estado)
        if not label_info:
            return

        notif_body, estado_label = label_info
        numero = f"#{id_venta:05d}"

        msg = messaging.Message(
            token=token,
            notification=messaging.Notification(
                title=f"\U0001f6cd️ Pedido {numero} actualizado",
                body=notif_body,
            ),
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="pedidos_channel",
                    sound="default",
                    icon="@mipmap/ic_launcher",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default"),
                ),
            ),
            data={
                "tipo": "cambio_pedido",
                "id_venta": str(id_venta),
                "estado": estado_label,
            },
        )
        messaging.send(msg, app=app)

    except ImportError:
        pass
    except Exception:
        pass
