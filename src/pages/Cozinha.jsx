import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import TopEcosystemBar from '../components/TopEcosystemBar';
import { Flame, CheckCircle2, Clock } from 'lucide-react';

export default function Cozinha() {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'pedidos'),
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
        setPedidos(lista);
      },
      () => {}
    );
    return () => unsub();
  }, []);

  const atualizarStatus = async (id, novoStatus) => {
    await updateDoc(doc(db, 'pedidos', id), { status: novoStatus });
  };

  const agruparItens = (pedido) => {
    if (Array.isArray(pedido.itensAgrupados) && pedido.itensAgrupados.length > 0) {
      return pedido.itensAgrupados;
    }
    const mapa = {};
    (pedido.itens || []).forEach((it) => {
      const key = `${it.nome}-${(it.ingredientesRemovidos || []).join(',')}`;
      if (!mapa[key]) {
        mapa[key] = {
          nome: it.nome || 'Item',
          qtd: 0,
          ingredientesRemovidos: it.ingredientesRemovidos || [],
          adicionaisSelecionados: it.adicionaisSelecionados || [],
          observacao: it.observacao || '',
        };
      }
      mapa[key].qtd += 1;
    });
    return Object.values(mapa);
  };

  const novos = pedidos.filter((p) => p.status === 'pendente');
  const preparo = pedidos.filter((p) => p.status === 'preparando');
  const prontos = pedidos.filter((p) => p.status === 'pronto');

  const renderCardPedido = (p, acaoLabel, proximoStatus, btnClass, borderClass) => (
    <div
      key={p.id}
      className={`bg-[#16171d] border ${borderClass} rounded-2xl p-4 space-y-3 shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-white text-zinc-950 font-black text-[11px] px-2.5 py-0.5 rounded-md uppercase">
            {String(p.mesaToken || 'M01').replace(/^M/i, 'MESA ')}
          </span>
          <span className="text-xs text-zinc-400 font-bold">
            #{p.numeroPedido || p.id.slice(0, 4)}
          </span>
        </div>
        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Tempo real
        </span>
      </div>

      <ul className="space-y-2">
        {agruparItens(p).map((item, idx) => (
          <li key={idx} className="text-xs border-b border-zinc-800/70 pb-2 last:border-b-0">
            <div>
              <span className="text-red-400 font-black mr-1.5">{item.qtd}x</span>
              <span className="font-bold text-white">{item.nome}</span>
            </div>

            {item.ingredientesRemovidos?.length > 0 && (
              <span className="block text-[11px] text-red-400 font-extrabold pl-5 mt-0.5">
                ✕ TIRAR: {item.ingredientesRemovidos.join(', ')}
              </span>
            )}

            {item.adicionaisSelecionados?.length > 0 && (
              <span className="block text-[11px] text-[#a3e635] font-extrabold pl-5 mt-0.5">
                + EXTRAS:{' '}
                {item.adicionaisSelecionados.map((e) => `${e.qtd}x ${e.nome}`).join(', ')}
              </span>
            )}

            {(item.observacao || item.obs) && (
              <span className="block text-[11px] text-amber-400 pl-5 mt-0.5">
                ↳ {item.observacao || item.obs}
              </span>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => atualizarStatus(p.id, proximoStatus)}
        className={`w-full ${btnClass} font-black text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5`}
      >
        {acaoLabel}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col">
      <TopEcosystemBar />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        <div className="bg-[#111217] border border-zinc-800/90 p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight">
                BARCO DA COZINHA • KDS
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Fila de produção em tempo real integrada às mesas NFC
              </p>
            </div>
          </div>

          <span className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300">
            Pedidos Ativos: <strong className="text-[#a3e635]">{novos.length + preparo.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* NA FILA */}
          <div className="bg-[#111217] border border-zinc-800/90 rounded-3xl p-4 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <h2 className="text-xs font-black uppercase tracking-wider">NA FILA (NOVOS)</h2>
              </div>
              <span className="bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-black px-2.5 py-0.5 rounded-lg">
                {novos.length}
              </span>
            </div>
            <div className="space-y-4">
              {novos.map((p) =>
                renderCardPedido(
                  p,
                  <>
                    <Flame className="w-4 h-4" /> Iniciar Preparo
                  </>,
                  'preparando',
                  'bg-amber-500 hover:bg-amber-400 text-zinc-950',
                  'border-red-500/45'
                )
              )}
              {novos.length === 0 && (
                <p className="text-center text-xs text-zinc-500 py-16">
                  Nenhum pedido novo na fila
                </p>
              )}
            </div>
          </div>

          {/* NA CHAPA / PREPARO */}
          <div className="bg-[#111217] border border-zinc-800/90 rounded-3xl p-4 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h2 className="text-xs font-black uppercase tracking-wider">NA CHAPA / PREPARO</h2>
              </div>
              <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black px-2.5 py-0.5 rounded-lg">
                {preparo.length}
              </span>
            </div>
            <div className="space-y-4">
              {preparo.map((p) =>
                renderCardPedido(
                  p,
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Marcar Pronto
                  </>,
                  'pronto',
                  'bg-[#a3e635] hover:bg-[#bef264] text-zinc-950',
                  'border-amber-500/45'
                )
              )}
              {preparo.length === 0 && (
                <p className="text-center text-xs text-zinc-500 py-16">
                  Nenhum prato na chapa agora
                </p>
              )}
            </div>
          </div>

          {/* PRONTO P/ ENTREGA */}
          <div className="bg-[#111217] border border-zinc-800/90 rounded-3xl p-4 flex flex-col min-h-[480px]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#a3e635]" />
                <h2 className="text-xs font-black uppercase tracking-wider">PRONTO P/ ENTREGA</h2>
              </div>
              <span className="bg-[#a3e635]/20 border border-[#a3e635]/40 text-[#a3e635] text-xs font-black px-2.5 py-0.5 rounded-lg">
                {prontos.length}
              </span>
            </div>
            <div className="space-y-4">
              {prontos.map((p) =>
                renderCardPedido(
                  p,
                  'Confirmar Saída do Balcão',
                  'entregue',
                  'bg-zinc-800 hover:bg-zinc-700 text-white',
                  'border-[#a3e635]/45'
                )
              )}
              {prontos.length === 0 && (
                <p className="text-center text-xs text-zinc-500 py-16">
                  Nenhum prato aguardando
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
