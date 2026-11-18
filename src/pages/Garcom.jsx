import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Users,
  BellRing,
  Check,
  ShoppingBag,
  CreditCard,
  PackageCheck,
  Clock,
  MessageSquare,
  LogOut,
  CheckCircle2,
  User,
  Hash,
  UtensilsCrossed,
} from 'lucide-react';

export default function Garcom() {
  const { user, isAdmin, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [mesas, setMesas] = useState([]);
  const [chamados, setChamados] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [filtroMesas, setFiltroMesas] = useState('todas'); // 'todas' | 'chamado' | 'ocupadas' | 'livres'
  const [filtroPedidos, setFiltroPedidos] = useState('ativos');
  const [metodoMesaSelecionado, setMetodoMesaSelecionado] = useState({});
  const [metodoPedidoSelecionado, setMetodoPedidoSelecionado] = useState({});
  const [avisoAcao, setAvisoAcao] = useState('');

  const nomeGarcomAtual = profile?.nome || profile?.email || 'Garçom';

  const notificar = (msg) => {
    setAvisoAcao(msg);
    setTimeout(() => setAvisoAcao((prev) => (prev === msg ? '' : prev)), 4000);
  };

  useEffect(() => {
    const unsubMesas = onSnapshot(
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

    const unsubChamados = onSnapshot(
      collection(db, 'chamados_garcom'),
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => {
          if (Boolean(a.resolvido) !== Boolean(b.resolvido)) {
            return a.resolvido ? 1 : -1;
          }
          return (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0);
        });
        setChamados(lista);
      },
      () => {}
    );

    const unsubPedidos = onSnapshot(
      collection(db, 'pedidos'),
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
        setPedidos(lista);
      },
      () => {}
    );

    return () => {
      unsubMesas();
      unsubChamados();
      unsubPedidos();
    };
  }, []);

  const atenderChamado = async (chamado) => {
    const { data, hora, dataHora } = obterDataHoraAtualBR();
    await updateDoc(doc(db, 'chamados_garcom', chamado.id), {
      resolvido: true,
      atendidoPorId: user?.uid || null,
      atendidoPor: nomeGarcomAtual,
      dataAtendimento: data,
      horaAtendimento: hora,
      dataHoraAtendimento: dataHora,
      atendidoEm: serverTimestamp(),
    });
    notificar(`Chamado da Mesa ${chamado.mesa} atendido por ${nomeGarcomAtual}!`);
  };

  const confirmarEntregaPedido = async (pedido) => {
    const { data, hora, dataHora } = obterDataHoraAtualBR();
    await updateDoc(doc(db, 'pedidos', pedido.id), {
      retiradoBalcao: true,
      status: 'entregue',
      garcomAtendeuId: user?.uid || null,
      garcomAtendeuNome: nomeGarcomAtual,
      garcomAtendeuEmail: profile?.email || null,
      dataAtendimentoBalcao: data,
      horaAtendimentoBalcao: hora,
      dataHoraAtendimentoBalcao: dataHora,
      retiradoEm: serverTimestamp(),
    });
    notificar(
      `Pedido ${pedido.codigoPedido || ''} (${pedido.nomeCliente || 'Cliente'}) entregue na mesa!`
    );
  };

  /**
   * Confirma o pagamento de toda a mesa, registra todos os dados no Firebase
   * (garçom que atendeu, garçom que recebeu, hora exata, forma de pagamento, códigos dos pedidos)
   * e LIBERA a mesa imediatamente para o próximo cliente.
   */
  const confirmarPagamentoELiberarMesa = async (mesaToken, pedidosDaMesa, metodoForcado = null) => {
    const codigoMesa = String(mesaToken || '').toUpperCase();
    const metodo =
      metodoForcado ||
      metodoMesaSelecionado[codigoMesa] ||
      pedidosDaMesa[0]?.formaPagamentoSolicitada ||
      'Cartão';

    const { data, hora, dataHora } = obterDataHoraAtualBR();

    const totalRecebido = pedidosDaMesa.reduce(
      (acc, p) => acc + (Number(p.total) || 0),
      0
    );
    const clientesUnicos = Array.from(
      new Set(pedidosDaMesa.map((p) => p.nomeCliente).filter(Boolean))
    );
    const codigosPedidos = pedidosDaMesa
      .map((p) => p.codigoPedido || `#${p.numeroPedido || p.id.slice(0, 4)}`)
      .filter(Boolean);

    // 1. Atualiza todos os pedidos abertos desta mesa preservando-os no banco com mesaLiberada: true
    for (const p of pedidosDaMesa) {
      await updateDoc(doc(db, 'pedidos', p.id), {
        pago: true,
        pagamentoStatus: 'pago',
        mesaLiberada: true,
        status: 'entregue',
        retiradoBalcao: true,
        metodoPagamento: metodo,
        garcomAtendeuId: p.garcomAtendeuId || user?.uid || null,
        garcomAtendeuNome: p.garcomAtendeuNome || nomeGarcomAtual,
        garcomPagamentoId: user?.uid || null,
        garcomPagamentoNome: nomeGarcomAtual,
        garcomPagamentoEmail: profile?.email || null,
        dataPagamento: data,
        horaPagamento: hora,
        dataHoraPagamento: dataHora,
        horaLiberacaoMesa: hora,
        pagoEm: serverTimestamp(),
      });
    }

    // 2. Resolve quaisquer chamados abertos dessa mesa
    const chamadosDaMesa = chamados.filter(
      (c) => !c.resolvido && String(c.mesa || '').toUpperCase() === codigoMesa
    );
    for (const c of chamadosDaMesa) {
      await updateDoc(doc(db, 'chamados_garcom', c.id), {
        resolvido: true,
        atendidoPorId: user?.uid || null,
        atendidoPor: nomeGarcomAtual,
        horaAtendimento: hora,
        dataHoraAtendimento: dataHora,
        atendidoEm: serverTimestamp(),
      });
    }

    // 3. Registra o fechamento consolidado em historico_atendimentos
    if (pedidosDaMesa.length > 0) {
      await addDoc(collection(db, 'historico_atendimentos'), {
        mesaToken: codigoMesa,
        mesaNumero: `Mesa ${codigoMesa.replace(/^M/i, '').padStart(2, '0')}`,
        clientes: clientesUnicos,
        codigosPedidos,
        quantidadePedidos: pedidosDaMesa.length,
        metodoPagamento: metodo,
        totalPago: totalRecebido,
        garcomFechamentoId: user?.uid || null,
        garcomFechamentoNome: nomeGarcomAtual,
        garcomFechamentoEmail: profile?.email || null,
        dataFechamento: data,
        horaFechamento: hora,
        dataHoraFechamento: dataHora,
        criadoEm: serverTimestamp(),
      });
    }

    notificar(
      `Pagamento (${metodo} • R$ ${totalRecebido
        .toFixed(2)
        .replace('.', ',')}) confirmado! ${codigoMesa} LIBERADA.`
    );
  };

  const formatarHora = (pedidoOuChamado) => {
    if (pedidoOuChamado.horaPedido) return pedidoOuChamado.horaPedido;
    if (pedidoOuChamado.horaChamado) return pedidoOuChamado.horaChamado;
    if (!pedidoOuChamado.criadoEm?.seconds) return 'Agora';
    const date = new Date(pedidoOuChamado.criadoEm.seconds * 1000);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Monta o estado real de cada mesa (Livre, Ocupada, Com Chamado)
  const pedidosNaoLiberados = pedidos.filter((p) => p.mesaLiberada !== true);
  const chamadosAbertos = chamados.filter((c) => !c.resolvido);

  const listaMesasComStatus = (
    mesas.length > 0
      ? mesas
      : [
          { id: 'm1', token: 'M01', numero: 'Mesa 01' },
          { id: 'm2', token: 'M02', numero: 'Mesa 02' },
          { id: 'm3', token: 'M03', numero: 'Mesa 03' },
          { id: 'm4', token: 'M04', numero: 'Mesa 04' },
        ]
  ).map((m) => {
    const codigo = String(m.token || m.codigo || '').toUpperCase();
    const pedidosMesa = pedidosNaoLiberados.filter(
      (p) => String(p.mesaToken || '').toUpperCase() === codigo
    );
    const chamadosMesa = chamadosAbertos.filter(
      (c) => String(c.mesa || '').toUpperCase() === codigo
    );
    const totalMesa = pedidosMesa.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
    const clientes = Array.from(
      new Set(pedidosMesa.map((p) => p.nomeCliente).filter(Boolean))
    );
    const codigos = pedidosMesa.map((p) => p.codigoPedido).filter(Boolean);
    const pediuConta =
      pedidosMesa.some((p) => p.pediuConta) ||
      chamadosMesa.some((c) => String(c.motivo || '').toLowerCase().includes('conta'));

    const temChamado = chamadosMesa.length > 0;
    const ocupada = pedidosMesa.length > 0;

    return {
      ...m,
      codigo,
      pedidosMesa,
      chamadosMesa,
      totalMesa,
      clientes,
      codigos,
      pediuConta,
      temChamado,
      ocupada,
      livre: !ocupada && !temChamado,
    };
  });

  const qtdMesasComChamado = listaMesasComStatus.filter((m) => m.temChamado).length;
  const qtdMesasOcupadas = listaMesasComStatus.filter((m) => m.ocupada).length;
  const qtdMesasLivres = listaMesasComStatus.filter((m) => m.livre).length;

  const mesasFiltradas = listaMesasComStatus.filter((m) => {
    if (filtroMesas === 'chamado') return m.temChamado;
    if (filtroMesas === 'ocupadas') return m.ocupada;
    if (filtroMesas === 'livres') return m.livre;
    return true;
  });

  const prontosNoBalcao = pedidosNaoLiberados.filter(
    (p) => p.status === 'pronto' && !p.retiradoBalcao
  ).length;

  const pedidosFiltrados = pedidosNaoLiberados.filter((p) => {
    if (filtroPedidos === 'ativos') return true;
    if (filtroPedidos === 'balcao') return p.status === 'pronto' && !p.retiradoBalcao;
    if (filtroPedidos === 'pagamento') return !p.pago;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col">
      {/* Se for ADM, mostra a barra completa do board. Se for Garçom, mostra apenas barra exclusiva do Garçom */}
      {isAdmin ? (
        <TopEcosystemBar />
      ) : (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2">
          <div className="bg-[#111217] border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#a3e635] text-zinc-950 font-black text-lg flex items-center justify-center">
                T
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  Tappo NFC • Terminal do Garçom
                </p>
                <p className="text-[11px] text-zinc-400">
                  Garçom Logado: <strong className="text-[#a3e635]">{nomeGarcomAtual}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="bg-zinc-900 hover:bg-red-600/20 border border-zinc-800 hover:border-red-500/40 text-zinc-200 hover:text-red-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-8">
        {/* Cabeçalho + Resumo de Mesas Ocupadas, Livres e com Chamado */}
        <div className="bg-[#111217] border border-zinc-800/90 p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight">
                ÁREA DOS GARÇONS • CONTROLE DO SALÃO
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Veja mesas livres, ocupadas e chamados em tempo real, confirme pagamentos e libere mesas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className="bg-red-950/30 border border-red-500/40 px-3.5 py-2 rounded-2xl text-center">
              <span className="block text-[10px] text-red-300 font-bold uppercase">
                Com Chamado
              </span>
              <span className="text-base font-black text-red-400">{qtdMesasComChamado}</span>
            </div>
            <div className="bg-amber-950/30 border border-amber-500/40 px-3.5 py-2 rounded-2xl text-center">
              <span className="block text-[10px] text-amber-300 font-bold uppercase">
                Mesas Ocupadas
              </span>
              <span className="text-base font-black text-amber-400">{qtdMesasOcupadas}</span>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-500/40 px-3.5 py-2 rounded-2xl text-center">
              <span className="block text-[10px] text-emerald-300 font-bold uppercase">
                Mesas Livres
              </span>
              <span className="text-base font-black text-emerald-400">{qtdMesasLivres}</span>
            </div>
          </div>
        </div>

        {avisoAcao && (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{avisoAcao}</span>
          </div>
        )}

        {/* SEÇÃO 1: MAPA DE MESAS DO SALÃO (OCUPADAS, LIVRES E COM CHAMADO) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-[#a3e635]" /> Situação das Mesas no Salão
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'todas', label: `Todas (${listaMesasComStatus.length})` },
                { key: 'chamado', label: `Com Chamado (${qtdMesasComChamado})` },
                { key: 'ocupadas', label: `Ocupadas (${qtdMesasOcupadas})` },
                { key: 'livres', label: `Livres (${qtdMesasLivres})` },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFiltroMesas(t.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                    filtroMesas === t.key
                      ? 'bg-[#a3e635] text-zinc-950'
                      : 'bg-[#111217] border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mesasFiltradas.map((m) => {
              const borderCard = m.temChamado
                ? 'border-red-500/80 shadow-lg shadow-red-500/15'
                : m.ocupada
                ? 'border-amber-500/60'
                : 'border-emerald-500/35';

              return (
                <div
                  key={m.id}
                  className={`bg-[#111217] border ${borderCard} rounded-3xl p-4 flex flex-col justify-between gap-3.5 transition`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-400">{m.codigo}</span>
                        <h3 className="text-base font-black text-white leading-tight">
                          {m.numero}
                        </h3>
                      </div>

                      {m.temChamado ? (
                        <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse uppercase">
                          CHAMADO
                        </span>
                      ) : m.pediuConta ? (
                        <span className="bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                          PEDIU CONTA
                        </span>
                      ) : m.ocupada ? (
                        <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                          OCUPADA
                        </span>
                      ) : (
                        <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                          LIVRE
                        </span>
                      )}
                    </div>

                    {/* Alerta se tiver chamado ativo na mesa */}
                    {m.temChamado && (
                      <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-2.5 space-y-1.5">
                        {m.chamadosMesa.map((c) => (
                          <div key={c.id} className="text-xs">
                            <p className="font-extrabold text-red-300">
                              🔔 {c.motivo || 'Chamado na mesa'}
                            </p>
                            {c.observacao && (
                              <p className="text-[11px] text-zinc-300">{c.observacao}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => atenderChamado(c)}
                              className="mt-1.5 w-full bg-red-600 hover:bg-red-500 text-white font-black text-[11px] py-1.5 rounded-lg transition"
                            >
                              Atender Chamado ✓
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Informações de ocupação (Clientes, Códigos e Valor) */}
                    {m.ocupada ? (
                      <div className="bg-[#16171d] border border-zinc-800 rounded-2xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-400">Consumo Ativo</span>
                          <span className="text-sm font-black text-[#a3e635]">
                            R$ {m.totalMesa.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        {m.clientes.length > 0 && (
                          <p className="text-[11px] text-white font-bold truncate">
                            Cliente: {m.clientes.join(', ')}
                          </p>
                        )}
                        {m.codigos.length > 0 && (
                          <p className="text-[10px] font-mono text-zinc-400 truncate">
                            Códigos: {m.codigos.join(', ')}
                          </p>
                        )}
                      </div>
                    ) : (
                      !m.temChamado && (
                        <div className="bg-[#16171d]/60 border border-zinc-800/70 rounded-2xl p-3 text-center">
                          <p className="text-xs font-bold text-emerald-400">Mesa Livre</p>
                          <p className="text-[11px] text-zinc-500">
                            Pronta para novo cliente
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  {/* Ação de Confirmar Pagamento & Liberar Mesa */}
                  {m.ocupada && (
                    <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                      <select
                        value={
                          metodoMesaSelecionado[m.codigo] ||
                          m.pedidosMesa[0]?.formaPagamentoSolicitada ||
                          'Cartão'
                        }
                        onChange={(e) =>
                          setMetodoMesaSelecionado((prev) => ({
                            ...prev,
                            [m.codigo]: e.target.value,
                          }))
                        }
                        className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                      >
                        <option value="Cartão">Pagamento: Cartão</option>
                        <option value="PIX">Pagamento: PIX</option>
                        <option value="Dinheiro">Pagamento: Dinheiro</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          confirmarPagamentoELiberarMesa(m.codigo, m.pedidosMesa)
                        }
                        className="w-full bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 font-black text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-[#a3e635]/20"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Pagamento &amp; Liberar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* SEÇÃO 2: PEDIDOS COM CÓDIGO AUTOMÁTICO, NOME DO CLIENTE E ATENDIMENTO */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-400" /> Pedidos Ativos das Mesas
            </h2>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'ativos', label: `Todos Ativos (${pedidosNaoLiberados.length})` },
                { key: 'balcao', label: `Prontos no Balcão (${prontosNoBalcao})` },
                {
                  key: 'pagamento',
                  label: `Aguardando Pagamento (${
                    pedidosNaoLiberados.filter((p) => !p.pago).length
                  })`,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFiltroPedidos(tab.key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition ${
                    filtroPedidos === tab.key
                      ? 'bg-red-600 text-white'
                      : 'bg-[#111217] border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pedidosFiltrados.map((p) => {
              const totalPedido =
                typeof p.total === 'number'
                  ? p.total
                  : (p.itens || []).reduce((acc, item) => acc + (Number(item.preco) || 0), 0);

              const codigoMesa = String(p.mesaToken || 'M01').toUpperCase();
              const pedidosDaMesmaMesa = pedidosNaoLiberados.filter(
                (item) => String(item.mesaToken || '').toUpperCase() === codigoMesa
              );

              return (
                <div
                  key={p.id}
                  className={`bg-[#111217] border p-5 rounded-3xl flex flex-col justify-between shadow-xl ${
                    p.status === 'pronto' && !p.retiradoBalcao
                      ? 'border-amber-500/60'
                      : 'border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-white text-zinc-950 font-black text-xs px-2.5 py-0.5 rounded-md">
                          Mesa {codigoMesa}
                        </span>
                        <span className="bg-[#a3e635]/15 border border-[#a3e635]/40 text-[#a3e635] font-mono font-black text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {p.codigoPedido || p.numeroPedido || p.id.slice(0, 4)}
                        </span>
                      </div>

                      <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400">
                        {p.status}
                      </span>
                    </div>

                    {/* Nome do Cliente + Hora do Pedido */}
                    <div className="bg-[#16171d] border border-zinc-800 rounded-xl px-3 py-2 mb-3 flex items-center justify-between text-xs">
                      <span className="font-extrabold text-white flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#a3e635]" />
                        {p.nomeCliente || 'Cliente na Mesa'}
                      </span>
                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatarHora(p)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold ${
                          p.retiradoBalcao
                            ? 'bg-sky-500/15 text-sky-400'
                            : 'bg-zinc-900 text-zinc-400'
                        }`}
                      >
                        {p.retiradoBalcao
                          ? `✓ Entregue (${p.garcomAtendeuNome || 'Garçom'})`
                          : 'Aguardando entrega'}
                      </span>

                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold ${
                          p.pago
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {p.pago
                          ? `✓ Pago (${p.metodoPagamento || 'OK'})`
                          : `Pgto: ${p.formaPagamentoSolicitada || 'Pendente'}`}
                      </span>
                    </div>

                    <ul className="space-y-2 mb-4">
                      {p.itens?.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-xs border-b border-zinc-800/60 pb-2 last:border-b-0"
                        >
                          <div className="flex justify-between">
                            <span className="font-bold text-white">{item.nome}</span>
                            <span className="text-zinc-400">
                              R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          {item.ingredientesRemovidos?.length > 0 && (
                            <p className="text-[10px] text-red-400 font-bold">
                              Sem: {item.ingredientesRemovidos.join(', ')}
                            </p>
                          )}
                          {item.adicionaisSelecionados?.length > 0 && (
                            <p className="text-[10px] text-[#a3e635] font-bold">
                              Extras:{' '}
                              {item.adicionaisSelecionados
                                .map((e) => `+${e.qtd}x ${e.nome}`)
                                .join(', ')}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div className="flex justify-between items-center text-xs font-black border-t border-zinc-800 pt-2.5 mb-4">
                      <span className="text-zinc-400">Total deste Pedido</span>
                      <span className="text-[#a3e635] text-sm">
                        R$ {totalPedido.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {!p.retiradoBalcao && (
                      <button
                        type="button"
                        onClick={() => confirmarEntregaPedido(p)}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 py-2.5 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <PackageCheck className="w-4 h-4" /> Confirmar Entrega na Mesa
                      </button>
                    )}

                    <div className="flex gap-2">
                      <select
                        value={
                          metodoPedidoSelecionado[p.id] ||
                          p.formaPagamentoSolicitada ||
                          'Cartão'
                        }
                        onChange={(e) =>
                          setMetodoPedidoSelecionado((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        className="bg-[#16171d] border border-zinc-800 rounded-xl px-2.5 py-2 text-xs text-white"
                      >
                        <option value="Cartão">Cartão</option>
                        <option value="PIX">PIX</option>
                        <option value="Dinheiro">Dinheiro</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          confirmarPagamentoELiberarMesa(
                            codigoMesa,
                            pedidosDaMesmaMesa,
                            metodoPedidoSelecionado[p.id] ||
                              p.formaPagamentoSolicitada ||
                              'Cartão'
                          )
                        }
                        className="flex-1 bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" /> Receber &amp; Liberar Mesa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {pedidosFiltrados.length === 0 && (
              <div className="col-span-full bg-[#111217] border border-zinc-800 p-8 rounded-3xl text-center text-zinc-500 text-xs">
                Nenhum pedido ativo neste filtro.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
