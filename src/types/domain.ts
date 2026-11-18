export type TipoIdentificacion = 'CC' | 'TI' | 'RC' | 'CE';

export type CategoriaTramite = 'constancia' | 'aval' | 'certificado';

export type EstadoCensal = 'activo' | 'inactivo' | 'trasladado';

export type EstadoVistoBueno = 'no_requerido' | 'pendiente' | 'aprobado' | 'rechazado';

export type EstadoSolicitud =
  | 'pendiente_visto_bueno'
  | 'pendiente_pago'
  | 'listo_expedicion'
  | 'emitido'
  | 'rechazado'
  | 'anulado';

export type RolFuncionario =
  | 'admin'
  | 'gobernador'
  | 'secretario'
  | 'tesorero'
  | 'trabajador_social';

export type MetodoPago =
  | 'efectivo'
  | 'transferencia'
  | 'consignacion'
  | 'nequi'
  | 'pse'
  | 'tarjeta';

export type AccionAuditoria =
  | 'SOLICITUD'
  | 'VISTO_BUENO'
  | 'RECHAZO'
  | 'PAGO'
  | 'EXPEDICION'
  | 'ANULACION'
  | 'CENSO_ACTUALIZACION'
  | 'TRABAJO_SOCIAL';

export interface Vereda {
  id: string;
  nombre: string;
  zona: string;
  activa: boolean;
}

export interface TipoDocumento {
  id: string;
  categoria: CategoriaTramite;
  nombre: string;
  descripcion: string;
  tarifa_cop: number;
  requiere_residencia_365: boolean;
  requiere_trabajo_social: boolean;
  requiere_visto_bueno: boolean;
  activo: boolean;
  orden: number;
}

export interface CensoRegistro {
  docKey: string;
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
  updatedAt: unknown;
  updatedBy: string;
}

export interface CensoConsultaPublica {
  docKey: string;
  tipo_documento: TipoIdentificacion;
  numero_documento: string;
  nombre_completo: string;
  vereda: string;
  fecha_inicio_residencia: string;
  estado_censal: EstadoCensal;
  trabajo_social_vigente: boolean;
  fecha_trabajo_social?: string;
  updatedAt: unknown;
}

export interface Solicitud {
  radicado: string;
  docKey: string;
  tipo_documento_identidad: TipoIdentificacion;
  numero_documento: string;
  solicitante_nombre: string;
  vereda: string;
  tipo_documento_id: string;
  tipo_documento_nombre: string;
  categoria: CategoriaTramite;
  motivo: string;
  tarifa_cop: number;
  requiere_visto_bueno: boolean;
  visto_bueno_estado: EstadoVistoBueno;
  visto_bueno_por?: string;
  visto_bueno_observacion?: string;
  pagado: boolean;
  recibo_pago?: string;
  estado: EstadoSolicitud;
  codigo_verificacion?: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface DocumentoEmitido {
  codigo_verificacion: string;
  radicado: string;
  docKey: string;
  solicitante_nombre: string;
  tipo_documento_identidad: TipoIdentificacion;
  numero_documento: string;
  vereda: string;
  tipo_documento_id: string;
  tipo_documento_nombre: string;
  categoria: CategoriaTramite;
  motivo: string;
  tarifa_cop: number;
  recibo_pago?: string;
  autoridad_firmante: string;
  fecha_emision: unknown;
  vigente: boolean;
  motivo_anulacion?: string;
}

export interface TrabajoSocial {
  id: string;
  docKey: string;
  comunero_nombre: string;
  actividad: string;
  fecha: string;
  horas: number;
  aprobado: boolean;
  registrado_por: string;
  createdAt: unknown;
}

export interface PagoTesoreria {
  recibo_numero: string;
  radicado: string;
  docKey: string;
  comunero_nombre: string;
  monto_cop: number;
  metodo_pago: MetodoPago;
  canal_pago?: 'tesoreria_presencial' | 'pasarela_en_linea';
  referencia_pasarela?: string;
  tesorero_nombre: string;
  fecha_pago: unknown;
}

export interface Auditoria {
  id: string;
  accion: AccionAuditoria;
  entidad: string;
  entidad_id: string;
  actor: string;
  rol: string;
  detalle: string;
  timestamp: unknown;
}

export interface Funcionario {
  uid: string;
  email: string;
  nombre: string;
  cargo: string;
  rol: RolFuncionario;
  activo: boolean;
  updatedAt: unknown;
}

export interface AutorizacionCorreo {
  email: string;
  nombre: string;
  cargo: string;
  rol: RolFuncionario;
  activo: boolean;
  autorizado_por: string;
  updatedAt: unknown;
}

export interface EvaluacionTramite {
  tipo: TipoDocumento;
  elegible: boolean;
  motivosBloqueo: string[];
}

export interface ResultadoRequisitos {
  encontrado: boolean;
  consulta: CensoConsultaPublica | null;
  diasResidencia: number;
  evaluaciones: EvaluacionTramite[];
}
