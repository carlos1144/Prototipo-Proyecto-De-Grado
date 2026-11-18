import type {
  CensoConsultaPublica,
  EvaluacionTramite,
  TipoDocumento,
  TipoIdentificacion,
  Vereda,
} from '../types/domain';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'carlosulcue@hotmail.com';

export const VEREDAS_INICIALES: Vereda[] = [
  { id: 'pueblo_nuevo_centro', nombre: 'Pueblo Nuevo Centro', zona: 'Centro', activa: true },
  { id: 'el_rosal', nombre: 'El Rosal', zona: 'Norte', activa: true },
  { id: 'la_primavera', nombre: 'La Primavera', zona: 'Oriente', activa: true },
  { id: 'alto_del_rey', nombre: 'Alto del Rey', zona: 'Alta', activa: true },
  { id: 'santa_clara', nombre: 'Santa Clara', zona: 'Occidente', activa: true },
  { id: 'el_carmelo', nombre: 'El Carmelo', zona: 'Sur', activa: true },
  { id: 'la_esperanza', nombre: 'La Esperanza', zona: 'Oriente', activa: true },
  { id: 'el_pital', nombre: 'El Pital', zona: 'Norte', activa: true },
];

export const TIPOS_DOCUMENTO_INICIALES: TipoDocumento[] = [
  {
    id: 'constancia_pertenencia',
    categoria: 'constancia',
    nombre: 'Constancia de pertenencia',
    descripcion:
      'Acredita la inclusión activa en el censo poblacional del Resguardo Indígena de Pueblo Nuevo ante entidades públicas y privadas.',
    tarifa_cop: 0,
    requiere_residencia_365: true,
    requiere_trabajo_social: false,
    requiere_visto_bueno: false,
    activo: true,
    orden: 1,
  },
  {
    id: 'constancia_educacion',
    categoria: 'constancia',
    nombre: 'Constancia para educación',
    descripcion:
      'Documento dirigido a instituciones educativas, colegios y universidades para matrícula, becas y programas de acceso diferencial.',
    tarifa_cop: 0,
    requiere_residencia_365: true,
    requiere_trabajo_social: false,
    requiere_visto_bueno: false,
    activo: true,
    orden: 2,
  },
  {
    id: 'constancia_salud',
    categoria: 'constancia',
    nombre: 'Constancia para salud',
    descripcion:
      'Soporte censal prioritario para afiliación y trámites ante EPS indígenas y red prestadora de servicios de salud.',
    tarifa_cop: 0,
    requiere_residencia_365: true,
    requiere_trabajo_social: false,
    requiere_visto_bueno: false,
    activo: true,
    orden: 3,
  },
  {
    id: 'constancia_trabajo',
    categoria: 'constancia',
    nombre: 'Constancia para trabajo',
    descripcion:
      'Certificación laboral y de pertenencia comunitaria solicitada para vinculación en proyectos u organizaciones territoriales.',
    tarifa_cop: 5000,
    requiere_residencia_365: true,
    requiere_trabajo_social: false,
    requiere_visto_bueno: false,
    activo: true,
    orden: 4,
  },
  {
    id: 'aval_estudio',
    categoria: 'aval',
    nombre: 'Aval de estudio',
    descripcion:
      'Respaldo institucional de la Autoridad Tradicional para convocatorias de educación superior, fondos indígenas e ICETEX.',
    tarifa_cop: 10000,
    requiere_residencia_365: true,
    requiere_trabajo_social: true,
    requiere_visto_bueno: true,
    activo: true,
    orden: 5,
  },
  {
    id: 'aval_trabajo',
    categoria: 'aval',
    nombre: 'Aval de trabajo',
    descripcion:
      'Autorización y respaldo comunitario otorgado por el Cabildo para contratos institucionales y convocatorias laborales.',
    tarifa_cop: 15000,
    requiere_residencia_365: true,
    requiere_trabajo_social: true,
    requiere_visto_bueno: true,
    activo: true,
    orden: 6,
  },
  {
    id: 'certificado_residencia',
    categoria: 'certificado',
    nombre: 'Certificado de residencia',
    descripcion:
      'Certifica la residencia continua superior a un año dentro de una vereda del territorio del Resguardo de Pueblo Nuevo.',
    tarifa_cop: 8000,
    requiere_residencia_365: true,
    requiere_trabajo_social: false,
    requiere_visto_bueno: false,
    activo: true,
    orden: 7,
  },
];

