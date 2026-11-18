import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  FileText,
  Lock,
  QrCode,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { TIPOS_DOCUMENTO_INICIALES, formatCOP } from '@/src/lib/catalog';
import { fetchCatalogoPublico } from '@/src/lib/firestore-service';
import type { CategoriaTramite, TipoDocumento } from '@/src/types/domain';
import { Button } from '@/src/components/ui/button';

const CATEGORIA_META: Record<
  CategoriaTramite,
  { titulo: string; subtitulo: string; orden: number }
> = {
  constancia: {
    titulo: 'Constancias',
    subtitulo:
      'Acreditan pertenencia étnica y censal ante instituciones educativas, de salud o laborales.',
    orden: 1,
  },
  aval: {
    titulo: 'Avales',
    subtitulo:
      'Respaldo institucional de la Autoridad Tradicional. Requieren trabajo social vigente (RN4) y visto bueno del Cabildo (RN5).',
    orden: 2,
  },
  certificado: {
    titulo: 'Certificados',
    subtitulo:
      'Certificación oficial de residencia continua superior a 365 días en una vereda del resguardo (RN2).',
    orden: 3,
  },
};

export function Tramites() {
  const [catalogo, setCatalogo] = React.useState<TipoDocumento[]>(TIPOS_DOCUMENTO_INICIALES);
  const [abierto, setAbierto] = React.useState<Record<CategoriaTramite, boolean>>({
    constancia: true,
    aval: true,
    certificado: true,
  });

  React.useEffect(() => {
    fetchCatalogoPublico().then(({ tipos }) => setCatalogo(tipos));
  }, []);

  const categorias: CategoriaTramite[] = ['constancia', 'aval', 'certificado'];

  return (
    <div className="min-h-screen bg-background">
      {/* Cabecera */}
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="font-display text-lg font-semibold tracking-tight whitespace-nowrap shrink-0"
          >
            Resguardo Pueblo Nuevo
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="secondary" size="sm">
              <Link to="/autoservicio" search={{ tab: 'consultar' }}>
                <Search className="h-4 w-4" />
                Consultar radicado
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/autoservicio" search={{ tab: 'validar' }}>
                <QrCode className="h-4 w-4" />
                Validar QR
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

        <div className="mx-auto max-w-6xl px-6 pb-12 pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-foreground/80 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
          <h1 className="mt-3 text-balance text-3xl font-semibold md:text-4xl">
            Trámites y documentos
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/90 md:text-base">
            Consulte las condiciones, tarifas y requisitos de cada constancia, aval o certificado y
            seleccione el que desea solicitar para continuar al autoservicio con su documento.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Instrucciones generales RN1 - RN6 */}
        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Instrucciones antes de radicar su solicitud
          </h2>
          <div className="mt-4 grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
            <div>
              <p className="font-semibold text-foreground">Censo activo y residencia (RN1–RN3)</p>
              <p className="mt-1">
                Debe figurar activo en el censo presencial del Cabildo y contar con más de 365 días
                de residencia continua en su vereda.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Trabajo social y visto bueno (RN4–RN5)</p>
              <p className="mt-1">
                Los avales de estudio y trabajo requieren trabajo social vigente del último año y
                aprobación de la Autoridad Tradicional.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Tarifa y descarga con QR (RN6)</p>
              <p className="mt-1">
                Las constancias gratuitas se emiten al instante. Los documentos con tarifa se pagan
                en Tesorería con el número de radicado.
              </p>
            </div>
          </div>
        </section>

        {/* Acordeón por categoría */}
        <section className="mt-8 space-y-4">
          {categorias.map((cat) => {
            const meta = CATEGORIA_META[cat];
            const items = catalogo.filter((d) => d.categoria === cat && d.activo);
            const isOpen = abierto[cat];

            return (
              <div key={cat} className="overflow-hidden rounded-xl border bg-card">
                <button
                  type="button"
                  onClick={() => setAbierto((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/40 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="font-display text-xl font-semibold text-foreground">
                        {meta.titulo}
                      </h2>
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">
                        · {items.length} {items.length === 1 ? 'trámite' : 'trámites'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{meta.subtitulo}</p>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-150 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="divide-y border-t">
                    {items.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col justify-between gap-4 px-6 py-5 md:flex-row md:items-center"
                      >
                        <div className="max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-foreground">{doc.nombre}</h3>
                            <span aria-hidden="true" className="text-muted-foreground">
                              ·
                            </span>
                            <span className="font-mono text-xs font-semibold tabular-nums text-accent">
                              {formatCOP(doc.tarifa_cop)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm text-muted-foreground">{doc.descripcion}</p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              Censo activo (RN1)
                            </span>
                            {doc.requiere_residencia_365 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Residencia &gt; 365 días (RN2)</span>
                              </>
                            )}
                            {doc.requiere_trabajo_social && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Trabajo social último año (RN4)</span>
                              </>
                            )}
                            {doc.requiere_visto_bueno && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Visto bueno Autoridad (RN5)</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Button asChild>
                            <Link to="/autoservicio" search={{ tab: 'solicitar', tipo: doc.id }}>
                              <span>Solicitar trámite</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Prototipo de Sistema de Información Censal y Documental — Proyecto de Grado, UNAD Caldono.
      </footer>
    </div>
  );
}
