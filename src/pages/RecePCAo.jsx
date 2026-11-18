import React, { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import TopEcosystemBar from '../components/TopEcosystemBar';
import QrCodeBox from '../components/QrCodeBox';
import {
  QrCode,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Smartphone,
  Download,
} from 'lucide-react';

export default function RecePCAo() {
  const [mesas, setMesas] = useState([]);
  const [gerando, setGerando] = useState(false);
  const [copiadoId, setCopiadoId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'mesas'),
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => {
          const numA = parseInt(String(a.token || a.numero || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.token || b.numero || '').replace(/\D/g, ''), 10) || 0;
          return numA - numB;
        });
        setMesas(lista);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const calcularProximoNumero = () => {
    if (mesas.length === 0) return 1;
    const usados = new Set(
      mesas
        .map((m) => parseInt(String(m.token || m.numero || '').replace(/\D/g, ''), 10))
        .filter((n) => !Number.isNaN(n) && n > 0)
    );
    let candidato = 1;
    while (usados.has(candidato)) {
      candidato += 1;
    }
    return candidato;
  };

  const gerarProximaMesa = async () => {
    if (gerando) return;
    setGerando(true);
    try {
      const proximoNum = calcularProximoNumero();
      const codigoFormatado = `M${String(proximoNum).padStart(2, '0')}`;
      await addDoc(collection(db, 'mesas'), {
        numero: `Mesa ${String(proximoNum).padStart(2, '0')}`,
        codigo: codigoFormatado,
        token: codigoFormatado,
        ativa: true,
        criadoEm: serverTimestamp(),
      });
    } finally {
      setGerando(false);
    }
  };

  const copiarLink = async (mesa) => {
    const url = `${window.location.origin}/m/${mesa.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {}
    setCopiadoId(mesa.id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const baixarQrPng = (mesa) => {
    const svgEl = document.getElementById(`qr-svg-${mesa.id}`);
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const link = document.createElement('a');
      link.download = `QRCode_${mesa.token}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  const removerMesa = async (mesa) => {
    await deleteDoc(doc(db, 'mesas', mesa.id));
  };

  const proximoPreview = `M${String(calcularProximoNumero()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col">
      <TopEcosystemBar mesaAtual={mesas[0]?.token || 'M01'} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="bg-[#111217] border border-zinc-800/90 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black">
                GERADOR DE QR CODE NFC DAS MESAS
              </h1>
              <p className="text-zinc-400 text-xs mt-0.5">
                Ao ler o QR Code pelo celular, o cliente abre direto o Cardápio Digital da mesa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={gerarProximaMesa}
            disabled={gerando}
            className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-black text-xs px-5 py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/25"
          >
            <Sparkles className="w-4 h-4" />
            {gerando ? 'Gerando...' : `Gerar Próxima Mesa (${proximoPreview})`}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {mesas.map((m) => {
            const urlMesa = `${window.location.origin}/m/${m.token}`;
            return (
              <div
                key={m.id}
                className="bg-[#111217] border border-zinc-800 hover:border-[#a3e635]/60 p-5 rounded-3xl flex flex-col items-center text-center space-y-4 shadow-xl relative transition"
              >
                <button
                  type="button"
                  onClick={() => removerMesa(m)}
                  title="Remover mesa"
                  className="absolute top-4 right-4 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#a3e635] bg-[#a3e635]/15 border border-[#a3e635]/30 px-3 py-1 rounded-full">
                    {m.codigo || m.token}
                  </span>
                  <h3 className="text-lg font-black mt-2">{m.numero}</h3>
                </div>

                {/* QR Code ISO 100% escaneável */}
                <QrCodeBox id={`qr-svg-${m.id}`} value={urlMesa} size={160} />

                <p className="text-[11px] text-zinc-400 font-mono break-all">
                  /m/{m.token}
                </p>

                <div className="w-full space-y-2">
                  <a
                    href={`/m/${m.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20"
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Testar Cardápio da Mesa
                  </a>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copiarLink(m)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      {copiadoId === m.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Link
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => baixarQrPng(m)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-[#a3e635] text-zinc-200 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                      title="Baixar QR Code para imprimir"
                    >
                      <Download className="w-3.5 h-3.5 text-[#a3e635]" /> Baixar QR
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