export interface CensoSeedEntry {
  tipo_documento: TipoIdentificacion;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  vereda: string;
  fecha_ingreso_censo: string;
  fecha_inicio_residencia: string;
  estado_censal: 'activo' | 'inactivo' | 'trasladado';
  cabeza_familia: string;
  telefono: string;
  trabajo_social_vigente: boolean;
  fecha_trabajo_social?: string;
  horas_trabajo_social?: number;
}

export interface FuncionarioSeedEntry {
  uid: string;
  email: string;
  nombre: string;
  cargo: string;
  rol: 'gobernador' | 'secretario' | 'tesorero' | 'trabajador_social';
  activo: boolean;
}

export const FUNCIONARIOS_SEMILLA: FuncionarioSeedEntry[] = [
  {
    uid: 'rol_gobernador_cabildo',
    email: 'gobernador@cabildopueblonuevo.org',
    nombre: 'Segundo Alberto Cuchillo Pavi',
    cargo: 'Gobernador Principal del Cabildo',
    rol: 'gobernador',
    activo: true,
  },
  {
    uid: 'rol_secretario_cabildo',
    email: 'secretaria@cabildopueblonuevo.org',
    nombre: 'Marisol Quiguanás Pillimué',
    cargo: 'Secretaria General del Cabildo',
    rol: 'secretario',
    activo: true,
  },
  {
    uid: 'rol_tesorero_cabildo',
    email: 'tesoreria@cabildopueblonuevo.org',
    nombre: 'Jhon Jairo Mestizo Trochez',
    cargo: 'Tesorero del Resguardo',
    rol: 'tesorero',
    activo: true,
  },
  {
    uid: 'rol_trabajador_social_cabildo',
    email: 'trabajosocial@cabildopueblonuevo.org',
    nombre: 'Diana Marcela Yule Campo',
    cargo: 'Coordinadora de Trabajo Social y Mingas',
    rol: 'trabajador_social',
    activo: true,
  },
];

