import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

const OPCIONES = [
  { formato: "csv",   label: "CSV" },
  { formato: "excel", label: "Excel (.xlsx)" },
  { formato: "pdf",   label: "PDF" },
];

export default function ExportMenu({ onExport, label = "Exportar", disabled = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [open]);

  return (
    <div className="dash-export" ref={ref}>
      <button
        type="button"
        className="report-btn"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
      >
        <Download size={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
        {label} ▾
      </button>
      {open && (
        <div className="dash-export__menu">
          {OPCIONES.map(o => (
            <button
              key={o.formato}
              type="button"
              className="dash-export__item"
              onClick={() => { setOpen(false); onExport(o.formato); }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
