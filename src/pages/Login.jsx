import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { garantirBancoProntoNoFirebase } from '../services/dbInitializer';
import { Lock, Mail, ShieldAlert, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCarregando(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.approved === false && data.role !== 'master_admin') {
          setError('Sua conta está bloqueada ou aguardando liberação do Administrador.');
          setCarregando(false);
          return;
        }
        if (data.role === 'garcom') {
          navigate('/garcom');
        } else {
          navigate('/admin');
        }
      } else {
        // Primeiro login de conta criada diretamente no Console do Firebase Authentication
        await setDoc(doc(db, 'users', user.uid), {
          nome: user.email?.split('@')[0] || 'Master Admin',
          email: user.email,
          role: 'master_admin',
          approved: true,
          criadoEm: serverTimestamp(),
        });
        await garantirBancoProntoNoFirebase();
        navigate('/admin');
      }
    } catch (err) {
      setError('E-mail ou senha inválidos. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#111217] border border-zinc-800 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#a3e635] text-zinc-950 font-black text-2xl flex items-center justify-center mb-3 shadow-lg shadow-[#a3e635]/20">
            T
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">
            Tappo NFC • Acesso Restrito
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Login exclusivo para Administrador e Garçons
          </p>
        </div>

        <div className="bg-zinc-900/90 border border-zinc-800 text-zinc-300 p-3 rounded-xl text-[11px] mb-5 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-[#a3e635] flex-shrink-0 mt-0.5" />
          <span>
            Cadastro público desativado. Contas de Administrador são criadas exclusivamente pelo Console do Firebase.
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 text-red-400 p-3 rounded-xl text-xs mb-5 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase">E-mail</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@restaurante.com"
                className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 uppercase">Senha</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs py-3.5 rounded-xl transition shadow-lg shadow-red-600/25"
          >
            {carregando ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar para tela inicial QR Code
          </Link>
        </div>
      </div>
    </div>
  );
}
