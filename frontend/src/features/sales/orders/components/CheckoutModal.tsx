import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Scale, User, MapPin, ShoppingBag, CheckCircle2, Sparkles, ShieldCheck, UploadCloud, ChevronRight, Gift, Truck, Phone, Save, Package, AlertTriangle } from 'lucide-react';
import { CartItem } from '../services/cartService';
import { getUser } from '../../../../services/authService';
import { getMiCredito } from '../../../../services/pedidosService';
import { apiFetch } from '../../../../utils/api';
import { getCobertura } from '../../../../services/ubicacionesService';
import FormularioDireccion from '../../../../shared/components/FormularioDireccion';
import { desdeTexto, lineaVia } from '../../../../utils/direccionEntrega';
// La regla del anticipo vive en un solo lugar, espejo del servidor.
import { pideAnticipo } from '../../../../utils/anticipo';
import SaldoMonto from '../../../../shared/components/SaldoMonto';
import SplitPagoMonto from '../../../../shared/components/SplitPagoMonto';
import './CheckoutModal.css';

// Datos de la cuenta bancaria — actualiza en GestionPedidos.jsx también
const CUENTA = {
  banco:   'Bancolombia',
  numero:  '54213570938',
  tipo:    'Cuenta de ahorros',
  titular: 'TostonApp S.A.S',
};


const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails: {
    address: string;
    municipio?: string;
    departamento?: string;
    date?: string;
    clientName: string;
    items: CartItem[];
    total: number;
    observaciones?: string;
    tieneDomicilio?: boolean;
  } | null;
  onConfirm: (paymentMethod: string, comprobante?: File | null, saldoAFavor?: { usar: boolean; monto: number; efectivoMonto?: number }, deliveryInfo?: { tieneDomicilio: boolean; address: string; idBarrio: number | null; municipio: string; departamento: string; date: string; time: string; observaciones: string }, anticipoData?: { requiere: boolean; metodo: string; efectivo: boolean; comprobante: File | null; monto: number; saldo: number; pagarTodo?: boolean; creditoCubreAnticipo?: boolean }) => Promise<void> | void;
}

/** Saldo a favor: lo que el cliente tiene abonado de devoluciones anteriores.
 *  No es todo o nada — con la barra decide que parte gasta en este pedido y
 *  cuanta se guarda para el siguiente. El porcentaje va sobre lo maximo que se
 *  puede aplicar (su saldo o el total del pedido, lo que sea menor), asi que
 *  el 100% siempre cae justo y nunca sobra plata aplicada. */
