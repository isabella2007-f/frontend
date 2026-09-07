"""seed_ubicaciones.py

Siembra la jerarquía Departamento → Ciudad → Barrio del módulo Ubicaciones.

  - Departamentos + ciudades/municipios: `data/ubicaciones_seed.json`
    (formato DIVIPOLA/DANE: {"Departamento": ["Municipio", ...]}). El archivo
    que se versiona trae los 33 departamentos, Antioquia COMPLETA (125
    municipios, es el departamento donde opera la empresa) y las capitales +
    ciudades principales del resto. Para cargar el DIVIPOLA completo del DANE:
    reemplazá ese JSON por el export oficial (misma forma) y re-ejecutá — es
    idempotente.

  - Barrios: `data/barrios_seed.json` — {"Municipio": ["Barrio", ...]}. Trae los
    barrios del Valle de Aburrá (área de cobertura de domicilio). Espeja
    `frontend/src/utils/barrios.js`. Cada barrio se siembra con Es_Base=1,
    Estado=1 y Precio = PRECIO_BASE_BARRIO (5000, para igualar exactamente el
    comportamiento de la antigua constante COSTO_DOMICILIO).

IDEMPOTENTE: la clave natural es (nombre dentro del padre). Re-ejecutar solo
inserta lo que falte; NUNCA pisa Precio ni Estado ya editados desde el módulo.

Uso:
    python seed_ubicaciones.py

Se ejecuta UNA vez tras aplicar las migraciones (las tablas se crean en el
startup de src/main.py). NO se cuelga del startup: 1.100+ municipios en cada
cold-start de Render sería lento y frágil.
"""
import json
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.shared.services.database import SessionLocal
from src.shared.services.models import Departamento, Ciudad, Barrio

# Precio base de todo barrio sembrado. 5000 = antigua constante COSTO_DOMICILIO,
# así ningún cliente ve un cambio de precio el día del deploy.
PRECIO_BASE_BARRIO = 5000

_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def _cargar(nombre: str) -> dict:
    ruta = os.path.join(_DATA_DIR, nombre)
    if not os.path.exists(ruta):
        raise SystemExit(f"❌ No se encontró {ruta}")
    with open(ruta, encoding="utf-8") as fh:
        datos = json.load(fh)
    # Las claves que empiezan por "_" son metadatos del archivo, no datos.
    return {k: v for k, v in datos.items() if not k.startswith("_")}


def sembrar_ubicaciones() -> None:
    divipola = _cargar("ubicaciones_seed.json")
    barrios_por_municipio = _cargar("barrios_seed.json")

    db = SessionLocal()
    nuevos_dep = nuevas_ciu = nuevos_bar = 0
    try:
        # ── Departamentos ──────────────────────────────────────────────
        dep_por_nombre = {d.Nombre: d for d in db.query(Departamento).all()}
        for nombre_dep in divipola:
            if nombre_dep not in dep_por_nombre:
                dep = Departamento(Nombre=nombre_dep, Estado=1)
                db.add(dep)
                db.flush()
                dep_por_nombre[nombre_dep] = dep
                nuevos_dep += 1
        db.commit()

        # ── Ciudades ───────────────────────────────────────────────────
        ciu_existentes = {
            (c.ID_Departamento, c.Nombre) for c in db.query(Ciudad).all()
        }
        ciu_por_clave: dict[tuple[int, str], Ciudad] = {}
        for nombre_dep, municipios in divipola.items():
            dep = dep_por_nombre[nombre_dep]
            for nombre_mun in municipios:
                clave = (dep.ID_Departamento, nombre_mun)
                if clave not in ciu_existentes:
                    ciu = Ciudad(ID_Departamento=dep.ID_Departamento, Nombre=nombre_mun, Estado=1)
                    db.add(ciu)
                    db.flush()
                    ciu_por_clave[clave] = ciu
                    ciu_existentes.add(clave)
                    nuevas_ciu += 1
        db.commit()

        # Mapa nombre_municipio → ID_Ciudad (para los barrios). Si un municipio
        # existe en dos departamentos, gana el primero encontrado — los barrios
        # del Valle de Aburrá son inequívocos.
        ciudades = db.query(Ciudad).all()
        ciu_por_nombre: dict[str, Ciudad] = {}
        for c in ciudades:
            ciu_por_nombre.setdefault(c.Nombre, c)

        # ── Barrios ────────────────────────────────────────────────────
        bar_existentes = {
            (b.ID_Ciudad, b.Nombre) for b in db.query(Barrio).all()
        }
        for nombre_mun, barrios in barrios_por_municipio.items():
            ciudad = ciu_por_nombre.get(nombre_mun)
            if not ciudad:
                print(f"⚠️  Municipio '{nombre_mun}' no está en el seed de ciudades; se omiten sus barrios")
                continue
            for nombre_bar in barrios:
                clave = (ciudad.ID_Ciudad, nombre_bar)
                if clave not in bar_existentes:
                    db.add(Barrio(
                        ID_Ciudad=ciudad.ID_Ciudad, Nombre=nombre_bar,
                        Precio=PRECIO_BASE_BARRIO, Es_Base=True, Estado=1,
                    ))
                    bar_existentes.add(clave)
                    nuevos_bar += 1
        db.commit()

        print(
            f"✅ Ubicaciones sembradas: +{nuevos_dep} departamentos, "
            f"+{nuevas_ciu} ciudades, +{nuevos_bar} barrios."
        )
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        print(f"❌ Error sembrando ubicaciones: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sembrar_ubicaciones()
