from sqlalchemy.orm import Session
from src.shared.services.models import ConfiguracionLanding


def _fila(db: Session) -> ConfiguracionLanding:
    """Devuelve la fila singleton (ID=1); la crea si no existe."""
    fila = db.query(ConfiguracionLanding).filter(ConfiguracionLanding.ID == 1).first()
    if not fila:
        fila = ConfiguracionLanding(ID=1)
        db.add(fila)
        db.commit()
        db.refresh(fila)
    return fila


def _to_dict(fila: ConfiguracionLanding) -> dict:
    return {
        "heroBadge":              fila.hero_badge,
        "heroTitle":              fila.hero_title,
        "heroDescription":        fila.hero_description,
        "historyTitle":           fila.history_title,
        "historyDescription":     fila.history_description,
        "ctaTitle":               fila.cta_title,
        "ctaDescription":         fila.cta_description,
        "contactPhone1":          fila.contact_phone1,
        "contactPhone2":          fila.contact_phone2,
        "contactAddressLine":     fila.contact_address_line,
        "contactCity":            fila.contact_city,
        "contactInstagramUrl":    fila.contact_instagram_url,
        "contactInstagramHandle": fila.contact_instagram_handle,
        "horarioLunesViernes":    fila.horario_lunes_viernes,
        "horarioSabado":          fila.horario_sabado,
    }


def obtener_config(db: Session) -> dict:
    return _to_dict(_fila(db))


def guardar_config(db: Session, datos: dict) -> dict:
    fila = _fila(db)
    mapping = {
        "heroBadge":              "hero_badge",
        "heroTitle":              "hero_title",
        "heroDescription":        "hero_description",
        "historyTitle":           "history_title",
        "historyDescription":     "history_description",
        "ctaTitle":               "cta_title",
        "ctaDescription":         "cta_description",
        "contactPhone1":          "contact_phone1",
        "contactPhone2":          "contact_phone2",
        "contactAddressLine":     "contact_address_line",
        "contactCity":            "contact_city",
        "contactInstagramUrl":    "contact_instagram_url",
        "contactInstagramHandle": "contact_instagram_handle",
        "horarioLunesViernes":    "horario_lunes_viernes",
        "horarioSabado":          "horario_sabado",
    }
    for campo_js, campo_db in mapping.items():
        valor = datos.get(campo_js)
        if valor is not None:
            setattr(fila, campo_db, valor)
    db.commit()
    db.refresh(fila)
    return _to_dict(fila)
