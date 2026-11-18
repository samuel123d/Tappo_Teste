import React from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Smartphone, Lock, ShieldCheck } from 'lucide-react';

export default function QrGatePage() {
  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#111217] border border-zinc-800/90 rounded-[32px] p-8 text-center space-y-6 shadow-2xl">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-[#a3e635] text-zinc-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-[#a3e635]/20 mb-4">
            T
          </div>
          <span className="inline-flex items-center gap-1.5 bg-red-600/15 border border-red-500/30 text-red-400 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
            <QrCode className="w-3.5 h-3.5" /> Acesso Exclusivo via QR Code
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Escaneie o QR Code da sua Mesa
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            O cardápio digital só é liberado através do link exclusivo do{' '}
            <strong className="text-white">QR Code</strong> ou{' '}
            <strong className="text-white">tag NFC</strong> instalada na mesa do estabelecimento.
          </p>
        </div>

        <div className="bg-[#16171d] border border-zinc-800 rounded-2xl p-4 space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#a3e635]/15 border border-[#a3e635]/30 text-[#a3e635] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">Como acessar o cardápio:</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                1. Abra a câmera do seu celular.<br />
                2. Aponte para o QR Code da sua mesa.<br />
                3. Toque no link exibido para abrir sua comanda.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" /> Tappo NFC
          </span>
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-white font-bold transition"
          >
            <Lock className="w-3 h-3" /> Acesso Equipe / ADM
          </Link>
        </div>
      </div>
    </div>
  );
}
