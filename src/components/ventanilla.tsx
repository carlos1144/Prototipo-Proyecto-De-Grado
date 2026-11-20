import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Lock,
  QrCode,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  TIPOS_DOCUMENTO_INICIALES,
  formatCOP,
  formatTimestamp,
} from '../lib/catalog';
import {
  autoservicioConsultarPorDocumento,
  autoservicioConsultarPorRadicado,
  autoservicioRequisitos,
  autoservicioSolicitar,
  autoservicioValidarCodigo,
  fetchCatalogoPublico,
} from '../lib/firestore-service';
import type {
  DocumentoEmitido,
  EvaluacionTramite,
  ResultadoRequisitos,
  Solicitud,
  TipoDocumento,
  TipoIdentificacion,
} from '../types/domain';
import { DocumentoPreviewModal } from './documento-preview-modal';
import { PasarelaPagoModal } from './pasarela-pago-modal';
import { Button } from './ui/button';

export type VentanillaTab = 'solicitar' | 'consultar' | 'validar';

interface VentanillaProps {
  initialTab?: VentanillaTab;
  initialTipoDocId?: string;
  initialCodigo?: string;
}

const ESTADO_LABELS: Record<Solicitud['estado'], { label: string; tone: string }> = {
  pendiente_visto_bueno: {
    label: 'Pendiente visto bueno autoridad (RN5)',
    tone: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  pendiente_pago: {
    label: 'Pendiente pago en Tesorería (RN6)',
    tone: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  listo_expedicion: {
    label: 'Pagado · Listo para expedición',
    tone: 'text-sky-800 bg-sky-50 border-sky-200',
  },
  emitido: {
    label: 'Expedido · Disponible para descarga',
    tone: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  rechazado: {
    label: 'Rechazado por autoridad',
    tone: 'text-red-800 bg-red-50 border-red-200',
  },
  anulado: {
    label: 'Anulado',
    tone: 'text-red-800 bg-red-50 border-red-200',
  },
};

export function Ventanilla({
  initialTab = 'solicitar',
  initialTipoDocId,
  initialCodigo,
}: VentanillaProps) {
  const [tab, setTab] = React.useState<VentanillaTab>(initialTab);
  const [catalogo, setCatalogo] = React.useState<TipoDocumento[]>(TIPOS_DOCUMENTO_INICIALES);

  // Tab 1: Solicitar / Expedir
  const [tipoId, setTipoId] = React.useState<TipoIdentificacion>('CC');
  const [numeroDoc, setNumeroDoc] = React.useState('');
  const [buscandoReq, setBuscandoReq] = React.useState(false);
  const [errorReq, setErrorReq] = React.useState<string | null>(null);
  const [resultadoReq, setResultadoReq] = React.useState<ResultadoRequisitos | null>(null);
  const [tipoSeleccionadoId, setTipoSeleccionadoId] = React.useState<string>(
    initialTipoDocId || 'constancia_pertenencia',
  );
  const [motivo, setMotivo] = React.useState('');
  const [enviandoSol, setEnviandoSol] = React.useState(false);
  const [solicitudCreada, setSolicitudCreada] = React.useState<{
    solicitud: Solicitud;
    documentoEmitido?: DocumentoEmitido;
  } | null>(null);

  // Tab 2: Consultar radicado
  const [modoConsulta, setModoConsulta] = React.useState<'radicado' | 'documento'>('radicado');
  const [radicadoInput, setRadicadoInput] = React.useState('');
  const [consultaTipoId, setConsultaTipoId] = React.useState<TipoIdentificacion>('CC');
  const [consultaNumDoc, setConsultaNumDoc] = React.useState('');
  const [buscandoSol, setBuscandoSol] = React.useState(false);
  const [errorConsulta, setErrorConsulta] = React.useState<string | null>(null);
  const [solicitudesEncontradas, setSolicitudesEncontradas] = React.useState<Solicitud[] | null>(
    null,
  );

  // Tab 3: Validar QR / Código
  const [codigoValidar, setCodigoValidar] = React.useState(initialCodigo || '');
  const [validandoDoc, setValidandoDoc] = React.useState(false);
  const [docValidado, setDocValidado] = React.useState<DocumentoEmitido | null | undefined>(
    undefined,
  );
  const [errorValidar, setErrorValidar] = React.useState<string | null>(null);

  // Modal Preview / PDF y Pasarela de Pago
  const [previewDoc, setPreviewDoc] = React.useState<DocumentoEmitido | null>(null);
  const [solicitudAPagar, setSolicitudAPagar] = React.useState<Solicitud | null>(null);
  const [verifiedDocKeys, setVerifiedDocKeys] = React.useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('pn_ventanilla_verified_keys_v1');
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [recentRadicados, setRecentRadicados] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('pn_ventanilla_radicados_v1');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [desbloqueoSol, setDesbloqueoSol] = React.useState<Solicitud | null>(null);
  const [cedulaDesbloqueo, setCedulaDesbloqueo] = React.useState('');
  const [errorDesbloqueo, setErrorDesbloqueo] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'pn_ventanilla_verified_keys_v1',
        JSON.stringify(verifiedDocKeys),
      );
    } catch {
      // ignore storage quota errors
    }
  }, [verifiedDocKeys]);

  const recordarRadicado = React.useCallback((radicado: string) => {
    setRecentRadicados((prev) => {
      const next = [radicado, ...prev.filter((r) => r !== radicado)].slice(0, 10);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('pn_ventanilla_radicados_v1', JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    fetchCatalogoPublico().then(({ tipos }) => setCatalogo(tipos));
  }, []);

  React.useEffect(() => {
    if (tab === 'consultar' && solicitudesEncontradas === null && recentRadicados.length > 0) {
      void Promise.all(
        recentRadicados.slice(0, 5).map((r) => autoservicioConsultarPorRadicado(r)),
      ).then((items) => {
        const valid = items.filter((s): s is Solicitud => s !== null);
        if (valid.length > 0) {
          setSolicitudesEncontradas(valid);
        }
      });
    }
  }, [tab, solicitudesEncontradas, recentRadicados]);

  React.useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  React.useEffect(() => {
    if (initialTipoDocId) setTipoSeleccionadoId(initialTipoDocId);
  }, [initialTipoDocId]);

  React.useEffect(() => {
    if (initialCodigo) {
      setCodigoValidar(initialCodigo);
      setTab('validar');
      void ejecutarValidacion(initialCodigo);
    }
  }, [initialCodigo]);

  const handleConsultarRequisitos = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorReq(null);
    setSolicitudCreada(null);
    const limpio = numeroDoc.trim();
    if (limpio.length < 4 || limpio.length > 20) {
      setErrorReq('Ingrese un número de documento entre 4 y 20 caracteres (cualquier número).');
      return;
    }

    setBuscandoReq(true);
    try {
      const res = await autoservicioRequisitos(tipoId, limpio, catalogo);
      setResultadoReq(res);
      if (res.encontrado && res.consulta) {
        setVerifiedDocKeys((prev) => ({ ...prev, [res.consulta!.docKey]: true }));
        const primeroElegible = res.evaluaciones.find((ev) => ev.elegible);
        if (
          !res.evaluaciones.some((ev) => ev.tipo.id === tipoSeleccionadoId && ev.elegible) &&
          primeroElegible
        ) {
          setTipoSeleccionadoId(primeroElegible.tipo.id);
        }
      }
    } catch (err) {
      setErrorReq(
        err instanceof Error
          ? 'No fue posible verificar su registro censal en este momento.'
          : 'Error inesperado.',
      );
    } finally {
      setBuscandoReq(false);
    }
  };

  const handleRadicarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resultadoReq?.consulta) return;
    const evalSeleccionada = resultadoReq.evaluaciones.find(
      (ev) => ev.tipo.id === tipoSeleccionadoId,
    );
    if (!evalSeleccionada || !evalSeleccionada.elegible) {
      setErrorReq('Seleccione un trámite disponible según sus requisitos.');
      return;
    }
    if (motivo.trim().length < 5) {
      setErrorReq('Indique brevemente el motivo o entidad destinataria del documento.');
      return;
    }

    setErrorReq(null);
    setEnviandoSol(true);
    try {
      const created = await autoservicioSolicitar({
        consulta: resultadoReq.consulta,
        tipo: evalSeleccionada.tipo,
        motivo,
      });
      recordarRadicado(created.solicitud.radicado);
      setSolicitudCreada(created);
      setMotivo('');
      if (created.documentoEmitido) {
        setPreviewDoc(created.documentoEmitido);
      } else if (created.solicitud.estado === 'pendiente_pago') {
        setSolicitudAPagar(created.solicitud);
      }
    } catch (err) {
      console.error(err);
      setErrorReq(
        'No se pudo radicar la solicitud. Verifique que el catálogo del Cabildo esté inicializado o intente nuevamente.',
      );
    } finally {
      setEnviandoSol(false);
    }
  };

  const handleConsultarSolicitudes = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorConsulta(null);
    setDesbloqueoSol(null);
    setCedulaDesbloqueo('');
    setErrorDesbloqueo(null);
    setBuscandoSol(true);
    try {
      if (modoConsulta === 'radicado') {
        if (!radicadoInput.trim()) {
          setErrorConsulta('Digite el número de radicado (ej. RAD-2026-XXXXXX).');
          setBuscandoSol(false);
          return;
        }
        const sol = await autoservicioConsultarPorRadicado(radicadoInput);
        if (sol) recordarRadicado(sol.radicado);
        setSolicitudesEncontradas(sol ? [sol] : []);
      } else {
        const cleanDoc = consultaNumDoc.trim();
        if (cleanDoc.length < 4 || cleanDoc.length > 20) {
          setErrorConsulta('Digite un número de documento entre 4 y 20 caracteres.');
          setBuscandoSol(false);
          return;
        }
        const lista = await autoservicioConsultarPorDocumento(consultaTipoId, cleanDoc);
        if (lista.length > 0) {
          setVerifiedDocKeys((prev) => ({ ...prev, [lista[0].docKey]: true }));
          lista.slice(0, 5).forEach((s) => recordarRadicado(s.radicado));
        }
        setSolicitudesEncontradas(lista);
      }
    } catch {
      setErrorConsulta('Error consultando solicitudes. Intente nuevamente.');
    } finally {
      setBuscandoSol(false);
    }
  };

  const ejecutarValidacion = async (codigo: string) => {
    const clean = codigo.trim().toUpperCase();
    if (!clean) {
      setErrorValidar('Ingrese el código alfanumérico impreso en el documento.');
      return;
    }
    setErrorValidar(null);
    setValidandoDoc(true);
    try {
      const res = await autoservicioValidarCodigo(clean);
      setDocValidado(res);
    } catch {
      setErrorValidar('No fue posible verificar el código en este momento.');
    } finally {
      setValidandoDoc(false);
    }
  };

  const handleValidarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await ejecutarValidacion(codigoValidar);
  };

  const abrirDocumentoEmitidoPorCodigo = async (codigo: string) => {
    const docData = await autoservicioValidarCodigo(codigo);
    if (docData) {
      setPreviewDoc(docData);
    }
  };

  const handleIntentarDescargar = (sol: Solicitud) => {
    if (!sol.codigo_verificacion) return;
    if (verifiedDocKeys[sol.docKey]) {
      void abrirDocumentoEmitidoPorCodigo(sol.codigo_verificacion);
      return;
    }
    setDesbloqueoSol(sol);
    setCedulaDesbloqueo('');
    setErrorDesbloqueo(null);
  };

  const handleConfirmarCedulaDesbloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desbloqueoSol || !desbloqueoSol.codigo_verificacion) return;
    if (cedulaDesbloqueo.trim() !== desbloqueoSol.numero_documento.trim()) {
      setErrorDesbloqueo(
        'El número de documento no coincide con el titular de esta solicitud.',
      );
      return;
    }
    setVerifiedDocKeys((prev) => ({ ...prev, [desbloqueoSol.docKey]: true }));
    const codigo = desbloqueoSol.codigo_verificacion;
    setDesbloqueoSol(null);
    setCedulaDesbloqueo('');
    setErrorDesbloqueo(null);
    await abrirDocumentoEmitidoPorCodigo(codigo);
  };

  const handlePagoConfirmado = (resultado: {
    reciboNumero: string;
    codigoVerificacion: string;
    documentoEmitido: DocumentoEmitido;
    metodo: 'nequi' | 'pse' | 'tarjeta';
  }) => {
    const pagada = solicitudAPagar;
    setSolicitudAPagar(null);
    if (pagada) {
      setVerifiedDocKeys((prev) => ({ ...prev, [pagada.docKey]: true }));
      const actualizada: Solicitud = {
        ...pagada,
        pagado: true,
        recibo_pago: resultado.reciboNumero,
        estado: 'emitido',
        codigo_verificacion: resultado.codigoVerificacion,
      };
      setSolicitudCreada((prev) =>
        prev && prev.solicitud.radicado === pagada.radicado
          ? { solicitud: actualizada, documentoEmitido: resultado.documentoEmitido }
          : prev,
      );
      setSolicitudesEncontradas((prev) =>
        prev ? prev.map((s) => (s.radicado === pagada.radicado ? actualizada : s)) : prev,
      );
    }
    setPreviewDoc(resultado.documentoEmitido);
  };

  const evaluacionActiva: EvaluacionTramite | undefined = resultadoReq?.evaluaciones.find(
    (ev) => ev.tipo.id === tipoSeleccionadoId,
  );

  const preselectedTipo = initialTipoDocId
    ? catalogo.find((t) => t.id === initialTipoDocId)
    : undefined;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Segmented Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Opciones del Portal Virtual Cabildo Indígena de Pueblo Nuevo"
        className="grid grid-cols-1 border-b bg-muted/50 sm:grid-cols-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'solicitar'}
          onClick={() => setTab('solicitar')}
          className={`flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'solicitar'
              ? 'border-b-2 border-primary bg-card text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span>Solicitar o expedir</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'consultar'}
          onClick={() => setTab('consultar')}
          className={`flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer sm:border-x ${
            tab === 'consultar'
              ? 'border-b-2 border-primary bg-card text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Consultar radicado</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'validar'}
          onClick={() => setTab('validar')}
          className={`flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'validar'
              ? 'border-b-2 border-primary bg-card text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <QrCode className="h-4 w-4 shrink-0" />
          <span>Validar código / QR</span>
        </button>
      </div>

      <div className="p-6 md:p-8">
        {/* TAB 1: SOLICITAR O EXPEDIR */}
        {tab === 'solicitar' && (
          <div>
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Autoservicio directo con su documento
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sin usuario ni contraseña. Validamos en tiempo real su censo activo (RN1),
                  antigüedad de residencia (RN2) y trabajo social (RN4).
                </p>
              </div>
            </div>

            {preselectedTipo && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground">
                    Trámite preseleccionado:{' '}
                    <strong className="font-semibold">{preselectedTipo.nombre}</strong>
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                  {formatCOP(preselectedTipo.tarifa_cop)}
                </span>
              </div>
            )}

            <form
              onSubmit={handleConsultarRequisitos}
              className="mt-5 grid gap-3 sm:grid-cols-[170px_1fr_auto]"
            >
              <div>
                <label
                  htmlFor="req-tipo-doc"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Tipo de documento
                </label>
                <select
                  id="req-tipo-doc"
                  value={tipoId}
                  onChange={(e) => setTipoId(e.target.value as TipoIdentificacion)}
                  className="h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="CC">Cédula (CC)</option>
                  <option value="TI">Tarjeta Identidad (TI)</option>
                  <option value="RC">Registro Civil (RC)</option>
                  <option value="CE">Cédula Extranjería (CE)</option>
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <label htmlFor="req-num-doc" className="font-medium">
                    Número de identificación (4 a 20 caracteres · cualquier número)
                  </label>
                  <span className="font-mono tabular-nums">{numeroDoc.trim().length}/20</span>
                </div>
                <input
                  id="req-num-doc"
                  type="text"
                  inputMode="numeric"
                  maxLength={20}
                  value={numeroDoc}
                  onChange={(e) => setNumeroDoc(e.target.value)}
                  placeholder="Ej. 1061724890 (4 a 20 caracteres)"
                  className="h-11 w-full rounded-lg border bg-background px-3.5 font-mono text-sm text-foreground placeholder:font-sans placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={buscandoReq}>
                  <UserCheck className="h-4 w-4" />
                  {buscandoReq ? 'Validando...' : 'Validar identidad'}
                </Button>
              </div>
            </form>

            {errorReq && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorReq}</span>
              </div>
            )}

            {/* Resultado no encontrado */}
            {resultadoReq && !resultadoReq.encontrado && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-950">
                <p className="font-semibold">
                  No se encontró el documento {tipoId} {numeroDoc} en el censo del resguardo.
                </p>
                <p className="mt-1 text-amber-900/90">
                  Recuerde que la inscripción o actualización censal (RN3) se realiza de forma
                  presencial en la Casa del Cabildo en Pueblo Nuevo, Caldono.
                </p>
              </div>
            )}

            {/* Resultado encontrado */}
            {resultadoReq?.encontrado && resultadoReq.consulta && (
              <div className="mt-6 space-y-6 border-t pt-6">
                {/* Ficha resumen del comunero */}
                <div className="flex flex-col justify-between gap-4 rounded-lg border bg-muted/40 p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Comunero verificado · {resultadoReq.consulta.tipo_documento}{' '}
                      <span className="font-mono tabular-nums">
                        {resultadoReq.consulta.numero_documento}
                      </span>
                    </p>
                    <h3 className="mt-0.5 text-lg font-semibold text-foreground">
                      {resultadoReq.consulta.nombre_completo}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Vereda {resultadoReq.consulta.vereda}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {resultadoReq.diasResidencia} días de residencia continua
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Trabajo social:{' '}
                        {resultadoReq.consulta.trabajo_social_vigente
                          ? 'Vigente último año'
                          : 'Sin constancia reciente'}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {resultadoReq.consulta.estado_censal === 'activo' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Censo activo (RN1)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800">
                        <Lock className="h-3.5 w-3.5" />
                        Estado: {resultadoReq.consulta.estado_censal}
                      </span>
                    )}
                  </div>
                </div>

                {/* Selección de trámite y estado de requisitos */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Seleccione el documento a solicitar
                  </h4>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {resultadoReq.evaluaciones.map((ev) => {
                      const seleccionado = tipoSeleccionadoId === ev.tipo.id;
                      return (
                        <button
                          key={ev.tipo.id}
                          type="button"
                          disabled={!ev.elegible}
                          onClick={() => setTipoSeleccionadoId(ev.tipo.id)}
                          className={`flex flex-col items-start rounded-lg border p-3.5 text-left transition-colors ${
                            !ev.elegible
                              ? 'cursor-not-allowed bg-muted/35 opacity-75'
                              : seleccionado
                                ? 'border-primary bg-primary/5 ring-1 ring-primary cursor-pointer'
                                : 'bg-card hover:bg-muted/40 cursor-pointer'
                          }`}
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {ev.tipo.nombre}
                            </span>
                            <span className="shrink-0 font-mono text-xs font-medium tabular-nums text-foreground">
                              {formatCOP(ev.tipo.tarifa_cop)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="capitalize">{ev.tipo.categoria}</span>
                            {ev.tipo.requiere_visto_bueno && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Requiere visto bueno (RN5)</span>
                              </>
                            )}
                          </div>
                          {ev.elegible ? (
                            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Disponible para solicitud
                            </span>
                          ) : (
                            <div className="mt-2 space-y-1 text-xs text-red-700">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Lock className="h-3.5 w-3.5" />
                                No disponible aún
                              </span>
                              <p className="leading-snug">{ev.motivosBloqueo[0]}</p>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Formulario de radicación si el trámite elegido es elegible */}
                {evaluacionActiva?.elegible && !solicitudCreada && (
                  <form
                    onSubmit={handleRadicarSolicitud}
                    className="space-y-4 rounded-lg border bg-muted/25 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Radicar: {evaluacionActiva.tipo.nombre}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {evaluacionActiva.tipo.tarifa_cop === 0 &&
                          !evaluacionActiva.tipo.requiere_visto_bueno
                            ? 'Trámite gratuito sin visto bueno previo: emisión y descarga PDF inmediata.'
                            : evaluacionActiva.tipo.requiere_visto_bueno
                              ? 'Requiere visto bueno de la Autoridad (RN5) y pago en Tesorería (RN6) tras aprobación.'
                              : 'Generará radicado para pago en Tesorería (RN6) y posterior descarga en línea.'}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums text-primary">
                        {formatCOP(evaluacionActiva.tipo.tarifa_cop)}
                      </span>
                    </div>

                    <div>
                      <label
                        htmlFor="sol-motivo"
                        className="mb-1.5 block text-xs font-medium text-muted-foreground"
                      >
                        Entidad destinataria o motivo del documento
                      </label>
                      <input
                        id="sol-motivo"
                        type="text"
                        required
                        maxLength={280}
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ej. Presentar ante Universidad del Cauca para matrícula 2026-II"
                        className="h-11 w-full rounded-lg border bg-card px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={enviandoSol}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {enviandoSol
                          ? 'Procesando solicitud...'
                          : evaluacionActiva.tipo.tarifa_cop === 0 &&
                              !evaluacionActiva.tipo.requiere_visto_bueno
                            ? 'Expedir y descargar ahora'
                            : 'Generar número de radicado'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Confirmación de radicado o expedición inmediata */}
                {solicitudCreada && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-900">
                          <CheckCircle2 className="h-5 w-5" />
                          <h4 className="font-semibold">
                            {solicitudCreada.documentoEmitido
                              ? 'Documento emitido y liberado con éxito'
                              : 'Solicitud radicada correctamente'}
                          </h4>
                        </div>
                        <p className="mt-1 text-sm text-emerald-950">
                          Número de radicado:{' '}
                          <strong className="font-mono tabular-nums">
                            {solicitudCreada.solicitud.radicado}
                          </strong>
                        </p>
                        <p className="mt-1 text-xs text-emerald-900/90">
                          {solicitudCreada.documentoEmitido
                            ? `Código de verificación QR: ${solicitudCreada.documentoEmitido.codigo_verificacion} · PDF protegido con su cédula.`
                            : solicitudCreada.solicitud.estado === 'pendiente_visto_bueno'
                              ? 'Su aval quedó en turno para visto bueno de la Autoridad Tradicional (RN5). Una vez aprobado, podrá pagarlo en línea.'
                              : `Pendiente de pago (${formatCOP(solicitudCreada.solicitud.tarifa_cop)}). Pague en línea con Nequi, PSE o Tarjeta para liberar su documento al instante.`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {solicitudCreada.solicitud.estado === 'pendiente_pago' && (
                          <Button
                            type="button"
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                            onClick={() => setSolicitudAPagar(solicitudCreada.solicitud)}
                          >
                            <CreditCard className="h-4 w-4" />
                            Pagar en línea (Nequi / PSE / Tarjeta)
                          </Button>
                        )}
                        {solicitudCreada.documentoEmitido && (
                          <Button
                            type="button"
                            onClick={() => setPreviewDoc(solicitudCreada.documentoEmitido!)}
                          >
                            <Download className="h-4 w-4" />
                            Ver y descargar PDF
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSolicitudCreada(null);
                            setRadicadoInput(solicitudCreada.solicitud.radicado);
                            setTab('consultar');
                          }}
                        >
                          Consultar en línea
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONSULTAR RADICADO */}
        {tab === 'consultar' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Consultar estado de solicitudes
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verifique el avance de visto bueno, pago en Tesorería y descargue documentos ya
                  emitidos.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setModoConsulta('radicado')}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                    modoConsulta === 'radicado'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Por radicado
                </button>
                <button
                  type="button"
                  onClick={() => setModoConsulta('documento')}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                    modoConsulta === 'documento'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Por identificación
                </button>
              </div>
            </div>

            <form onSubmit={handleConsultarSolicitudes} className="mt-5 flex flex-col gap-3 sm:flex-row">
              {modoConsulta === 'radicado' ? (
                <div className="flex-1">
                  <label htmlFor="rad-input" className="sr-only">
                    Número de radicado
                  </label>
                  <input
                    id="rad-input"
                    type="text"
                    value={radicadoInput}
                    onChange={(e) => setRadicadoInput(e.target.value)}
                    placeholder="Ej. RAD-2026-A1B2C3"
                    className="h-11 w-full rounded-lg border bg-background px-3.5 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ) : (
                <>
                  <select
                    aria-label="Tipo de documento"
                    value={consultaTipoId}
                    onChange={(e) => setConsultaTipoId(e.target.value as TipoIdentificacion)}
                    className="h-11 rounded-lg border bg-background px-3 text-sm sm:w-44"
                  >
                    <option value="CC">CC</option>
                    <option value="TI">TI</option>
                    <option value="RC">RC</option>
                    <option value="CE">CE</option>
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={20}
                    value={consultaNumDoc}
                    onChange={(e) => setConsultaNumDoc(e.target.value)}
                    placeholder="Número de identificación (4 a 20 caracteres)"
                    className="h-11 flex-1 rounded-lg border bg-background px-3.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </>
              )}
              <Button type="submit" size="lg" disabled={buscandoSol}>
                <Search className="h-4 w-4" />
                {buscandoSol ? 'Buscando...' : 'Consultar'}
              </Button>
            </form>

            {errorConsulta && (
              <p className="mt-3 text-sm text-red-700">{errorConsulta}</p>
            )}

            {solicitudesEncontradas !== null && (
              <div className="mt-6 space-y-3">
                {solicitudesEncontradas.length === 0 ? (
                  <div className="rounded-lg border bg-muted/40 p-5 text-sm text-muted-foreground">
                    No se encontraron solicitudes asociadas a esa búsqueda.
                  </div>
                ) : (
                  solicitudesEncontradas.map((sol) => {
                    const estadoInfo = ESTADO_LABELS[sol.estado];
                    return (
                      <div
                        key={sol.radicado}
                        className="rounded-lg border bg-card p-4"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono font-semibold text-foreground tabular-nums">
                                {sol.radicado}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{formatTimestamp(sol.createdAt)}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {formatCOP(sol.tarifa_cop)}
                              </span>
                            </div>
                            <h3 className="mt-1 font-semibold text-foreground">
                              {sol.tipo_documento_nombre}
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {verifiedDocKeys[sol.docKey]
                                ? `${sol.solicitante_nombre} · ${sol.motivo}`
                                : `Titular verificado por radicado · ${sol.motivo}`}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${estadoInfo.tone}`}
                              >
                                <Clock className="h-3.5 w-3.5" />
                                {estadoInfo.label}
                              </span>
                              {sol.estado === 'emitido' && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Lock className="h-3.5 w-3.5 text-primary" />
                                  Protegido con cédula
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {sol.estado === 'pendiente_pago' && (
                              <Button
                                type="button"
                                className="bg-accent text-accent-foreground hover:bg-accent/90"
                                onClick={() => setSolicitudAPagar(sol)}
                              >
                                <CreditCard className="h-4 w-4" />
                                Pagar en línea
                              </Button>
                            )}
                            {sol.estado === 'emitido' && sol.codigo_verificacion && (
                              <Button
                                type="button"
                                onClick={() => handleIntentarDescargar(sol)}
                              >
                                {verifiedDocKeys[sol.docKey] ? (
                                  <Download className="h-4 w-4" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                                {verifiedDocKeys[sol.docKey]
                                  ? 'Descargar PDF'
                                  : 'Desbloquear con cédula'}
                              </Button>
                            )}
                          </div>
                        </div>

                        {desbloqueoSol?.radicado === sol.radicado && (
                          <form
                            onSubmit={handleConfirmarCedulaDesbloqueo}
                            className="mt-4 flex flex-col gap-2.5 border-t pt-3.5 sm:flex-row sm:items-end"
                          >
                            <div className="flex-1">
                              <label
                                htmlFor={`unlock-${sol.radicado}`}
                                className="mb-1 block text-xs font-medium text-foreground"
                              >
                                Seguridad por cédula: confirme el número de identificación (4 a 20
                                caracteres)
                              </label>
                              <input
                                id={`unlock-${sol.radicado}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={20}
                                required
                                value={cedulaDesbloqueo}
                                onChange={(e) => setCedulaDesbloqueo(e.target.value)}
                                placeholder="Digite el número de documento (4 a 20 caracteres)"
                                className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                              />
                              {errorDesbloqueo && (
                                <p className="mt-1 text-xs text-red-700">{errorDesbloqueo}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setDesbloqueoSol(null)}
                              >
                                Cancelar
                              </Button>
                              <Button type="submit" size="sm">
                                Verificar y abrir PDF
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VALIDAR QR / CÓDIGO */}
        {tab === 'validar' && (
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Verificar autenticidad de documento
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingrese el código alfanumérico ubicado junto al código QR para confirmar si el
              certificado fue expedido por el Cabildo y se encuentra vigente.
            </p>

            <form onSubmit={handleValidarSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label htmlFor="val-codigo" className="sr-only">
                  Código de verificación
                </label>
                <input
                  id="val-codigo"
                  type="text"
                  value={codigoValidar}
                  onChange={(e) => setCodigoValidar(e.target.value)}
                  placeholder="Ej. PN-2026-X7K9M2"
                  className="h-11 w-full rounded-lg border bg-background px-3.5 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <Button type="submit" size="lg" disabled={validandoDoc}>
                <ShieldCheck className="h-4 w-4" />
                {validandoDoc ? 'Verificando...' : 'Verificar documento'}
              </Button>
            </form>

            {errorValidar && <p className="mt-3 text-sm text-red-700">{errorValidar}</p>}

            {docValidado === null && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                No existe ningún documento emitido con el código{' '}
                <strong className="font-mono">{codigoValidar.toUpperCase()}</strong>.
              </div>
            )}

            {docValidado && (
              <div
                className={`mt-6 rounded-lg border p-5 ${
                  docValidado.vigente
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-red-200 bg-red-50/70'
                }`}
              >
                <div>
                  <p
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                      docValidado.vigente ? 'text-emerald-900' : 'text-red-900'
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {docValidado.vigente
                      ? 'Documento oficial auténtico y vigente'
                      : 'Documento anulado — Sin validez'}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">
                    {docValidado.tipo_documento_nombre}
                  </h3>
                  <dl className="mt-3 grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Código de verificación</dt>
                      <dd className="font-mono font-semibold text-foreground tabular-nums">
                        {docValidado.codigo_verificacion}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Radicado</dt>
                      <dd className="font-mono font-medium text-foreground tabular-nums">
                        {docValidado.radicado}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Fecha de expedición</dt>
                      <dd className="font-medium text-foreground tabular-nums">
                        {formatTimestamp(docValidado.fecha_emision)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Estado</dt>
                      <dd
                        className={`font-semibold ${
                          docValidado.vigente ? 'text-emerald-800' : 'text-red-800'
                        }`}
                      >
                        {docValidado.vigente ? 'Vigente' : 'Anulado'}
                      </dd>
                    </div>
                  </dl>
                  {!docValidado.vigente && docValidado.motivo_anulacion && (
                    <p className="mt-3 text-xs text-red-800">
                      Motivo de anulación: {docValidado.motivo_anulacion}
                    </p>
                  )}
                  <p className="mt-4 border-t border-black/10 pt-3 text-xs text-muted-foreground">
                    Por protección de datos personales (Ley 1581 de 2012), esta verificación pública
                    no muestra información del titular.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DocumentoPreviewModal documento={previewDoc} onClose={() => setPreviewDoc(null)} />
      <PasarelaPagoModal
        solicitud={solicitudAPagar}
        onClose={() => setSolicitudAPagar(null)}
        onPagoConfirmado={handlePagoConfirmado}
      />
    </div>
  );
}
