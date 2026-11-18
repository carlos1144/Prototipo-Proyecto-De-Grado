import * as React from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import {
  ClipboardList,
  Clock,
  FileCheck2,
  HelpCircle,
  Lock,
  MapPin,
  Phone,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';

const GUIA = [
  {
    t: '1. Censo presencial',
    d: 'Su registro en el censo se hace en la Casa del Cabildo y se actualiza periódicamente.',
  },
  {
    t: '2. Solicite y pague',
    d: 'Solicite su constancia o aval con su número de documento y pague el valor correspondiente en tesorería.',
  },
  {
    t: '3. Descargue en línea',
    d: 'Con el pago registrado, consulte su radicado y descargue su documento oficial con código QR.',
  },
];

const FAQ = [
  {
    q: '¿Necesito crear una cuenta o registrarme?',
    a: 'No. El servicio para comuneros es directo con su tipo y número de documento de identidad.',
  },
  {
    q: '¿Puedo inscribirme en el censo por internet?',
    a: 'No. El registro censal se realiza de forma presencial en el Cabildo para verificar su pertenencia étnica y comunitaria.',
  },
  {
    q: '¿Cómo solicito una constancia o un aval?',
    a: "Haga clic en el botón 'Trámites y documentos' en la barra superior para consultar los requisitos y elegir el documento que necesita.",
  },
  {
    q: '¿El documento descargado es oficial y válido?',
    a: 'Sí. Cada documento emitido cuenta con un código alfanumérico único y un código QR verificable públicamente por cualquier entidad.',
  },
  {
    q: '¿Por qué un trámite dice «No disponible aún»?',
    a: 'El sistema valida en tiempo real sus requisitos (antigüedad de residencia, trabajo social o visto bueno). El mensaje le indicará qué condición está pendiente.',
  },
];

export function Index() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    tab?: string;
    tipo?: string;
    codigo?: string;
  };

  React.useEffect(() => {
    if (search.codigo || search.tab || search.tipo) {
      void navigate({
        to: '/autoservicio',
        search: {
          tab: search.tab || (search.codigo ? 'validar' : 'solicitar'),
          tipo: search.tipo,
          codigo: search.codigo,
        },
      });
    }
  }, [navigate, search.codigo, search.tab, search.tipo]);

  return (
    <div className="min-h-screen bg-background">
      {/* Cabecera institucional con único botón Trámites y documentos igual al de Acceso funcionarios */}
      <header className="relative overflow-hidden bg-hero text-primary-foreground">
        <img
          src="/src/assets/images/caldono_resguardo_hero_1794964930501.jpg"
          alt="Paisaje territorial del Resguardo Indígena de Pueblo Nuevo en Caldono, Cauca"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#0b2319]/90 via-[#102e21]/85 to-[#102e21]/95"
        />

        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="font-display text-lg font-semibold tracking-tight whitespace-nowrap shrink-0"
          >
            Resguardo Pueblo Nuevo
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="secondary" size="sm">
              <Link to="/tramites">
                <ClipboardList className="h-4 w-4" />
                Trámites y documentos
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/ingreso">
                <Lock className="h-4 w-4" />
                Acceso funcionarios
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] opacity-85">
            Caldono · Cauca
          </p>
          <h1 className="mt-2 max-w-3xl text-balance text-4xl font-semibold leading-tight md:text-5xl">
            Ventanilla virtual de certificados y trámites
          </h1>
          <p className="mt-3 max-w-2xl text-lg opacity-90">
            Genere constancias, avales y certificados oficiales del resguardo desde donde esté, sin
            filas y sin necesidad de crear una cuenta.
          </p>
        </div>
      </header>

      {/* Guía rápida del procedimiento */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="text-2xl font-semibold">¿Cómo funcionan los trámites?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {GUIA.map((g) => (
            <div key={g.t} className="rounded-xl border bg-card p-5">
              <FileCheck2 className="h-6 w-6 text-accent" />
              <h3 className="mt-3 font-semibold">{g.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{g.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preguntas frecuentes y atención presencial */}
      <section
        id="preguntas"
        className="mx-auto grid max-w-6xl gap-10 px-6 pb-14 md:grid-cols-[2fr_1fr]"
      >
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <HelpCircle className="h-6 w-6 text-accent" />
            Preguntas frecuentes
          </h2>
          <div className="mt-4 divide-y rounded-xl border bg-card">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-4">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        <aside id="atencion" className="overflow-hidden rounded-xl border bg-card text-sm">
          <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
            <img
              src="/src/assets/images/cabildo_atencion_presencial_1794964931190.jpg"
              alt="Secretaría y registro censal presencial en la Casa del Cabildo de Pueblo Nuevo"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="p-5">
            <h2 className="text-lg font-semibold">Atención presencial</h2>
            <p className="mt-3 flex gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              Casa del Cabildo, Pueblo Nuevo, Caldono (Cauca)
            </p>
            <p className="mt-2 flex gap-2">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              Lunes a viernes (8:00 a.m. - 12:00 m. y 2:00 p.m. - 5:00 p.m.)
            </p>
            <p className="mt-2 flex gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              Línea de atención de la Secretaría del Cabildo
            </p>
          </div>
        </aside>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Prototipo de Sistema de Información Censal y Documental — Proyecto de Grado, UNAD Caldono.
      </footer>
    </div>
  );
}
