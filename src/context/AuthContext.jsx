import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { garantirBancoProntoNoFirebase } from '../services/dbInitializer';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Garante que a estrutura pré-pronta (loja, cardápio, mesas) exista no Firestore
    garantirBancoProntoNoFirebase();

    let unsubProfile = null;
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      unsubProfile = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (snap) => {
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() });
          } else {
            // Conta criada direto no Firebase Auth Console assume master_admin
            setProfile({
              id: firebaseUser.uid,
              email: firebaseUser.email,
              nome: firebaseUser.email?.split('@')[0] || 'Administrador',
              role: 'master_admin',
              approved: true,
            });
          }
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin =
    Boolean(user) &&
    Boolean(profile) &&
    profile.approved !== false &&
    (profile.role === 'admin' || profile.role === 'master_admin');

  const isGarcom =
    Boolean(user) &&
    Boolean(profile) &&
    profile.approved !== false &&
    profile.role === 'garcom';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isGarcom, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
