import { useMemo, useState } from "react";
import { getUser } from "../../../services/authService.js";
import { useApp } from "../../../AppContext.jsx";
import { useNotificaciones } from "../../notificaciones/context/NotificacionesContext.jsx";
import "./DashboardCocina.css";

const COOK_ROLE_ALIASES = ["producción", "produccion", "cocinero"];

const formatDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatDuration = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const buildPriority = (pedido) => {
  const urgency = pedido.fecha_pedido ? Math.round((new Date() - new Date(`${pedido.fecha_pedido}T00:00:00`)) / 86_400_000) : 0;
  if (pedido.domicilio) return "Alta";
  if (urgency >= 2) return "Urgente";
  return "Normal";
};

const getTimeMinutes = (start, end) => {
  if (!start || !end) return null;
  const diff = new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`);
  return diff >= 0 ? diff / 60000 : null;
};

export default function DashboardCocina() {
  const user = getUser();
  const rol = user?.rol?.toLowerCase();
  const esCocina = COOK_ROLE_ALIASES.includes(rol);

  const {
    pedidos,
    ordenes,
    productos,
    insumos,
    cambiarEstadoPedido,
    cambiarEstadoOrden,
  } = useApp();
  const { notificaciones } = useNotificaciones();

  const cocinaPedidos = pedidos.filter(p => ["Pendiente", "En producción", "Listo"].includes(p.estado));
  const pedidosPendientes = cocinaPedidos.filter(p => p.estado === "Pendiente");
  const pedidosEnPreparacion = cocinaPedidos.filter(p => p.estado === "En producción");
  const pedidosListos = cocinaPedidos.filter(p => p.estado === "Listo");
  const ordenesActivas = ordenes.filter(o => ["Pendiente", "En proceso"].includes(o.estado));

  const historial = pedidos.filter(p => ["Listo", "Cancelado"].includes(p.estado));
  const ordenesHistoricas = ordenes.filter(o => ["Completada", "Cancelada"].includes(o.estado));

  const tiempoPromedio = useMemo(() => {
    const tiempos = historial
      .map(p => getTimeMinutes(p.fechaInicio || p.fecha_pedido, p.fechaCierre))
      .filter(t => t != null);
    if (!tiempos.length) return null;
    return Math.round(tiempos.reduce((sum, t) => sum + t, 0) / tiempos.length);
  }, [historial]);

  const alertasInventario = insumos
    .filter(i => i.stockActual <= (i.stockMinimo ?? 0))
    .sort((a, b) => a.stockActual - b.stockActual)
    .slice(0, 5);

  const cocinaNotificaciones = notificaciones.filter(n => n.idDestinatario === "produccion");

  const openPedido = (pedidoId) => setSelectedPedido(pedidoId);

  const [selectedPedido, setSelectedPedido] = useState(null);

  const selectedPedidoData = cocinaPedidos.find(p => p.id === selectedPedido) || null;

  const handleAvanzarPedido = (pedido) => {
    const siguiente = pedido.estado === "Pendiente" ? "En producción" : pedido.estado === "En producción" ? "Listo" : null;
    if (!siguiente) return;
    cambiarEstadoPedido(pedido.id, siguiente);
    setSelectedPedido(pedido.id);
  };

  const handleCancelarPedido = (pedido) => {
    cambiarEstadoPedido(pedido.id, "Cancelado");
    if (selectedPedido === pedido.id) setSelectedPedido(null);
  };

  const handleCompletarOrden = (orden) => {
    cambiarEstadoOrden(orden.id, "Completada");
  };

  if (!esCocina) {
    return (
      <div className="cocina-wrapper">
        <div className="cocina-access-denied">
          <h1>Acceso denegado</h1>
          <p>Este panel solo está disponible para el equipo de cocina.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cocina-wrapper">
      <header className="cocina-header">
        <div>
          <p className="cocina-eyebrow">Panel de cocina</p>
          <h1 className="cocina-title">Bienvenido, {user?.nombre || "Cocinero"}</h1>
        </div>
        <div className="cocina-top-notes">
          <span>Pedidos activos</span>
          <strong>{cocinaPedidos.length}</strong>
        </div>
      </header>

      <section className="cocina-stats-grid">
        <article className="stat-card stat-card--pending">
          <span>Pedidos pendientes</span>
          <strong>{pedidosPendientes.length}</strong>
        </article>
        <article className="stat-card stat-card--progress">
          <span>En preparación</span>
          <strong>{pedidosEnPreparacion.length}</strong>
        </article>
        <article className="stat-card stat-card--ready">
          <span>Listos</span>
          <strong>{pedidosListos.length}</strong>
        </article>
        <article className="stat-card stat-card--production">
          <span>Órdenes de producción</span>
          <strong>{ordenesActivas.length}</strong>
        </article>
        <article className="stat-card stat-card--avg-time">
          <span>Tiempo promedio</span>
          <strong>{tiempoPromedio != null ? formatDuration(tiempoPromedio) : "—"}</strong>
        </article>
      </section>

      <section className="cocina-section">
        <div className="section-header">
          <div>
            <h2>Pedidos de cocina</h2>
            <p>Revisa pedidos listos para comenzar o continuar la preparación.</p>
          </div>
          <span className="section-tag">Total {cocinaPedidos.length}</span>
        </div>

        <div className="pedido-cards-grid">
          {cocinaPedidos.length === 0 ? (
            <div className="empty-card">No hay pedidos activos en cocina.</div>
          ) : cocinaPedidos.map(pedido => (
            <article key={pedido.id} className={`pedido-card pedido-card--${pedido.estado.replace(/\s+/g, "-").toLowerCase()}`}>
              <div className="pedido-card__header">
                <div>
                  <span className="pedido-number">#{pedido.numero}</span>
                  <span className="pedido-state">{pedido.estado}</span>
                </div>
                <button className="link-button" onClick={() => openPedido(pedido.id)}>Ver</button>
              </div>
              <div className="pedido-card__body">
                <p><strong>Cliente:</strong> {pedido.cliente?.nombre || "Cliente anónimo"}</p>
                <p><strong>Hora:</strong> {formatDate(pedido.fecha_pedido)}</p>
                <p><strong>Prioridad:</strong> {buildPriority(pedido)}</p>
                <p><strong>Productos:</strong> {pedido.productosItems?.length || 0}</p>
              </div>
              <div className="pedido-card__actions">
                {pedido.estado !== "Listo" && pedido.estado !== "Cancelado" && (
                  <button className="primary-button" onClick={() => handleAvanzarPedido(pedido)}>
                    {pedido.estado === "Pendiente" ? "Iniciar preparación" : "Marcar como listo"}
                  </button>
                )}
                {pedido.estado !== "Cancelado" && (
                  <button className="danger-button" onClick={() => handleCancelarPedido(pedido)}>
                    Cancelar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cocina-section cocina-layout-two">
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Órdenes de producción</h2>
              <p>Controla insumos y completa las órdenes activas.</p>
            </div>
            <span className="section-tag">{ordenesActivas.length} activas</span>
          </div>

          {ordenesActivas.length === 0 ? (
            <div className="empty-card">No hay órdenes de producción activas.</div>
          ) : (
            <div className="ordenes-grid">
              {ordenesActivas.map(orden => (
                <article key={orden.id} className="orden-card">
                  <div className="orden-card__header">
                    <div>
                      <span className="orden-id">{orden.id}</span>
                      <span className="orden-state">{orden.estado}</span>
                    </div>
                    <button className="link-button" onClick={() => handleCompletarOrden(orden)}>
                      Marcar completada
                    </button>
                  </div>
                  <p><strong>Pedido:</strong> {orden.numeroPedido || "—"}</p>
                  <p><strong>Producto:</strong> {orden.productos?.map(item => `${item.nombre} x${item.cantidad}`).join(", ")}</p>
                  <div className="orden-card__footer">
                    <span>{orden.insumos?.length || 0} insumos</span>
                    <span>Entrega: {orden.fechaEntrega || "—"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Alertas de inventario</h2>
              <p>Insumos próximos a mínimo o agotados.</p>
            </div>
            <span className="section-tag">{alertasInventario.length}</span>
          </div>

          {alertasInventario.length === 0 ? (
            <div className="empty-card">No hay alertas de inventario.</div>
          ) : (
            <ul className="alerts-list">
              {alertasInventario.map(insumo => (
                <li key={insumo.id}>
                  <strong>{insumo.nombre}</strong>
                  <span>{insumo.stockActual} {insumo.stockActual === 0 ? "(agotado)" : `(mínimo ${insumo.stockMinimo})`}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="cocina-section">
        <div className="section-header">
          <div>
            <h2>Detalle del pedido</h2>
            <p>Ver los productos, cantidades y notas de preparación.</p>
          </div>
        </div>

        {selectedPedidoData ? (
          <div className="detalle-pedido-card">
            <div className="detalle-pedido-row">
              <div>
                <p className="detalle-label">Pedido</p>
                <h3>#{selectedPedidoData.numero}</h3>
              </div>
              <div>
                <p className="detalle-label">Estado</p>
                <span className="badge badge--state">{selectedPedidoData.estado}</span>
              </div>
            </div>

            <div className="detalle-pedido-grid">
              <div className="detalle-block">
                <p className="detalle-label">Cliente</p>
                <p>{selectedPedidoData.cliente?.nombre || "—"}</p>
                <p className="detalle-small">{selectedPedidoData.cliente?.telefono || ""}</p>
              </div>
              <div className="detalle-block">
                <p className="detalle-label">Código</p>
                <p>{selectedPedidoData.numero}</p>
              </div>
              <div className="detalle-block">
                <p className="detalle-label">Observaciones</p>
                <p>{selectedPedidoData.notas || "Sin observaciones"}</p>
              </div>
            </div>

            <div className="detalle-pedido-table-wrap">
              <table className="detalle-pedido-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Ficha técnica</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPedidoData.productosItems?.map(item => {
                    const producto = productos.find(p => p.id === item.idProducto);
                    const ficha = producto?.ficha || producto?.ficha_tecnica;
                    return (
                      <tr key={item.idProducto}>
                        <td>{item.nombre}</td>
                        <td>{item.cantidad}</td>
                        <td>{ficha ? "Disponible" : "No disponible"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="detalle-pedido-actions">
              {selectedPedidoData.estado !== "Listo" && selectedPedidoData.estado !== "Cancelado" && (
                <button className="primary-button" onClick={() => handleAvanzarPedido(selectedPedidoData)}>
                  {selectedPedidoData.estado === "Pendiente" ? "Iniciar preparación" : "Marcar como listo"}
                </button>
              )}
              {selectedPedidoData.estado !== "Cancelado" && (
                <button className="danger-button" onClick={() => handleCancelarPedido(selectedPedidoData)}>
                  Cancelar pedido
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-card">Selecciona un pedido para ver sus detalles.</div>
        )}
      </section>

      <section className="cocina-section cocina-dual-row">
        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Historial de preparación</h2>
              <p>Pedidos preparados, cancelados y tiempos registrados.</p>
            </div>
          </div>
          <div className="history-list">
            {historial.length === 0 ? (
              <div className="empty-card">Aún no hay historial de cocina.</div>
            ) : historial.slice(0, 6).map(p => (
              <div key={p.id} className="history-item">
                <div>
                  <strong>#{p.numero}</strong>
                  <span>{p.estado}</span>
                </div>
                <div>
                  <span>{formatDate(p.fecha_pedido)}</span>
                  <span>{formatDuration(getTimeMinutes(p.fechaInicio || p.fecha_pedido, p.fechaCierre || p.fecha_pedido))}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-panel">
          <div className="section-header">
            <div>
              <h2>Notificaciones de cocina</h2>
              <p>Pedidos nuevos, cambios de estado y cancelaciones.</p>
            </div>
          </div>
          {cocinaNotificaciones.length === 0 ? (
            <div className="empty-card">No hay notificaciones nuevas.</div>
          ) : (
            <ul className="notifications-list">
              {cocinaNotificaciones.slice(0, 8).map(n => (
                <li key={n.id}>
                  <p className="notif-title">{n.titulo}</p>
                  <p className="notif-message">{n.mensaje}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
