import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  CENSO_SEMILLA,
  FUNCIONARIOS_SEMILLA,
  TIPOS_DOCUMENTO_INICIALES,
  VEREDAS_INICIALES,
  buildDocKey,
  calcularDiasResidencia,
  evaluarRequisitosParaDocumento,
  generarCodigoAleatorio,
} from './catalog';
import { OperationType, db, handleFirestoreError } from './firebase';
import type {
  AccionAuditoria,
  Auditoria,
  AutorizacionCorreo,
  CensoConsultaPublica,
  CensoRegistro,
  DocumentoEmitido,
  EstadoCensal,
  Funcionario,
  MetodoPago,
  PagoTesoreria,
  ResultadoRequisitos,
  RolFuncionario,
  Solicitud,
  TipoDocumento,
  TipoIdentificacion,
  TrabajoSocial,
  Vereda,
} from '../types/domain';

function buildAuditId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AUD-${Date.now()}-${prefix}-${rand}`;
}

export async function fetchCatalogoPublico(): Promise<{
  tipos: TipoDocumento[];
  veredas: Vereda[];
  desdeFirestore: boolean;
}> {
  try {
    const [tiposSnap, veredasSnap] = await Promise.all([
      getDocs(query(collection(db, 'tipos_documento'), orderBy('orden', 'asc'))),
      getDocs(collection(db, 'veredas')),
    ]);

    const tipos = tiposSnap.docs.map((d) => d.data() as TipoDocumento);
    const veredas = veredasSnap.docs.map((d) => d.data() as Vereda);

    if (tipos.length === 0 || veredas.length === 0) {
      return {
        tipos: tipos.length > 0 ? tipos : TIPOS_DOCUMENTO_INICIALES,
        veredas: veredas.length > 0 ? veredas : VEREDAS_INICIALES,
        desdeFirestore: false,
      };
    }

    return { tipos, veredas, desdeFirestore: true };
  } catch (error) {
    console.warn('No se pudo cargar catálogo desde Firestore, usando catálogo base:', error);
    return {
      tipos: TIPOS_DOCUMENTO_INICIALES,
      veredas: VEREDAS_INICIALES,
      desdeFirestore: false,
    };
  }
}

export async function autoservicioRequisitos(
  tipoIdentificacion: TipoIdentificacion,
  numeroDocumento: string,
  tiposCatalogo: TipoDocumento[],
): Promise<ResultadoRequisitos> {
  const docKey = buildDocKey(tipoIdentificacion, numeroDocumento);
  const path = `censo_consultas/${docKey}`;
  try {
    const snap = await getDoc(doc(db, 'censo_consultas', docKey));
    if (!snap.exists()) {
      return {
        encontrado: false,
        consulta: null,
        diasResidencia: 0,
        evaluaciones: [],
      };
    }

    const consulta = snap.data() as CensoConsultaPublica;
    const diasResidencia = calcularDiasResidencia(consulta.fecha_inicio_residencia);
    const evaluaciones = tiposCatalogo
      .filter((t) => t.activo)
      .map((tipo) => evaluarRequisitosParaDocumento(consulta, tipo));

    return {
      encontrado: true,
      consulta,
      diasResidencia,
      evaluaciones,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function autoservicioSolicitar(params: {
  consulta: CensoConsultaPublica;
  tipo: TipoDocumento;
  motivo: string;
}): Promise<{ solicitud: Solicitud; documentoEmitido?: DocumentoEmitido }> {
  const { consulta, tipo, motivo } = params;
  const radicado = generarCodigoAleatorio('RAD');
  const esEmisionInmediata = tipo.tarifa_cop === 0 && !tipo.requiere_visto_bueno;
  const codigoVerificacion = esEmisionInmediata ? generarCodigoAleatorio('PN') : undefined;

  let estadoInicial: Solicitud['estado'] = 'pendiente_pago';
  if (tipo.requiere_visto_bueno) {
    estadoInicial = 'pendiente_visto_bueno';
  } else if (esEmisionInmediata) {
    estadoInicial = 'emitido';
  }

  const solicitudData: Record<string, unknown> = {
    radicado,
    docKey: consulta.docKey,
    tipo_documento_identidad: consulta.tipo_documento,
    numero_documento: consulta.numero_documento,
    solicitante_nombre: consulta.nombre_completo,
    vereda: consulta.vereda,
    tipo_documento_id: tipo.id,
    tipo_documento_nombre: tipo.nombre,
    categoria: tipo.categoria,
    motivo: motivo.trim(),
    tarifa_cop: tipo.tarifa_cop,
    requiere_visto_bueno: tipo.requiere_visto_bueno,
    visto_bueno_estado: tipo.requiere_visto_bueno ? 'pendiente' : 'no_requerido',
    pagado: tipo.tarifa_cop === 0 && !tipo.requiere_visto_bueno,
    estado: estadoInicial,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (codigoVerificacion) {
    solicitudData.codigo_verificacion = codigoVerificacion;
  }

  try {
    // Check existing radicados index
    const indexRef = doc(db, 'radicados_por_documento', consulta.docKey);
    const indexSnap = await getDoc(indexRef);
    const prevRadicados: string[] = indexSnap.exists()
      ? ((indexSnap.data().radicados as string[]) || [])
      : [];
    const nextRadicados = [radicado, ...prevRadicados].slice(0, 50);

    const batch = writeBatch(db);
    batch.set(doc(db, 'solicitudes', radicado), solicitudData);
    batch.set(indexRef, {
      docKey: consulta.docKey,
      radicados: nextRadicados,
      updatedAt: serverTimestamp(),
    });

    const auditSolicitudId = buildAuditId('SOL');
    batch.set(doc(db, 'auditoria', auditSolicitudId), {
      id: auditSolicitudId,
      accion: 'SOLICITUD' as AccionAuditoria,
      entidad: 'solicitudes',
      entidad_id: radicado,
      actor: consulta.nombre_completo,
      rol: 'comunero_autoservicio',
      detalle: `Radicación de ${tipo.nombre} (${consulta.docKey}). Motivo: ${motivo.trim()}`,
      timestamp: serverTimestamp(),
    });

    let documentoEmitido: DocumentoEmitido | undefined;
    if (esEmisionInmediata && codigoVerificacion) {
      const docPayload = {
        codigo_verificacion: codigoVerificacion,
        radicado,
        docKey: consulta.docKey,
        solicitante_nombre: consulta.nombre_completo,
        tipo_documento_identidad: consulta.tipo_documento,
        numero_documento: consulta.numero_documento,
        vereda: consulta.vereda,
        tipo_documento_id: tipo.id,
        tipo_documento_nombre: tipo.nombre,
        categoria: tipo.categoria,
        motivo: motivo.trim(),
        tarifa_cop: 0,
        autoridad_firmante: 'Secretaría General — Cabildo Indígena Pueblo Nuevo',
        fecha_emision: serverTimestamp(),
        vigente: true,
      };
      batch.set(doc(db, 'documentos_emitidos', codigoVerificacion), docPayload);

      const auditExpId = buildAuditId('EXP');
      batch.set(doc(db, 'auditoria', auditExpId), {
        id: auditExpId,
        accion: 'EXPEDICION' as AccionAuditoria,
        entidad: 'documentos_emitidos',
        entidad_id: codigoVerificacion,
        actor: 'Ventanilla Virtual (Automática)',
        rol: 'sistema',
        detalle: `Expedición inmediata gratuita de ${tipo.nombre} para ${consulta.docKey} (Radicado ${radicado}).`,
        timestamp: serverTimestamp(),
      });

      documentoEmitido = {
        ...docPayload,
        fecha_emision: new Date().toISOString(),
      };
    }

    await batch.commit();

    const createdSnap = await getDoc(doc(db, 'solicitudes', radicado));
    const createdSolicitud = (createdSnap.exists()
      ? createdSnap.data()
      : solicitudData) as Solicitud;

    return {
      solicitud: createdSolicitud,
      documentoEmitido,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `solicitudes/${radicado}`);
  }
}

export async function autoservicioConsultarPorRadicado(
  radicado: string,
): Promise<Solicitud | null> {
  const cleanRad = radicado.trim().toUpperCase();
  if (!cleanRad) return null;
  try {
    const snap = await getDoc(doc(db, 'solicitudes', cleanRad));
    return snap.exists() ? (snap.data() as Solicitud) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `solicitudes/${cleanRad}`);
  }
}

export async function autoservicioConsultarPorDocumento(
  tipoIdentificacion: TipoIdentificacion,
  numeroDocumento: string,
): Promise<Solicitud[]> {
  const docKey = buildDocKey(tipoIdentificacion, numeroDocumento);
  try {
    const indexSnap = await getDoc(doc(db, 'radicados_por_documento', docKey));
    if (!indexSnap.exists()) return [];
    const radicados = (indexSnap.data().radicados as string[]) || [];
    const results = await Promise.all(
      radicados.slice(0, 25).map(async (rad) => {
        const s = await getDoc(doc(db, 'solicitudes', rad));
        return s.exists() ? (s.data() as Solicitud) : null;
      }),
    );
    return results.filter((s): s is Solicitud => s !== null);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `radicados_por_documento/${docKey}`);
  }
}

export async function autoservicioValidarCodigo(
  codigo: string,
): Promise<DocumentoEmitido | null> {
  const cleanCode = codigo.trim().toUpperCase();
  if (!cleanCode) return null;
  try {
    const snap = await getDoc(doc(db, 'documentos_emitidos', cleanCode));
    return snap.exists() ? (snap.data() as DocumentoEmitido) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `documentos_emitidos/${cleanCode}`);
  }
}

// --- Staff & Admin Services ---

export async function obtenerOCrearPerfilFuncionario(user: User): Promise<Funcionario | null> {
  const ref = doc(db, 'funcionarios', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as Funcionario;
    }

    const emailNorm = user.email?.toLowerCase().trim();

    if (emailNorm === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
      const adminProfile: Funcionario = {
        uid: user.uid,
        email: user.email || BOOTSTRAPPED_ADMIN_EMAIL,
        nombre: user.displayName || 'Administrador Cabildo',
        cargo: 'Administrador del Sistema / Secretaría',
        rol: 'admin',
        activo: true,
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, adminProfile);
      return adminProfile;
    }

    if (emailNorm) {
      const authSnap = await getDoc(doc(db, 'autorizaciones_correo', emailNorm));
      if (authSnap.exists()) {
        const authData = authSnap.data() as AutorizacionCorreo;
        if (authData.activo) {
          const staffProfile: Funcionario = {
            uid: user.uid,
            email: emailNorm,
            nombre: authData.nombre || user.displayName || 'Funcionario Cabildo',
            cargo: authData.cargo || 'Funcionario Autorizado',
            rol: authData.rol,
            activo: true,
            updatedAt: serverTimestamp(),
          };
          await setDoc(ref, staffProfile);
          return staffProfile;
        }
      }
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `funcionarios/${user.uid}`);
  }
}

export async function cargarDatosSemilla(actorNombre: string): Promise<{
  veredasCreadas: number;
  tiposCreados: number;
  comunerosCreados: number;
  funcionariosCreados: number;
}> {
  try {
    const batch = writeBatch(db);

    for (const v of VEREDAS_INICIALES) {
      batch.set(doc(db, 'veredas', v.id), v);
    }

    for (const t of TIPOS_DOCUMENTO_INICIALES) {
      batch.set(doc(db, 'tipos_documento', t.id), t);
    }

    for (const c of CENSO_SEMILLA) {
      const docKey = buildDocKey(c.tipo_documento, c.numero_documento);
      const registro: Record<string, unknown> = {
        docKey,
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
        horas_trabajo_social: c.horas_trabajo_social ?? 0,
        updatedAt: serverTimestamp(),
        updatedBy: actorNombre,
      };
      if (c.fecha_trabajo_social) {
        registro.fecha_trabajo_social = c.fecha_trabajo_social;
      }

      const consulta: Record<string, unknown> = {
        docKey,
        tipo_documento: c.tipo_documento,
        numero_documento: c.numero_documento,
        nombre_completo: `${c.nombres} ${c.apellidos}`.trim(),
        vereda: c.vereda,
        fecha_inicio_residencia: c.fecha_inicio_residencia,
        estado_censal: c.estado_censal,
        trabajo_social_vigente: c.trabajo_social_vigente,
        updatedAt: serverTimestamp(),
      };
      if (c.fecha_trabajo_social) {
        consulta.fecha_trabajo_social = c.fecha_trabajo_social;
      }

      batch.set(doc(db, 'censo', docKey), registro);
      batch.set(doc(db, 'censo_consultas', docKey), consulta);
    }

    for (const f of FUNCIONARIOS_SEMILLA) {
      batch.set(doc(db, 'funcionarios', f.uid), {
        uid: f.uid,
        email: f.email,
        nombre: f.nombre,
        cargo: f.cargo,
        rol: f.rol,
        activo: f.activo,
        updatedAt: serverTimestamp(),
      });
    }

    const auditId = buildAuditId('SEED');
    batch.set(doc(db, 'auditoria', auditId), {
      id: auditId,
      accion: 'CENSO_ACTUALIZACION' as AccionAuditoria,
      entidad: 'sistema',
      entidad_id: 'catalogo_y_censo_inicial',
      actor: actorNombre,
      rol: 'admin',
      detalle: `Inicialización de ${VEREDAS_INICIALES.length} veredas, ${TIPOS_DOCUMENTO_INICIALES.length} trámites, ${CENSO_SEMILLA.length} registros censales y ${FUNCIONARIOS_SEMILLA.length} perfiles base de funcionarios.`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();

    return {
      veredasCreadas: VEREDAS_INICIALES.length,
      tiposCreados: TIPOS_DOCUMENTO_INICIALES.length,
      comunerosCreados: CENSO_SEMILLA.length,
      funcionariosCreados: FUNCIONARIOS_SEMILLA.length,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'censo/seed');
  }
}

export async function listarCenso(): Promise<CensoRegistro[]> {
  try {
    const snap = await getDocs(collection(db, 'censo'));
    return snap.docs.map((d) => d.data() as CensoRegistro);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'censo');
  }
}

export async function guardarRegistroCenso(
  datos: {
    tipo_documento: TipoIdentificacion;
    numero_documento: string;
    nombres: string;
    apellidos: string;
    fecha_nacimiento?: string;
    vereda: string;
    fecha_ingreso_censo: string;
    fecha_inicio_residencia: string;
    estado_censal: EstadoCensal;
    cabeza_familia?: string;
    telefono?: string;
    trabajo_social_vigente: boolean;
    fecha_trabajo_social?: string;
    horas_trabajo_social?: number;
  },
  actor: { nombre: string; rol: string },
): Promise<void> {
  const docKey = buildDocKey(datos.tipo_documento, datos.numero_documento);
  try {
    const batch = writeBatch(db);
    const registro: Record<string, unknown> = {
      docKey,
      tipo_documento: datos.tipo_documento,
      numero_documento: datos.numero_documento.trim(),
      nombres: datos.nombres.trim(),
      apellidos: datos.apellidos.trim(),
      vereda: datos.vereda,
      fecha_ingreso_censo: datos.fecha_ingreso_censo,
      fecha_inicio_residencia: datos.fecha_inicio_residencia,
      estado_censal: datos.estado_censal,
      trabajo_social_vigente: datos.trabajo_social_vigente,
      horas_trabajo_social: datos.horas_trabajo_social ?? 0,
      updatedAt: serverTimestamp(),
      updatedBy: actor.nombre,
    };
    if (datos.fecha_nacimiento?.trim()) registro.fecha_nacimiento = datos.fecha_nacimiento.trim();
    if (datos.cabeza_familia?.trim()) registro.cabeza_familia = datos.cabeza_familia.trim();
    if (datos.telefono?.trim()) registro.telefono = datos.telefono.trim();
    if (datos.fecha_trabajo_social?.trim()) {
      registro.fecha_trabajo_social = datos.fecha_trabajo_social.trim();
    }

    const consulta: Record<string, unknown> = {
      docKey,
      tipo_documento: datos.tipo_documento,
      numero_documento: datos.numero_documento.trim(),
      nombre_completo: `${datos.nombres.trim()} ${datos.apellidos.trim()}`,
      vereda: datos.vereda,
      fecha_inicio_residencia: datos.fecha_inicio_residencia,
      estado_censal: datos.estado_censal,
      trabajo_social_vigente: datos.trabajo_social_vigente,
      updatedAt: serverTimestamp(),
    };
    if (datos.fecha_trabajo_social?.trim()) {
      consulta.fecha_trabajo_social = datos.fecha_trabajo_social.trim();
    }

    batch.set(doc(db, 'censo', docKey), registro);
    batch.set(doc(db, 'censo_consultas', docKey), consulta);

    const auditId = buildAuditId('CEN');
    batch.set(doc(db, 'auditoria', auditId), {
      id: auditId,
      accion: 'CENSO_ACTUALIZACION' as AccionAuditoria,
      entidad: 'censo',
      entidad_id: docKey,
      actor: actor.nombre,
      rol: actor.rol,
      detalle: `Registro/actualización presencial de censo para ${datos.nombres.trim()} ${datos.apellidos.trim()} (${docKey}) — Estado: ${datos.estado_censal}, Vereda: ${datos.vereda}.`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `censo/${docKey}`);
  }
}

export async function listarSolicitudes(): Promise<Solicitud[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'solicitudes'), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => d.data() as Solicitud);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'solicitudes');
  }
}

export async function aprobarORechazarVistoBueno(params: {
  solicitud: Solicitud;
  aprobar: boolean;
  observacion: string;
  actor: { nombre: string; rol: string };
}): Promise<void> {
  const { solicitud, aprobar, observacion, actor } = params;
  try {
    const batch = writeBatch(db);
    const nuevoEstadoSolicitud: Solicitud['estado'] = !aprobar
      ? 'rechazado'
      : solicitud.tarifa_cop > 0 && !solicitud.pagado
        ? 'pendiente_pago'
        : 'listo_expedicion';

    batch.update(doc(db, 'solicitudes', solicitud.radicado), {
      visto_bueno_estado: aprobar ? 'aprobado' : 'rechazado',
      visto_bueno_por: actor.nombre,
      visto_bueno_observacion: observacion.trim() || (aprobar ? 'Aprobado por autoridad' : 'No autorizado'),
      estado: nuevoEstadoSolicitud,
      updatedAt: serverTimestamp(),
    });

    const auditId = buildAuditId(aprobar ? 'VB' : 'REJ');
    batch.set(doc(db, 'auditoria', auditId), {
      id: auditId,
      accion: (aprobar ? 'VISTO_BUENO' : 'RECHAZO') as AccionAuditoria,
      entidad: 'solicitudes',
      entidad_id: solicitud.radicado,
      actor: actor.nombre,
      rol: actor.rol,
      detalle: `${aprobar ? 'Aprobación' : 'Rechazo'} de visto bueno (RN5) para ${solicitud.tipo_documento_nombre} de ${solicitud.solicitante_nombre}. Obs: ${observacion.trim() || 'Sin observación'}.`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `solicitudes/${solicitud.radicado}`);
  }
}

export async function registrarPagoTesoreria(params: {
  solicitud: Solicitud;
  metodo_pago: MetodoPago;
  actor: { nombre: string; rol: string };
}): Promise<string> {
  const { solicitud, metodo_pago, actor } = params;
  const reciboNumero = generarCodigoAleatorio('REC');
  try {
    const batch = writeBatch(db);

    batch.set(doc(db, 'pagos_tesoreria', reciboNumero), {
      recibo_numero: reciboNumero,
      radicado: solicitud.radicado,
      docKey: solicitud.docKey,
      comunero_nombre: solicitud.solicitante_nombre,
      monto_cop: solicitud.tarifa_cop,
      metodo_pago,
      canal_pago: 'tesoreria_presencial',
      tesorero_nombre: actor.nombre,
      fecha_pago: serverTimestamp(),
    });

    batch.update(doc(db, 'solicitudes', solicitud.radicado), {
      pagado: true,
      recibo_pago: reciboNumero,
      estado: 'listo_expedicion',
      updatedAt: serverTimestamp(),
    });

    const auditId = buildAuditId('PAG');
    batch.set(doc(db, 'auditoria', auditId), {
      id: auditId,
      accion: 'PAGO' as AccionAuditoria,
      entidad: 'pagos_tesoreria',
      entidad_id: reciboNumero,
      actor: actor.nombre,
      rol: actor.rol,
      detalle: `Recibo ${reciboNumero} por $${solicitud.tarifa_cop} COP (${metodo_pago}) para radicado ${solicitud.radicado} (RN6).`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return reciboNumero;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `pagos_tesoreria/${reciboNumero}`);
  }
}

export async function procesarPagoPasarelaEnLinea(params: {
  solicitud: Solicitud;
  metodo_pago: 'nequi' | 'pse' | 'tarjeta';
  referencia_pasarela: string;
  detalle_medio: string;
}): Promise<{
  reciboNumero: string;
  codigoVerificacion: string;
  documentoEmitido: DocumentoEmitido;
}> {
  const { solicitud, metodo_pago, referencia_pasarela, detalle_medio } = params;
  const reciboNumero = generarCodigoAleatorio('REC');
  const codigoVerificacion = generarCodigoAleatorio('PN');

  try {
    const batch = writeBatch(db);

    batch.set(doc(db, 'pagos_tesoreria', reciboNumero), {
      recibo_numero: reciboNumero,
      radicado: solicitud.radicado,
      docKey: solicitud.docKey,
      comunero_nombre: solicitud.solicitante_nombre,
      monto_cop: solicitud.tarifa_cop,
      metodo_pago,
      canal_pago: 'pasarela_en_linea',
      referencia_pasarela,
      tesorero_nombre: `Pasarela en Línea (${metodo_pago.toUpperCase()})`,
      fecha_pago: serverTimestamp(),
    });

    batch.update(doc(db, 'solicitudes', solicitud.radicado), {
      pagado: true,
      recibo_pago: reciboNumero,
      estado: 'emitido',
      codigo_verificacion: codigoVerificacion,
      updatedAt: serverTimestamp(),
    });

    const docPayload = {
      codigo_verificacion: codigoVerificacion,
      radicado: solicitud.radicado,
      docKey: solicitud.docKey,
      solicitante_nombre: solicitud.solicitante_nombre,
      tipo_documento_identidad: solicitud.tipo_documento_identidad,
      numero_documento: solicitud.numero_documento,
      vereda: solicitud.vereda,
      tipo_documento_id: solicitud.tipo_documento_id,
      tipo_documento_nombre: solicitud.tipo_documento_nombre,
      categoria: solicitud.categoria,
      motivo: solicitud.motivo,
      tarifa_cop: solicitud.tarifa_cop,
      recibo_pago: reciboNumero,
      autoridad_firmante: 'Secretaría General — Cabildo Indígena Pueblo Nuevo',
      fecha_emision: serverTimestamp(),
      vigente: true,
    };

    batch.set(doc(db, 'documentos_emitidos', codigoVerificacion), docPayload);

    const auditPagoId = buildAuditId('PAG');
    batch.set(doc(db, 'auditoria', auditPagoId), {
      id: auditPagoId,
      accion: 'PAGO' as AccionAuditoria,
      entidad: 'pagos_tesoreria',
      entidad_id: reciboNumero,
      actor: solicitud.solicitante_nombre,
      rol: 'comunero_pasarela',
      detalle: `Pago en línea (${metodo_pago.toUpperCase()} · ${detalle_medio}) por $${solicitud.tarifa_cop} COP. Ref: ${referencia_pasarela}. Recibo ${reciboNumero} para ${solicitud.radicado} (RN6).`,
      timestamp: serverTimestamp(),
    });

    const auditExpId = buildAuditId('EXP');
    batch.set(doc(db, 'auditoria', auditExpId), {
      id: auditExpId,
      accion: 'EXPEDICION' as AccionAuditoria,
      entidad: 'documentos_emitidos',
      entidad_id: codigoVerificacion,
      actor: 'Liberación Automática Post-Pago',
      rol: 'sistema',
      detalle: `Expedición automática tras pago en línea de ${solicitud.tipo_documento_nombre} para ${solicitud.docKey} (Radicado ${solicitud.radicado}).`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();

    return {
      reciboNumero,
      codigoVerificacion,
      documentoEmitido: {
        ...docPayload,
        fecha_emision: new Date().toISOString(),
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `pagos_tesoreria/${reciboNumero}`);
  }
}

export async function expedirDocumentoDesdeSolicitud(params: {
  solicitud: Solicitud;
  actor: { nombre: string; rol: string };
}): Promise<string> {
  const { solicitud, actor } = params;
  const codigo = generarCodigoAleatorio('PN');
  try {
    const batch = writeBatch(db);

    const docPayload: Record<string, unknown> = {
      codigo_verificacion: codigo,
      radicado: solicitud.radicado,
      docKey: solicitud.docKey,
      solicitante_nombre: solicitud.solicitante_nombre,
      tipo_documento_identidad: solicitud.tipo_documento_identidad,
      numero_documento: solicitud.numero_documento,
      vereda: solicitud.vereda,
      tipo_documento_id: solicitud.tipo_documento_id,
      tipo_documento_nombre: solicitud.tipo_documento_nombre,
      categoria: solicitud.categoria,
      motivo: solicitud.motivo,
      tarifa_cop: solicitud.tarifa_cop,
      autoridad_firmante: `${actor.nombre} — Cabildo Indígena Pueblo Nuevo`,
      fecha_emision: serverTimestamp(),
      vigente: true,
    };
    if (solicitud.recibo_pago) {
      docPayload.recibo_pago = solicitud.recibo_pago;
    }

    batch.set(doc(db, 'documentos_emitidos', codigo), docPayload);
    batch.update(doc(db, 'solicitudes', solicitud.radicado), {
      estado: 'emitido',
      codigo_verificacion: codigo,
      updatedAt: serverTimestamp(),
    });

    const auditId = buildAuditId('EXP');
    batch.set(doc(db, 'auditoria', auditId), {
      id: auditId,
      accion: 'EXPEDICION' as AccionAuditoria,
      entidad: 'documentos_emitidos',
      entidad_id: codigo,
      actor: actor.nombre,
      rol: actor.rol,
      detalle: `Expedición oficial de ${solicitud.tipo_documento_nombre} para ${solicitud.solicitante_nombre} (Radicado ${solicitud.radicado}).`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();
    return codigo;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `documentos_emitidos/${codigo}`);
  }
}

export async function anularDocumento(params: {
  solicitud: Solicitud;
  motivoAnulacion: string;
  actor: { nombre: string; rol: string };
}): Promise<void> {
  const { solicitud, motivoAnulacion, actor } = params;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'solicitudes', solicitud.radicado), {
      estado: 'anulado',
      updatedAt: serverTimestamp(),
    });

    if (solicitud.codigo_verificacion) {
      batch.update(doc(db, 'documentos_emitidos', solicitud.codigo_verificacion), {
        vigente: false,
        motivo_anulacion: motivoAnulacion.trim(),
      });
    }

    const auditId = buildAuditId('ANU');
    batch.set(doc(db, 'auditoria', auditId), {
      id: auditId,
      accion: 'ANULACION' as AccionAuditoria,
      entidad: 'documentos_emitidos',
      entidad_id: solicitud.codigo_verificacion || solicitud.radicado,
      actor: actor.nombre,
      rol: actor.rol,
      detalle: `Anulación de documento/radicado ${solicitud.radicado}. Motivo: ${motivoAnulacion.trim()}`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `solicitudes/${solicitud.radicado}`);
  }
}

export async function registrarTrabajoSocial(params: {
  registroCenso: CensoRegistro;
  actividad: string;
  fecha: string;
  horas: number;
  aprobado: boolean;
  actor: { nombre: string; rol: string };
}): Promise<void> {
  const { registroCenso, actividad, fecha, horas, aprobado, actor } = params;
  const id = generarCodigoAleatorio('TS');
  const nombreCompleto = `${registroCenso.nombres} ${registroCenso.apellidos}`.trim();
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'trabajo_social', id), {
      id,
      docKey: registroCenso.docKey,
      comunero_nombre: nombreCompleto,
      actividad: actividad.trim(),
      fecha,
      horas,
      aprobado,
      registrado_por: actor.nombre,
      createdAt: serverTimestamp(),
    });

    const totalHoras = (registroCenso.horas_trabajo_social ?? 0) + (aprobado ? horas : 0);
    const vigente = aprobado || registroCenso.trabajo_social_vigente;

    batch.update(doc(db, 'censo', registroCenso.docKey), {
      trabajo_social_vigente: vigente,
      fecha_trabajo_social: fecha,
      horas_trabajo_social: totalHoras,
      updatedAt: serverTimestamp(),
      updatedBy: actor.nombre,
    });

    batch.update(doc(db, 'censo_consultas', registroCenso.docKey), {
      trabajo_social_vigente: vigente,
      fecha_trabajo_social: fecha,
      updatedAt: serverTimestamp(),
    });

    const auditId = buildAuditId('TS');
    batch.set(doc(db, 'auditoria', auditId), {
      id: auditId,
      accion: 'TRABAJO_SOCIAL' as AccionAuditoria,
      entidad: 'trabajo_social',
      entidad_id: id,
      actor: actor.nombre,
      rol: actor.rol,
      detalle: `Registro de trabajo social (${horas}h, ${aprobado ? 'Aprobado' : 'Pendiente'}) para ${nombreCompleto} (${registroCenso.docKey}) — ${actividad.trim()}.`,
      timestamp: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `trabajo_social/${id}`);
  }
}

export async function listarTrabajoSocial(): Promise<TrabajoSocial[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'trabajo_social'), orderBy('createdAt', 'desc')),
    );
    return snap.docs.map((d) => d.data() as TrabajoSocial);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'trabajo_social');
  }
}

export async function listarPagosTesoreria(): Promise<PagoTesoreria[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'pagos_tesoreria'), orderBy('fecha_pago', 'desc')),
    );
    return snap.docs.map((d) => d.data() as PagoTesoreria);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'pagos_tesoreria');
  }
}

export async function listarAuditoria(): Promise<Auditoria[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'auditoria'), orderBy('timestamp', 'desc')),
    );
    return snap.docs.map((d) => d.data() as Auditoria);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'auditoria');
  }
}

export async function listarFuncionarios(): Promise<Funcionario[]> {
  try {
    const snap = await getDocs(collection(db, 'funcionarios'));
    return snap.docs.map((d) => d.data() as Funcionario);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'funcionarios');
  }
}

export async function guardarFuncionario(params: {
  uid: string;
  email: string;
  nombre: string;
  cargo: string;
  rol: RolFuncionario;
  activo: boolean;
}): Promise<void> {
  try {
    await setDoc(doc(db, 'funcionarios', params.uid.trim()), {
      uid: params.uid.trim(),
      email: params.email.trim(),
      nombre: params.nombre.trim(),
      cargo: params.cargo.trim(),
      rol: params.rol,
      activo: params.activo,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `funcionarios/${params.uid}`);
  }
}

export async function listarAutorizacionesCorreo(): Promise<AutorizacionCorreo[]> {
  try {
    const snap = await getDocs(collection(db, 'autorizaciones_correo'));
    return snap.docs.map((d) => d.data() as AutorizacionCorreo);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'autorizaciones_correo');
  }
}

export async function guardarAutorizacionCorreo(params: {
  email: string;
  nombre: string;
  cargo: string;
  rol: RolFuncionario;
  activo: boolean;
  autorizado_por: string;
}): Promise<void> {
  const emailNorm = params.email.trim().toLowerCase();
  try {
    await setDoc(doc(db, 'autorizaciones_correo', emailNorm), {
      email: emailNorm,
      nombre: params.nombre.trim(),
      cargo: params.cargo.trim(),
      rol: params.rol,
      activo: params.activo,
      autorizado_por: params.autorizado_por,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `autorizaciones_correo/${emailNorm}`);
  }
}

export async function eliminarAutorizacionCorreo(email: string): Promise<void> {
  const emailNorm = email.trim().toLowerCase();
  try {
    await deleteDoc(doc(db, 'autorizaciones_correo', emailNorm));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `autorizaciones_correo/${emailNorm}`);
  }
}
