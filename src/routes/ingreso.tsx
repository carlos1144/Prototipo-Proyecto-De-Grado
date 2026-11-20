import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  Lock,
  LogOut,
  Mail,
  Plus,
  Receipt,
  Search,
  Shield,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  CENSO_SEMILLA,
  FUNCIONARIOS_SEMILLA,
  VEREDAS_INICIALES,
  buildDocKey,
  calcularDiasResidencia,
  formatCOP,
  formatTimestamp,
  generarCodigoAleatorio,
} from '@/src/lib/catalog';
import {
  anularDocumento,
  aprobarORechazarVistoBueno,
  cargarDatosSemilla,
  eliminarAutorizacionCorreo,
  expedirDocumentoDesdeSolicitud,
  guardarAutorizacionCorreo,
  guardarFuncionario,
  guardarRegistroCenso,
  listarAuditoria,
  listarAutorizacionesCorreo,
  listarCenso,
  listarFuncionarios,
  listarPagosTesoreria,
  listarSolicitudes,
  listarTrabajoSocial,
  registrarPagoTesoreria,
  registrarTrabajoSocial,
} from '@/src/lib/firestore-service';
import type {
  AccionAuditoria,
  Auditoria,
  AutorizacionCorreo,
  CensoRegistro,
  EstadoCensal,
  Funcionario,
  MetodoPago,
  PagoTesoreria,
  RolFuncionario,
  Solicitud,
  TipoIdentificacion,
  TrabajoSocial,
} from '@/src/types/domain';
import { useFirebaseAuth } from '@/src/components/firebase-provider';
import { Button } from '@/src/components/ui/button';

type StaffSection =
  | 'resumen'
  | 'solicitudes'
  | 'tesoreria'
  | 'censo'
  | 'trabajo_social'
  | 'auditoria'
  | 'funcionarios';

const ROL_LABELS: Record<RolFuncionario, string> = {
  admin: 'Administrador',
  gobernador: 'Gobernador / Autoridad',
  secretario: 'Secretario del Cabildo',
  tesorero: 'Tesorero',
  trabajador_social: 'Trabajador Social',
};

