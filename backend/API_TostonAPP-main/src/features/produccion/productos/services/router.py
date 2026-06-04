from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from src.shared.services.database import get_db
from src.features.auth.services.dependencies import requiere_permiso
from .schemas import ProductoCreate, ProductoUpdate, ProductoResponse, ProductoListResponse, ImagenesUrlInput, FichaTecnicaInput
from .service import (
    obtener_productos, obtener_producto, crear_producto,
    editar_producto, agregar_imagenes, eliminar_imagen, eliminar_producto,
    gestionar_ficha, eliminar_ficha, verificar_puede_eliminar_producto,
    obtener_lotes_producto,
)

router = APIRouter(prefix="/productos", tags=["Gesti\u00f3n de Productos"])


@router.get("/", response_model=ProductoListResponse)
def listar_productos(
    pagina:     int           = Query(1, ge=1),
    por_pagina: int           = Query(10, ge=1, le=100),
    busqueda:   Optional[str] = Query(None),
    publicado:  Optional[int] = Query(None),
    db:         Session       = Depends(get_db),
):
    return obtener_productos(db, pagina, por_pagina, busqueda, publicado=publicado)


@router.get("/{id_producto}", response_model=ProductoResponse)
def ver_producto(
    id_producto: int,
    db:          Session = Depends(get_db),
):
    return obtener_producto(db, id_producto)


@router.post("/", response_model=ProductoResponse, status_code=201)
def agregar_producto(
    datos: ProductoCreate,
    db:    Session = Depends(get_db),
    _:     dict    = Depends(requiere_permiso("crear_productos"))
):
    """Crea un producto. El estado se calcula autom\u00e1ticamente seg\u00fan stock."""
    return crear_producto(db, datos)


@router.put("/{id_producto}", response_model=ProductoResponse)
def actualizar_producto(
    id_producto: int,
    datos:       ProductoUpdate,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("editar_productos"))
):
    """Edita el producto. El estado se recalcula autom\u00e1ticamente."""
    return editar_producto(db, id_producto, datos)


@router.post("/{id_producto}/imagenes", response_model=ProductoResponse)
def subir_imagenes(
    id_producto: int,
    datos:       ImagenesUrlInput,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("editar_productos"))
):
    """Asocia URLs de Cloudinary al producto."""
    return agregar_imagenes(db, id_producto, datos.urls)


@router.delete("/{id_producto}/imagenes/{id_imagen}")
def borrar_imagen(
    id_producto: int,
    id_imagen:   int,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("editar_productos"))
):
    """Elimina una imagen espec\u00edfica del producto."""
    return eliminar_imagen(db, id_imagen)


@router.post("/{id_producto}/ficha", response_model=ProductoResponse)
def crear_ficha(
    id_producto: int,
    datos:       FichaTecnicaInput,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("editar_productos"))
):
    """Crea o actualiza la ficha técnica de un producto existente."""
    return gestionar_ficha(db, id_producto, datos)


@router.put("/{id_producto}/ficha", response_model=ProductoResponse)
def editar_ficha(
    id_producto: int,
    datos:       FichaTecnicaInput,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("editar_productos"))
):
    """Actualiza la ficha técnica de un producto existente."""
    return gestionar_ficha(db, id_producto, datos)


@router.delete("/{id_producto}/ficha")
def borrar_ficha(
    id_producto: int,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("eliminar_productos"))
):
    """Elimina la ficha técnica y sus insumos de un producto."""
    return eliminar_ficha(db, id_producto)


@router.get("/{id_producto}/lotes")
def lotes_producto(
    id_producto: int,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("ver_productos")),
):
    """Retorna todos los lotes de producción asociados a un producto."""
    return obtener_lotes_producto(db, id_producto)


@router.get("/{id_producto}/validar-eliminar")
def validar_eliminar_producto(
    id_producto: int,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("eliminar_productos")),
):
    """Comprueba si el producto puede eliminarse sin violar dependencias."""
    return verificar_puede_eliminar_producto(db, id_producto)


@router.delete("/{id_producto}")
def borrar_producto(
    id_producto: int,
    db:          Session = Depends(get_db),
    _:           dict    = Depends(requiere_permiso("eliminar_productos"))
):
    """Elimina el producto junto con sus im\u00e1genes y ficha t\u00e9cnica."""
    return eliminar_producto(db, id_producto)