const SaldoAFavorPicker: React.FC<{
  saldo: number;
  maximo: number;
  activo: boolean;
  monto: number | '';
  onToggle: () => void;
  onMonto: (m: number | '') => void;
}> = ({ saldo, maximo, activo, monto, onToggle, onMonto }) => {
  return (
    <div className={`rounded-2xl border-2 transition-all ${activo ? 'border-green-500 bg-green-50' : 'border-gray-100 bg-white hover:border-green-200'}`}>
      <div onClick={onToggle} className="flex items-center gap-3 p-3 cursor-pointer">
        <div className={`p-2 rounded-xl shrink-0 ${activo ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700'}`}>
          <Gift size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-gray-700">Usar saldo a favor</p>
          <p className="text-[10px] font-bold text-green-700">{COP(saldo)} disponibles</p>
        </div>
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${activo ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
          {activo && <CheckCircle2 size={10} className="text-white" />}
        </div>
      </div>

      {activo && (
        <div className="px-3 pb-3 pt-2.5 border-t border-green-200">
          <SaldoMonto
            saldo={saldo}
            maximo={maximo}
            monto={monto}
            onMonto={onMonto}
          />
        </div>
      )}
    </div>
  );
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, orderDetails, onConfirm }) => {
  const [paymentMethod,      setPaymentMethod]      = useState('digital');
  // Pago mixto: cuánta plata va en efectivo, en pesos. La transferencia se
  // paga ahora con comprobante y el efectivo se entrega al recibir el pedido.
  const [efectivoMonto,      setEfectivoMonto]      = useState<number | ''>('');
  const [mixtoError,         setMixtoError]         = useState('');
  const [comprobante,        setComprobante]        = useState<File | null>(null);
  const [comprobanteError,   setComprobanteError]   = useState('');
  const [isConfirming,       setIsConfirming]       = useState(false);
  const [credito,            setCredito]            = useState(0);
  const [usarCredito,        setUsarCredito]        = useState(false);
  // Cuanto saldo a favor se aplica, EN PESOS. Arranca vacio y el tope lo
  // pone creditoMaximo; el atajo "Todo" cubre el caso mas comun.
  const [creditoMonto,       setCreditoMonto]       = useState<number | ''>('');
  const [tieneDomicilio,     setTieneDomicilio]     = useState(false);
  /// Si el pedido va a la dirección de siempre o a otra.
  ///
  /// La guardada se muestra y no se toca: para cambiarla está "Mis datos".
  /// Antes venía precargada en un campo editable y corregirla ahí terminaba
  /// pisando la del perfil sin que nadie lo pidiera.
  const [usarRegistrada,     setUsarRegistrada]     = useState(true);
  /// La otra dirección, en campos separados. Vale solo para este pedido.
  const [otraVia,            setOtraVia]            = useState(() => desdeTexto(''));
  /// Barrio de entrega elegido + su cobertura ({ disponible, base, final, ... }).
  const [idBarrio,           setIdBarrio]           = useState<number | null>(null);
  const [coberturaBarrio,    setCoberturaBarrio]    = useState<any>(null);
  const [date,               setDate]               = useState('');
  const [time,               setTime]               = useState('');
  const [observaciones,      setObservaciones]      = useState('');
  // Teléfono
  const [telefono,           setTelefono]           = useState('');
  const [telefonoTocado,     setTelefonoTocado]     = useState(false);
  const [telefonoRegistrado, setTelefonoRegistrado] = useState(false);
  const [guardarTelefono,    setGuardarTelefono]    = useState(true);
  // Dirección guardada
  /// Lo que el cliente tiene guardado en su perfil. No se toca desde acá.
  const [registrada,     setRegistrada]     = useState<any>(null);
  /// Si ya se intentó confirmar: hasta entonces no se marca nada en rojo.
  const [direccionTocada,     setDireccionTocada]     = useState(false);
  // Anticipo
  const [anticipoMetodo,      setAnticipoMetodo]      = useState('');
  const [anticipoEfectivo,    setAnticipoEfectivo]    = useState(false);
  const [anticipoComprobante, setAnticipoComprobante] = useState<File | null>(null);
  const [anticipoError,       setAnticipoError]       = useState('');
  // 'mitad' = 50%, 'todo' = 100%, 'personalizado' = monto elegido por el cliente
  const [anticipoOpcion,      setAnticipoOpcion]      = useState<'mitad' | 'todo' | 'personalizado'>('mitad');
  const [montoPersonalizado,  setMontoPersonalizado]  = useState<number | ''>('');
  const [terminosAceptados,  setTerminosAceptados]   = useState(false);

  useEffect(() => {
    if (!isOpen || !orderDetails) return;
    setTieneDomicilio(orderDetails.tieneDomicilio ?? false);
    setIdBarrio(null);
    setCoberturaBarrio(null);
    setDate(orderDetails.date || '');
    setTime('');
    setObservaciones(orderDetails.observaciones || '');
    setComprobante(null);
    setTelefonoTocado(false);
    setDireccionTocada(false);

    // Cargar perfil para verificar teléfono y prefill de dirección / barrio.
    apiFetch('/auth/perfil')
      .then((perfil: any) => {
        const tel = perfil?.Telefono || '';
        setTelefono(tel);
        setTelefonoRegistrado(!!tel);
        setRegistrada({
          direccion:    perfil?.Direccion || '',
          ID_Barrio:    perfil?.ID_Barrio || null,
          barrio:       perfil?.Barrio || null,
        });
        // Con dirección guardada se arranca en ella; sin ella, no hay nada
        // que elegir y se pide directamente.
        setUsarRegistrada(!!perfil?.Direccion);
        // El barrio ya no se pregunta: es el de sus datos, y de ahí sale la
        // tarifa. Preguntarlo en cada pedido era pedir dos veces lo mismo.
        if (perfil?.ID_Barrio) {
          getCobertura(perfil.ID_Barrio)
            .then((cob: any) => { setIdBarrio(perfil.ID_Barrio); setCoberturaBarrio(cob); })
            .catch(() => { setIdBarrio(null); setCoberturaBarrio(null); });
        } else {
          setIdBarrio(null);
          setCoberturaBarrio(null);
        }
      })
      .catch(() => {
        setTelefonoRegistrado(false);
        setRegistrada(null);
      });

    getMiCredito()
      .then((data: any) => setCredito(data?.saldo || 0))
      .catch(() => setCredito(0));
    setAnticipoOpcion('mitad');
    setMontoPersonalizado('');
    setAnticipoMetodo('');
    setAnticipoEfectivo(false);
    setAnticipoComprobante(null);
    setAnticipoError('');
    setUsarCredito(false);
    setCreditoMonto('');
    setEfectivoMonto('');
    setMixtoError('');
    setTerminosAceptados(false);
  }, [isOpen]);

  // El anticipo se le pide al pedido que hay que hornear Y que pasa de
  // $50.000. Acá estaba clavado en `true`: se le pedía transferencia por
  // adelantado a quien compraba tres panes que estaban en la vitrina.
  //
  // Se calcula acá arriba, antes del early return, porque el efecto de abajo
  // lo necesita y los hooks no pueden quedar detrás de un return; de ahí el
  // encadenado opcional sobre orderDetails.
  const requiereAnticipo = pideAnticipo(
    (orderDetails?.items || []).map((it: CartItem) => ({
      cantidad:           it.cantidad,
      stock:              it.stock,
      requiereProduccion: it.requiereProduccion,
    })),
    (orderDetails?.total || 0) + (tieneDomicilio && coberturaBarrio?.disponible ? (coberturaBarrio.final ?? 0) : 0),
  );

  // Un pedido con anticipo no admite mixto: la parte en efectivo del mixto se
  // paga AL RECIBIR y el anticipo tiene que estar cubierto ANTES de producir,
  // así que no respalda nada. El backend lo rechaza; acá se resuelve al leer y
  // no tocando el estado, para que el cliente que baje la cantidad recupere el
  // método que había elegido.
  const permiteMixto = !requiereAnticipo;
  const esMixto      = permiteMixto && paymentMethod === 'mixto';

  if (!isOpen || !orderDetails) return null;

  const itemsConDeficit = (orderDetails.items || []).filter(
    (it: CartItem) => it.requiereProduccion && it.cantidad > (it.stock ?? 0)
  );

  const soloDigitos = (tel: string) => tel.replace(/\D/g, '');
  const telefonoValido = soloDigitos(telefono).length === 10;
  const telefonoError = telefonoTocado && !telefonoValido
    ? soloDigitos(telefono).length === 0 ? 'El teléfono es obligatorio' : 'Debe tener exactamente 10 dígitos'
    : null;

  // La entrega necesita: una dirección exacta (texto) y un barrio con cobertura.
  // El barrio determina el precio del domicilio (SelectorBarrioEntrega ya
  // consultó la cobertura contra el backend).
  const barrioDisponible = !!coberturaBarrio?.disponible;
  /// Solo se puede usar la guardada si hay una.
  const conRegistrada = usarRegistrada && !!registrada?.direccion;
  /// A dónde va el pedido: la de siempre, o la que se escribió para hoy.
  const address = conRegistrada
    ? String(registrada.direccion).trim()
    : lineaVia(otraVia);
  const faltaDireccion =
    !address ? 'Escribe la dirección exacta (calle, número, complemento)'
    : !idBarrio             ? 'Tu barrio no está en tus datos. Agrégalo en "Mis datos" para pedir a domicilio.'
    : !barrioDisponible     ? 'Tu barrio no tiene cobertura de domicilio: cámbialo en "Mis datos" o recoge en tienda'
    : null;
  const direccionValida = faltaDireccion === null;
  const direccionError  = direccionTocada ? faltaDireccion : null;

  const user = getUser();
  const costoDomicilio   = (tieneDomicilio && barrioDisponible) ? (coberturaBarrio.final ?? 0) : 0;
  const costoDomicilioBase = (tieneDomicilio && barrioDisponible) ? (coberturaBarrio.base ?? 0) : 0;
  // Tope real: no se puede aplicar mas saldo del que hay ni mas de lo que
  // cuesta el pedido. Sobre ese tope corre la barra.
  const creditoMaximo    = Math.min(credito, orderDetails.total + costoDomicilio);
  const creditoAplicar   = usarCredito
    ? Math.min(Math.max(Number(creditoMonto) || 0, 0), creditoMaximo)
    : 0;
  const totalFinal       = Math.max(0, orderDetails.total + costoDomicilio - creditoAplicar);
  const montoMitad = Math.ceil(totalFinal * 0.5);
  const montoAnticipo = requiereAnticipo
    ? anticipoOpcion === 'todo'          ? totalFinal
    : anticipoOpcion === 'personalizado' ? Math.max(montoMitad, Math.min(Math.round(Number(montoPersonalizado) || 0), totalFinal))
    : montoMitad
    : 0;
  // El cliente paga todo si eligió "Pagar total" o si el monto personalizado alcanza el total
  const pagarTodo            = anticipoOpcion === 'todo' || (anticipoOpcion === 'personalizado' && montoAnticipo >= totalFinal);
  const creditoCubreAnticipo = requiereAnticipo && usarCredito
    && creditoAplicar >= montoAnticipo;

  const handleFinalConfirm = async () => {
    setTelefonoTocado(true);
    if (tieneDomicilio) setDireccionTocada(true);
    if (!telefonoValido) return;
    if (tieneDomicilio && !direccionValida) return;

    // Pagando por transferencia el comprobante es obligatorio: sin él, el pedido
    // se creaba igual y quedaba sin soporte de pago, sin avisar a nadie.
    // (Con anticipo el comprobante que cuenta es el del anticipo, validado abajo.)
    // Un mixto tiene que tener las dos partes: si una queda en cero, lo que
    // el cliente quiere es el otro método a secas.
    if (esMixto) {
      const enEfectivo = Number(efectivoMonto) || 0;
      if (enEfectivo <= 0) {
        setMixtoError('Escribe cuánto vas a pagar en efectivo.');
        return;
      }
      if (enEfectivo >= totalFinal) {
        setMixtoError(`El efectivo debe ser menor que ${COP(totalFinal)}. Si vas a pagar todo en efectivo, elige ese método.`);
        return;
      }
      setMixtoError('');
    }

    // El mixto lleva una transferencia de verdad: también pide el comprobante.
    // Excepción: si el saldo a favor cubre el 100% del total no hay nada que
    // transferir, aunque el método elegido sea "Transferencia".
    const llevaTransferencia = paymentMethod === 'digital' || esMixto;
    if (llevaTransferencia && !requiereAnticipo && totalFinal > 0 && !comprobante) {
      setComprobanteError('Adjunta el comprobante de la transferencia.');
      return;
    }
    setComprobanteError('');

    if (requiereAnticipo && !creditoCubreAnticipo) {
      if (!anticipoMetodo) { setAnticipoError('Selecciona el método de pago del anticipo'); return; }

      if (anticipoMetodo === 'digital' && !anticipoComprobante) { setAnticipoError('Debes adjuntar el comprobante del anticipo'); return; }
    }

    setIsConfirming(true);

    // Guardar teléfono si el usuario lo pidió y no estaba registrado (o cambió)
    if (guardarTelefono && (!telefonoRegistrado || telefono !== (user as any)?.telefono)) {
      await apiFetch('/auth/perfil', {
        method: 'PUT',
        body: JSON.stringify({ Telefono: telefono }),
      }).catch(() => {});
    }

    // La dirección del perfil solo se escribe cuando NO había ninguna: una
    // dirección puntual —"hoy déjalo donde mi mamá"— no puede pisar la de
    // siempre. Para cambiarla está "Mis datos". El barrio del perfil (dato guía)
    // se guarda igual: no condiciona nada.
    if (tieneDomicilio && !registrada?.direccion && address) {
      await apiFetch('/auth/perfil', {
        method: 'PUT',
        body: JSON.stringify({
          Direccion: address,
          ID_Barrio: idBarrio || undefined,
          Municipio: coberturaBarrio?.ciudad || undefined,
          Departamento: coberturaBarrio?.departamento || undefined,
        }),
      }).catch(() => {});
    }

    // Con anticipo, el pedido se cobra por donde se pagó el anticipo: es el
    // mismo dinero. Si lo cubre el crédito, el saldo se cobra al entregar y se
    // deja en efectivo (una transferencia sin comprobante bloquea la entrega).
    const metodoPedido = requiereAnticipo
      ? (creditoCubreAnticipo ? 'efectivo' : anticipoMetodo || 'efectivo')
      : paymentMethod;

    try {
      await onConfirm(metodoPedido, comprobante, { usar: usarCredito, monto: creditoAplicar, efectivoMonto: Number(efectivoMonto) || 0 }, {
        tieneDomicilio,
        address,
        idBarrio,
        municipio: coberturaBarrio?.ciudad || '',
        departamento: coberturaBarrio?.departamento || '',
        date,
        time,
        observaciones,
      }, requiereAnticipo ? {
        requiere: true,
        metodo: creditoCubreAnticipo ? 'credito' : anticipoMetodo,
        efectivo: creditoCubreAnticipo ? true : anticipoEfectivo,
        comprobante: creditoCubreAnticipo ? null : anticipoComprobante,
        monto: montoAnticipo,
        saldo: totalFinal - montoAnticipo,
        pagarTodo,
        creditoCubreAnticipo,
      } : undefined);
    } catch {
      // el padre ya muestra el error al usuario
    } finally {
      setIsConfirming(false);
    }
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-gray-700 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all";

  return (
    <div className="modal-overlay">
      <div className="modal-box relative shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-none" style={{ maxWidth: '460px', borderRadius: '24px' }}>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl border border-white/20">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-none mb-0.5">Confirmar Pedido</h2>
              <p className="text-white/60 text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck size={9} /> Pago 100% Seguro
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-all text-white/70 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50 px-4 py-3 space-y-3">

          {/* Aviso de producción */}
          {itemsConDeficit.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Package size={13} /> Orden de producción requerida
              </p>
              <p className="text-xs font-semibold text-blue-700 mb-2">
                Los siguientes productos no tienen suficiente stock. Se creará una orden de producción y el administrador te propondrá una fecha de entrega.
              </p>
              <ul className="space-y-1">
                {itemsConDeficit.map((it: CartItem) => (
                  <li key={it.id} className="flex justify-between text-[11px] font-bold text-blue-800">
                    <span>{it.nombre}</span>
                    <span className="text-blue-500">
                      Stock: {it.stock ?? 0} · Pedido: {it.cantidad}
                      {it.cantidad > (it.stock ?? 0) ? ` · Déficit: ${it.cantidad - (it.stock ?? 0)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quién recibe. Al lado había un "A nombre de" que se guardaba
              en una columna que nadie lee: no sale en el detalle, ni en el
              panel, ni en el domicilio. */}
          <div className="bg-white rounded-2xl border border-gray-100 px-3 py-2.5">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Quién recibe</p>
            <div className="flex items-center gap-1.5">
              <User size={12} className="text-green-700 shrink-0" />
              <p className="text-xs font-black text-gray-800 truncate">{user?.nombre} {user?.apellidos}</p>
            </div>
          </div>

          {/* Teléfono de contacto */}
          <div className={`bg-white rounded-2xl border px-3 py-3 space-y-2 ${telefonoError ? 'border-red-200' : telefonoValido ? 'border-green-200' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Phone size={10} /> Teléfono de contacto
                <span className="text-red-400">*</span>
              </p>
              {telefonoRegistrado && telefonoValido && (
                <span className="text-[9px] font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Registrado
                </span>
              )}
            </div>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                placeholder="Ej: 300 123 4567"
                value={telefono}
                onChange={e => {
                  setTelefono(e.target.value);
                  setTelefonoTocado(true);
                }}
                onBlur={() => setTelefonoTocado(true)}
                className={inputCls + " pl-8"}
              />
            </div>
            {telefonoError && (
              <p className="text-[10px] font-bold text-red-500">{telefonoError}</p>
            )}
            {!telefonoError && telefonoValido && !telefonoRegistrado && telefono.trim() && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={guardarTelefono}
                  onChange={e => setGuardarTelefono(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-green-600"
                />
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                  <Save size={11} className="text-green-600" /> Guardar como teléfono principal
                </span>
              </label>
            )}
          </div>

          {/* Tipo de entrega */}
          <div className="bg-white rounded-2xl border border-gray-100 px-3 py-3 space-y-2.5">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tipo de entrega</p>
            <div className="grid grid-cols-2 bg-gray-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setTieneDomicilio(false)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all duration-200 ${!tieneDomicilio ? 'bg-white text-green-800 shadow' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <ShoppingBag size={13} /> Recogida
              </button>
              <button
                onClick={() => setTieneDomicilio(true)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all duration-200 ${tieneDomicilio ? 'bg-white text-green-800 shadow' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Truck size={13} /> Domicilio
              </button>
            </div>

            {!tieneDomicilio && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                <MapPin size={14} className="text-green-700 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-0.5">Dirección de recogida</p>
                  <p className="text-xs font-bold text-gray-700">CARRERA 38 A NO. 80 12</p>
                </div>
              </div>
            )}


            {tieneDomicilio && (
              <div className="space-y-2">
                {/* La de siempre o una para hoy. Antes había un solo campo
                    precargado con la del perfil: corregirlo para este pedido
                    terminaba pisando la dirección guardada. */}
                {!!registrada?.direccion && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: true,  titulo: 'Mi dirección', detalle: String(registrada.direccion) },
                      { id: false, titulo: 'Otra dirección', detalle: 'Solo para este pedido' },
                    ].map(op => {
                      const activa = usarRegistrada === op.id;
                      return (
                        <button
                          key={String(op.id)}
                          type="button"
                          onClick={() => { setUsarRegistrada(op.id); setDireccionTocada(true); }}
                          className={`text-left rounded-2xl border px-3 py-2.5 transition ${
                            activa
                              ? 'border-green-600 bg-green-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <span className={`block text-[11px] font-black ${activa ? 'text-green-700' : 'text-gray-500'}`}>
                            {op.titulo}
                          </span>
                          <span className="block text-[10px] font-semibold text-gray-500 truncate mt-0.5">
                            {op.detalle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {conRegistrada ? (
                  /* Se muestra como es y no se edita: para cambiarla está
                     "Mis datos", que es donde se cambia de verdad. */
                  <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2.5">
                    <MapPin size={14} className="text-gray-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                        Se entrega en
                      </p>
                      <p className="text-xs font-black text-gray-800">{registrada.direccion}</p>
                      {registrada.barrio?.nombre && (
                        <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                          {registrada.barrio.nombre}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <FormularioDireccion
                    valor={otraVia}
                    onCambio={(d: any) => { setOtraVia(d); setDireccionTocada(true); }}
                    tema="checkout"
                    soloVia
                  />
                )}

                {/* El barrio sale de sus datos: acá se muestra para que sepa
                    a dónde va y cuánto cuesta, no para elegirlo otra vez. */}
                {coberturaBarrio ? (
                  <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-2xl px-3 py-2.5">
                    <MapPin size={14} className="text-green-700 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black text-green-700 uppercase tracking-widest mb-0.5">
                        Barrio de entrega
                      </p>
                      <p className="text-xs font-black text-gray-800">
                        {coberturaBarrio.barrio}
                        {coberturaBarrio.ciudad ? ` · ${coberturaBarrio.ciudad}` : ''}
                      </p>
                      <p className="text-[11px] font-semibold text-gray-500 mt-0.5">
                        {barrioDisponible
                          ? `Domicilio ${COP(coberturaBarrio.final ?? 0)}`
                          : (coberturaBarrio.motivo || 'Sin cobertura de domicilio')}
                        {' · '}
                        <span className="text-gray-400">se cambia en Mis datos</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2.5">
                    <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                      Todavía no tienes barrio en tus datos. Agrégalo en
                      «Mis datos» para poder pedir a domicilio.
                    </p>
                  </div>
                )}
                {direccionError && (
                  <p className="text-[10px] font-bold text-red-500 mt-1 pl-1">
                    {direccionError}
                  </p>
                )}
                {direccionValida && !registrada?.direccion && (
                  <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                    <Save size={12} className="text-green-600 shrink-0" />
                    Como es tu primera dirección, la guardamos en tu perfil como referencia.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Resumen productos */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-50">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Productos</span>
              <span className="text-[9px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{orderDetails.items.length} items</span>
            </div>
            <div className="max-h-28 overflow-y-auto custom-scrollbar px-3 py-1">
              {orderDetails.items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-bold text-gray-700 flex-1 truncate">{item.nombre}</span>
                  <span className="text-[10px] text-gray-400 font-black mx-2">×{item.cantidad}</span>
                  <span className="text-xs font-black text-gray-900">{COP(item.precio * item.cantidad)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Con anticipo el método se elige una sola vez, abajo: preguntarlo
              aquí también obligaba a decidir dos veces lo mismo. */}
          {!requiereAnticipo && (
          <div className="bg-white rounded-2xl border border-gray-100 px-3 py-3 space-y-2.5">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Método de pago del pedido
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'digital',  icon: <CreditCard size={14} />, label: 'Transferencia' },
                { id: 'efectivo', icon: <Banknote size={14} />,   label: 'Efectivo' },
                { id: 'mixto',    icon: <Scale size={14} />,      label: 'Mixto' },
              ].filter(m => m.id !== 'mixto' || permiteMixto).map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-[11px] font-black ${paymentMethod === m.id ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>
                  <div className={`p-1.5 rounded-lg ${paymentMethod === m.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{m.icon}</div>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Reparto entre las dos formas de pago */}
            {esMixto && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 mb-2">
                  Pagas una parte ahora por transferencia y el resto en efectivo al recibir
                </p>
                <SplitPagoMonto
                  total={totalFinal}
                  montoEfectivo={efectivoMonto}
                  onMonto={(v: number | '') => { setEfectivoMonto(v); setMixtoError(''); }}
                  error={mixtoError}
                />
              </div>
            )}

            {(paymentMethod === 'digital' || esMixto) && totalFinal === 0 && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                <p className="text-xs font-bold text-green-800">Tu saldo a favor cubre el total — no necesitas realizar ningún pago ni adjuntar comprobante.</p>
              </div>
            )}

            {(paymentMethod === 'digital' || esMixto) && totalFinal > 0 && (
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div className="space-y-1">
                    {[['Banco', CUENTA.banco], ['Número', CUENTA.numero], ['Tipo', CUENTA.tipo], ['Titular', CUENTA.titular]].map(([l, v]) => (
                      <div key={l} className="flex gap-2">
                        <span className="text-[9px] font-black text-blue-400 uppercase w-12 shrink-0">{l}</span>
                        <span className="text-[10px] font-black text-blue-900">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {esMixto && (
                  <p className="text-[10px] font-bold text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
                    Transfiere {COP(totalFinal - (Number(efectivoMonto) || 0))} y
                    ten listos {COP(Number(efectivoMonto) || 0)} en efectivo para la entrega.
                  </p>
                )}
                <div className="relative group">
                  <input type="file" accept="image/*"
                    onChange={e => { setComprobante(e.target.files?.[0] || null); setComprobanteError(''); }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="border-2 border-dashed border-green-200 bg-white group-hover:bg-green-50 transition-all rounded-xl p-3 text-center">
                    {comprobante ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle2 size={14} className="text-green-500" />
                        <p className="text-xs font-black text-green-700 truncate max-w-[160px]">{comprobante.name}</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <UploadCloud size={15} className="text-green-300" />
                        <p className="text-xs font-bold text-gray-400">Subir comprobante de pago</p>
                      </div>
                    )}
                  </div>
                </div>
                {comprobanteError && (
                  <p className="text-[11px] font-bold text-red-600">{comprobanteError}</p>
                )}
              </div>
            )}
          </div>
          )}

          {/* Anticipo obligatorio */}
          {requiereAnticipo && (
            <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-3 py-3 space-y-3">
              <div className="flex items-start gap-2">
                <Banknote size={20} className="text-yellow-600 shrink-0" />
                <div>
                  <p className="text-xs font-black text-yellow-800">Anticipo requerido</p>
                  <p className="text-[10px] font-bold text-yellow-700">Este pedido lleva productos por encargo y supera los $50.000: requiere un anticipo del 50%. El saldo restante se paga al recibir.</p>
                  <p className="text-[10px] font-bold text-yellow-700 mt-1">El pago mixto no está disponible: su parte en efectivo se paga al recibir y el anticipo va antes.</p>
                </div>
              </div>

              {/* Toggle: anticipo 50% / monto elegido / pagar total */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'mitad',         label: 'Anticipo 50%'     },
                  { id: 'personalizado', label: 'Elegir monto'     },
                  { id: 'todo',          label: 'Pagar total ahora' },
                ] as Array<{ id: 'mitad' | 'todo' | 'personalizado'; label: string }>).map(opt => (
                  <button key={opt.id}
                    onClick={() => { setAnticipoOpcion(opt.id); setMontoPersonalizado(''); setAnticipoMetodo(''); setAnticipoEfectivo(false); setAnticipoComprobante(null); setAnticipoError(''); }}
                    className={`p-2 rounded-xl border-2 text-xs font-black transition-all ${anticipoOpcion === opt.id ? 'border-yellow-500 bg-yellow-100 text-yellow-900' : 'border-gray-200 bg-white text-gray-400 hover:border-yellow-200'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Input para monto personalizado */}
              {anticipoOpcion === 'personalizado' && (
                <div className="space-y-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={montoMitad}
                    max={totalFinal}
                    step={100}
                    placeholder={`Entre ${COP(montoMitad)} y ${COP(totalFinal)}`}
                    value={montoPersonalizado}
                    onChange={e => setMontoPersonalizado(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-gray-50 border border-yellow-300 rounded-xl py-2.5 px-3 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:border-yellow-400 transition-all"
                  />
                  {montoPersonalizado !== '' && Number(montoPersonalizado) < montoMitad && (
                    <p className="text-[10px] font-bold text-red-500">El mínimo es {COP(montoMitad)} (50%)</p>
                  )}
                  {montoPersonalizado !== '' && Number(montoPersonalizado) > totalFinal && (
                    <p className="text-[10px] font-bold text-red-500">No puede superar el total ({COP(totalFinal)})</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-yellow-200">
                <span className="text-xs font-bold text-gray-600">
                  {anticipoOpcion === 'todo' ? 'Total a pagar ahora' : anticipoOpcion === 'personalizado' ? 'Anticipo elegido' : 'Anticipo (50%)'}
                </span>
                <span className="text-base font-black text-yellow-700">{COP(montoAnticipo)}</span>
              </div>

              {/* Saldo a favor — dentro del bloque de anticipo */}
              {credito > 0 && (
                <SaldoAFavorPicker
                  saldo={credito}
                  maximo={creditoMaximo}
                  activo={usarCredito}
                  monto={creditoMonto}
                  onToggle={() => {
                    const prender = !usarCredito;
                    setUsarCredito(prender);
                    if (prender) setCreditoMonto(creditoMaximo);
                  }}
                  onMonto={setCreditoMonto}
                />
              )}

              {creditoCubreAnticipo ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs font-bold text-green-800">Tu saldo a favor cubre este anticipo — no necesitas adjuntar comprobante.</p>
                </div>
              ) : (
                <>
                  {usarCredito && creditoAplicar > 0 && creditoAplicar < montoAnticipo && (
                    <div className="text-[10px] font-bold text-yellow-700 bg-yellow-100 rounded-xl px-3 py-2">
                      Con {COP(creditoAplicar)} de saldo a favor aún debes pagar {COP(montoAnticipo - creditoAplicar)} por otro método.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'efectivo', icon: <Banknote size={13} />, label: 'Efectivo' },
                      { id: 'digital',  icon: <CreditCard size={13} />, label: 'Transferencia' },
                    ].map(m => (
                      <button key={m.id}
                        onClick={() => { setAnticipoMetodo(m.id); setAnticipoEfectivo(false); setAnticipoComprobante(null); setAnticipoError(''); }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-black transition-all ${anticipoMetodo === m.id ? 'border-yellow-500 bg-yellow-100 text-yellow-900' : 'border-gray-200 bg-white text-gray-400 hover:border-yellow-200'}`}>
                        <div className={`p-1.5 rounded-lg ${anticipoMetodo === m.id ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{m.icon}</div>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {anticipoMetodo === 'efectivo' && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      <Banknote size={14} className="text-amber-600 shrink-0" />
                      <p className="text-xs font-bold text-amber-800">
                        Paga <strong>{COP(montoAnticipo)}</strong> en efectivo al empleado. Él lo registrará desde su panel.
                      </p>
                    </div>
                  )}

                  {anticipoMetodo === 'digital' && (
                    <div className="space-y-2">
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 text-[10px] font-bold text-blue-800">
                        Transfiere <strong>{COP(montoAnticipo)}</strong> a <strong>{CUENTA.banco}</strong> · {CUENTA.tipo} · <strong>{CUENTA.numero}</strong> — {CUENTA.titular}
                      </div>
                      <div className="relative group">
                        <input type="file" accept="image/*"
                          onChange={e => { setAnticipoComprobante(e.target.files?.[0] || null); setAnticipoError(''); }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="border-2 border-dashed border-yellow-300 bg-white group-hover:bg-yellow-50 transition-all rounded-xl p-3 text-center">
                          {anticipoComprobante ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle2 size={13} className="text-green-500" />
                              <p className="text-xs font-black text-green-700 truncate max-w-[180px]">{anticipoComprobante.name}</p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <UploadCloud size={14} className="text-yellow-400" />
                              <p className="text-xs font-bold text-gray-400">Subir comprobante del anticipo</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {anticipoError && (
                <p className="text-[10px] font-black text-red-600">{anticipoError}</p>
              )}

              {!pagarTodo && (
                <div className="flex items-center justify-between text-[10px] font-bold text-yellow-800 bg-white rounded-xl px-3 py-2 border border-yellow-200">
                  <span>Saldo restante al recibir el pedido</span>
                  <span className="font-black">{COP(totalFinal - montoAnticipo)}</span>
                </div>
              )}
            </div>
          )}

          {/* Saldo a favor (con anticipo se muestra dentro de ese bloque) */}
          {credito > 0 && !requiereAnticipo && (
            <SaldoAFavorPicker
              saldo={credito}
              maximo={creditoMaximo}
              activo={usarCredito}
              monto={creditoMonto}
              onToggle={() => {
                const prender = !usarCredito;
                setUsarCredito(prender);
                if (prender) setCreditoMonto(creditoMaximo);
              }}
              onMonto={setCreditoMonto}
            />
          )}

          {/* Observaciones */}
          <div className="bg-white rounded-2xl border border-gray-100 px-3 py-3">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Observaciones del pedido</p>
            <textarea
              rows={2}
              placeholder="Ej: Sin picante, toque el timbre, entregar después de las 5pm..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3">
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs text-gray-500 font-bold">
              <span>Subtotal</span><span>{COP(orderDetails.total)}</span>
            </div>
            {tieneDomicilio && barrioDisponible && (
              <div className="flex justify-between text-xs font-bold text-purple-700">
                <span>Domicilio</span>
                <span>
                  {costoDomicilio !== costoDomicilioBase && (
                    <span className="line-through text-gray-400 font-medium mr-1">{COP(costoDomicilioBase)}</span>
                  )}
                  {costoDomicilio === 0 ? 'gratis' : `+${COP(costoDomicilio)}`}
                </span>
              </div>
            )}
            {paymentMethod === 'mixto' && !requiereAnticipo && Number(efectivoMonto) > 0 && (
              <>
                <div className="flex justify-between text-[11px] font-bold text-gray-500">
                  <span>En efectivo al recibir</span>
                  <span>{COP(Number(efectivoMonto))}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-gray-500">
                  <span>Por transferencia</span>
                  <span>{COP(totalFinal - Number(efectivoMonto))}</span>
                </div>
              </>
            )}
            {usarCredito && creditoAplicar > 0 && (
              <div className="flex justify-between text-xs font-bold text-green-700">
                <span>Saldo a favor</span><span>−{COP(creditoAplicar)}</span>
              </div>
            )}
            {requiereAnticipo && (
              <>
                {/* Sin esta línea se pasaba del subtotal al anticipo y no se
                    entendía sobre qué monto se calcula el 50%. */}
                <div className="flex justify-between text-xs font-black text-gray-700 border-t border-gray-100 pt-1">
                  <span>Total del pedido</span><span>{COP(totalFinal)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-yellow-700">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Banknote size={13} /> {pagarTodo ? 'Total pagado ahora' : anticipoOpcion === 'personalizado' ? 'Anticipo elegido' : 'Anticipo ahora (50%)'}</span><span>{COP(montoAnticipo)}</span>
                </div>
                {!pagarTodo && (
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>Saldo al recibir</span><span>{COP(totalFinal - montoAnticipo)}</span>
                  </div>
                )}
              </>
            )}
            {/* Términos y condiciones */}
            <label style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
              padding: '10px 12px', borderRadius: 10,
              background: terminosAceptados ? '#f1f8e9' : '#fff8e1',
              border: `1px solid ${terminosAceptados ? '#aed581' : '#ffe082'}`,
              transition: 'background 0.2s, border-color 0.2s',
            }}>
              <input
                type="checkbox"
                checked={terminosAceptados}
                onChange={e => setTerminosAceptados(e.target.checked)}
                style={{ marginTop: 2, accentColor: '#388e3c', width: 15, height: 15, flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: '#5d4037', lineHeight: 1.5 }}>
                He leído y acepto los <strong>términos y condiciones</strong>: entiendo que <strong>Tostón no realiza devoluciones de dinero</strong> una vez confirmado el pedido. En caso de devolución aprobada, el valor se acreditará como <strong>saldo a favor</strong> para futuros pedidos.
              </span>
            </label>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {requiereAnticipo ? (pagarTodo ? 'Total a pagar ahora' : 'Anticipo a pagar ahora') : 'Total a pagar'}
                </p>
                <p className="text-2xl font-black text-gray-900 tracking-tighter leading-none">
                  {COP(requiereAnticipo ? montoAnticipo : totalFinal)}
                </p>
              </div>
              <button
                onClick={handleFinalConfirm}
                disabled={isConfirming || !terminosAceptados}
                title={!terminosAceptados ? 'Debes aceptar los términos y condiciones' : undefined}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${isConfirming || !terminosAceptados ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' : 'text-white hover:shadow-xl hover:-translate-y-0.5'}`}
                style={(!isConfirming && terminosAceptados) ? { background: 'linear-gradient(135deg, var(--green-800) 0%, var(--green-700) 100%)' } : {}}
              >
                {isConfirming
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando</>
                  : <>Confirmar <ChevronRight size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default CheckoutModal;
