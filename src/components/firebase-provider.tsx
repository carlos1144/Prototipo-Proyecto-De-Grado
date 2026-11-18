import * as React from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { obtenerOCrearPerfilFuncionario } from '../lib/firestore-service';
import type { Funcionario } from '../types/domain';

interface FirebaseContextValue {
  user: User | null;
  funcionario: Funcionario | null;
  authReady: boolean;
  authError: string | null;
  signingIn: boolean;
  iniciarSesionGoogle: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
  recargarPerfil: () => Promise<void>;
}

const FirebaseContext = React.createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [funcionario, setFuncionario] = React.useState<Funcionario | null>(null);
  const [authReady, setAuthReady] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);

  const cargarPerfil = React.useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setFuncionario(null);
      return;
    }
    try {
      const perfil = await obtenerOCrearPerfilFuncionario(currentUser);
      setFuncionario(perfil);
    } catch (err) {
      console.error('Error cargando perfil de funcionario:', err);
      setFuncionario(null);
    }
  }, []);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      await cargarPerfil(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, [cargarPerfil]);

  const iniciarSesionGoogle = React.useCallback(async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No fue posible iniciar sesión con Google.';
      setAuthError(message);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const cerrarSesion = React.useCallback(async () => {
    await signOut(auth);
    setFuncionario(null);
  }, []);

  const recargarPerfil = React.useCallback(async () => {
    await cargarPerfil(auth.currentUser);
  }, [cargarPerfil]);

  const value = React.useMemo<FirebaseContextValue>(
    () => ({
      user,
      funcionario,
      authReady,
      authError,
      signingIn,
      iniciarSesionGoogle,
      cerrarSesion,
      recargarPerfil,
    }),
    [user, funcionario, authReady, authError, signingIn, iniciarSesionGoogle, cerrarSesion, recargarPerfil],
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebaseAuth() {
  const ctx = React.useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth debe usarse dentro de FirebaseProvider');
  }
  return ctx;
}
