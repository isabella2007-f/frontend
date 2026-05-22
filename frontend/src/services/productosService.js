// src/services/productosService.js
// ─────────────────────────────────────────────────────────────────────────────
// Todas las llamadas a la API para el módulo de Productos y Categorías.
// Usa apiFetch (que ya maneja el Bearer token y redirige en 401).
// Las imágenes se suben con fetch raw porque FormData no puede ir por apiFetch.
// ─────────────────────────────────────────────────────────────────────────────
import { apiFetch } from "../utils/api";

const BASE = import.meta.env.VITE_API_URL; // "https://api-tostonapp.onrender.com/api"

/* ══════════════════════════════════════════════════════════
   CATEGORÍAS DE PRODUCTOS
══════════════════════════════════════════════════════════ */

/**
 * Lista todas las categorías de productos.
 * @returns {Promise<{ total, pagina, por_pagina, categorias: CategoriaProductoResponse[] }>}
 */
export async function getCategorias({ pagina = 1, porPagina = 100 } = {}) {
  return apiFetch(
    `/categoria-productos/?pagina=${pagina}&por_pagina=${porPagina}`
  );
}

/* ══════════════════════════════════════════════════════════
   PRODUCTOS — CRUD
══════════════════════════════════════════════════════════ */

/**
 * Lista productos paginados con búsqueda opcional.
 * @returns {Promise<{ total, pagina, por_pagina, productos: ProductoResponse[] }>}
 */
export async function getProductos({
  pagina = 1,
  porPagina = 100,
  busqueda = "",
} = {}) {
  const q = busqueda ? `&busqueda=${encodeURIComponent(busqueda)}` : "";
  return apiFetch(
    `/productos/?pagina=${pagina}&por_pagina=${porPagina}${q}`
  );
}

/**
 * Retorna el detalle de un producto (incluye imágenes y ficha técnica).
 * @param {number} id
 * @returns {Promise<ProductoResponse>}
 */
export async function getProducto(id) {
  return apiFetch(`/productos/${id}`);
}

/**
 * Crea un producto nuevo (sin imágenes; subirlas aparte con subirImagenes).
 *
 * @param {{
 *   nombre: string,
 *   ID_Categoria: number,
 *   Precio_venta: number,
 *   Stock: number,
 *   Stock_Minimo: number,
 *   ficha_tecnica?: { Version?, Observaciones?, Procedimiento? }
 * }} data
 * @returns {Promise<ProductoResponse>}
 */
export async function crearProducto(data) {
  return apiFetch("/productos/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Edita un producto existente. Solo envía los campos que cambiaron.
 *
 * @param {number} id
 * @param {{
 *   nombre?: string,
 *   ID_Categoria?: number,
 *   Precio_venta?: number,
 *   Stock?: number,
 *   Stock_Minimo?: number,
 *   Estado?: number   // 1 = activo, 0 = inactivo
 * }} data
 * @returns {Promise<ProductoResponse>}
 */
export async function editarProducto(id, data) {
  return apiFetch(`/productos/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Elimina un producto junto con sus imágenes y ficha técnica.
 * @param {number} id
 */
export async function eliminarProducto(id) {
  return apiFetch(`/productos/${id}`, { method: "DELETE" });
}

/**
 * Activa o desactiva un producto.
 * Internamente hace PUT con Estado: 1 o 0.
 *
 * @param {number} id
 * @param {boolean} activoActual  — estado actual ANTES del toggle
 * @returns {Promise<ProductoResponse>}
 */
export async function toggleEstadoProducto(id, activoActual) {
  return apiFetch(`/productos/${id}`, {
    method: "PUT",
    body: JSON.stringify({ Estado: activoActual ? 0 : 1 }),
  });
}

/* ══════════════════════════════════════════════════════════
   IMÁGENES
══════════════════════════════════════════════════════════ */

/**
 * Sube uno o varios archivos File al producto mediante multipart/form-data.
 * NO uses apiFetch aquí porque FormData requiere que el browser
 * calcule el Content-Type + boundary automáticamente.
 *
 * @param {number}   idProducto
 * @param {File[]}   archivos    — array de objetos File del <input type="file">
 * @returns {Promise<ProductoResponse>}  — producto actualizado con las imágenes
 */
export async function subirImagenes(idProducto, urls) {
  // urls: array de strings (secure_url de Cloudinary)
  if (!urls || urls.length === 0) return null;
  return apiFetch(`/productos/${idProducto}/imagenes`, {
    method: "POST",
    body: JSON.stringify({ urls }),
  });
}

/**
 * Elimina una imagen específica de un producto.
 *
 * @param {number} idProducto
 * @param {number} idImagen   — ID_Producto_Img que devuelve la API
 */
export async function eliminarImagen(idProducto, idImagen) {
  return apiFetch(`/productos/${idProducto}/imagenes/${idImagen}`, {
    method: "DELETE",
  });
}