export function Ingreso() {
  const {
    user,
    funcionario,
    authReady,
    authError,
    signingIn,
    iniciarSesionGoogle,
    cerrarSesion,
  } = useFirebaseAuth();

  const [seccion, setSeccion] = React.useState<StaffSection>('resumen');
  const [cargando, setCargando] = React.useState(false);
  const [mensaje, setMensaje] = React.useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  // Modo Revisión Académica (Tutor / Evaluador) persistido en localStorage
  const TUTOR_STORAGE_KEY = 'pn_modo_tutor_state_v1';
  const [modoTutor, setModoTutor] = React.useState(false);
  const [rolTutor, setRolTutor] = React.useState<RolFuncionario>('admin');

  // Datos operativos
  const [censo, setCenso] = React.useState<CensoRegistro[]>([]);
  const [solicitudes, setSolicitudes] = React.useState<Solicitud[]>([]);
  const [pagos, setPagos] = React.useState<PagoTesoreria[]>([]);
  const [trabajos, setTrabajos] = React.useState<TrabajoSocial[]>([]);
  const [auditoria, setAuditoria] = React.useState<Auditoria[]>([]);
  const [funcionarios, setFuncionarios] = React.useState<Funcionario[]>([]);
  const [autorizacionesCorreo, setAutorizacionesCorreo] = React.useState<AutorizacionCorreo[]>([]);

  // Filtros
  const [busquedaCenso, setBusquedaCenso] = React.useState('');
  const [filtroSol, setFiltroSol] = React.useState<string>('todas');
  const [filtroAuditoria, setFiltroAuditoria] = React.useState<string>('TODAS');

  // Formulario Censo presencial (RN3)
  const [censoForm, setCensoForm] = React.useState({
    tipo_documento: 'CC' as TipoIdentificacion,
    numero_documento: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    vereda: VEREDAS_INICIALES[0].nombre,
    fecha_ingreso_censo: new Date().toISOString().slice(0, 10),
    fecha_inicio_residencia: new Date().toISOString().slice(0, 10),
    estado_censal: 'activo' as EstadoCensal,
    cabeza_familia: '',
    telefono: '',
    trabajo_social_vigente: false,
  });

  // Formulario Trabajo Social (RN4)
  const [tsForm, setTsForm] = React.useState({
    docKey: '',
    actividad: '',
    fecha: new Date().toISOString().slice(0, 10),
    horas: 8,
    aprobado: true,
  });

  // Formulario Funcionario (Admin) y Autorización por correo
  const [funcForm, setFuncForm] = React.useState({
    uid: '',
    email: '',
    nombre: '',
    cargo: '',
    rol: 'secretario' as RolFuncionario,
    activo: true,
  });

  const [authEmailForm, setAuthEmailForm] = React.useState({
    email: '',
    nombre: '',
    cargo: 'Tutor / Evaluador Académico',
    rol: 'admin' as RolFuncionario,
  });

  const activarModoTutor = (forzarReinicio = false) => {
    const nowIso = new Date().toISOString();
    const demoCenso: CensoRegistro[] = CENSO_SEMILLA.map((c) => ({
      docKey: buildDocKey(c.tipo_documento, c.numero_documento),
      tipo_documento: c.tipo_documento,
      numero_documento: c.numero_documento,
      nombres: c.nombres,
      apellidos: c.apellidos,
      fecha_nacimiento: c.fecha_nacimiento,
      vereda: c.vereda,
      fecha_ingreso_censo: c.fecha_ingreso_censo,
      fecha_inicio_residencia: c.fecha_inicio_residencia,
      estado_censal: c.estado_censal,
      cabeza_familia: c.cabeza_familia,
      telefono: c.telefono,
      trabajo_social_vigente: c.trabajo_social_vigente,
      fecha_trabajo_social: c.fecha_trabajo_social,
      horas_trabajo_social: c.horas_trabajo_social,
      updatedAt: nowIso,
      updatedBy: 'Modo Revisión Tutor',
    }));

    const demoSolicitudes: Solicitud[] = [
      {
        radicado: 'RAD-2026-DEMO01',
        docKey: 'CC_1061724890',
        tipo_documento_identidad: 'CC',
        numero_documento: '1061724890',
        solicitante_nombre: 'Mateo Ulcué Tunubalá',
        vereda: 'Pueblo Nuevo Centro',
        tipo_documento_id: 'aval_estudio',
        tipo_documento_nombre: 'Aval de estudio',
        categoria: 'aval',
        motivo: 'Renovación beca Fondo Álvaro Ulcué Chocué',
        tarifa_cop: 10000,
        requiere_visto_bueno: true,
        visto_bueno_estado: 'pendiente',
        pagado: false,
        estado: 'pendiente_visto_bueno',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        radicado: 'RAD-2026-DEMO02',
        docKey: 'CC_34567890',
        tipo_documento_identidad: 'CC',
        numero_documento: '34567890',
        solicitante_nombre: 'Lucía Velasco Tombé',
        vereda: 'El Rosal',
        tipo_documento_id: 'certificado_residencia',
        tipo_documento_nombre: 'Certificado de residencia',
        categoria: 'certificado',
        motivo: 'Trámite bancario ante Banco Agrario Caldono',
        tarifa_cop: 8000,
        requiere_visto_bueno: false,
        visto_bueno_estado: 'no_requerido',
        pagado: false,
        estado: 'pendiente_pago',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        radicado: 'RAD-2026-DEMO03',
        docKey: 'CC_1061445210',
        tipo_documento_identidad: 'CC',
        numero_documento: '1061445210',
        solicitante_nombre: 'Carmen Pillimué Dagua',
        vereda: 'Santa Clara',
        tipo_documento_id: 'aval_trabajo',
        tipo_documento_nombre: 'Aval de trabajo',
        categoria: 'aval',
        motivo: 'Contratación IPS Indígena Caldono',
        tarifa_cop: 15000,
        requiere_visto_bueno: true,
        visto_bueno_estado: 'aprobado',
        visto_bueno_por: 'Segundo Alberto Cuchillo Pavi',
        pagado: true,
        recibo_pago: 'REC-2026-DEMO99',
        estado: 'emitido',
        codigo_verificacion: 'PN-2026-DEMO77',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    const demoPagos: PagoTesoreria[] = [
      {
        recibo_numero: 'REC-2026-DEMO99',
        radicado: 'RAD-2026-DEMO03',
        docKey: 'CC_1061445210',
        comunero_nombre: 'Carmen Pillimué Dagua',
        monto_cop: 15000,
        metodo_pago: 'nequi',
        canal_pago: 'pasarela_en_linea',
        referencia_pasarela: 'PAY-2026-NEQUI1',
        tesorero_nombre: 'Pasarela en Línea (NEQUI)',
        fecha_pago: nowIso,
      },
    ];

    const demoTrabajos: TrabajoSocial[] = [
      {
        id: 'TS-2026-DEMO01',
        docKey: 'CC_1061724890',
        comunero_nombre: 'Mateo Ulcué Tunubalá',
        actividad: 'Minga comunitaria de mantenimiento acueducto veredal',
        fecha: '2026-08-18',
        horas: 24,
        aprobado: true,
        registrado_por: 'Diana Marcela Yule Campo',
        createdAt: nowIso,
      },
    ];

    const demoAuditoria: Auditoria[] = [
      {
        id: 'AUD-DEMO-1',
        accion: 'PAGO',
        entidad: 'pagos_tesoreria',
        entidad_id: 'REC-2026-DEMO99',
        actor: 'Carmen Pillimué Dagua',
        rol: 'comunero_pasarela',
        detalle: 'Pago en línea (NEQUI) por $15.000 COP para RAD-2026-DEMO03 (RN6).',
        timestamp: nowIso,
      },
      {
        id: 'AUD-DEMO-2',
        accion: 'EXPEDICION',
        entidad: 'documentos_emitidos',
        entidad_id: 'PN-2026-DEMO77',
        actor: 'Liberación Automática Post-Pago',
        rol: 'sistema',
        detalle: 'Expedición automática con código QR tras pago confirmado.',
        timestamp: nowIso,
      },
    ];

    const demoFuncs: Funcionario[] = [
      {
        uid: 'demo_admin_tutor',
        email: 'tutor@unad.edu.co',
        nombre: 'Tutor Evaluador (Demo)',
        cargo: 'Evaluación Académica UNAD',
        rol: 'admin',
        activo: true,
        updatedAt: nowIso,
      },
      ...FUNCIONARIOS_SEMILLA.map((f) => ({ ...f, updatedAt: nowIso })),
    ];

    if (!forzarReinicio && typeof window !== 'undefined') {
      try {
        const savedRaw = window.localStorage.getItem(TUTOR_STORAGE_KEY);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw) as {
            rolTutor?: RolFuncionario;
            censo?: CensoRegistro[];
            solicitudes?: Solicitud[];
            pagos?: PagoTesoreria[];
            trabajos?: TrabajoSocial[];
            auditoria?: Auditoria[];
            funcionarios?: Funcionario[];
            autorizacionesCorreo?: AutorizacionCorreo[];
          };
          if (saved.censo && saved.censo.length > 0) {
            setCenso(saved.censo);
            setSolicitudes(saved.solicitudes || []);
            setPagos(saved.pagos || []);
            setTrabajos(saved.trabajos || []);
            setAuditoria(saved.auditoria || []);
            setFuncionarios(saved.funcionarios || []);
            setAutorizacionesCorreo(saved.autorizacionesCorreo || []);
            setTsForm((prev) => ({ ...prev, docKey: saved.censo![0].docKey }));
            setRolTutor(saved.rolTutor || 'admin');
            setSeccion('resumen');
            setModoTutor(true);
            setMensaje({
              tipo: 'ok',
              texto:
                'Modo Revisión Académica restaurado con todos sus cambios guardados localmente.',
            });
            return;
          }
        }
      } catch {
        // Fallback to fresh demo seed
      }
    }

    setCenso(demoCenso);
    setSolicitudes(demoSolicitudes);
    setPagos(demoPagos);
    setTrabajos(demoTrabajos);
    setAuditoria(demoAuditoria);
    setFuncionarios(demoFuncs);
    setAutorizacionesCorreo([]);
    setTsForm((prev) => ({ ...prev, docKey: demoCenso[0].docKey }));
    setRolTutor('admin');
    setSeccion('resumen');
    setModoTutor(true);
    setMensaje({
      tipo: 'ok',
      texto:
        'Modo Revisión Académica activo con datos de prueba. Todos los cambios que realice quedarán guardados en este navegador.',
    });
  };

  // Restaurar Modo Revisión si el usuario lo dejó activo antes de recargar
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const activeFlag = window.localStorage.getItem('pn_modo_tutor_activo_v1');
      if (activeFlag === '1') {
        activarModoTutor(false);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar automáticamente cualquier cambio en Modo Revisión
  React.useEffect(() => {
    if (!modoTutor || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('pn_modo_tutor_activo_v1', '1');
      window.localStorage.setItem(
        TUTOR_STORAGE_KEY,
        JSON.stringify({
          rolTutor,
          censo,
          solicitudes,
          pagos,
          trabajos,
          auditoria,
          funcionarios,
          autorizacionesCorreo,
        }),
      );
    } catch {
      // ignore quota error
    }
  }, [
    modoTutor,
    rolTutor,
    censo,
    solicitudes,
    pagos,
    trabajos,
    auditoria,
    funcionarios,
    autorizacionesCorreo,
  ]);

  const autoSeededRef = React.useRef(false);

  const cargarTodo = React.useCallback(async () => {
    if (modoTutor || !funcionario || !funcionario.activo) return;
    setCargando(true);
    try {
      const [censoRes, solRes, pagosRes, tsRes, audRes] = await Promise.all([
        listarCenso(),
        listarSolicitudes(),
        listarPagosTesoreria(),
        listarTrabajoSocial(),
        listarAuditoria(),
      ]);
      setCenso(censoRes);
      setSolicitudes(solRes);
      setPagos(pagosRes);
      setTrabajos(tsRes);
      setAuditoria(audRes);

      if (censoRes.length > 0) {
        setTsForm((prev) => (prev.docKey ? prev : { ...prev, docKey: censoRes[0].docKey }));
      }

      if (funcionario.rol === 'admin') {
        const [funcRes, authEmailsRes] = await Promise.all([
          listarFuncionarios(),
          listarAutorizacionesCorreo(),
        ]);
        setAutorizacionesCorreo(authEmailsRes);
        if (!autoSeededRef.current && (censoRes.length < 30 || funcRes.length < 4)) {
          autoSeededRef.current = true;
          const seedRes = await cargarDatosSemilla(funcionario.nombre);
          const [censoActualizado, funcActualizados, audActualizada] = await Promise.all([
            listarCenso(),
            listarFuncionarios(),
            listarAuditoria(),
          ]);
          setCenso(censoActualizado);
          setFuncionarios(funcActualizados);
          setAuditoria(audActualizada);
          if (censoActualizado.length > 0) {
            setTsForm((prev) =>
              prev.docKey ? prev : { ...prev, docKey: censoActualizado[0].docKey },
            );
          }
          setMensaje({
            tipo: 'ok',
            texto: `Base inicial cargada automáticamente: ${seedRes.comunerosCreados} comuneros en censo, ${seedRes.funcionariosCreados} perfiles de rol, ${seedRes.veredasCreadas} veredas y ${seedRes.tiposCreados} trámites.`,
          });
        } else {
          setFuncionarios(funcRes);
        }
      }
    } catch (err) {
      console.error(err);
      setMensaje({
        tipo: 'err',
        texto: 'Error cargando los registros del Cabildo desde Firestore.',
      });
    } finally {
      setCargando(false);
    }
  }, [funcionario, modoTutor]);

  React.useEffect(() => {
    void cargarTodo();
  }, [cargarTodo]);

  const activeStaff: Funcionario | null = modoTutor
    ? {
        uid: 'demo_tutor',
        email: 'tutor@unad.edu.co',
        nombre: `Tutor Evaluador (${ROL_LABELS[rolTutor]})`,
        cargo: 'Revisión Académica',
        rol: rolTutor,
        activo: true,
        updatedAt: new Date().toISOString(),
      }
    : funcionario;

  const pushDemoAudit = (accion: AccionAuditoria, entidad: string, entidadId: string, detalle: string) => {
    if (!activeStaff) return;
    setAuditoria((prev) => [
      {
        id: `AUD-DEMO-${Date.now()}`,
        accion,
        entidad,
        entidad_id: entidadId,
        actor: activeStaff.nombre,
        rol: activeStaff.rol,
        detalle,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleSeedData = async () => {
    if (!activeStaff) return;
    if (modoTutor) {
      activarModoTutor();
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      const res = await cargarDatosSemilla(activeStaff.nombre);
      setMensaje({
        tipo: 'ok',
        texto: `Datos inicializados: ${res.veredasCreadas} veredas, ${res.tiposCreados} trámites, ${res.comunerosCreados} comuneros en censo y ${res.funcionariosCreados} perfiles de funcionarios por rol.`,
      });
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'No se pudieron cargar los datos semilla.' });
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarCenso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff) return;
    setMensaje(null);

    const numDocClean = censoForm.numero_documento.trim();
    if (numDocClean.length < 4 || numDocClean.length > 20) {
      setMensaje({
        tipo: 'err',
        texto: 'El número de documento debe tener entre 4 y 20 caracteres (cualquier número).',
      });
      return;
    }

    const telClean = censoForm.telefono.replace(/\D/g, '');
    if (telClean.length > 0 && telClean.length !== 10) {
      setMensaje({
        tipo: 'err',
        texto: 'Si ingresa teléfono, debe tener exactamente 10 dígitos (cualquier número).',
      });
      return;
    }

    const formLimpo = {
      ...censoForm,
      numero_documento: numDocClean,
      telefono: telClean,
    };

    if (modoTutor) {
      const docKey = buildDocKey(formLimpo.tipo_documento, formLimpo.numero_documento);
      setCenso((prev) => [
        {
          docKey,
          ...formLimpo,
          updatedAt: new Date().toISOString(),
          updatedBy: activeStaff.nombre,
        },
        ...prev.filter((c) => c.docKey !== docKey),
      ]);
      pushDemoAudit('CENSO_ACTUALIZACION', 'censo', docKey, `Registro censal demo para ${formLimpo.nombres} ${formLimpo.apellidos}.`);
      setMensaje({ tipo: 'ok', texto: 'Registro censal guardado localmente en Modo Revisión (RN3 / RN7).' });
      setCensoForm((prev) => ({
        ...prev,
        numero_documento: '',
        nombres: '',
        apellidos: '',
        cabeza_familia: '',
        telefono: '',
      }));
      return;
    }
    setCargando(true);
    try {
      await guardarRegistroCenso(formLimpo, {
        nombre: activeStaff.nombre,
        rol: activeStaff.rol,
      });
      setMensaje({ tipo: 'ok', texto: 'Registro censal guardado y auditado en Firestore (RN3 / RN7).' });
      setCensoForm((prev) => ({
        ...prev,
        numero_documento: '',
        nombres: '',
        apellidos: '',
        cabeza_familia: '',
        telefono: '',
      }));
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'No fue posible guardar el registro censal.' });
    } finally {
      setCargando(false);
    }
  };

  const handleVistoBueno = async (sol: Solicitud, aprobar: boolean) => {
    if (!activeStaff) return;
    const obs = aprobar
      ? 'Cumple requisitos comunitarios y pertenencia territorial.'
      : 'No cumple criterios de autorización en esta vigencia.';
    if (modoTutor) {
      const nuevoEstado: Solicitud['estado'] = !aprobar
        ? 'rechazado'
        : sol.tarifa_cop > 0 && !sol.pagado
          ? 'pendiente_pago'
          : 'listo_expedicion';
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.radicado === sol.radicado
            ? {
                ...s,
                visto_bueno_estado: aprobar ? 'aprobado' : 'rechazado',
                visto_bueno_por: activeStaff.nombre,
                visto_bueno_observacion: obs,
                estado: nuevoEstado,
              }
            : s,
        ),
      );
      pushDemoAudit(aprobar ? 'VISTO_BUENO' : 'RECHAZO', 'solicitudes', sol.radicado, `${aprobar ? 'Aprobación' : 'Rechazo'} visto bueno demo.`);
      setMensaje({
        tipo: 'ok',
        texto: aprobar ? `Visto bueno aprobado (demo) para ${sol.radicado}.` : `Solicitud ${sol.radicado} rechazada (demo).`,
      });
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await aprobarORechazarVistoBueno({
        solicitud: sol,
        aprobar,
        observacion: obs,
        actor: { nombre: activeStaff.nombre, rol: activeStaff.rol },
      });
      setMensaje({
        tipo: 'ok',
        texto: aprobar
          ? `Visto bueno aprobado para ${sol.radicado}.`
          : `Solicitud ${sol.radicado} rechazada.`,
      });
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'Error procesando el visto bueno (RN5).' });
    } finally {
      setCargando(false);
    }
  };

  const handleRegistrarPago = async (sol: Solicitud, metodo: MetodoPago) => {
    if (!activeStaff) return;
    if (modoTutor) {
      const recibo = generarCodigoAleatorio('REC');
      setPagos((prev) => [
        {
          recibo_numero: recibo,
          radicado: sol.radicado,
          docKey: sol.docKey,
          comunero_nombre: sol.solicitante_nombre,
          monto_cop: sol.tarifa_cop,
          metodo_pago: metodo,
          canal_pago: 'tesoreria_presencial',
          tesorero_nombre: activeStaff.nombre,
          fecha_pago: new Date().toISOString(),
        },
        ...prev,
      ]);
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.radicado === sol.radicado
            ? { ...s, pagado: true, recibo_pago: recibo, estado: 'listo_expedicion' }
            : s,
        ),
      );
      pushDemoAudit('PAGO', 'pagos_tesoreria', recibo, `Pago demo ${recibo} para ${sol.radicado}.`);
      setMensaje({ tipo: 'ok', texto: `Pago demo registrado con recibo ${recibo}.` });
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      const recibo = await registrarPagoTesoreria({
        solicitud: sol,
        metodo_pago: metodo,
        actor: { nombre: activeStaff.nombre, rol: activeStaff.rol },
      });
      setMensaje({
        tipo: 'ok',
        texto: `Pago registrado con recibo ${recibo} para radicado ${sol.radicado} (RN6).`,
      });
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'Error registrando el pago en Tesorería.' });
    } finally {
      setCargando(false);
    }
  };

  const handleExpedir = async (sol: Solicitud) => {
    if (!activeStaff) return;
    if (modoTutor) {
      const codigo = generarCodigoAleatorio('PN');
      setSolicitudes((prev) =>
        prev.map((s) =>
          s.radicado === sol.radicado ? { ...s, estado: 'emitido', codigo_verificacion: codigo } : s,
        ),
      );
      pushDemoAudit('EXPEDICION', 'documentos_emitidos', codigo, `Expedición demo para ${sol.radicado}.`);
      setMensaje({ tipo: 'ok', texto: `Documento demo expedido con código ${codigo}.` });
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      const codigo = await expedirDocumentoDesdeSolicitud({
        solicitud: sol,
        actor: { nombre: activeStaff.nombre, rol: activeStaff.rol },
      });
      setMensaje({
        tipo: 'ok',
        texto: `Documento expedido con código de verificación ${codigo}.`,
      });
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'Error expidiendo el documento.' });
    } finally {
      setCargando(false);
    }
  };

  const handleAnular = async (sol: Solicitud) => {
    if (!activeStaff) return;
    if (modoTutor) {
      setSolicitudes((prev) =>
        prev.map((s) => (s.radicado === sol.radicado ? { ...s, estado: 'anulado' } : s)),
      );
      pushDemoAudit('ANULACION', 'documentos_emitidos', sol.codigo_verificacion || sol.radicado, `Anulación demo de ${sol.radicado}.`);
      setMensaje({ tipo: 'ok', texto: `Radicado ${sol.radicado} anulado en Modo Revisión.` });
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await anularDocumento({
        solicitud: sol,
        motivoAnulacion: 'Anulado por autoridad administrativa del Cabildo.',
        actor: { nombre: activeStaff.nombre, rol: activeStaff.rol },
      });
      setMensaje({ tipo: 'ok', texto: `Radicado ${sol.radicado} anulado en auditoría (RN7).` });
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'Error anulando el documento.' });
    } finally {
      setCargando(false);
    }
  };

  const handleRegistrarTrabajoSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff) return;
    const target = censo.find((c) => c.docKey === tsForm.docKey);
    if (!target) {
      setMensaje({ tipo: 'err', texto: 'Seleccione un comunero del censo.' });
      return;
    }
    if (modoTutor) {
      const id = generarCodigoAleatorio('TS');
      const nombreCompleto = `${target.nombres} ${target.apellidos}`;
      setTrabajos((prev) => [
        {
          id,
          docKey: target.docKey,
          comunero_nombre: nombreCompleto,
          actividad: tsForm.actividad,
          fecha: tsForm.fecha,
          horas: Number(tsForm.horas),
          aprobado: tsForm.aprobado,
          registrado_por: activeStaff.nombre,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      pushDemoAudit('TRABAJO_SOCIAL', 'trabajo_social', id, `Trabajo social demo para ${nombreCompleto}.`);
      setMensaje({ tipo: 'ok', texto: `Trabajo social registrado (demo) para ${nombreCompleto}.` });
      setTsForm((prev) => ({ ...prev, actividad: '' }));
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await registrarTrabajoSocial({
        registroCenso: target,
        actividad: tsForm.actividad,
        fecha: tsForm.fecha,
        horas: Number(tsForm.horas),
        aprobado: tsForm.aprobado,
        actor: { nombre: activeStaff.nombre, rol: activeStaff.rol },
      });
      setMensaje({
        tipo: 'ok',
        texto: `Trabajo social registrado para ${target.nombres} ${target.apellidos} (RN4).`,
      });
      setTsForm((prev) => ({ ...prev, actividad: '' }));
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'Error registrando trabajo social.' });
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modoTutor) {
      setFuncionarios((prev) => [
        { ...funcForm, updatedAt: new Date().toISOString() },
        ...prev.filter((f) => f.uid !== funcForm.uid),
      ]);
      setMensaje({ tipo: 'ok', texto: 'Funcionario guardado en Modo Revisión.' });
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await guardarFuncionario(funcForm);
      setMensaje({ tipo: 'ok', texto: 'Funcionario actualizado correctamente.' });
      setFuncForm({
        uid: '',
        email: '',
        nombre: '',
        cargo: '',
        rol: 'secretario',
        activo: true,
      });
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'No se pudo guardar el perfil del funcionario.' });
    } finally {
      setCargando(false);
    }
  };

  const handleGuardarAutorizacionCorreo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStaff) return;
    if (modoTutor) {
      setAutorizacionesCorreo((prev) => [
        {
          email: authEmailForm.email.toLowerCase(),
          nombre: authEmailForm.nombre,
          cargo: authEmailForm.cargo,
          rol: authEmailForm.rol,
          activo: true,
          autorizado_por: activeStaff.nombre,
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setMensaje({ tipo: 'ok', texto: 'Autorización por correo simulada en Modo Revisión.' });
      return;
    }
    setCargando(true);
    setMensaje(null);
    try {
      await guardarAutorizacionCorreo({
        ...authEmailForm,
        activo: true,
        autorizado_por: activeStaff.nombre,
      });
      setMensaje({
        tipo: 'ok',
        texto: `Correo ${authEmailForm.email.toLowerCase()} autorizado. Ya puede ingresar con Google sin esperar UID.`,
      });
      setAuthEmailForm({
        email: '',
        nombre: '',
        cargo: 'Tutor / Evaluador Académico',
        rol: 'admin',
      });
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'No se pudo autorizar el correo electrónico.' });
    } finally {
      setCargando(false);
    }
  };

  const handleEliminarAutorizacionCorreo = async (email: string) => {
    if (modoTutor) {
      setAutorizacionesCorreo((prev) => prev.filter((a) => a.email !== email));
      return;
    }
    setCargando(true);
    try {
      await eliminarAutorizacionCorreo(email);
      setMensaje({ tipo: 'ok', texto: `Autorización revocada para ${email}.` });
      await cargarTodo();
    } catch {
      setMensaje({ tipo: 'err', texto: 'No se pudo revocar la autorización.' });
    } finally {
      setCargando(false);
    }
  };

  const exportarCensoCsv = () => {
    const headers = [
      'Tipo',
      'Numero',
      'Nombres',
      'Apellidos',
      'Vereda',
      'Estado',
      'InicioResidencia',
      'TrabajoSocialVigente',
    ];
    const rows = censo.map((c) =>
      [
        c.tipo_documento,
        c.numero_documento,
        c.nombres,
        c.apellidos,
        c.vereda,
        c.estado_censal,
        c.fecha_inicio_residencia,
        c.trabajo_social_vigente ? 'SI' : 'NO',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `censo_pueblo_nuevo_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- Pantalla de autenticación ---
  if (!authReady && !modoTutor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Verificando sesión institucional...</p>
      </div>
    );
  }

  if (!modoTutor && (!user || !funcionario || !funcionario.activo)) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link to="/" className="font-display text-lg font-semibold text-primary">
              Resguardo Pueblo Nuevo
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al portal virtual
            </Link>
          </div>
        </header>

        <main className="mx-auto flex max-w-lg flex-col justify-center px-6 py-12">
          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-semibold text-foreground">
              Portal interno de funcionarios
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Acceso institucional para Administrador, Gobernador, Secretaría, Tesorería y Trabajo
              Social. Los comuneros no necesitan ingresar aquí para descargar sus certificados.
            </p>

            {user && !funcionario && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
                La cuenta <strong>{user.email}</strong> aún no tiene autorización activa. Pida al
                Administrador agregar su correo electrónico en el panel o registrar su UID:{' '}
                <span className="font-mono">{user.uid}</span>
              </div>
            )}

            {authError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {authError}
              </div>
            )}

            <div className="mt-6 space-y-3">
              {!user ? (
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={iniciarSesionGoogle}
                  disabled={signingIn}
                >
                  <Shield className="h-4 w-4" />
                  {signingIn ? 'Conectando...' : 'Ingresar con cuenta institucional'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={cerrarSesion}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión ({user.email})
                </Button>
              )}
            </div>

            <div className="mt-6 border-t pt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Evaluación y sustentación de proyecto de grado
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Si un tutor o jurado necesita revisar el panel completo sin crear cuenta ni
                modificar los datos reales del Cabildo, puede ingresar en modo demostración con
                datos de prueba y selector de los 5 roles.
              </p>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="mt-3 w-full"
                onClick={() => activarModoTutor(false)}
              >
                <Eye className="h-4 w-4" />
                Entrar en Modo Revisión (Tutor / Evaluador)
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const currentStaff = activeStaff!;
  const role = currentStaff.rol;
  const puedeCenso = role === 'admin' || role === 'secretario' || role === 'trabajador_social';
  const puedeVistoBueno = role === 'admin' || role === 'gobernador';
  const puedeTesoreria = role === 'admin' || role === 'tesorero';
  const puedeExpedir = role === 'admin' || role === 'secretario' || role === 'gobernador';
  const puedeTrabajoSocial =
    role === 'admin' || role === 'trabajador_social' || role === 'secretario';

  const censoFiltrado = censo.filter((c) => {
    const q = busquedaCenso.trim().toLowerCase();
    if (!q) return true;
    return (
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(q) ||
      c.numero_documento.toLowerCase().includes(q) ||
      c.vereda.toLowerCase().includes(q)
    );
  });

  const solicitudesFiltradas = solicitudes.filter((s) =>
    filtroSol === 'todas' ? true : s.estado === filtroSol,
  );

  const auditoriaFiltrada = auditoria.filter((a) =>
    filtroAuditoria === 'TODAS' ? true : a.accion === filtroAuditoria,
  );

  const totalRecaudado = pagos.reduce((acc, p) => acc + p.monto_cop, 0);
  const pendientesVb = solicitudes.filter((s) => s.estado === 'pendiente_visto_bueno').length;
  const pendientesPago = solicitudes.filter((s) => s.estado === 'pendiente_pago').length;
  const emitidos = solicitudes.filter((s) => s.estado === 'emitido').length;

  const navItems: { id: StaffSection; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { id: 'resumen', label: 'Resumen', icon: <FileSpreadsheet className="h-4 w-4" />, visible: true },
    {
      id: 'solicitudes',
      label: 'Solicitudes y vistos buenos',
      icon: <ClipboardCheck className="h-4 w-4" />,
      visible: true,
    },
    {
      id: 'tesoreria',
      label: 'Tesorería',
      icon: <Receipt className="h-4 w-4" />,
      visible: puedeTesoreria,
    },
    {
      id: 'censo',
      label: 'Censo poblacional',
      icon: <Users className="h-4 w-4" />,
      visible: puedeCenso,
    },
    {
      id: 'trabajo_social',
      label: 'Trabajo social',
      icon: <CheckCircle2 className="h-4 w-4" />,
      visible: puedeTrabajoSocial,
    },
    {
      id: 'auditoria',
      label: 'Auditoría (RN7)',
      icon: <History className="h-4 w-4" />,
      visible: true,
    },
    {
      id: 'funcionarios',
      label: 'Funcionarios',
      icon: <Shield className="h-4 w-4" />,
      visible: role === 'admin',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Banner de Modo Revisión para Tutor */}
      {modoTutor && (
        <div className="border-b border-amber-300 bg-amber-50 px-6 py-2.5 text-xs text-amber-950">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 shrink-0 text-amber-800" />
              <span>
                <strong>Modo Revisión Académica (Tutor):</strong> los cambios que realice se
                guardan en este navegador sin alterar los datos reales de Firestore.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="tutor-rol-select" className="font-medium">
                Simular rol:
              </label>
              <select
                id="tutor-rol-select"
                value={rolTutor}
                onChange={(e) => {
                  setRolTutor(e.target.value as RolFuncionario);
                  setSeccion('resumen');
                }}
                className="h-8 rounded-md border border-amber-300 bg-white px-2.5 text-xs font-medium"
              >
                <option value="admin">Administrador</option>
                <option value="gobernador">Gobernador / Autoridad</option>
                <option value="secretario">Secretario del Cabildo</option>
                <option value="tesorero">Tesorero</option>
                <option value="trabajador_social">Trabajador Social</option>
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-amber-300 bg-white text-xs text-amber-950 hover:bg-amber-100"
                onClick={() => activarModoTutor(true)}
              >
                Restablecer demo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="font-display text-lg font-semibold text-primary whitespace-nowrap shrink-0"
            >
              Resguardo Pueblo Nuevo
            </Link>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {currentStaff.nombre} · {ROL_LABELS[currentStaff.rol]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/">Portal Virtual</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (modoTutor) {
                  if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('pn_modo_tutor_activo_v1');
                  }
                  setModoTutor(false);
                  setMensaje(null);
                } else {
                  void cerrarSesion();
                }
              }}
            >
              <LogOut className="h-4 w-4" />
              {modoTutor ? 'Salir del modo tutor' : 'Salir'}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar Navigation */}
        <aside className="space-y-1">
          {navItems
            .filter((i) => i.visible)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSeccion(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                  seccion === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}

          {role === 'admin' && censo.length < 30 && (
            <div className="mt-4 rounded-lg border bg-card p-3.5 text-xs">
              <p className="font-semibold text-foreground">
                {censo.length === 0 ? 'Base inicial vacía' : `Censo parcial (${censo.length}/30)`}
              </p>
              <p className="mt-1 text-muted-foreground">
                Cargue las 8 veredas, 7 trámites, 30 comuneros de prueba y un funcionario por rol.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-3 w-full"
                onClick={handleSeedData}
                disabled={cargando}
              >
                <Database className="h-3.5 w-3.5" />
                {censo.length === 0 ? 'Cargar 30 comuneros y roles' : 'Sincronizar 30 comuneros'}
              </Button>
            </div>
          )}
        </aside>

        {/* Main Workspace */}
        <main className="min-w-0 space-y-6">
          {mensaje && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                mensaje.tipo === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {mensaje.texto}
            </div>
          )}

          {/* SECCIÓN: RESUMEN Y REPORTES */}
          {seccion === 'resumen' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-foreground">
                    Panel de Gestión del Cabildo
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Control operativo de censo, autorizaciones, tesorería y expedición documental.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {role === 'admin' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSeedData}
                      disabled={cargando}
                    >
                      <Database className="h-4 w-4" />
                      Sincronizar datos semilla
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={exportarCensoCsv}>
                    <Download className="h-4 w-4" />
                    Exportar censo CSV
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-card p-5">
                  <p className="text-xs font-medium text-muted-foreground">Comuneros en censo</p>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
                    {censo.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {censo.filter((c) => c.estado_censal === 'activo').length} activos
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pendientes visto bueno (RN5)
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-amber-700">
                    {pendientesVb}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Avales en espera</p>
                </div>
                <div className="rounded-xl border bg-card p-5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Pendientes pago (RN6)
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
                    {pendientesPago}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    Recaudado: {formatCOP(totalRecaudado)}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-5">
                  <p className="text-xs font-medium text-muted-foreground">Documentos emitidos</p>
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums text-emerald-800">
                    {emitidos}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {auditoria.length} eventos en auditoría
                  </p>
                </div>
              </div>

              {censo.length > 0 && (
                <div className="rounded-xl border bg-card p-5">
                  <h2 className="text-base font-semibold text-foreground">
                    Documentos de prueba cargados en Censo (para verificar el Portal Virtual)
                  </h2>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Identificación</th>
                          <th className="py-2 pr-4 font-medium">Comunero</th>
                          <th className="py-2 pr-4 font-medium">Vereda</th>
                          <th className="py-2 pr-4 font-medium">Estado (RN1)</th>
                          <th className="py-2 pr-4 font-medium">Residencia (RN2)</th>
                          <th className="py-2 font-medium">Trabajo social (RN4)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {censo.slice(0, 8).map((c) => (
                          <tr key={c.docKey}>
                            <td className="py-2.5 pr-4 font-mono tabular-nums">
                              {c.tipo_documento} {c.numero_documento}
                            </td>
                            <td className="py-2.5 pr-4 font-medium">
                              {c.nombres} {c.apellidos}
                            </td>
                            <td className="py-2.5 pr-4">{c.vereda}</td>
                            <td className="py-2.5 pr-4 capitalize">{c.estado_censal}</td>
                            <td className="py-2.5 pr-4 tabular-nums">
                              {calcularDiasResidencia(c.fecha_inicio_residencia)} días
                            </td>
                            <td className="py-2.5">
                              {c.trabajo_social_vigente ? 'Vigente' : 'Sin registro'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECCIÓN: SOLICITUDES Y VISTOS BUENOS */}
          {seccion === 'solicitudes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-2xl font-semibold">
                  Solicitudes y Vistos Buenos (RN5)
                </h1>
                <select
                  aria-label="Filtrar solicitudes por estado"
                  value={filtroSol}
                  onChange={(e) => setFiltroSol(e.target.value)}
                  className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
                >
                  <option value="todas">Todos los estados</option>
                  <option value="pendiente_visto_bueno">Pendiente visto bueno</option>
                  <option value="pendiente_pago">Pendiente pago</option>
                  <option value="listo_expedicion">Listas para expedición</option>
                  <option value="emitido">Emitidas</option>
                  <option value="rechazado">Rechazadas</option>
                  <option value="anulado">Anuladas</option>
                </select>
              </div>

              <div className="divide-y rounded-xl border bg-card">
                {solicitudesFiltradas.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    No hay solicitudes en esta categoría.
                  </p>
                ) : (
                  solicitudesFiltradas.map((sol) => (
                    <div
                      key={sol.radicado}
                      className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono font-semibold text-foreground tabular-nums">
                            {sol.radicado}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{sol.tipo_documento_nombre}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {formatCOP(sol.tarifa_cop)}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {sol.solicitante_nombre} ({sol.tipo_documento_identidad}{' '}
                          {sol.numero_documento}) — Vereda {sol.vereda}
                        </p>
                        <p className="text-xs text-muted-foreground">Motivo: {sol.motivo}</p>
                        <p className="text-xs text-muted-foreground">
                          Estado actual: <strong className="text-foreground">{sol.estado}</strong>
                          {sol.codigo_verificacion && (
                            <span className="ml-2 font-mono">
                              · Código: {sol.codigo_verificacion}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {sol.estado === 'pendiente_visto_bueno' && puedeVistoBueno && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleVistoBueno(sol, true)}
                              disabled={cargando}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Aprobar visto bueno
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => handleVistoBueno(sol, false)}
                              disabled={cargando}
                            >
                              <XCircle className="h-4 w-4" />
                              Rechazar
                            </Button>
                          </>
                        )}

                        {sol.estado === 'listo_expedicion' && puedeExpedir && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleExpedir(sol)}
                            disabled={cargando}
                          >
                            Expedir documento QR
                          </Button>
                        )}

                        {sol.estado === 'emitido' && (role === 'admin' || role === 'gobernador') && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAnular(sol)}
                            disabled={cargando}
                          >
                            Anular documento
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN: TESORERÍA (RN6) */}
          {seccion === 'tesoreria' && puedeTesoreria && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold">
                  Tesorería y Recibos de Pago (RN6)
                </h1>
                <p className="text-sm text-muted-foreground">
                  Registre el recaudo de solicitudes pendientes para habilitar su expedición en
                  línea.
                </p>
              </div>

              <div className="rounded-xl border bg-card">
                <div className="border-b px-5 py-3.5 text-sm font-semibold">
                  Solicitudes pendientes de pago
                </div>
                <div className="divide-y">
                  {solicitudes.filter((s) => s.estado === 'pendiente_pago').length === 0 ? (
                    <p className="p-5 text-sm text-muted-foreground">
                      No hay cobros pendientes en este momento.
                    </p>
                  ) : (
                    solicitudes
                      .filter((s) => s.estado === 'pendiente_pago')
                      .map((sol) => (
                        <div
                          key={sol.radicado}
                          className="flex flex-wrap items-center justify-between gap-4 p-5"
                        >
                          <div>
                            <p className="font-mono text-xs font-semibold tabular-nums">
                              {sol.radicado}
                            </p>
                            <p className="text-sm font-semibold">
                              {sol.solicitante_nombre} — {sol.tipo_documento_nombre}
                            </p>
                            <p className="font-mono text-xs font-semibold text-accent tabular-nums">
                              Valor a pagar: {formatCOP(sol.tarifa_cop)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleRegistrarPago(sol, 'efectivo')}
                              disabled={cargando}
                            >
                              Registrar pago efectivo
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegistrarPago(sol, 'transferencia')}
                              disabled={cargando}
                            >
                              Transferencia
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-sm font-semibold">Historial de recibos emitidos</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-4">Recibo</th>
                        <th className="py-2 pr-4">Radicado</th>
                        <th className="py-2 pr-4">Comunero</th>
                        <th className="py-2 pr-4">Método</th>
                        <th className="py-2 pr-4">Valor</th>
                        <th className="py-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pagos.map((p) => (
                        <tr key={p.recibo_numero}>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">{p.recibo_numero}</td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">{p.radicado}</td>
                          <td className="py-2.5 pr-4">{p.comunero_nombre}</td>
                          <td className="py-2.5 pr-4 capitalize">{p.metodo_pago}</td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">
                            {formatCOP(p.monto_cop)}
                          </td>
                          <td className="py-2.5">{formatTimestamp(p.fecha_pago)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN: CENSO POBLACIONAL (RN1-RN3) */}
          {seccion === 'censo' && puedeCenso && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold">
                  Censo Poblacional Presencial (RN1–RN3)
                </h1>
                <p className="text-sm text-muted-foreground">
                  Inscripción y actualización presencial de comuneros del Resguardo Pueblo Nuevo.
                </p>
              </div>

              <form
                onSubmit={handleGuardarCenso}
                className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-3"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Tipo documento
                  </label>
                  <select
                    value={censoForm.tipo_documento}
                    onChange={(e) =>
                      setCensoForm((p) => ({
                        ...p,
                        tipo_documento: e.target.value as TipoIdentificacion,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="CC">CC</option>
                    <option value="TI">TI</option>
                    <option value="RC">RC</option>
                    <option value="CE">CE</option>
                  </select>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <label className="font-medium">Número documento (4 a 20 car.)</label>
                    <span className="font-mono tabular-nums">
                      {censoForm.numero_documento.trim().length}/20
                    </span>
                  </div>
                  <input
                    required
                    maxLength={20}
                    inputMode="numeric"
                    value={censoForm.numero_documento}
                    onChange={(e) =>
                      setCensoForm((p) => ({ ...p, numero_documento: e.target.value }))
                    }
                    placeholder="Cualquier número (4–20)"
                    className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Estado censal (RN1)
                  </label>
                  <select
                    value={censoForm.estado_censal}
                    onChange={(e) =>
                      setCensoForm((p) => ({
                        ...p,
                        estado_censal: e.target.value as EstadoCensal,
                      }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="trasladado">Trasladado</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nombres
                  </label>
                  <input
                    required
                    value={censoForm.nombres}
                    onChange={(e) => setCensoForm((p) => ({ ...p, nombres: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Apellidos
                  </label>
                  <input
                    required
                    value={censoForm.apellidos}
                    onChange={(e) => setCensoForm((p) => ({ ...p, apellidos: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Vereda
                  </label>
                  <select
                    value={censoForm.vereda}
                    onChange={(e) => setCensoForm((p) => ({ ...p, vereda: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    {VEREDAS_INICIALES.map((v) => (
                      <option key={v.id} value={v.nombre}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <label className="font-medium">Teléfono (10 dígitos · cualquier número)</label>
                    <span className="font-mono tabular-nums">{censoForm.telefono.length}/10</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={censoForm.telefono}
                    onChange={(e) =>
                      setCensoForm((p) => ({
                        ...p,
                        telefono: e.target.value.replace(/\D/g, '').slice(0, 10),
                      }))
                    }
                    placeholder="10 dígitos (opcional)"
                    className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Inicio residencia (RN2)
                  </label>
                  <input
                    type="date"
                    required
                    value={censoForm.fecha_inicio_residencia}
                    onChange={(e) =>
                      setCensoForm((p) => ({ ...p, fecha_inicio_residencia: e.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Fecha ingreso censo
                  </label>
                  <input
                    type="date"
                    required
                    value={censoForm.fecha_ingreso_censo}
                    onChange={(e) =>
                      setCensoForm((p) => ({ ...p, fecha_ingreso_censo: e.target.value }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Cabeza de familia (opcional)
                  </label>
                  <input
                    value={censoForm.cabeza_familia}
                    onChange={(e) =>
                      setCensoForm((p) => ({ ...p, cabeza_familia: e.target.value }))
                    }
                    placeholder="Nombre cabeza de hogar"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    id="censo-ts-vigente"
                    type="checkbox"
                    checked={censoForm.trabajo_social_vigente}
                    onChange={(e) =>
                      setCensoForm((p) => ({ ...p, trabajo_social_vigente: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border"
                  />
                  <label htmlFor="censo-ts-vigente" className="text-xs font-medium text-foreground">
                    Trabajo social vigente último año (RN4)
                  </label>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={cargando}>
                    <Plus className="h-4 w-4" />
                    Guardar en censo
                  </Button>
                </div>
              </form>

              <div className="rounded-xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">Listado censal</h2>
                  <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={busquedaCenso}
                      onChange={(e) => setBusquedaCenso(e.target.value)}
                      placeholder="Buscar por nombre, documento o vereda..."
                      className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-xs"
                    />
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-4">Documento</th>
                        <th className="py-2 pr-4">Nombre completo</th>
                        <th className="py-2 pr-4">Teléfono</th>
                        <th className="py-2 pr-4">Vereda</th>
                        <th className="py-2 pr-4">Estado</th>
                        <th className="py-2 pr-4">Residencia</th>
                        <th className="py-2 pr-4">Trabajo social</th>
                        <th className="py-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {censoFiltrado.map((c) => (
                        <tr key={c.docKey}>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">
                            {c.tipo_documento} {c.numero_documento}
                          </td>
                          <td className="py-2.5 pr-4 font-medium">
                            {c.nombres} {c.apellidos}
                          </td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums text-muted-foreground">
                            {c.telefono || '—'}
                          </td>
                          <td className="py-2.5 pr-4">{c.vereda}</td>
                          <td className="py-2.5 pr-4 capitalize">{c.estado_censal}</td>
                          <td className="py-2.5 pr-4 tabular-nums">
                            {calcularDiasResidencia(c.fecha_inicio_residencia)} días
                          </td>
                          <td className="py-2.5 pr-4">
                            {c.trabajo_social_vigente ? 'Aprobado' : 'Pendiente'}
                          </td>
                          <td className="py-2.5 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setCensoForm({
                                  tipo_documento: c.tipo_documento,
                                  numero_documento: c.numero_documento,
                                  nombres: c.nombres,
                                  apellidos: c.apellidos,
                                  fecha_nacimiento: c.fecha_nacimiento || '',
                                  vereda: c.vereda,
                                  fecha_ingreso_censo: c.fecha_ingreso_censo,
                                  fecha_inicio_residencia: c.fecha_inicio_residencia,
                                  estado_censal: c.estado_censal,
                                  cabeza_familia: c.cabeza_familia || '',
                                  telefono: c.telefono || '',
                                  trabajo_social_vigente: c.trabajo_social_vigente,
                                })
                              }
                            >
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN: TRABAJO SOCIAL (RN4) */}
          {seccion === 'trabajo_social' && puedeTrabajoSocial && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold">
                  Trabajo Social Comunitario (RN4)
                </h1>
                <p className="text-sm text-muted-foreground">
                  Certifique la participación en mingas y trabajo comunitario requerida para avales
                  de estudio y trabajo.
                </p>
              </div>

              <form
                onSubmit={handleRegistrarTrabajoSocial}
                className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-4"
              >
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Comunero
                  </label>
                  <select
                    value={tsForm.docKey}
                    onChange={(e) => setTsForm((p) => ({ ...p, docKey: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    {censo.map((c) => (
                      <option key={c.docKey} value={c.docKey}>
                        {c.nombres} {c.apellidos} ({c.tipo_documento} {c.numero_documento})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={tsForm.fecha}
                    onChange={(e) => setTsForm((p) => ({ ...p, fecha: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Horas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={tsForm.horas}
                    onChange={(e) => setTsForm((p) => ({ ...p, horas: Number(e.target.value) }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Actividad comunitaria / Minga
                  </label>
                  <input
                    required
                    value={tsForm.actividad}
                    onChange={(e) => setTsForm((p) => ({ ...p, actividad: e.target.value }))}
                    placeholder="Ej. Minga de mantenimiento acueducto veredal y asamblea general"
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={cargando}>
                    Registrar y aprobar
                  </Button>
                </div>
              </form>

              <div className="rounded-xl border bg-card p-5">
                <h2 className="text-sm font-semibold">Bitácora de trabajo social</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-4">Fecha</th>
                        <th className="py-2 pr-4">Comunero</th>
                        <th className="py-2 pr-4">Actividad</th>
                        <th className="py-2 pr-4">Horas</th>
                        <th className="py-2">Registrado por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {trabajos.map((t) => (
                        <tr key={t.id}>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">{t.fecha}</td>
                          <td className="py-2.5 pr-4 font-medium">{t.comunero_nombre}</td>
                          <td className="py-2.5 pr-4">{t.actividad}</td>
                          <td className="py-2.5 pr-4 font-mono tabular-nums">{t.horas}h</td>
                          <td className="py-2.5">{t.registrado_por}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN: AUDITORÍA INMUTABLE (RN7) */}
          {seccion === 'auditoria' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-2xl font-semibold">
                    Bitácora Inmutable de Auditoría (RN7)
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Registro append-only protegido por reglas de seguridad: no admite edición ni
                    eliminación.
                  </p>
                </div>
                <select
                  aria-label="Filtrar eventos de auditoría"
                  value={filtroAuditoria}
                  onChange={(e) => setFiltroAuditoria(e.target.value)}
                  className="h-9 rounded-lg border bg-card px-3 text-xs font-medium"
                >
                  <option value="TODAS">Todas las acciones</option>
                  <option value="SOLICITUD">Solicitudes</option>
                  <option value="VISTO_BUENO">Vistos buenos</option>
                  <option value="PAGO">Pagos Tesorería</option>
                  <option value="EXPEDICION">Expediciones</option>
                  <option value="ANULACION">Anulaciones</option>
                  <option value="CENSO_ACTUALIZACION">Censo</option>
                  <option value="TRABAJO_SOCIAL">Trabajo social</option>
                </select>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-4">Fecha / Hora</th>
                        <th className="py-2 pr-4">Acción</th>
                        <th className="py-2 pr-4">Actor (Rol)</th>
                        <th className="py-2 pr-4">Entidad</th>
                        <th className="py-2">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {auditoriaFiltrada.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                            {formatTimestamp(a.timestamp)}
                          </td>
                          <td className="py-2.5 pr-4 font-mono font-semibold">{a.accion}</td>
                          <td className="py-2.5 pr-4">
                            {a.actor} <span className="text-muted-foreground">({a.rol})</span>
                          </td>
                          <td className="py-2.5 pr-4 font-mono">{a.entidad_id}</td>
                          <td className="py-2.5 text-muted-foreground">{a.detalle}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECCIÓN: FUNCIONARIOS (ADMIN) */}
          {seccion === 'funcionarios' && role === 'admin' && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-semibold">
                  Funcionarios y Roles del Cabildo
                </h1>
                <p className="text-sm text-muted-foreground">
                  Autorice nuevos funcionarios o tutores directamente con su correo Google (sin
                  necesidad de pedirles UID) o gestione perfiles existentes.
                </p>
              </div>

              {/* Autorizar por correo sin esperar UID */}
              <div className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">
                    Autorizar acceso por correo electrónico (Recomendado)
                  </h2>
                </div>
                <p className="mb-4 text-xs text-muted-foreground">
                  Escriba el correo de Google de su tutor u otro funcionario del Cabildo. En cuanto
                  inicie sesión en el portal, su cuenta quedará activa automáticamente con el rol
                  asignado.
                </p>

                <form
                  onSubmit={handleGuardarAutorizacionCorreo}
                  className="grid gap-3 md:grid-cols-4"
                >
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Correo Google a autorizar
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmailForm.email}
                      onChange={(e) =>
                        setAuthEmailForm((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="tutor@unad.edu.co"
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Nombre completo
                    </label>
                    <input
                      required
                      value={authEmailForm.nombre}
                      onChange={(e) =>
                        setAuthEmailForm((p) => ({ ...p, nombre: e.target.value }))
                      }
                      placeholder="Nombre del tutor o funcionario"
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Cargo
                    </label>
                    <input
                      required
                      value={authEmailForm.cargo}
                      onChange={(e) =>
                        setAuthEmailForm((p) => ({ ...p, cargo: e.target.value }))
                      }
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Rol
                      </label>
                      <select
                        value={authEmailForm.rol}
                        onChange={(e) =>
                          setAuthEmailForm((p) => ({
                            ...p,
                            rol: e.target.value as RolFuncionario,
                          }))
                        }
                        className="h-10 w-full rounded-lg border bg-background px-2.5 text-sm"
                      >
                        <option value="admin">Administrador</option>
                        <option value="gobernador">Gobernador</option>
                        <option value="secretario">Secretario</option>
                        <option value="tesorero">Tesorero</option>
                        <option value="trabajador_social">Trabajador Social</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={cargando}>
                        Autorizar
                      </Button>
                    </div>
                  </div>
                </form>

                {autorizacionesCorreo.length > 0 && (
                  <div className="mt-4 overflow-x-auto border-t pt-3">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-2 pr-4">Correo autorizado</th>
                          <th className="py-2 pr-4">Nombre</th>
                          <th className="py-2 pr-4">Cargo</th>
                          <th className="py-2 pr-4">Rol</th>
                          <th className="py-2 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {autorizacionesCorreo.map((a) => (
                          <tr key={a.email}>
                            <td className="py-2 pr-4 font-mono">{a.email}</td>
                            <td className="py-2 pr-4 font-medium">{a.nombre}</td>
                            <td className="py-2 pr-4">{a.cargo}</td>
                            <td className="py-2 pr-4">{ROL_LABELS[a.rol]}</td>
                            <td className="py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEliminarAutorizacionCorreo(a.email)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-700" />
                                Revocar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <form
                onSubmit={handleGuardarFuncionario}
                className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-3"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    UID de Firebase Auth
                  </label>
                  <input
                    required
                    value={funcForm.uid}
                    onChange={(e) => setFuncForm((p) => ({ ...p, uid: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={funcForm.email}
                    onChange={(e) => setFuncForm((p) => ({ ...p, email: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nombre completo
                  </label>
                  <input
                    required
                    value={funcForm.nombre}
                    onChange={(e) => setFuncForm((p) => ({ ...p, nombre: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Cargo
                  </label>
                  <input
                    required
                    value={funcForm.cargo}
                    onChange={(e) => setFuncForm((p) => ({ ...p, cargo: e.target.value }))}
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Rol
                  </label>
                  <select
                    value={funcForm.rol}
                    onChange={(e) =>
                      setFuncForm((p) => ({ ...p, rol: e.target.value as RolFuncionario }))
                    }
                    className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                  >
                    <option value="secretario">Secretario</option>
                    <option value="gobernador">Gobernador</option>
                    <option value="tesorero">Tesorero</option>
                    <option value="trabajador_social">Trabajador Social</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={cargando}>
                    Guardar funcionario
                  </Button>
                </div>
              </form>

              <div className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Nota: Para que otro usuario real ingrese con su cuenta Google, debe iniciar
                    sesión una vez para obtener su UID real y luego registrarlo o reemplazar el UID
                    en esta tabla.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-4">UID</th>
                        <th className="py-2 pr-4">Nombre</th>
                        <th className="py-2 pr-4">Correo</th>
                        <th className="py-2 pr-4">Cargo</th>
                        <th className="py-2 pr-4">Rol</th>
                        <th className="py-2 pr-4">Estado</th>
                        <th className="py-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {funcionarios.map((f) => (
                        <tr key={f.uid}>
                          <td className="py-2.5 pr-4 font-mono text-[11px] text-muted-foreground">
                            {f.uid}
                          </td>
                          <td className="py-2.5 pr-4 font-medium">{f.nombre}</td>
                          <td className="py-2.5 pr-4">{f.email}</td>
                          <td className="py-2.5 pr-4">{f.cargo}</td>
                          <td className="py-2.5 pr-4">{ROL_LABELS[f.rol]}</td>
                          <td className="py-2.5 pr-4">{f.activo ? 'Activo' : 'Inactivo'}</td>
                          <td className="py-2.5 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setFuncForm({
                                  uid: f.uid,
                                  email: f.email,
                                  nombre: f.nombre,
                                  cargo: f.cargo,
                                  rol: f.rol,
                                  activo: f.activo,
                                })
                              }
                            >
                              Cargar en formulario
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
