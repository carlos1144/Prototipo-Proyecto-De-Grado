import { Link, useSearch } from '@tanstack/react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Ventanilla, type VentanillaTab } from '@/src/components/ventanilla';
import { TIPOS_DOCUMENTO_INICIALES } from '@/src/lib/catalog';

export function Autoservicio() {
  const search = useSearch({ strict: false }) as {
    tab?: VentanillaTab;
    tipo?: string;
    codigo?: string;
  };

  const tipoSeleccionado = TIPOS_DOCUMENTO_INICIALES.find((t) => t.id === search.tipo);

  return (
    <div className="min-h-screen bg-background">
      {/* Cabecera institucional */}
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="font-display text-lg font-semibold tracking-tight whitespace-nowrap shrink-0"
          >
            Resguardo Pueblo Nuevo
          </Link>

          <div className="flex items-center gap-3">
            <Button asChild variant="secondary" size="sm">
              <Link to="/tramites">Trámites y documentos</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/ingreso">
                <Lock className="h-4 w-4" />
                Acceso funcionarios
              </Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-6">
          <Link
            to="/tramites"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-foreground/85 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al catálogo de trámites y documentos
          </Link>
          <h1 className="mt-3 text-balance text-3xl font-semibold md:text-4xl">
            Autoservicio directo con su documento
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-primary-foreground/90 md:text-base">
            {tipoSeleccionado
              ? `Trámite seleccionado: ${tipoSeleccionado.nombre}. Digite su tipo y número de identificación para validar requisitos y continuar.`
              : 'Valide sus requisitos con su documento de identidad, consulte el estado de su radicado o verifique la autenticidad de un certificado.'}
          </p>
        </div>
      </header>

      <main className="relative z-10 mx-auto -mt-12 max-w-4xl px-4 pb-16 md:px-6">
        <Ventanilla
          initialTab={search.tab || (search.codigo ? 'validar' : 'solicitar')}
          initialTipoDocId={search.tipo}
          initialCodigo={search.codigo}
        />
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Prototipo de Sistema de Información Censal y Documental — Proyecto de Grado, UNAD Caldono.
      </footer>
    </div>
  );
}
