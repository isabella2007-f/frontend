import { fmtFecha } from "../../utils/dateUtils";
import { ESTADOS_COMPLETADO_ID } from "./estados";

// xlsx y jspdf son pesados; se cargan solo cuando el usuario exporta.
const loadXLSX = () => import("xlsx");
const loadPDF = () => Promise.all([import("jspdf"), import("jspdf-autotable")]);

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CO")}`;

const fmtCell = (val, type, target) => {
  if (val === null || val === undefined || val === "") return "";
  if (type === "date") return fmtFecha(val);
  if (type === "money") {
    if (target === "excel") return Number(val);
    if (target === "csv") return String(Math.round(Number(val) || 0));
    return money(val);
  }
  if (type === "number") return target === "excel" ? Number(val) : String(val);
  return String(val);
};

const aoa = (ds, target) => [
  ds.columns.map(c => c.label),
  ...ds.rows.map(r => ds.columns.map(c => fmtCell(r[c.key], c.type, target))),
];

/* ── Constructores de datasets ───────────────────────────── */

export function ventasDataset(ventas, name = "Ventas") {
  return {
    name,
    columns: [
      { key: "idVenta",    label: "Pedido",         type: "number" },
      { key: "fecha",      label: "Fecha",          type: "date" },
      { key: "cliente",    label: "Cliente",        type: "text" },
      { key: "metodoPago", label: "Método de pago", type: "text" },
      { key: "estado",     label: "Estado",         type: "text" },
      { key: "total",      label: "Total",          type: "money" },
      { key: "_productos", label: "Productos",      type: "text" },
    ],
    rows: ventas.map(v => ({
      ...v,
      _productos: v.productos.map(p => `${p.nombre} x${p.cantidad}`).join("; "),
    })),
  };
}

export function ventasLineasDataset(ventas, name = "Ventas (detalle)") {
  const rows = [];
  ventas.forEach(v => {
    const base = {
      idVenta: v.idVenta, fecha: v.fecha, cliente: v.cliente,
      metodoPago: v.metodoPago, estado: v.estado, totalPedido: v.total,
    };
    if (!v.productos.length) {
      rows.push({ ...base, producto: "—", cantidad: 0, precioUnitario: 0, subtotal: 0 });
      return;
    }
    v.productos.forEach(p => rows.push({
      ...base,
      producto: p.nombre,
      cantidad: p.cantidad,
      precioUnitario: p.precioUnitario,
      subtotal: p.cantidad * p.precioUnitario,
    }));
  });
  return {
    name,
    columns: [
      { key: "idVenta",        label: "Pedido",          type: "number" },
      { key: "fecha",          label: "Fecha",           type: "date" },
      { key: "cliente",        label: "Cliente",         type: "text" },
      { key: "metodoPago",     label: "Método de pago",  type: "text" },
      { key: "estado",         label: "Estado",          type: "text" },
      { key: "producto",       label: "Producto",        type: "text" },
      { key: "cantidad",       label: "Cantidad",        type: "number" },
      { key: "precioUnitario", label: "Precio unitario", type: "money" },
      { key: "subtotal",       label: "Subtotal",        type: "money" },
      { key: "totalPedido",    label: "Total pedido",    type: "money" },
    ],
    rows,
  };
}

export function productosDataset(productos, name = "Productos") {
  return {
    name,
    columns: [
      { key: "nombre",     label: "Producto",  type: "text" },
      { key: "cantidad",   label: "Unidades",  type: "number" },
      { key: "porcentaje", label: "% del total", type: "number" },
      { key: "ingresos",   label: "Ingresos",  type: "money" },
    ],
    rows: productos,
  };
}

export function clientesDataset(clientesNuevos, name = "Clientes nuevos") {
  return {
    name,
    columns: [
      { key: "nombre", label: "Cliente", type: "text" },
      { key: "correo", label: "Correo",  type: "text" },
      { key: "fecha",  label: "Registro", type: "date" },
    ],
    rows: clientesNuevos,
  };
}

