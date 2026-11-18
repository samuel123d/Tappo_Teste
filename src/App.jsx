import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import QrGatePage from './pages/QrGatePage';
import CardapioCliente from './pages/CardapioCliente';
import Cozinha from './pages/Cozinha';
import CaixaPDV from './pages/CaixaPDV';
import Garcom from './pages/Garcom';
import RecePCAo from './pages/RecePCAo';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Bloqueio na raiz: exige leitura do QR Code / path da mesa */}
          <Route path="/" element={<QrGatePage />} />

          {/* Cardápio Digital: acessível SOMENTE pelo path do QR Code da mesa */}
          <Route path="/m/:nfcToken" element={<CardapioCliente />} />

          {/* Tela de Autenticação (Somente Login — sem auto-cadastro) */}
          <Route path="/login" element={<Login />} />

          {/* Rota do Garçom (Acessível para Garçom autenticado e ADM) */}
          <Route
            path="/garcom"
            element={
              <ProtectedRoute allow={['garcom', 'admin']}>
                <Garcom />
              </ProtectedRoute>
            }
          />

          {/* Rotas Exclusivas do Administrador (Board Completo) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allow={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cozinha"
            element={
              <ProtectedRoute allow={['admin']}>
                <Cozinha />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caixa"
            element={
              <ProtectedRoute allow={['admin']}>
                <CaixaPDV />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recepcao"
            element={
              <ProtectedRoute allow={['admin']}>
                <RecePCAo />
              </ProtectedRoute>
            }
          />

          {/* Qualquer outra rota desconhecida cai no bloqueio de QR Code */}
          <Route path="*" element={<QrGatePage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