export const CENSO_SEMILLA: CensoSeedEntry[] = [
  {
    tipo_documento: 'CC',
    numero_documento: '1061724890',
    nombres: 'Mateo',
    apellidos: 'Ulcué Tunubalá',
    fecha_nacimiento: '1996-04-12',
    vereda: 'Pueblo Nuevo Centro',
    fecha_ingreso_censo: '2015-02-10',
    fecha_inicio_residencia: '2015-02-10',
    estado_censal: 'activo',
    cabeza_familia: 'Mateo Ulcué Tunubalá',
    telefono: '3125550194',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-08-18',
    horas_trabajo_social: 24,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '34567890',
    nombres: 'Lucía',
    apellidos: 'Velasco Tombé',
    fecha_nacimiento: '1988-09-23',
    vereda: 'El Rosal',
    fecha_ingreso_censo: '2018-06-05',
    fecha_inicio_residencia: '2018-06-05',
    estado_censal: 'activo',
    cabeza_familia: 'Lucía Velasco Tombé',
    telefono: '3114820911',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'TI',
    numero_documento: '1061890123',
    nombres: 'Santiago',
    apellidos: 'Campo Quiguanás',
    fecha_nacimiento: '2010-11-04',
    vereda: 'La Primavera',
    fecha_ingreso_censo: '2026-06-15',
    fecha_inicio_residencia: '2026-06-15',
    estado_censal: 'activo',
    cabeza_familia: 'Marisol Quiguanás',
    telefono: '3203349012',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '76321456',
    nombres: 'Rosa Elena',
    apellidos: 'Guetio Dagua',
    fecha_nacimiento: '1979-03-19',
    vereda: 'Alto del Rey',
    fecha_ingreso_censo: '2012-01-14',
    fecha_inicio_residencia: '2012-01-14',
    estado_censal: 'inactivo',
    cabeza_familia: 'Rosa Elena Guetio Dagua',
    telefono: '3149012233',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061445210',
    nombres: 'Carmen',
    apellidos: 'Pillimué Dagua',
    fecha_nacimiento: '1999-07-30',
    vereda: 'Santa Clara',
    fecha_ingreso_censo: '2021-03-08',
    fecha_inicio_residencia: '2021-03-08',
    estado_censal: 'activo',
    cabeza_familia: 'Carmen Pillimué Dagua',
    telefono: '3107721840',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-09-05',
    horas_trabajo_social: 16,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061731045',
    nombres: 'Andrés Felipe',
    apellidos: 'Yule Trochez',
    fecha_nacimiento: '1994-01-18',
    vereda: 'El Carmelo',
    fecha_ingreso_censo: '2016-05-12',
    fecha_inicio_residencia: '2016-05-12',
    estado_censal: 'activo',
    cabeza_familia: 'Andrés Felipe Yule Trochez',
    telefono: '3134021188',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-07-22',
    horas_trabajo_social: 32,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061742901',
    nombres: 'María Fernanda',
    apellidos: 'Pavi Mestizo',
    fecha_nacimiento: '1997-10-09',
    vereda: 'La Esperanza',
    fecha_ingreso_censo: '2019-08-19',
    fecha_inicio_residencia: '2019-08-19',
    estado_censal: 'activo',
    cabeza_familia: 'María Fernanda Pavi Mestizo',
    telefono: '3158894301',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-06-14',
    horas_trabajo_social: 20,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061758320',
    nombres: 'Julián David',
    apellidos: 'Cuchillo Secué',
    fecha_nacimiento: '1992-05-27',
    vereda: 'El Pital',
    fecha_ingreso_censo: '2014-09-03',
    fecha_inicio_residencia: '2014-09-03',
    estado_censal: 'activo',
    cabeza_familia: 'Julián David Cuchillo Secué',
    telefono: '3162209412',
    trabajo_social_vigente: false,
    horas_trabajo_social: 4,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '34601289',
    nombres: 'Blanca Nubia',
    apellidos: 'Tombé Pechené',
    fecha_nacimiento: '1981-12-02',
    vereda: 'Pueblo Nuevo Centro',
    fecha_ingreso_censo: '2010-04-20',
    fecha_inicio_residencia: '2010-04-20',
    estado_censal: 'activo',
    cabeza_familia: 'Blanca Nubia Tombé Pechené',
    telefono: '3183310945',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-09-19',
    horas_trabajo_social: 40,
  },
  {
    tipo_documento: 'TI',
    numero_documento: '1061904512',
    nombres: 'Valeria',
    apellidos: 'Tunubalá Vitonás',
    fecha_nacimiento: '2009-06-11',
    vereda: 'El Rosal',
    fecha_ingreso_censo: '2020-02-01',
    fecha_inicio_residencia: '2020-02-01',
    estado_censal: 'activo',
    cabeza_familia: 'Héctor Tunubalá',
    telefono: '3126678901',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-08-03',
    horas_trabajo_social: 12,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061769084',
    nombres: 'Óscar Eduardo',
    apellidos: 'Vitonás Musse',
    fecha_nacimiento: '1990-02-14',
    vereda: 'La Primavera',
    fecha_ingreso_censo: '2017-11-10',
    fecha_inicio_residencia: '2017-11-10',
    estado_censal: 'activo',
    cabeza_familia: 'Óscar Eduardo Vitonás Musse',
    telefono: '3119903421',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-05-30',
    horas_trabajo_social: 18,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '76289310',
    nombres: 'Hernando',
    apellidos: 'Pechené Yule',
    fecha_nacimiento: '1975-08-07',
    vereda: 'Alto del Rey',
    fecha_ingreso_censo: '2008-03-15',
    fecha_inicio_residencia: '2008-03-15',
    estado_censal: 'activo',
    cabeza_familia: 'Hernando Pechené Yule',
    telefono: '3147723409',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-10-01',
    horas_trabajo_social: 36,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061775432',
    nombres: 'Sandra Milena',
    apellidos: 'Secué Campo',
    fecha_nacimiento: '1995-03-29',
    vereda: 'Santa Clara',
    fecha_ingreso_censo: '2022-01-18',
    fecha_inicio_residencia: '2022-01-18',
    estado_censal: 'activo',
    cabeza_familia: 'Sandra Milena Secué Campo',
    telefono: '3215548090',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'RC',
    numero_documento: '1061987001',
    nombres: 'Emmanuel',
    apellidos: 'Dagua Guetio',
    fecha_nacimiento: '2019-09-12',
    vereda: 'El Carmelo',
    fecha_ingreso_censo: '2019-10-05',
    fecha_inicio_residencia: '2019-10-05',
    estado_censal: 'activo',
    cabeza_familia: 'Yolanda Guetio',
    telefono: '3104431298',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061782190',
    nombres: 'Diego Alejandro',
    apellidos: 'Mestizo Ulcué',
    fecha_nacimiento: '1998-11-21',
    vereda: 'La Esperanza',
    fecha_ingreso_censo: '2020-07-14',
    fecha_inicio_residencia: '2020-07-14',
    estado_censal: 'activo',
    cabeza_familia: 'Diego Alejandro Mestizo Ulcué',
    telefono: '3178902134',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-08-29',
    horas_trabajo_social: 28,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '34592014',
    nombres: 'Gloria Esperanza',
    apellidos: 'Musse Velasco',
    fecha_nacimiento: '1984-04-06',
    vereda: 'El Pital',
    fecha_ingreso_censo: '2013-06-22',
    fecha_inicio_residencia: '2013-06-22',
    estado_censal: 'activo',
    cabeza_familia: 'Gloria Esperanza Musse Velasco',
    telefono: '3123409811',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-04-17',
    horas_trabajo_social: 22,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061794503',
    nombres: 'Cristian Camilo',
    apellidos: 'Trochez Pavi',
    fecha_nacimiento: '2001-01-25',
    vereda: 'Pueblo Nuevo Centro',
    fecha_ingreso_censo: '2026-04-01',
    fecha_inicio_residencia: '2026-04-01',
    estado_censal: 'activo',
    cabeza_familia: 'Luis Trochez',
    telefono: '3198765432',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-09-10',
    horas_trabajo_social: 16,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061801234',
    nombres: 'Natalia Andrea',
    apellidos: 'Quiguanás Yule',
    fecha_nacimiento: '2000-12-15',
    vereda: 'El Rosal',
    fecha_ingreso_censo: '2021-09-09',
    fecha_inicio_residencia: '2021-09-09',
    estado_censal: 'activo',
    cabeza_familia: 'Natalia Andrea Quiguanás Yule',
    telefono: '3137651209',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-07-08',
    horas_trabajo_social: 20,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '76345120',
    nombres: 'Albeiro',
    apellidos: 'Campo Tunubalá',
    fecha_nacimiento: '1980-06-30',
    vereda: 'La Primavera',
    fecha_ingreso_censo: '2011-02-28',
    fecha_inicio_residencia: '2011-02-28',
    estado_censal: 'trasladado',
    cabeza_familia: 'Albeiro Campo Tunubalá',
    telefono: '3154320987',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061813456',
    nombres: 'Yury Vanessa',
    apellidos: 'Pillimué Cuchillo',
    fecha_nacimiento: '1993-07-03',
    vereda: 'Alto del Rey',
    fecha_ingreso_censo: '2017-04-11',
    fecha_inicio_residencia: '2017-04-11',
    estado_censal: 'activo',
    cabeza_familia: 'Yury Vanessa Pillimué Cuchillo',
    telefono: '3112098345',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'TI',
    numero_documento: '1061918273',
    nombres: 'Kevin Stiven',
    apellidos: 'Guetio Mestizo',
    fecha_nacimiento: '2011-02-19',
    vereda: 'Santa Clara',
    fecha_ingreso_censo: '2018-08-24',
    fecha_inicio_residencia: '2018-08-24',
    estado_censal: 'activo',
    cabeza_familia: 'Aracelly Mestizo',
    telefono: '3209123456',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-06-25',
    horas_trabajo_social: 14,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061824567',
    nombres: 'Paola Andrea',
    apellidos: 'Velasco Dagua',
    fecha_nacimiento: '1991-10-28',
    vereda: 'El Carmelo',
    fecha_ingreso_censo: '2015-11-16',
    fecha_inicio_residencia: '2015-11-16',
    estado_censal: 'activo',
    cabeza_familia: 'Paola Andrea Velasco Dagua',
    telefono: '3146543210',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-10-08',
    horas_trabajo_social: 30,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061835678',
    nombres: 'Wilson Fabián',
    apellidos: 'Ulcué Pechené',
    fecha_nacimiento: '1989-05-08',
    vereda: 'La Esperanza',
    fecha_ingreso_censo: '2016-01-29',
    fecha_inicio_residencia: '2016-01-29',
    estado_censal: 'activo',
    cabeza_familia: 'Wilson Fabián Ulcué Pechené',
    telefono: '3167890123',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-09-12',
    horas_trabajo_social: 24,
  },
  {
    tipo_documento: 'CE',
    numero_documento: '45890123',
    nombres: 'Ramiro',
    apellidos: 'Inti Quispe',
    fecha_nacimiento: '1986-03-14',
    vereda: 'El Pital',
    fecha_ingreso_censo: '2023-02-05',
    fecha_inicio_residencia: '2023-02-05',
    estado_censal: 'activo',
    cabeza_familia: 'Ramiro Inti Quispe',
    telefono: '3182345678',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061846789',
    nombres: 'Leidy Johana',
    apellidos: 'Yule Vitonás',
    fecha_nacimiento: '2002-08-17',
    vereda: 'Pueblo Nuevo Centro',
    fecha_ingreso_censo: '2020-10-11',
    fecha_inicio_residencia: '2020-10-11',
    estado_censal: 'activo',
    cabeza_familia: 'Leidy Johana Yule Vitonás',
    telefono: '3109871234',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-08-11',
    horas_trabajo_social: 18,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '34615890',
    nombres: 'Luz Dary',
    apellidos: 'Pavi Tombé',
    fecha_nacimiento: '1977-11-22',
    vereda: 'El Rosal',
    fecha_ingreso_censo: '2009-07-04',
    fecha_inicio_residencia: '2009-07-04',
    estado_censal: 'activo',
    cabeza_familia: 'Luz Dary Pavi Tombé',
    telefono: '3128765401',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-05-19',
    horas_trabajo_social: 48,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061857890',
    nombres: 'Jhonatan',
    apellidos: 'Cuchillo Campo',
    fecha_nacimiento: '1999-02-09',
    vereda: 'La Primavera',
    fecha_ingreso_censo: '2026-07-20',
    fecha_inicio_residencia: '2026-07-20',
    estado_censal: 'activo',
    cabeza_familia: 'Jhonatan Cuchillo Campo',
    telefono: '3173456789',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061868901',
    nombres: 'Erika Tatiana',
    apellidos: 'Mestizo Secué',
    fecha_nacimiento: '1995-09-01',
    vereda: 'Alto del Rey',
    fecha_ingreso_censo: '2019-03-27',
    fecha_inicio_residencia: '2019-03-27',
    estado_censal: 'activo',
    cabeza_familia: 'Erika Tatiana Mestizo Secué',
    telefono: '3156789012',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-09-28',
    horas_trabajo_social: 26,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '76398211',
    nombres: 'José Reinel',
    apellidos: 'Dagua Trochez',
    fecha_nacimiento: '1972-12-10',
    vereda: 'Santa Clara',
    fecha_ingreso_censo: '2007-05-18',
    fecha_inicio_residencia: '2007-05-18',
    estado_censal: 'inactivo',
    cabeza_familia: 'José Reinel Dagua Trochez',
    telefono: '3131122334',
    trabajo_social_vigente: false,
    horas_trabajo_social: 0,
  },
  {
    tipo_documento: 'CC',
    numero_documento: '1061879012',
    nombres: 'Angie Lorena',
    apellidos: 'Musse Quiguanás',
    fecha_nacimiento: '2003-04-26',
    vereda: 'El Carmelo',
    fecha_ingreso_censo: '2022-06-14',
    fecha_inicio_residencia: '2022-06-14',
    estado_censal: 'activo',
    cabeza_familia: 'Angie Lorena Musse Quiguanás',
    telefono: '3115432198',
    trabajo_social_vigente: true,
    fecha_trabajo_social: '2026-10-14',
    horas_trabajo_social: 20,
  },
];

