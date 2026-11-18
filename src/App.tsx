import { RouterProvider } from '@tanstack/react-router';
import { ErrorBoundary } from './components/error-boundary';
import { FirebaseProvider } from './components/firebase-provider';
import { router } from './router';

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <RouterProvider router={router} />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
