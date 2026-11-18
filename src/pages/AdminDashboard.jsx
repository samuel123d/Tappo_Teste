import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, getSecondaryAuth } from '../services/firebase';
import {
  garantirBancoProntoNoFirebase,
  limparPedidosECaixaFirebase,
} from '../services/dbInitializer';
import { CONFIG_LOJA_PADRAO, FALLBACK_FOOD_SVG } from '../data/menuData';
import TopEcosystemBar from '../components/TopEcosystemBar';
import {
  ShieldCheck,
  Utensils,
  Store,
  Users,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  Database,
  RotateCcw,
  UserPlus,
  ClipboardList,
  Search,
} from 'lucide-react';

export default function AdminDashboard() {
  const [abaAtiva, setAbaAtiva] = useState('cardapio'); // 'cardapio' | 'historico' | 'loja' | 'equipe' | 'banco'
  const [aviso, setAviso] = useState('');

  // Estados do Cardápio (Firestore: produtos)
  const [produtos, setProdutos] = useState([]);
  const [editandoProduto, setEditandoProduto] = useState(null);
  const [novoIngredienteTexto, setNovoIngredienteTexto] = useState('');
  const [novoExtraNome, setNovoExtraNome] = useState('');
  const [novoExtraPreco, setNovoExtraPreco] = useState('');
  const [salvandoProduto, setSalvandoProduto] = useState(false);

  // Histórico Completo de Pedidos & Auditoria (Firestore: pedidos)
  const [todosPedidos, setTodosPedidos] = useState([]);
  const [buscaHistorico, setBuscaHistorico] = useState('');

  // Estados de Configuração da Loja (Firestore: config_loja/geral)
  const [configLoja, setConfigLoja] = useState(CONFIG_LOJA_PADRAO);
  const [salvandoLoja, setSalvandoLoja] = useState(false);

  // Estados de Equipe / Garçons (Firebase Auth + Firestore: users)
  const [usuarios, setUsuarios] = useState([]);
  const [novoStaffNome, setNovoStaffNome] = useState('');
  const [novoStaffEmail, setNovoStaffEmail] = useState('');
  const [novoStaffSenha, setNovoStaffSenha] = useState('');
  const [novoStaffCargo, setNovoStaffCargo] = useState('garcom');
  const [cadastrandoStaff, setCadastrandoStaff] = useState(false);

  // Estados de Banco / Limpeza
  const [executandoBanco, setExecutandoBanco] = useState(false);

  const notificar = (msg) => {
    setAviso(msg);
    setTimeout(() => setAviso((prev) => (prev === msg ? '' : prev)), 4000);
  };

  useEffect(() => {
    const unsubProd = onSnapshot(
      collection(db, 'produtos'),
      (snap) => {
        setProdutos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    const unsubPedidos = onSnapshot(
      collection(db, 'pedidos'),
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        lista.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
        setTodosPedidos(lista);
      },
      () => {}
    );

    const unsubConfig = onSnapshot(
      doc(db, 'config_loja', 'geral'),
      (snap) => {
        if (snap.exists()) {
          setConfigLoja({ ...CONFIG_LOJA_PADRAO, ...snap.data() });
        }
      },
      () => {}
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      () => {}
    );

    return () => {
      unsubProd();
      unsubPedidos();
      unsubConfig();
      unsubUsers();
    };
  }, []);

  // --- FUNÇÕES DE EDIÇÃO DO CARDÁPIO ---
  const abrirNovoProduto = () => {
    setEditandoProduto({
      id: null,
      nome: '',
      categoria: 'Smash Burgers',
      tag: 'NOVIDADE',
      preco: 29.9,
      descricao: '',
      imagem: '',
      maisVendido: true,
      disponivel: true,
      ingredientes: ['Pão Brioche', 'Blend Bovino', 'Queijo Cheddar'],
      adicionais: [{ id: `add-${Date.now()}`, nome: 'Bacon Crocante', preco: 4.5 }],
    });
    setNovoIngredienteTexto('');
    setNovoExtraNome('');
    setNovoExtraPreco('');
  };

  const abrirEditarProduto = (prod) => {
    setEditandoProduto({
      ...prod,
      ingredientes: Array.isArray(prod.ingredientes) ? [...prod.ingredientes] : [],
      adicionais: Array.isArray(prod.adicionais) ? [...prod.adicionais] : [],
    });
    setNovoIngredienteTexto('');
    setNovoExtraNome('');
    setNovoExtraPreco('');
  };

  const adicionarIngredienteNaLista = () => {
    const val = novoIngredienteTexto.trim();
    if (!val || !editandoProduto) return;
    setEditandoProduto((prev) => ({
      ...prev,
      ingredientes: [...(prev.ingredientes || []), val],
    }));
    setNovoIngredienteTexto('');
  };

  const removerIngredienteDaLista = (idx) => {
    setEditandoProduto((prev) => ({
      ...prev,
      ingredientes: prev.ingredientes.filter((_, i) => i !== idx),
    }));
  };

  const adicionarExtraNaLista = () => {
    const nome = novoExtraNome.trim();
    const preco = parseFloat(String(novoExtraPreco).replace(',', '.'));
    if (!nome || Number.isNaN(preco) || !editandoProduto) return;
    setEditandoProduto((prev) => ({
      ...prev,
      adicionais: [
        ...(prev.adicionais || []),
        { id: `add-${Date.now()}`, nome, preco },
      ],
    }));
    setNovoExtraNome('');
    setNovoExtraPreco('');
  };

  const removerExtraDaLista = (idx) => {
    setEditandoProduto((prev) => ({
      ...prev,
      adicionais: prev.adicionais.filter((_, i) => i !== idx),
    }));
  };

  const salvarProdutoNoFirebase = async (e) => {
    e.preventDefault();
    if (!editandoProduto || salvandoProduto) return;
    setSalvandoProduto(true);
    try {
      const payload = {
        nome: editandoProduto.nome.trim(),
        categoria: editandoProduto.categoria.trim() || 'Geral',
        tag: editandoProduto.tag.trim() || 'CARDÁPIO',
        preco: Number(parseFloat(String(editandoProduto.preco).replace(',', '.')) || 0),
        descricao: editandoProduto.descricao.trim(),
        imagem: editandoProduto.imagem.trim(),
        maisVendido: Boolean(editandoProduto.maisVendido),
        disponivel: editandoProduto.disponivel !== false,
        ingredientes: editandoProduto.ingredientes || [],
        adicionais: editandoProduto.adicionais || [],
        atualizadoEm: serverTimestamp(),
      };

      if (editandoProduto.id) {
        await updateDoc(doc(db, 'produtos', editandoProduto.id), payload);
        notificar(`"${payload.nome}" atualizado no Firebase!`);
      } else {
        await addDoc(collection(db, 'produtos'), {
          ...payload,
          likes: 120,
          criadoEm: serverTimestamp(),
        });
        notificar(`"${payload.nome}" adicionado ao cardápio!`);
      }
      setEditandoProduto(null);
    } catch (err) {
      notificar('Erro ao salvar produto: ' + err.message);
    } finally {
      setSalvandoProduto(false);
    }
  };

  const excluirProduto = async (prod) => {
    await deleteDoc(doc(db, 'produtos', prod.id));
    notificar(`"${prod.nome}" removido do cardápio.`);
  };

  // --- FUNÇÕES DA LOJA / APP ---
  const salvarConfigLoja = async (e) => {
    e.preventDefault();
    setSalvandoLoja(true);
    try {
      await setDoc(
        doc(db, 'config_loja', 'geral'),
        {
          ...configLoja,
          cupomDescontoPercent: Number(configLoja.cupomDescontoPercent || 0),
          taxaGarcomPercent: Number(configLoja.taxaGarcomPercent || 0),
          tappoClubPontos: Number(configLoja.tappoClubPontos || 150),
          atualizadoEm: serverTimestamp(),
        },
        { merge: true }
      );
      notificar('Configurações do App salvas no Firebase!');
    } catch (err) {
      notificar('Erro ao salvar loja: ' + err.message);
    } finally {
      setSalvandoLoja(false);
    }
  };

  // --- FUNÇÕES DE CADASTRO DE GARÇONS PELO ADM ---
  const cadastrarFuncionario = async (e) => {
    e.preventDefault();
    if (cadastrandoStaff) return;
    setCadastrandoStaff(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        novoStaffEmail.trim(),
        novoStaffSenha
      );
      await signOut(secondaryAuth);

      await setDoc(doc(db, 'users', cred.user.uid), {
        nome: novoStaffNome.trim(),
        email: novoStaffEmail.trim(),
        role: 'garcom',
        approved: true,
        criadoEm: serverTimestamp(),
      });

      setNovoStaffNome('');
      setNovoStaffEmail('');
      setNovoStaffSenha('');
      notificar(`Login de ${novoStaffCargo === 'garcom' ? 'Garçom' : 'ADM'} criado com sucesso!`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        notificar('Este e-mail já está em uso no sistema.');
      } else if (err.code === 'auth/weak-password') {
        notificar('A senha precisa ter no mínimo 6 caracteres.');
      } else {
        notificar('Erro ao cadastrar funcionário: ' + err.message);
      }
    } finally {
      setCadastrandoStaff(false);
    }
  };

  const toggleAprovacaoUsuario = async (u) => {
    await updateDoc(doc(db, 'users', u.id), { approved: !u.approved });
    notificar(`Status de ${u.nome || u.email} atualizado.`);
  };

  // --- FUNÇÕES DE BANCO DE DADOS ---
  const handleLimparPedidosECaixa = async () => {
    setExecutandoBanco(true);
    try {
      await limparPedidosECaixaFirebase();
      notificar('Banco limpo! Todos os pedidos e valores de teste foram zerados (R$ 0,00).');
    } catch (err) {
      notificar('Erro ao limpar pedidos: ' + err.message);
    } finally {
      setExecutandoBanco(false);
    }
  };

  const handleRecriarEstruturaPadrao = async () => {
    setExecutandoBanco(true);
    try {
      await garantirBancoProntoNoFirebase(true);
      notificar('Estrutura pré-pronta sincronizada no Firestore!');
    } catch (err) {
      notificar('Erro ao sincronizar: ' + err.message);
    } finally {
      setExecutandoBanco(false);
    }
  };

  const pedidosHistoricoFiltrados = todosPedidos.filter((p) => {
    if (!buscaHistorico.trim()) return true;
    const termo = buscaHistorico.toLowerCase();
    return (
      String(p.codigoPedido || '').toLowerCase().includes(termo) ||
      String(p.nomeCliente || '').toLowerCase().includes(termo) ||
      String(p.mesaToken || '').toLowerCase().includes(termo) ||
      String(p.garcomAtendeuNome || '').toLowerCase().includes(termo) ||
      String(p.garcomPagamentoNome || '').toLowerCase().includes(termo) ||
      String(p.metodoPagamento || '').toLowerCase().includes(termo)
    );
  });

  const faturamentoTotalHistorico = todosPedidos
    .filter((p) => p.pago)
    .reduce((acc, p) => acc + (Number(p.total) || 0), 0);

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col">
      <TopEcosystemBar />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Cabeçalho Master Admin */}
        <div className="bg-[#111217] border border-zinc-800/90 p-5 rounded-3xl flex flex-wrap justify-between items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight">
                PAINEL ADMINISTRATIVO • CONTROLE TOTAL DO APP
              </h1>
              <p className="text-zinc-400 text-xs mt-0.5">
                Edite pratos, ingredientes, histórico completo de pedidos, garçons e banco Firebase
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'cardapio', label: 'Cardápio & Ingredientes', icon: Utensils },
              {
                id: 'historico',
                label: `Registro de Pedidos (${todosPedidos.length})`,
                icon: ClipboardList,
              },
              { id: 'loja', label: 'Identidade do App', icon: Store },
              { id: 'equipe', label: 'Garçons & Logins', icon: Users },
              { id: 'banco', label: 'Banco & Caixa Limpo', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAbaAtiva(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition ${
                    abaAtiva === tab.id
                      ? 'bg-[#a3e635] text-zinc-950 shadow-md shadow-[#a3e635]/20'
                      : 'bg-[#16171d] border border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {aviso && (
          <div className="bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{aviso}</span>
          </div>
        )}

        {/* ABA 1: EDITOR COMPLETO DE CARDÁPIO, DESCRIÇÕES E INGREDIENTES */}
        {abaAtiva === 'cardapio' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">
                  Produtos no Firebase ({produtos.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Edite descrição, foto, preço, ingredientes removíveis e adicionais estilo McDonald&apos;s
                </p>
              </div>
              <button
                type="button"
                onClick={abrirNovoProduto}
                className="bg-red-600 hover:bg-red-500 text-white font-black text-xs px-4 py-3 rounded-2xl flex items-center gap-1.5 shadow-lg shadow-red-600/25 transition"
              >
                <Plus className="w-4 h-4" /> Adicionar Novo Item
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {produtos.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-[#111217] border border-zinc-800 rounded-3xl p-4 flex gap-4 items-start justify-between"
                >
                  <div className="flex gap-3.5 min-w-0">
                    <img
                      src={prod.imagem}
                      alt={prod.nome}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_FOOD_SVG;
                      }}
                      className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 bg-zinc-900"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase text-red-400">
                        {prod.categoria} • {prod.tag}
                      </span>
                      <h3 className="text-sm font-black text-white truncate">{prod.nome}</h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                        {prod.descricao}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs font-black text-[#a3e635]">
                          R$ {Number(prod.preco || 0).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md text-zinc-300">
                          {(prod.ingredientes || []).length} ingredientes
                        </span>
                        <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md text-zinc-300">
                          {(prod.adicionais || []).length} extras
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => abrirEditarProduto(prod)}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white p-2 rounded-xl transition"
                      title="Editar item"
                    >
                      <Pencil className="w-4 h-4 text-[#a3e635]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirProduto(prod)}
                      className="bg-zinc-900 hover:bg-red-600/20 border border-zinc-800 hover:border-red-500/40 text-zinc-400 hover:text-red-400 p-2 rounded-xl transition"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 2: REGISTRO COMPLETO DE TODOS OS PEDIDOS (AUDITORIA FIREBASE) */}
        {abaAtiva === 'historico' && (
          <div className="bg-[#111217] border border-zinc-800/90 p-6 rounded-3xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black">
                  Histórico Permanente de Pedidos &amp; Auditoria ({todosPedidos.length})
                </h2>
                <p className="text-xs text-zinc-400">
                  Todos os pedidos ficam registrados com código automático, nome do cliente, garçom, hora e pagamento mesmo após a mesa ser liberada
                </p>
              </div>

              <div className="bg-[#16171d] border border-zinc-800 px-4 py-2 rounded-2xl">
                <span className="block text-[10px] font-bold uppercase text-zinc-400">
                  TOTAL PAGO REGISTRADO
                </span>
                <span className="text-base font-black text-[#a3e635]">
                  R$ {faturamentoTotalHistorico.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
                placeholder="Buscar por código (TP-...), nome do cliente, mesa, garçom ou pagamento..."
                className="w-full bg-[#16171d] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#a3e635]"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
                    <th className="py-3 px-3">Código / Mesa</th>
                    <th className="py-3 px-3">Cliente &amp; Hora</th>
                    <th className="py-3 px-3">Itens</th>
                    <th className="py-3 px-3">Garçom Atendimento</th>
                    <th className="py-3 px-3">Pagamento &amp; Hora</th>
                    <th className="py-3 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-xs">
                  {pedidosHistoricoFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-900/40">
                      <td className="py-3 px-3 align-top">
                        <span className="font-mono font-black text-[#a3e635] block">
                          {p.codigoPedido || `#${p.numeroPedido || p.id.slice(0, 4)}`}
                        </span>
                        <span className="text-[11px] text-zinc-400 font-bold">
                          Mesa {p.mesaToken}
                        </span>
                        <span
                          className={`mt-1 inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            p.mesaLiberada
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {p.mesaLiberada ? 'Mesa Liberada ✓' : 'Mesa Ocupada'}
                        </span>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <p className="font-extrabold text-white">{p.nomeCliente || 'Cliente'}</p>
                        <p className="text-[11px] text-zinc-400">
                          {p.dataPedido || ''} {p.horaPedido || ''}
                        </p>
                      </td>

                      <td className="py-3 px-3 align-top max-w-xs">
                        {(p.itens || []).map((it, idx) => (
                          <div key={idx} className="text-[11px] text-zinc-200">
                            • {it.nome}
                            {it.ingredientesRemovidos?.length > 0 && (
                              <span className="text-red-400">
                                {' '}
                                (Sem: {it.ingredientesRemovidos.join(', ')})
                              </span>
                            )}
                          </div>
                        ))}
                      </td>

                      <td className="py-3 px-3 align-top">
                        <p className="font-bold text-sky-400">
                          {p.garcomAtendeuNome || 'Aguardando'}
                        </p>
                        {p.horaAtendimentoBalcao && (
                          <p className="text-[10px] text-zinc-400">
                            Entregue: {p.horaAtendimentoBalcao}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-3 align-top">
                        {p.pago ? (
                          <div>
                            <span className="text-emerald-400 font-extrabold block">
                              ✓ {p.metodoPagamento || p.formaPagamentoSolicitada}
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              Por: {p.garcomPagamentoNome || 'Sistema'}
                            </span>
                            {p.horaPagamento && (
                              <span className="text-[10px] text-zinc-500 block">
                                Hora: {p.horaPagamento}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-400 font-bold">
                            Pendente ({p.formaPagamentoSolicitada || 'A definir'})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 align-top text-right font-black text-[#a3e635]">
                        R$ {Number(p.total || 0).toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                  {pedidosHistoricoFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-500">
                        Nenhum pedido registrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: IDENTIDADE & CONFIGURAÇÕES DO APP DO CLIENTE */}
        {abaAtiva === 'loja' && (
          <form
            onSubmit={salvarConfigLoja}
            className="bg-[#111217] border border-zinc-800/90 p-6 rounded-3xl space-y-5"
          >
            <div>
              <h2 className="text-base font-black">Identidade Visual &amp; Regras do App</h2>
              <p className="text-xs text-zinc-400">
                Tudo o que você alterar aqui é salvo no Firebase e aparece imediatamente no celular do cliente
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  Nome do Restaurante / Loja
                </label>
                <input
                  type="text"
                  required
                  value={configLoja.nomeRestaurante}
                  onChange={(e) =>
                    setConfigLoja({ ...configLoja, nomeRestaurante: e.target.value })
                  }
                  className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  Subtítulo / Slogan
                </label>
                <input
                  type="text"
                  value={configLoja.subtitulo}
                  onChange={(e) => setConfigLoja({ ...configLoja, subtitulo: e.target.value })}
                  className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  URL da Foto de Capa do Topo
                </label>
                <input
                  type="text"
                  value={configLoja.bannerUrl}
                  onChange={(e) => setConfigLoja({ ...configLoja, bannerUrl: e.target.value })}
                  className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  Código do Cupom Promocional
                </label>
                <input
                  type="text"
                  value={configLoja.cupomCodigo}
                  onChange={(e) => setConfigLoja({ ...configLoja, cupomCodigo: e.target.value })}
                  className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  Desconto do Cupom (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={configLoja.cupomDescontoPercent}
                  onChange={(e) =>
                    setConfigLoja({ ...configLoja, cupomDescontoPercent: e.target.value })
                  }
                  className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  Taxa de Serviço do Garçom (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={configLoja.taxaGarcomPercent}
                  onChange={(e) =>
                    setConfigLoja({ ...configLoja, taxaGarcomPercent: e.target.value })
                  }
                  className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase">
                  Pontos Boas-Vindas Tappo Club
                </label>
                <input
                  type="number"
                  min="0"
                  value={configLoja.tappoClubPontos}
                  onChange={(e) =>
                    setConfigLoja({ ...configLoja, tappoClubPontos: e.target.value })
                  }
                  className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={salvandoLoja}
              className="bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 font-black text-xs px-6 py-3.5 rounded-2xl flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              {salvandoLoja ? 'Salvando...' : 'Salvar Alterações no Firebase'}
            </button>
          </form>
        )}

        {/* ABA 4: CADASTRO DE GARÇONS & EQUIPE PELO ADM */}
        {abaAtiva === 'equipe' && (
          <div className="space-y-6">
            <form
              onSubmit={cadastrarFuncionario}
              className="bg-[#111217] border border-zinc-800/90 p-6 rounded-3xl space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-[#a3e635]" />
                <div>
                  <h2 className="text-base font-black">Cadastrar Novo Garçom / Equipe</h2>
                  <p className="text-xs text-zinc-400">
                    Crie o login e senha dos garçons. Contas de Administrador são criadas exclusivamente no Console do Firebase.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Nome</label>
                  <input
                    type="text"
                    required
                    value={novoStaffNome}
                    onChange={(e) => setNovoStaffNome(e.target.value)}
                    placeholder="Ex: Lucas Silva"
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    E-mail de Login
                  </label>
                  <input
                    type="email"
                    required
                    value={novoStaffEmail}
                    onChange={(e) => setNovoStaffEmail(e.target.value)}
                    placeholder="garcom@suaempresa.com"
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Senha (mín. 6 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={novoStaffSenha}
                    onChange={(e) => setNovoStaffSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1 focus:outline-none focus:border-[#a3e635]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Função</label>
                  <input
                    type="text"
                    readOnly
                    value="Garçom (Salão & Pedidos)"
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-sky-400 font-bold mt-1"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cadastrandoStaff}
                className="bg-[#a3e635] hover:bg-[#bef264] disabled:opacity-50 text-zinc-950 font-black text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {cadastrandoStaff ? 'Cadastrando...' : 'Criar Login no Firebase'}
              </button>
            </form>

            <div className="bg-[#111217] border border-zinc-800/90 p-6 rounded-3xl">
              <h3 className="text-sm font-black uppercase text-zinc-300 mb-4">
                Contas Cadastradas ({usuarios.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
                      <th className="py-3 px-4">Nome / E-mail</th>
                      <th className="py-3 px-4">Cargo</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id} className="border-b border-zinc-800/50">
                        <td className="py-3 px-4">
                          <p className="text-xs font-bold text-white">{u.nome || 'Sem nome'}</p>
                          <p className="text-[11px] text-zinc-400">{u.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[11px] font-black px-2.5 py-1 rounded-lg uppercase ${
                              u.role === 'garcom'
                                ? 'bg-sky-500/15 text-sky-400'
                                : 'bg-[#a3e635]/15 text-[#a3e635]'
                            }`}
                          >
                            {u.role === 'garcom' ? 'Garçom' : 'Administrador'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.approved !== false ? (
                            <span className="text-xs font-bold text-emerald-400">Ativo</span>
                          ) : (
                            <span className="text-xs font-bold text-red-400">Bloqueado</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.role !== 'master_admin' && (
                            <button
                              type="button"
                              onClick={() => toggleAprovacaoUsuario(u)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black ${
                                u.approved !== false
                                  ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                                  : 'bg-[#a3e635] text-zinc-950'
                              }`}
                            >
                              {u.approved !== false ? 'Bloquear' : 'Liberar'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: BANCO DE DADOS & CAIXA LIMPO */}
        {abaAtiva === 'banco' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#111217] border border-zinc-800 p-6 rounded-3xl space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black">Zerar Caixa &amp; Limpar Pedidos</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Remove todos os pedidos e chamados de teste do Firestore para deixar o faturamento e a conta da empresa em <strong>R$ 0,00</strong> antes de operar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLimparPedidosECaixa}
                disabled={executandoBanco}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs px-5 py-3 rounded-2xl transition"
              >
                {executandoBanco ? 'Limpando...' : 'Limpar Pedidos & Zerar Caixa Agora'}
              </button>
            </div>

            <div className="bg-[#111217] border border-zinc-800 p-6 rounded-3xl space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-[#a3e635]/15 border border-[#a3e635]/30 flex items-center justify-center text-[#a3e635]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black">Sincronizar Estrutura Pré-Pronta</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Garante que as configurações da loja, itens do cardápio com ingredientes e mesas QR estejam gravados no Firebase prontos para você editar.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRecriarEstruturaPadrao}
                disabled={executandoBanco}
                className="bg-[#a3e635] hover:bg-[#bef264] disabled:opacity-50 text-zinc-950 font-black text-xs px-5 py-3 rounded-2xl transition"
              >
                {executandoBanco ? 'Sincronizando...' : 'Garantir Estrutura no Firebase'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DE EDIÇÃO / CRIAÇÃO DE PRODUTO COM INGREDIENTES E ADICIONAIS */}
      {editandoProduto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111217] border border-zinc-800 w-full max-w-2xl rounded-3xl p-6 max-h-[92vh] overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-lg font-black">
                {editandoProduto.id ? `Editar: ${editandoProduto.nome}` : 'Novo Item do Cardápio'}
              </h3>
              <button
                type="button"
                onClick={() => setEditandoProduto(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={salvarProdutoNoFirebase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Nome do Prato</label>
                  <input
                    type="text"
                    required
                    value={editandoProduto.nome}
                    onChange={(e) =>
                      setEditandoProduto({ ...editandoProduto, nome: e.target.value })
                    }
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Categoria</label>
                  <input
                    type="text"
                    required
                    value={editandoProduto.categoria}
                    onChange={(e) =>
                      setEditandoProduto({ ...editandoProduto, categoria: e.target.value })
                    }
                    placeholder="Smash Burgers, Tex-Mex, Bebidas..."
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editandoProduto.preco}
                    onChange={(e) =>
                      setEditandoProduto({ ...editandoProduto, preco: e.target.value })
                    }
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Tag / Selo</label>
                  <input
                    type="text"
                    value={editandoProduto.tag}
                    onChange={(e) =>
                      setEditandoProduto({ ...editandoProduto, tag: e.target.value })
                    }
                    placeholder="TOP 1 • CASA"
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Descrição Completa
                  </label>
                  <textarea
                    rows={2}
                    value={editandoProduto.descricao}
                    onChange={(e) =>
                      setEditandoProduto({ ...editandoProduto, descricao: e.target.value })
                    }
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white mt-1"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">URL da Foto</label>
                  <input
                    type="text"
                    value={editandoProduto.imagem}
                    onChange={(e) =>
                      setEditandoProduto({ ...editandoProduto, imagem: e.target.value })
                    }
                    placeholder="https://..."
                    className="w-full bg-[#16171d] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editandoProduto.maisVendido)}
                  onChange={(e) =>
                    setEditandoProduto({ ...editandoProduto, maisVendido: e.target.checked })
                  }
                  className="accent-red-600"
                />
                Exibir na aba &quot;Mais Vendidos&quot; e nos Destaques
              </label>

              <div className="bg-[#16171d] border border-zinc-800 rounded-2xl p-4 space-y-3">
                <span className="text-[11px] font-black uppercase text-zinc-300 block">
                  Ingredientes do Item (Cliente pode tirar estilo McDonald&apos;s)
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoIngredienteTexto}
                    onChange={(e) => setNovoIngredienteTexto(e.target.value)}
                    placeholder="Ex: Cebola Roxa, Tomate, Picles..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={adicionarIngredienteNaLista}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold"
                  >
                    + Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(editandoProduto.ingredientes || []).map((ing, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 px-2.5 py-1 rounded-lg text-xs"
                    >
                      {ing}
                      <button
                        type="button"
                        onClick={() => removerIngredienteDaLista(idx)}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#16171d] border border-zinc-800 rounded-2xl p-4 space-y-3">
                <span className="text-[11px] font-black uppercase text-[#a3e635] block">
                  Adicionais / Ingredientes Extras (+ Valor)
                </span>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <input
                    type="text"
                    value={novoExtraNome}
                    onChange={(e) => setNovoExtraNome(e.target.value)}
                    placeholder="Ex: Bacon Crocante Extra"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={novoExtraPreco}
                    onChange={(e) => setNovoExtraPreco(e.target.value)}
                    placeholder="R$ 4.50"
                    className="w-28 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={adicionarExtraNaLista}
                    className="bg-[#a3e635] text-zinc-950 px-3.5 py-2 rounded-xl text-xs font-black"
                  >
                    + Extra
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(editandoProduto.adicionais || []).map((ex, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs"
                    >
                      <span>
                        {ex.nome} —{' '}
                        <strong className="text-[#a3e635]">
                          + R$ {Number(ex.preco || 0).toFixed(2).replace('.', ',')}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => removerExtraDaLista(idx)}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditandoProduto(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoProduto}
                  className="bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {salvandoProduto ? 'Salvando...' : 'Salvar no Firebase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
