import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allow = ['admin'] }) {
  const { user, profile, loading, isAdmin, isGarcom } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="w-3 h-3 rounded-full bg-[#a3e635] animate-ping" />
          <span>Verificando credenciais...</span>
        </div>
      </div>
    );
  }

  if (!user || !profile || profile.approved === false) {
    return <Navigate to="/login" replace />;
  }

  if (allow.includes('admin') && isAdmin) {
    return children;
  }

  if (allow.includes('garcom') && isGarcom) {
    return children;
  }

  // Se for garçom tentando acessar rota exclusiva de ADM, envia para /garcom
  if (isGarcom) {
    return <Navigate to="/garcom" replace />;
  }

  return <Navigate to="/login" replace />;
}
