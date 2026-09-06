import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import "./ImageLightbox.css";

/**
 * Miniatura de una imagen (URL de Cloudinary o dataURL) que al pulsarse abre un
 * visor a pantalla completa con zoom (botones, rueda del ratón) y arrastre para
 * desplazar. Sin dependencias externas.
 *
 * @param {string}  src           URL o dataURL de la imagen.
 * @param {string}  alt           Texto alternativo.
 * @param {string}  label         Título opcional en la barra del visor.
 * @param {object}  thumbStyle    Estilos inline para la miniatura.
 * @param {string}  thumbClassName Clase extra para la miniatura.
 */
export default function ImageLightbox({ src, alt = "Imagen", label, thumbStyle, thumbClassName = "" }) {
  const [open,     setOpen]     = useState(false);
  const [scale,    setScale]    = useState(1);
  const [pos,      setPos]      = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!src) return null;

  const zoomIn  = () => setScale((s) => Math.min(6, +(s + 0.5).toFixed(2)));
  const zoomOut = () => setScale((s) => {
    const n = Math.max(1, +(s - 0.5).toFixed(2));
    if (n === 1) setPos({ x: 0, y: 0 });
    return n;
  });

  const onWheel = (e) => {
    e.preventDefault();
    setScale((s) => {
      const n = Math.min(6, Math.max(1, +(s - e.deltaY * 0.0015).toFixed(2)));
      if (n === 1) setPos({ x: 0, y: 0 });
      return n;
    });
  };

  const onPointerDown = (e) => {
    if (scale <= 1) return;
    dragRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    setPos({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onPointerUp = () => { dragRef.current = null; setDragging(false); };

  return (
    <>
      <button
        type="button"
        className={`img-lightbox-thumb ${thumbClassName}`}
        style={thumbStyle}
        onClick={() => { reset(); setOpen(true); }}
        title="Ampliar imagen"
      >
        <img src={src} alt={alt} />
        <span className="img-lightbox-thumb__hint"><ZoomIn size={13} /> Ampliar</span>
      </button>

      {open && createPortal(
        <div className="img-lightbox-overlay" onClick={() => setOpen(false)}>
          <div className="img-lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
            {label && <span className="img-lightbox-toolbar__label">{label}</span>}
            <button type="button" onClick={zoomOut}  title="Alejar">   <ZoomOut  size={16} /></button>
            <span className="img-lightbox-toolbar__pct">{Math.round(scale * 100)}%</span>
            <button type="button" onClick={zoomIn}   title="Acercar">  <ZoomIn   size={16} /></button>
            <button type="button" onClick={reset}    title="Restablecer"><RotateCcw size={16} /></button>
            <button type="button" onClick={() => setOpen(false)} title="Cerrar"><X size={16} /></button>
          </div>
          <div
            className="img-lightbox-stage"
            onClick={(e) => e.stopPropagation()}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
          >
            <img
              src={src}
              alt={alt}
              draggable={false}
              style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
