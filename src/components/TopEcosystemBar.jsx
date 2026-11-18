import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { CONFIG_LOJA_PADRAO } from '../data/menuData';
import {
  Smartphone,
  Flame,
  CreditCard,
  QrCode,
  Users,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

/**
 * Barra superior completa do ecossistema — renderizada EXCLUSIVAMENTE
 * quando o usuário autenticado é Administrador (isAdmin).
 */
export default function TopEcosystemBar({ mesaAtual = 'M04' }) {
  const { isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [pedidosCozinha, setPedidosCozinha] = useState(0);
  const [chamadosGarcom, setChamadosGarcom] = useState(0);
  const [nomeLoja, setNomeLoja] = useState(CONFIG_LOJA_PADRAO.nomeRestaurante);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubConfig = onSnapshot(
      doc(db, 'config_loja', 'geral'),
      (snap) => {
        if (snap.exists() && snap.data().nomeRestaurante) {
          setNomeLoja(snap.data().nomeRestaurante);
        }
      },
      () => {}
    );

    const unsubPedidos = onSnapshot(
      collection(db, 'pedidos'),
      (snap) => {
        const ativos = snap.docs.filter((d) => d.data().status !== 'entregue').length;
        setPedidosCozinha(ativos);
      },
      () => {}
    );

    const unsubChamados = onSnapshot(
      collection(db, 'chamados_garcom'),
      (snap) => {
        const abertos = snap.docs.filter((d) => !d.data().resolvido).length;
        setChamadosGarcom(abertos);
      },
      () => {}
    );

    return () => {
      unsubConfig();
      unsubPedidos();
      unsubChamados();
    };
  }, [isAdmin]);

  // Cliente e Garçom NÃO veem o board completo do Administrador
  if (!isAdmin) return null;

  const numMesaLabel = String(mesaAtual || '04').replace(/^M/i, '').padStart(2, '0');
  const mesaTokenPath = String(mesaAtual || 'M04').toUpperCase().startsWith('M')
    ? String(mesaAtual || 'M04').toUpperCase()
    : `M${numMesaLabel}`;

  const isAdminPage = location.pathname === '/admin';
  const isCliente = location.pathname === '/' || location.pathname.startsWith('/m/');
  const isCozinha = location.pathname === '/cozinha';
  const isCaixa = location.pathname === '/caixa';
  const isGarcom = location.pathname === '/garcom';
  const isRecepcao = location.pathname === '/recepcao';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 pt-3 pb-2 z-40">
      <div className="bg-[#111217]/95 backdrop-blur-md border border-zinc-800/90 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        {/* Identidade Tappo NFC */}
        <Link to="/admin" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#a3e635] text-zinc-950 font-black text-lg flex items-center justify-center shadow-md shadow-[#a3e635]/20 group-hover:scale-105 transition">
            T
          </div>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight text-white">
              Tappo NFC <span className="text-zinc-500">•</span>{' '}
              <span className="text-white">{nomeLoja}</span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Board Completo do Administrador
            </div>
          </div>
        </Link>

        {/* Navegação Completa do ADM */}
        <nav className="flex flex-wrap items-center gap-1.5 bg-[#090a0d] border border-zinc-800/80 p-1 rounded-xl">
          <Link
            to="/admin"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              isAdminPage
                ? 'bg-[#a3e635] text-zinc-950 shadow-md shadow-[#a3e635]/25'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Painel ADM</span>
          </Link>

          <Link
            to={`/m/${mesaTokenPath}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              isCliente
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Cliente (Mesa {numMesaLabel})</span>
          </Link>

          <Link
            to="/cozinha"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              isCozinha
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Cozinha</span>
            {pedidosCozinha > 0 && (
              <span className="bg-amber-400 text-zinc-950 font-black text-[10px] px-1.5 rounded-full">
                {pedidosCozinha}
              </span>
            )}
          </Link>

          <Link
            to="/caixa"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              isCaixa
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-sky-400" />
            <span>Caixa / PDV</span>
          </Link>

          <Link
            to="/garcom"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              isGarcom
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Garçom</span>
            {chamadosGarcom > 0 && (
              <span className="bg-red-500 text-white font-black text-[10px] px-1.5 rounded-full animate-pulse">
                {chamadosGarcom}
              </span>
            )}
          </Link>

          <Link
            to="/recepcao"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              isRecepcao
                ? 'bg-red-600 text-white shadow-md shadow-red-600/25'
                : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#a3e635]" />
            <span>QR Mesas</span>
          </Link>
        </nav>

        {/* Status + Botão Sair */}
        <div className="flex items-center gap-3">
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ADM Online</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="bg-zinc-900 hover:bg-red-600/20 border border-zinc-800 hover:border-red-500/40 text-zinc-300 hover:text-red-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