export function resumenDataset(kpis, name = "Resumen") {
  const fila = (metrica, k) => ({ metrica, valor: k.valor, variacion: k.delta ?? "sin comparación" });
  return {
    name,
    columns: [
      { key: "metrica",   label: "Métrica",             type: "text" },
      { key: "valor",     label: "Valor",               type: "text" },
      { key: "variacion", label: "Variación vs anterior", type: "text" },
    ],
    rows: [
      fila("Total ventas", kpis.ventas),
      fila("Pedidos", kpis.pedidos),
      fila("Clientes nuevos", kpis.clientes),
      fila("Ticket promedio", kpis.ticket),
    ],
  };
}

const soloCompletadas = (ventas) =>
  ventas.filter(v => ESTADOS_COMPLETADO_ID.includes(v.estadoId) && !v.tieneDevolucion);

/* Datasets para el "ver detalles" de una tarjeta. `ventas` ya viene filtrado
   por el modal (p. ej. por estado en "Flujo de ventas"). */
export function datasetsTarjeta(card, { ventas, productos }) {
  if (card === "top") return [productosDataset(productos)];
  if (card === "flujo") return [ventasDataset(ventas, "Flujo de ventas")];
  return [ventasDataset(soloCompletadas(ventas), "Ventas completadas")];
}

/* Datasets para el export global del dashboard. */
export function datasetsGlobales(formato, { kpis, detalle }) {
  if (formato === "csv") {
    // Un CSV es una sola tabla: todas las ventas a nivel de línea de pedido.
    return [ventasLineasDataset(detalle.ventas)];
  }
  return [
    resumenDataset(kpis),
    ventasLineasDataset(detalle.ventas),
    productosDataset(detalle.productos),
    clientesDataset(detalle.clientesNuevos),
  ];
}

/* ── Exportadores ────────────────────────────────────────── */

export async function exportarDatasets(formato, filenameBase, titulo, datasets) {
  if (formato === "csv" || formato === "excel") {
    const XLSX = await loadXLSX();
    return exportarConXLSX(XLSX, formato, filenameBase, datasets);
  }
  const [{ jsPDF }] = await loadPDF();  // jspdf-autotable se registra como plugin al importarse
  return exportarPDF(jsPDF, filenameBase, titulo, datasets);
}

function exportarConXLSX(XLSX, formato, filenameBase, datasets) {
  if (formato === "csv") {
    const wb = XLSX.utils.book_new();
    let data;
    if (datasets.length === 1) {
      data = aoa(datasets[0], "csv");
    } else {
      data = [];
      datasets.forEach((ds, i) => {
        if (i) data.push([]);
        data.push([ds.name]);
        aoa(ds, "csv").forEach(r => data.push(r));
      });
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "Datos");
    XLSX.writeFile(wb, `${filenameBase}.csv`);
    return;
  }

  if (formato === "excel") {
    const wb = XLSX.utils.book_new();
    datasets.forEach((ds, i) => {
      const ws = XLSX.utils.aoa_to_sheet(aoa(ds, "excel"));
      XLSX.utils.book_append_sheet(wb, ws, (ds.name || `Hoja ${i + 1}`).slice(0, 31));
    });
    XLSX.writeFile(wb, `${filenameBase}.xlsx`);
  }
}

function exportarPDF(jsPDF, filenameBase, titulo, datasets) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 15);
  let y = 22;
  datasets.forEach(ds => {
    doc.setFontSize(10);
    doc.text(ds.name, 14, y);
    doc.autoTable({
      startY: y + 2,
      head: [ds.columns.map(c => c.label)],
      body: ds.rows.map(r => ds.columns.map(c => fmtCell(r[c.key], c.type, "pdf"))),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [46, 125, 50] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 12;
  });
  doc.save(`${filenameBase}.pdf`);
}
