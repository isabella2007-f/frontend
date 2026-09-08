import { X } from "lucide-react";

/**
 * Tarjeta con el texto completo de los términos y condiciones del pedido.
 * Se abre desde el enlace "términos y condiciones" del checkout.
 */
export default function TerminosCondicionesModal({ onClose }) {
  return (
    <div className="co-tyc-overlay" onClick={onClose}>
      <div className="co-tyc-card" onClick={(e) => e.stopPropagation()}>
        <div className="co-tyc-head">
          <h3>Términos y condiciones</h3>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>
        <div className="co-tyc-body">
          <p>
            Al confirmar un pedido en <strong>Tostón</strong> aceptas las siguientes
            condiciones:
          </p>
          <p>
            <strong>1. Devoluciones de dinero.</strong> Tostón <strong>no realiza
            devoluciones de dinero</strong> una vez confirmado el pedido. Si se
            aprueba una devolución, el valor correspondiente se acredita como
            <strong> saldo a favor</strong> en tu cuenta para usarlo en futuros
            pedidos.
          </p>
          <p>
            <strong>2. Pedidos programados y por encargo.</strong> Los productos que
            no tienen stock inmediato se elaboran bajo pedido. La fecha de entrega
            se acuerda contigo y puede variar según la producción. Los pedidos por
            encargo que superan el monto establecido requieren un anticipo, que se
            descuenta del total.
          </p>
          <p>
            <strong>3. Domicilios.</strong> El costo del domicilio depende del
            barrio de entrega y de las promociones vigentes ese día; se calcula y se
            congela al confirmar el pedido. Si divides tu pedido en varias entregas,
            cada entrega a domicilio se cobra por separado.
          </p>
          <p>
            <strong>4. Horario de atención.</strong> Los pedidos hechos fuera del
            horario de atención quedan registrados, pero no se procesan hasta que la
            tienda vuelve a abrir.
          </p>
          <p>
            <strong>5. Datos de contacto.</strong> Para pedidos a domicilio es
            obligatorio un teléfono de contacto válido. Los datos que registras se
            usan únicamente para gestionar y entregar tu pedido.
          </p>
          <p>
            <strong>6. Pagos.</strong> Los pagos por transferencia deben soportarse
            con el comprobante correspondiente. Un pedido sin el soporte de pago
            requerido puede ser rechazado o retenido hasta verificar el pago.
          </p>
        </div>
      </div>
    </div>
  );
}
