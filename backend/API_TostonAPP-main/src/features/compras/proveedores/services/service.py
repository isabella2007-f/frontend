from sqlalchemy.orm import Session
from sqlalchemy import distinct
from fastapi import HTTPException

from src.shared.services.models import Proveedor, SujetoDerecho, Compra, DetalleCompra, Insumo, Estado
from .schemas import ProveedorCreate, ProveedorUpdate


def _formato_proveedor(proveedor: Proveedor, db: Session) -> dict:
    sujeto = db.query(SujetoDerecho).filter(
        SujetoDerecho.ID_Sujeto_Derecho == proveedor.Sujeto_Derecho
    ).first()

    total_compras = db.query(Compra).filter(
        Compra.ID_Proveedor == proveedor.ID_Proveedor
    ).count()

    ultima = (
        db.query(Compra)
        .filter(Compra.ID_Proveedor == proveedor.ID_Proveedor)
        .order_by(Compra.Fecha_Compra.desc())
        .first()
    )
    ultima_fecha  = ultima.Fecha_Compra if ultima else None
    ultima_estado = None
    if ultima:
        estado_obj    = db.query(Estado).filter(Estado.ID_Estados == ultima.Estado).first()
        ultima_estado = estado_obj.Estado if estado_obj else None

    insumo_ids = (
        db.query(distinct(DetalleCompra.ID_Insumo))
        .join(Compra, Compra.ID_Compra == DetalleCompra.ID_Compra)
        .filter(
            Compra.ID_Proveedor == proveedor.ID_Proveedor,
            DetalleCompra.ID_Insumo != None,
        )
        .all()
    )
    insumos_provistos = []
    for (id_ins,) in insumo_ids:
        ins = db.query(Insumo).filter(Insumo.ID_Insumo == id_ins).first()
        if ins:
            insumos_provistos.append(ins.Nombre)

    return {
        "ID_Proveedor":         proveedor.ID_Proveedor,
        "Sujeto_Derecho":       proveedor.Sujeto_Derecho,
        "nombre_sujeto":        sujeto.Sujeto_Derecho if sujeto else None,
        "Responsable":          proveedor.Responsable,
        "Direccion":            proveedor.Direccion,
        "Municipio":            proveedor.Municipio,
        "Departamento":         proveedor.Departamento,
        "Telefono":             proveedor.Telefono,
        "Correo":               proveedor.Correo,
        "total_compras":        total_compras,
        "ultima_compra_fecha":  ultima_fecha,
        "ultima_compra_estado": ultima_estado,
        "insumos_provistos":    insumos_provistos,
    }


def obtener_proveedores(
    db: Session,
    pagina: int = 1,
    por_pagina: int = 10,
    busqueda: str = None
) -> dict:
    query = db.query(Proveedor)

    if busqueda:
        termino = f"%{busqueda}%"
        query = query.filter(
            Proveedor.Responsable.ilike(termino) |
            Proveedor.Correo.ilike(termino) |
            Proveedor.Telefono.ilike(termino)
        )

    total       = query.count()
    offset      = (pagina - 1) * por_pagina
    proveedores = query.offset(offset).limit(por_pagina).all()

    return {
        "total":       total,
        "pagina":      pagina,
        "por_pagina":  por_pagina,
        "proveedores": [_formato_proveedor(p, db) for p in proveedores],
    }


def obtener_proveedor(db: Session, id_proveedor: int) -> dict:
    proveedor = db.query(Proveedor).filter(
        Proveedor.ID_Proveedor == id_proveedor
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return _formato_proveedor(proveedor, db)


def crear_proveedor(db: Session, datos: ProveedorCreate) -> dict:
    if datos.Correo and db.query(Proveedor).filter(
        Proveedor.Correo == datos.Correo
    ).first():
        raise HTTPException(status_code=400, detail="Ya existe un proveedor con ese correo")

    nuevo = Proveedor(
        Sujeto_Derecho = datos.Sujeto_Derecho,
        Responsable    = datos.Responsable,
        Direccion      = datos.Direccion,
        Municipio      = datos.Municipio,
        Departamento   = datos.Departamento,
        Telefono       = datos.Telefono,
        Correo         = datos.Correo,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return _formato_proveedor(nuevo, db)


def editar_proveedor(db: Session, id_proveedor: int, datos: ProveedorUpdate) -> dict:
    proveedor = db.query(Proveedor).filter(
        Proveedor.ID_Proveedor == id_proveedor
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    for campo, valor in datos.model_dump(exclude_none=True).items():
        setattr(proveedor, campo, valor)

    db.commit()
    db.refresh(proveedor)
    return _formato_proveedor(proveedor, db)


def eliminar_proveedor(db: Session, id_proveedor: int) -> dict:
    proveedor = db.query(Proveedor).filter(
        Proveedor.ID_Proveedor == id_proveedor
    ).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    total_compras = db.query(Compra).filter(Compra.ID_Proveedor == id_proveedor).count()
    if total_compras > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar: el proveedor tiene {total_compras} compra(s) registrada(s)"
        )

    db.delete(proveedor)
    db.commit()
    return {"mensaje": f"Proveedor {id_proveedor} eliminado correctamente"}
