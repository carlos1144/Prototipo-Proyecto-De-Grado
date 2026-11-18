import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { Autoservicio } from './routes/autoservicio';
import { Index } from './routes/index';
import { Ingreso } from './routes/ingreso';
import { Tramites } from './routes/tramites';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Index,
});

const tramitesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tramites',
  component: Tramites,
});

const autoservicioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/autoservicio',
  component: Autoservicio,
});

const ingresoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ingreso',
  component: Ingreso,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  tramitesRoute,
  autoservicioRoute,
  ingresoRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