export function buildDocKey(tipo: TipoIdentificacion, numero: string): string {
  const cleanNum = numero.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return `${tipo}_${cleanNum}`;
}

export function calcularDiasResidencia(fechaInicio: string): number {
  const start = new Date(`${fechaInicio}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatCOP(valor: number): string {
  if (valor === 0) return 'Gratuito';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatTimestamp(value: unknown): string {
  if (!value) return '—';
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    }
  }
  return '—';
}

export function evaluarRequisitosParaDocumento(
  consulta: CensoConsultaPublica,
  tipo: TipoDocumento,
): EvaluacionTramite {
  const motivosBloqueo: string[] = [];
  const dias = calcularDiasResidencia(consulta.fecha_inicio_residencia);

  // RN1: Estado censal activo
  if (consulta.estado_censal !== 'activo') {
    motivosBloqueo.push(
      `RN1: Su estado censal actual es «${consulta.estado_censal}». Debe actualizar su registro presencialmente en la Casa del Cabildo (RN3).`,
    );
  }

  // RN2: Residencia continua > 365 días
  if (tipo.requiere_residencia_365 && dias <= 365) {
    motivosBloqueo.push(
      `RN2: Requiere más de 365 días de residencia continua en el resguardo (actualmente registra ${dias} días desde ${consulta.fecha_inicio_residencia}).`,
    );
  }

  // RN4: Trabajo social comunitario vigente del último año
  if (tipo.requiere_trabajo_social && !consulta.trabajo_social_vigente) {
    motivosBloqueo.push(
      'RN4: Este aval exige constancia aprobada de trabajo social comunitario en el último año.',
    );
  }

  return {
    tipo,
    elegible: motivosBloqueo.length === 0,
    motivosBloqueo,
  };
}

export function generarCodigoAleatorio(prefijo: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefijo}-2026-${token}`;
}
