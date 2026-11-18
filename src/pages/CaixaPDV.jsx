import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { obterDataHoraAtualBR } from '../utils/orderUtils';
import TopEcosystemBar from '../components/TopEcosystemBar';
import { CreditCard, BellRing, CheckCircle2 } from 'lucide-react';

export default function CaixaPDV() {
  const { user, profile } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [mesasCodigos, setMesasCodigos] = useState(['M01', 'M02', 'M03', 'M04']);
  const [mesaSelecionada, setMesaSelecionada] = useState('M01');
  const [metodoPDV, setMetodoPDV] = useState('Cartão');

  const nomeOperador = profile?.nome || profile?.email || 'Caixa / ADM';

  useEffect(() => {
    const unsubPedidos = onSnapshot(
      collection(db, 'pedidos'),
      (snap) => {
        setPedidos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    const unsubChamados = onSnapshot(
      collection(db, 'chamados_garcom'),
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
        setChamados(lista);
      },
      () => {}
    );

    const unsubMesas = onSnapshot(
      collection(db, 'mesas'),
      (snap) => {
        if (!snap.empty) {
          const cods = snap.docs
            .map((d) => String(d.data().token || '').toUpperCase())
            .filter(Boolean);
          const unicos = Array.from(new Set(cods)).sort();
          setMesasCodigos(unicos);
          if (!unicos.includes(mesaSelecionada) && unicos.length > 0) {
            setMesaSelecionada(unicos[0]);
          }
        }
      },
      () => {}
    );

    return () => {
      unsubPedidos();
      unsubChamados();
      unsubMesas();
    };
  }, []);

  const pedidosNaoLiberados = pedidos.filter((p) => p.mesaLiberada !== true);
  const pedidosPagos = pedidos.filter((p) => p.pago === true);
  const faturamentoTurno = pedidosPagos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);

  const infoMesa = (codigo) => {
    const daMesa = pedidosNaoLiberados.filter(
      (p) => String(p.mesaToken || '').toUpperCase() === codigo
    );
    const total = daMesa.reduce(
      (acc, p) =>
        acc +
        (typeof p.total === 'number'
          ? p.total
          : (p.itens || []).reduce((s, i) => s + (Number(i.preco) || 0), 0)),
      0
    );
    const pediuConta = daMesa.some((p) => p.pediuConta);
    return {
      pedidos: daMesa,
      total,
      status: pediuConta ? 'PEDIU CONTA' : daMesa.length > 0 ? 'OCUPADA' : 'LIVRE',
    };
  };

  const mesasAtivasCount = mesasCodigos.filter((c) => infoMesa(c).pedidos.length > 0).length;
  const detalhesSelecionada = infoMesa(mesaSelecionada);

  const confirmarPagamentoELiberarMesa = async () => {
    const { data, hora, dataHora } = obterDataHoraAtualBR();
    const lista = detalhesSelecionada.pedidos;
    if (lista.length === 0) return;

    for (const p of lista) {
      await updateDoc(doc(db, 'pedidos', p.id), {
        pago: true,
        pagamentoStatus: 'pago',
        mesaLiberada: true,
        status: 'entregue',
        retiradoBalcao: true,
        metodoPagamento: metodoPDV,
        garcomAtendeuNome: p.garcomAtendeuNome || nomeOperador,
        garcomPagamentoId: user?.uid || null,
        garcomPagamentoNome: nomeOperador,
        dataPagamento: data,
        horaPagamento: hora,
        dataHoraPagamento: dataHora,
        horaLiberacaoMesa: hora,
        pagoEm: serverTimestamp(),
      });
    }

    for (const c of chamados) {
      if (!c.resolvido && String(c.mesa || '').toUpperCase() === mesaSelecionada) {
        await updateDoc(doc(db, 'chamados_garcom', c.id), {
          resolvido: true,
          atendidoPor: nomeOperador,
          horaAtendimento: hora,
        });
      }
    }

    await addDoc(collection(db, 'historico_atendimentos'), {
      mesaToken: mesaSelecionada,
      mesaNumero: `Mesa ${mesaSelecionada.replace(/^M/i, '').padStart(2, '0')}`,
      clientes: Array.from(new Set(lista.map((p) => p.nomeCliente).filter(Boolean))),
      codigosPedidos: lista.map((p) => p.codigoPedido).filter(Boolean),
      quantidadePedidos: lista.length,
      metodoPagamento: metodoPDV,
      totalPago: detalhesSelecionada.total,
      garcomFechamentoNome: nomeOperador,
      dataFechamento: data,
      horaFechamento: hora,
      dataHoraFechamento: dataHora,
      criadoEm: serverTimestamp(),
    });
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col">
      <TopEcosystemBar mesaAtual={mesaSelecionada} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        <div className="bg-[#111217] border border-zinc-800/90 p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight">
                CAIXA &amp; GESTÃO DE MESAS NFC
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Frente de caixa, chamados de garçom e recebimento de maquininhas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#16171d] border border-zinc-800 px-4 py-2 rounded-2xl">
              <span className="block text-[10px] font-bold uppercase text-zinc-400">
                FATURAMENTO REGISTRADO
              </span>
              <span className="text-base font-black text-[#a3e635]">
                R$ {faturamentoTurno.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="bg-[#16171d] border border-zinc-800 px-4 py-2 rounded-2xl">
              <span className="block text-[10px] font-bold uppercase text-zinc-400">
                MESAS OCUPADAS
              </span>
              <span className="text-base font-black text-white">
                {String(mesasAtivasCount).padStart(2, '0')} /{' '}
                {String(mesasCodigos.length).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#111217] border border-zinc-800/90 p-5 rounded-3xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                  MAPA DE MESAS NFC
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Livre
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Ocupada
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Pediu Conta
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {mesasCodigos.map((codigo) => {
                  const dados = infoMesa(codigo);
                  const selecionada = mesaSelecionada === codigo;
                  const num = codigo.replace(/^M/i, '').padStart(2, '0');
                  return (
                    <button
                      key={codigo}
                      type="button"
                      onClick={() => setMesaSelecionada(codigo)}
                      className={`p-4 rounded-2xl border text-left transition ${
                        selecionada
                          ? 'bg-[#171920] border-[#a3e635] shadow-lg shadow-[#a3e635]/10'
                          : 'bg-[#16171d] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-black text-white">Mesa {num}</span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                            dados.status === 'LIVRE'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : dados.status === 'PEDIU CONTA'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {dados.status}
                        </span>
                      </div>
                      <p className="text-base font-black text-white mt-2">
                        R$ {dados.total.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {dados.pedidos.length > 0
                          ? `${dados.pedidos.length} pedido(s) ativo(s)`
                          : 'Disponível NFC'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#111217] border border-zinc-800/90 p-5 rounded-3xl space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" /> ALERTAS E CHAMADOS NFC EM TEMPO REAL
              </h2>

              <div className="space-y-2.5">
                {chamados
                  .filter((c) => !c.resolvido)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-[#16171d] border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-[#a3e635]/20 text-[#a3e635] font-black text-xs px-2.5 py-1 rounded-lg">
                          {c.mesa}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Chamado NFC: {c.motivo || 'Atendimento na mesa'}
                          </p>
                          {c.observacao && (
                            <p className="text-[11px] text-zinc-400">{c.observacao}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateDoc(doc(db, 'chamados_garcom', c.id), {
                            resolvido: true,
                            atendidoPor: nomeOperador,
                          })
                        }
                        className="text-xs font-bold text-emerald-400 hover:underline"
                      >
                        Atender ✓
                      </button>
                    </div>
                  ))}
                {chamados.filter((c) => !c.resolvido).length === 0 && (
                  <p className="text-xs text-zinc-500 py-3">Nenhum alerta ativo no momento.</p>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#111217] border border-zinc-800/90 p-6 rounded-3xl flex flex-col justify-between min-h-[430px] shadow-xl">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#a3e635]">
                    DETALHAMENTO PDV
                  </span>
                  <h2 className="text-2xl font-black text-white mt-0.5">
                    Mesa {mesaSelecionada.replace(/^M/i, '').padStart(2, '0')}
                  </h2>
                </div>

                <div className="border-t border-zinc-800 pt-4 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                    PEDIDOS &amp; ITENS ABERTOS
                  </span>
                  {detalhesSelecionada.pedidos.length > 0 ? (
                    detalhesSelecionada.pedidos.map((ped) => (
                      <div
                        key={ped.id}
                        className="bg-[#16171d] border border-zinc-800 rounded-2xl p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-800/70 pb-1.5">
                          <span className="font-mono font-black text-[#a3e635]">
                            {ped.codigoPedido || `#${ped.numeroPedido || ped.id.slice(0, 4)}`}
                          </span>
                          <span className="text-zinc-300 font-bold">
                            Cliente: {ped.nomeCliente || 'Cliente'}
                          </span>
                        </div>
                        {(ped.itens || []).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-white font-semibold">1x {item.nome}</span>
                            <span className="text-emerald-400 font-black">
                              R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-500 py-6">Nenhum item aberto nesta mesa.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-semibold">Total a Receber</span>
                  <span className="text-2xl font-black text-[#a3e635]">
                    R$ {detalhesSelecionada.total.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {detalhesSelecionada.pedidos.length > 0 && (
                  <select
                    value={metodoPDV}
                    onChange={(e) => setMetodoPDV(e.target.value)}
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold"
                  >
                    <option value="Cartão">Forma de Pagamento: Cartão</option>
                    <option value="PIX">Forma de Pagamento: PIX</option>
                    <option value="Dinheiro">Forma de Pagamento: Dinheiro</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={confirmarPagamentoELiberarMesa}
                  disabled={detalhesSelecionada.pedidos.length === 0}
                  className="w-full bg-[#a3e635] hover:bg-[#bef264] disabled:opacity-40 text-zinc-950 font-black text-xs py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#a3e635]/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  CONFIRMAR PAGAMENTO &amp; LIBERAR{' '}
                  {mesaSelecionada.replace(/^M/i, 'MESA ')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
