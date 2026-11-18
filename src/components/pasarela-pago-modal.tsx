import * as React from 'react';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { formatCOP, generarCodigoAleatorio } from '../lib/catalog';
import { procesarPagoPasarelaEnLinea } from '../lib/firestore-service';
import type { DocumentoEmitido, Solicitud } from '../types/domain';
import { Button } from './ui/button';

interface PasarelaPagoModalProps {
  solicitud: Solicitud | null;
  onClose: () => void;
  onPagoConfirmado: (resultado: {
    reciboNumero: string;
    codigoVerificacion: string;
    documentoEmitido: DocumentoEmitido;
    metodo: 'nequi' | 'pse' | 'tarjeta';
  }) => void;
}

const BANCOS_PSE = [
  'Bancolombia',
  'Davivienda',
  'Banco de Bogotá',
  'Banco Agrario de Colombia',
  'BBVA Colombia',
  'Banco de Occidente',
  'Nequi',
  'Daviplata',
  'Scotiabank Colpatria',
  'Banco Caja Social',
];

export function PasarelaPagoModal({
  solicitud,
  onClose,
  onPagoConfirmado,
}: PasarelaPagoModalProps) {
  const [metodo, setMetodo] = React.useState<'nequi' | 'pse' | 'tarjeta'>('nequi');
  const [procesando, setProcesando] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Nequi
  const [celularNequi, setCelularNequi] = React.useState('');
  const [claveDinamicaNequi, setClaveDinamicaNequi] = React.useState('');

  // PSE
  const [bancoPse, setBancoPse] = React.useState(BANCOS_PSE[0]);
  const [tipoPersonaPse, setTipoPersonaPse] = React.useState<'natural' | 'juridica'>('natural');
  const [celularPse, setCelularPse] = React.useState('');
  const [correoPse, setCorreoPse] = React.useState('');
  const [claveDinamicaPse, setClaveDinamicaPse] = React.useState('');

  // Tarjeta
  const [numTarjeta, setNumTarjeta] = React.useState('');
  const [titularTarjeta, setTitularTarjeta] = React.useState('');
  const [expTarjeta, setExpTarjeta] = React.useState('');
  const [claveDinamicaTarjeta, setClaveDinamicaTarjeta] = React.useState('');

  React.useEffect(() => {
    setError(null);
    setProcesando(false);
    if (solicitud) {
      setTitularTarjeta(solicitud.solicitante_nombre);
    }
  }, [solicitud]);

  if (!solicitud) return null;

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExp = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const handleConfirmarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let detalleMedio = '';

    if (metodo === 'nequi') {
      const celLimpio = celularNequi.replace(/\D/g, '');
      const claveLimpia = claveDinamicaNequi.replace(/\D/g, '');
      if (celLimpio.length !== 10) {
        setError('El número de teléfono Nequi debe tener exactamente 10 dígitos (cualquier número).');
        return;
      }
      if (claveLimpia.length !== 6) {
        setError('La clave dinámica debe tener exactamente 6 dígitos (cualquier número).');
        return;
      }
      detalleMedio = `Cel. ***${celLimpio.slice(-4)} · Clave dinámica`;
    } else if (metodo === 'pse') {
      const celPseLimpio = celularPse.replace(/\D/g, '');
      const clavePseLimpia = claveDinamicaPse.replace(/\D/g, '');
      if (celPseLimpio.length !== 10) {
        setError('El número de teléfono debe tener exactamente 10 dígitos (cualquier número).');
        return;
      }
      if (!correoPse.includes('@') || correoPse.trim().length < 5) {
        setError('Ingrese un correo electrónico válido para el comprobante PSE.');
        return;
      }
      if (clavePseLimpia.length !== 6) {
        setError('La clave dinámica bancaria debe tener exactamente 6 dígitos (cualquier número).');
        return;
      }
      detalleMedio = `${bancoPse} (${tipoPersonaPse === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}) · Clave dinámica`;
    } else {
      const cardDigits = numTarjeta.replace(/\D/g, '');
      const expDigits = expTarjeta.replace(/\D/g, '');
      const claveTarjLimpia = claveDinamicaTarjeta.replace(/\D/g, '');
      if (cardDigits.length !== 16) {
        setError('El número de tarjeta debe tener exactamente 16 dígitos (cualquier número).');
        return;
      }
      if (titularTarjeta.trim().length < 3) {
        setError('Ingrese el nombre del titular de la tarjeta.');
        return;
      }
      if (expDigits.length !== 4) {
        setError('La fecha de vencimiento debe tener exactamente 4 dígitos (MM/AA).');
        return;
      }
      if (claveTarjLimpia.length !== 6) {
        setError('La clave dinámica debe tener exactamente 6 dígitos (cualquier número).');
        return;
      }
      detalleMedio = `Tarjeta **** ${cardDigits.slice(-4)} · Clave dinámica`;
    }

    setProcesando(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
      const referencia = generarCodigoAleatorio('PAY');
      const res = await procesarPagoPasarelaEnLinea({
        solicitud,
        metodo_pago: metodo,
        referencia_pasarela: referencia,
        detalle_medio: detalleMedio,
      });

      onPagoConfirmado({
        ...res,
        metodo,
      });
    } catch (err) {
      console.error(err);
      setError(
        'No fue posible confirmar el pago y liberar el documento. Verifique que el radicado siga pendiente de pago.',
      );
    } finally {
      setProcesando(false);
    }
  };

  const cardDigitsCount = numTarjeta.replace(/\D/g, '').length;
  const expDigitsCount = expTarjeta.replace(/\D/g, '').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pasarela-title"
    >
      <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-xl border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b bg-primary px-6 py-4 text-primary-foreground">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] opacity-85">
              <Lock className="h-3.5 w-3.5" />
              <span>Pasarela de Pago Segura · Cabildo Pueblo Nuevo</span>
            </div>
            <h2 id="pasarela-title" className="mt-1 font-display text-lg font-semibold">
              Pagar derechos de expedición (RN6)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            aria-label="Cerrar pasarela de pago"
            className="rounded-lg p-1.5 text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Aviso de entorno de simulación académica */}
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-900">
            <strong>Modo prototipo con clave dinámica:</strong> acepta cualquier combinación numérica
            que cumpla la cantidad de dígitos indicada (sin cobros reales) y guarda el recibo junto
            con el documento liberado en la base de datos.
          </div>

          {/* Resumen del trámite */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <div>
              <p className="font-mono text-xs font-semibold text-muted-foreground tabular-nums">
                Radicado: {solicitud.radicado}
              </p>
              <p className="font-semibold text-foreground">{solicitud.tipo_documento_nombre}</p>
              <p className="text-xs text-muted-foreground">
                Titular: {solicitud.solicitante_nombre} ({solicitud.tipo_documento_identidad}{' '}
                {solicitud.numero_documento})
              </p>
            </div>
            <div className="text-right">
              <span className="block text-xs text-muted-foreground">Total a pagar</span>
              <span className="font-mono text-xl font-semibold tabular-nums text-primary">
                {formatCOP(solicitud.tarifa_cop)}
              </span>
            </div>
          </div>

          {/* Selector de medio de pago */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Seleccione el medio de pago (autorización con clave dinámica)
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMetodo('nequi');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                  metodo === 'nequi'
                    ? 'border-primary bg-primary/8 text-primary ring-1 ring-primary'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="h-5 w-5" />
                <span>Nequi</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMetodo('pse');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                  metodo === 'pse'
                    ? 'border-primary bg-primary/8 text-primary ring-1 ring-primary'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span>PSE Bancos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMetodo('tarjeta');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-semibold transition-colors cursor-pointer ${
                  metodo === 'tarjeta'
                    ? 'border-primary bg-primary/8 text-primary ring-1 ring-primary'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Tarjetas</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleConfirmarPago} className="mt-5 space-y-4">
            {metodo === 'nequi' && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <label htmlFor="nequi-cel" className="font-medium">
                      Número de teléfono Nequi (10 dígitos · cualquier número)
                    </label>
                    <span className="font-mono tabular-nums">{celularNequi.length}/10</span>
                  </div>
                  <input
                    id="nequi-cel"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={celularNequi}
                    onChange={(e) => setCelularNequi(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Ej. 1234567890 (10 dígitos)"
                    className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <label htmlFor="nequi-code" className="font-medium">
                      Clave dinámica Nequi (6 dígitos · cualquier número)
                    </label>
                    <span className="font-mono tabular-nums">{claveDinamicaNequi.length}/6</span>
                  </div>
                  <input
                    id="nequi-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={claveDinamicaNequi}
                    onChange={(e) =>
                      setClaveDinamicaNequi(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    placeholder="Ej. 123456 (6 dígitos)"
                    className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {metodo === 'pse' && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div>
                  <label
                    htmlFor="pse-banco"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Seleccione su entidad bancaria (PSE)
                  </label>
                  <select
                    id="pse-banco"
                    value={bancoPse}
                    onChange={(e) => setBancoPse(e.target.value)}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    {BANCOS_PSE.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="pse-persona"
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                      Tipo de persona
                    </label>
                    <select
                      id="pse-persona"
                      value={tipoPersonaPse}
                      onChange={(e) =>
                        setTipoPersonaPse(e.target.value as 'natural' | 'juridica')
                      }
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    >
                      <option value="natural">Persona Natural</option>
                      <option value="juridica">Persona Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <label htmlFor="pse-cel" className="font-medium">
                        Teléfono (10 dígitos · cualquier número)
                      </label>
                      <span className="font-mono tabular-nums">{celularPse.length}/10</span>
                    </div>
                    <input
                      id="pse-cel"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={celularPse}
                      onChange={(e) => setCelularPse(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10 dígitos"
                      className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="pse-correo"
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                      Correo para comprobante PSE
                    </label>
                    <input
                      id="pse-correo"
                      type="email"
                      required
                      value={correoPse}
                      onChange={(e) => setCorreoPse(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <label htmlFor="pse-clave" className="font-medium">
                        Clave dinámica (6 dígitos)
                      </label>
                      <span className="font-mono tabular-nums">{claveDinamicaPse.length}/6</span>
                    </div>
                    <input
                      id="pse-clave"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={claveDinamicaPse}
                      onChange={(e) =>
                        setClaveDinamicaPse(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="6 dígitos (cualquier número)"
                      className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {metodo === 'tarjeta' && (
              <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <label htmlFor="card-num" className="font-medium">
                      Número de tarjeta Crédito o Débito (16 dígitos · cualquier número)
                    </label>
                    <span className="font-mono tabular-nums">{cardDigitsCount}/16</span>
                  </div>
                  <input
                    id="card-num"
                    type="text"
                    inputMode="numeric"
                    maxLength={19}
                    required
                    value={numTarjeta}
                    onChange={(e) => setNumTarjeta(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000 (16 dígitos)"
                    className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="card-holder"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Nombre del titular en la tarjeta
                  </label>
                  <input
                    id="card-holder"
                    type="text"
                    required
                    value={titularTarjeta}
                    onChange={(e) => setTitularTarjeta(e.target.value)}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <label htmlFor="card-exp" className="font-medium">
                        Vencimiento (4 dígitos · MM/AA)
                      </label>
                      <span className="font-mono tabular-nums">{expDigitsCount}/4</span>
                    </div>
                    <input
                      id="card-exp"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      required
                      value={expTarjeta}
                      onChange={(e) => setExpTarjeta(formatExp(e.target.value))}
                      placeholder="12/30 (4 dígitos)"
                      className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <label htmlFor="card-clave" className="font-medium">
                        Clave dinámica (6 dígitos)
                      </label>
                      <span className="font-mono tabular-nums">
                        {claveDinamicaTarjeta.length}/6
                      </span>
                    </div>
                    <input
                      id="card-clave"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={claveDinamicaTarjeta}
                      onChange={(e) =>
                        setClaveDinamicaTarjeta(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="6 dígitos (cualquier número)"
                      className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>
                Al confirmar, su recibo quedará guardado en Tesorería y su certificado será
                liberado con seguridad de cédula.
              </span>
            </div>

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={procesando}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                {procesando
                  ? 'Confirmando pago y liberando...'
                  : `Confirmar pago ${formatCOP(solicitud.tarifa_cop)}`}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
