import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  CONFIG_LOJA_PADRAO,
  PRODUTOS_INICIAIS_SEED,
  MESAS_INICIAIS_SEED,
  FALLBACK_FOOD_SVG,
} from '../data/menuData';
import {
  gerarCodigoAutomaticoPedido,
  obterDataHoraAtualBR,
} from '../utils/orderUtils';
import TopEcosystemBar from '../components/TopEcosystemBar';
import {
  BellRing,
  Plus,
  Minus,
  X,
  Copy,
  Heart,
  Share2,
  ChevronLeft,
  Flame,
  CreditCard,
  Banknote,
  QrCode,
  Ticket,
  Utensils,
  SlidersHorizontal,
  Lock,
  User,
  Receipt,
  CheckCircle2,
} from 'lucide-react';

const MOTIVOS_ATENDIMENTO = [
  { id: 'pedido', emoji: '🍔', titulo: 'Fazer pedido' },
  { id: 'talheres', emoji: '🍴', titulo: 'Guardanapos / Talheres' },
  { id: 'duvidas', emoji: '💬', titulo: 'Dúvidas / Cardápio' },
  { id: 'conta', emoji: '🧾', titulo: 'Pedir a Conta' },
];

export default function CardapioCliente() {
  const { nfcToken } = useParams();
  const mesaCodigo = String(nfcToken || '').trim().toUpperCase();
  const mesaNumero = mesaCodigo.replace(/^M/i, '').padStart(2, '0');

  // Validação obrigatória do QR Code da mesa no Firebase
  const [statusMesaQr, setStatusMesaQr] = useState(
    mesaCodigo ? 'verificando' : 'invalida'
  ); // 'verificando' | 'valida' | 'invalida'

  // Dados dinâmicos do Firebase (editáveis pelo ADM)
  const [configLoja, setConfigLoja] = useState(CONFIG_LOJA_PADRAO);
  const [produtos, setProdutos] = useState([]);
  const [pedidosAtivosMesa, setPedidosAtivosMesa] = useState([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Mais Vendidos');

  // Identificação do Cliente + Código Automático do Pedido
  const [nomeCliente, setNomeCliente] = useState(() => {
    try {
      return localStorage.getItem(`tappo_cliente_${mesaCodigo}`) || '';
    } catch {
      return '';
    }
  });
  const [erroNome, setErroNome] = useState('');
  const [comprovanteRecente, setComprovanteRecente] = useState(null);
  const [modalMeusPedidosAberto, setModalMeusPedidosAberto] = useState(false);
  const inputNomeRef = useRef(null);

  // Carrinho (itens já personalizados)
  const [carrinho, setCarrinho] = useState([]);
  const [toastMsg, setToastMsg] = useState(`Cardápio da Mesa ${mesaNumero} liberado!`);

  // Cupom & Tappo Club
  const [cupomAplicado, setCupomAplicado] = useState(false);
  const [tappoClubAtivo, setTappoClubAtivo] = useState(false);
  const [incluirGorjeta, setIncluirGorjeta] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState('Cartão');

  // Modal Estilo McDonald's: Personalizar Ingredientes (Tirar / Adicionar Extras)
  const [produtoPersonalizando, setProdutoPersonalizando] = useState(null);
  const [ingredientesRemovidos, setIngredientesRemovidos] = useState([]);
  const [extrasQtd, setExtrasQtd] = useState({});
  const [obsItem, setObsItem] = useState('');
  const [qtdPersonalizando, setQtdPersonalizando] = useState(1);

  // Modo Stories (Destaques)
  const [storiesAberto, setStoriesAberto] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [likesStories, setLikesStories] = useState({});

  // Modal Chamar Garçom
  const [modalGarcomAberto, setModalGarcomAberto] = useState(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState('Fazer pedido');
  const [obsGarcom, setObsGarcom] = useState('');
  const [enviandoGarcom, setEnviandoGarcom] = useState(false);

  // Modal Enviar Pedido / Fechar Conta
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

  const dispararToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 4000);
  };

  useEffect(() => {
    dispararToast(`Cardápio da Mesa ${mesaNumero} liberado!`);
    try {
      const salvo = localStorage.getItem(`tappo_cliente_${mesaCodigo}`);
      if (salvo) setNomeCliente(salvo);
    } catch {}
  }, [mesaNumero, mesaCodigo]);

  useEffect(() => {
    if (!mesaCodigo) {
      setStatusMesaQr('invalida');
      return;
    }

    setStatusMesaQr('verificando');

    const unsubMesaQr = onSnapshot(
      collection(db, 'mesas'),
      (snap) => {
        if (!snap.empty) {
          const encontrada = snap.docs.some((d) => {
            const data = d.data();
            const token = String(data.token || data.codigo || '').trim().toUpperCase();
            return token === mesaCodigo && data.ativa !== false;
          });
          setStatusMesaQr(encontrada ? 'valida' : 'invalida');
        } else {
          const seedValida = MESAS_INICIAIS_SEED.some(
            (m) => String(m.token || '').toUpperCase() === mesaCodigo
          );
          setStatusMesaQr(seedValida ? 'valida' : 'invalida');
        }
      },
      () => {
        const seedValida = MESAS_INICIAIS_SEED.some(
          (m) => String(m.token || '').toUpperCase() === mesaCodigo
        );
        setStatusMesaQr(seedValida ? 'valida' : 'invalida');
      }
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

    const unsubProdutos = onSnapshot(
      collection(db, 'produtos'),
      (snapshot) => {
        if (!snapshot.empty) {
          const lista = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) => p.disponivel !== false);
          setProdutos(lista);
        } else {
          setProdutos(
            PRODUTOS_INICIAIS_SEED.map((p, idx) => ({ id: `seed-${idx}`, ...p }))
          );
        }
      },
      () => {
        setProdutos(
          PRODUTOS_INICIAIS_SEED.map((p, idx) => ({ id: `seed-${idx}`, ...p }))
        );
      }
    );

    // Escuta em tempo real os pedidos da mesa que ainda não foram liberados (mesaLiberada !== true)
    const unsubPedidos = onSnapshot(
      collection(db, 'pedidos'),
      (snapshot) => {
        const daMesa = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(
            (p) =>
              String(p.mesaToken || '').toUpperCase() === mesaCodigo &&
              p.mesaLiberada !== true
          );
        daMesa.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
        setPedidosAtivosMesa(daMesa);
      },
      () => {}
    );

    return () => {
      unsubMesaQr();
      unsubConfig();
      unsubProdutos();
      unsubPedidos();
    };
  }, [mesaCodigo]);

  // Auto-avanço nos Stories
  useEffect(() => {
    if (!storiesAberto || produtos.length === 0) return;
    const timer = setInterval(() => {
      setStoryIndex((prev) => (prev + 1) % produtos.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [storiesAberto, produtos.length]);

  const handleAlterarNomeCliente = (valor) => {
    setNomeCliente(valor);
    if (erroNome) setErroNome('');
    try {
      localStorage.setItem(`tappo_cliente_${mesaCodigo}`, valor);
    } catch {}
  };

  // Abrir modal estilo McDonald's ao clicar no hambúrguer/item
  const abrirPersonalizacao = (produto) => {
    setProdutoPersonalizando(produto);
    setIngredientesRemovidos([]);
    setExtrasQtd({});
    setObsItem('');
    setQtdPersonalizando(1);
  };

  const toggleRemoverIngrediente = (ingrediente) => {
    setIngredientesRemovidos((prev) =>
      prev.includes(ingrediente)
        ? prev.filter((i) => i !== ingrediente)
        : [...prev, ingrediente]
    );
  };

  const alterarQtdExtra = (extraId, delta) => {
    setExtrasQtd((prev) => {
      const atual = prev[extraId] || 0;
      const novo = Math.max(0, Math.min(5, atual + delta));
      return { ...prev, [extraId]: novo };
    });
  };

  const calcularPrecoPersonalizadoUnitario = () => {
    if (!produtoPersonalizando) return 0;
    const base = Number(produtoPersonalizando.preco || 0);
    const extrasLista = produtoPersonalizando.adicionais || [];
    const totalExtras = extrasLista.reduce((acc, ex) => {
      const q = extrasQtd[ex.id] || 0;
      return acc + Number(ex.preco || 0) * q;
    }, 0);
    return base + totalExtras;
  };

  const confirmarItemPersonalizado = () => {
    if (!produtoPersonalizando) return;
    const extrasLista = (produtoPersonalizando.adicionais || [])
      .filter((ex) => (extrasQtd[ex.id] || 0) > 0)
      .map((ex) => ({
        id: ex.id,
        nome: ex.nome,
        qtd: extrasQtd[ex.id],
        preco: Number(ex.preco || 0),
      }));

    const precoUnitarioFinal = calcularPrecoPersonalizadoUnitario();

    const assinatura = JSON.stringify({
      id: produtoPersonalizando.id,
      rem: [...ingredientesRemovidos].sort(),
      ext: extrasLista,
      obs: obsItem.trim(),
    });

    setCarrinho((prev) => {
      const existente = prev.find((i) => i.assinatura === assinatura);
      if (existente) {
        return prev.map((i) =>
          i.assinatura === assinatura ? { ...i, qtd: i.qtd + qtdPersonalizando } : i
        );
      }
      return [
        ...prev,
        {
          cartKey: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          assinatura,
          id: produtoPersonalizando.id,
          nome: produtoPersonalizando.nome,
          precoBase: Number(produtoPersonalizando.preco || 0),
          preco: precoUnitarioFinal,
          qtd: qtdPersonalizando,
          ingredientesRemovidos: [...ingredientesRemovidos],
          adicionaisSelecionados: extrasLista,
          observacao: obsItem.trim(),
        },
      ];
    });

    dispararToast(`+${qtdPersonalizando}x ${produtoPersonalizando.nome} adicionado!`);
    setProdutoPersonalizando(null);
  };

  const alterarQtdCarrinho = (cartKey, delta) => {
    setCarrinho((prev) =>
      prev
        .map((item) => (item.cartKey === cartKey ? { ...item, qtd: item.qtd + delta } : item))
        .filter((item) => item.qtd > 0)
    );
  };

  const totalItensQtd = carrinho.reduce((acc, i) => acc + i.qtd, 0);
  const subtotal = carrinho.reduce((acc, i) => acc + Number(i.preco || 0) * i.qtd, 0);
  const percDesconto = Number(configLoja.cupomDescontoPercent || 10) / 100;
  const percGarcom = Number(configLoja.taxaGarcomPercent || 10) / 100;
  const desconto = cupomAplicado ? subtotal * percDesconto : 0;
  const subtotalComDesconto = Math.max(0, subtotal - desconto);
  const taxaGarcom = incluirGorjeta ? subtotalComDesconto * percGarcom : 0;
  const totalFinal = subtotalComDesconto + taxaGarcom;

  const totalJaConsumidoNaMesa = pedidosAtivosMesa.reduce(
    (acc, p) => acc + (Number(p.total) || 0),
    0
  );

  const copiarTexto = async (texto, msgSucesso) => {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {}
    dispararToast(msgSucesso);
  };

  const copiarCupom = async () => {
    const code = configLoja.cupomCodigo || 'BEMVINDO10';
    setCupomAplicado(true);
    await copiarTexto(
      code,
      `Cupom ${code} aplicado (${configLoja.cupomDescontoPercent}% OFF)!`
    );
  };

  const montarItensParaFirebase = () => {
    return carrinho.flatMap((item) =>
      Array.from({ length: item.qtd }, () => ({
        id: item.id,
        nome: item.nome,
        preco: Number(item.preco || 0),
        ingredientesRemovidos: item.ingredientesRemovidos || [],
        adicionaisSelecionados: item.adicionaisSelecionados || [],
        observacao: item.observacao || '',
      }))
    );
  };

  const validarNomeAntesDeEnviar = () => {
    const limpo = nomeCliente.trim();
    if (!limpo) {
      setErroNome('Digite seu nome para gerar o código automático do pedido.');
      if (inputNomeRef.current) inputNomeRef.current.focus();
      return null;
    }
    return limpo;
  };

  const enviarPedidoParaCozinha = async () => {
    if (carrinho.length === 0 || enviandoPedido) return;
    const clienteValidado = validarNomeAntesDeEnviar();
    if (!clienteValidado) return;

    setEnviandoPedido(true);
    try {
      const codigoAuto = gerarCodigoAutomaticoPedido();
      const { data, hora, dataHora } = obterDataHoraAtualBR();

      await addDoc(collection(db, 'pedidos'), {
        codigoPedido: codigoAuto,
        nomeCliente: clienteValidado,
        mesaToken: mesaCodigo,
        mesaNumero: `Mesa ${mesaNumero}`,
        itens: montarItensParaFirebase(),
        itensAgrupados: carrinho.map((i) => ({
          nome: i.nome,
          qtd: i.qtd,
          preco: Number(i.preco || 0),
          ingredientesRemovidos: i.ingredientesRemovidos || [],
          adicionaisSelecionados: i.adicionaisSelecionados || [],
          observacao: i.observacao || '',
        })),
        subtotal,
        desconto,
        taxaGarcom,
        total: totalFinal,
        formaPagamentoSolicitada: formaPagamento,
        metodoPagamento: formaPagamento,
        status: 'pendente',
        pago: false,
        mesaLiberada: false,
        retiradoBalcao: false,
        garcomAtendeuId: null,
        garcomAtendeuNome: null,
        garcomPagamentoNome: null,
        dataPedido: data,
        horaPedido: hora,
        dataHoraPedido: dataHora,
        criadoEm: serverTimestamp(),
      });

      setComprovanteRecente({
        codigoPedido: codigoAuto,
        nomeCliente: clienteValidado,
        mesa: `Mesa ${mesaNumero}`,
        horaPedido: hora,
        total: totalFinal,
        formaPagamento,
      });

      setCarrinho([]);
      setModalContaAberto(false);
      dispararToast(`Pedido ${codigoAuto} enviado! Guarde seu código.`);
    } catch (err) {
      dispararToast('Erro ao enviar pedido: ' + err.message);
    } finally {
      setEnviandoPedido(false);
    }
  };

  const confirmarFechamentoConta = async () => {
    if (enviandoPedido) return;
    const clienteValidado =
      carrinho.length > 0
        ? validarNomeAntesDeEnviar()
        : nomeCliente.trim() || pedidosAtivosMesa[0]?.nomeCliente || 'Cliente da Mesa';

    if (!clienteValidado) return;

    setEnviandoPedido(true);
    try {
      const { data, hora, dataHora } = obterDataHoraAtualBR();
      let codigoGeradoAgora = null;

      if (carrinho.length > 0) {
        codigoGeradoAgora = gerarCodigoAutomaticoPedido();
        await addDoc(collection(db, 'pedidos'), {
          codigoPedido: codigoGeradoAgora,
          nomeCliente: clienteValidado,
          mesaToken: mesaCodigo,
          mesaNumero: `Mesa ${mesaNumero}`,
          itens: montarItensParaFirebase(),
          itensAgrupados: carrinho.map((i) => ({
            nome: i.nome,
            qtd: i.qtd,
            preco: Number(i.preco || 0),
            ingredientesRemovidos: i.ingredientesRemovidos || [],
            adicionaisSelecionados: i.adicionaisSelecionados || [],
            observacao: i.observacao || '',
          })),
          subtotal,
          desconto,
          taxaGarcom,
          total: totalFinal,
          formaPagamentoSolicitada: formaPagamento,
          metodoPagamento: formaPagamento,
          pediuConta: true,
          status: 'pendente',
          pago: false,
          mesaLiberada: false,
          retiradoBalcao: false,
          garcomAtendeuId: null,
          garcomAtendeuNome: null,
          garcomPagamentoNome: null,
          dataPedido: data,
          horaPedido: hora,
          dataHoraPedido: dataHora,
          criadoEm: serverTimestamp(),
        });
      }

      const valorTotalConta = totalFinal + totalJaConsumidoNaMesa;

      await addDoc(collection(db, 'chamados_garcom'), {
        mesa: mesaCodigo,
        mesaNumero: `Mesa ${mesaNumero}`,
        nomeCliente: clienteValidado,
        codigoPedido: codigoGeradoAgora || pedidosAtivosMesa[0]?.codigoPedido || null,
        motivo: `Pedir a Conta • ${formaPagamento}`,
        observacao:
          valorTotalConta > 0
            ? `Cliente: ${clienteValidado} • Total: R$ ${valorTotalConta
                .toFixed(2)
                .replace('.', ',')} (${formaPagamento})`
            : `Cliente: ${clienteValidado} • Levar maquininha (${formaPagamento})`,
        resolvido: false,
        horaChamado: hora,
        dataChamado: data,
        criadoEm: serverTimestamp(),
      });

      if (codigoGeradoAgora) {
        setComprovanteRecente({
          codigoPedido: codigoGeradoAgora,
          nomeCliente: clienteValidado,
          mesa: `Mesa ${mesaNumero}`,
          horaPedido: hora,
          total: totalFinal,
          formaPagamento,
        });
      }

      setCarrinho([]);
      setModalContaAberto(false);
      dispararToast(`Conta solicitada (${formaPagamento})! Garçom a caminho.`);
    } catch (err) {
      dispararToast('Erro ao solicitar conta: ' + err.message);
    } finally {
      setEnviandoPedido(false);
    }
  };

  const confirmarChamadoGarcom = async (e) => {
    e.preventDefault();
    if (enviandoGarcom) return;
    setEnviandoGarcom(true);
    try {
      const { data, hora } = obterDataHoraAtualBR();
      await addDoc(collection(db, 'chamados_garcom'), {
        mesa: mesaCodigo,
        mesaNumero: `Mesa ${mesaNumero}`,
        nomeCliente: nomeCliente.trim() || 'Cliente na Mesa',
        motivo: motivoSelecionado,
        observacao: obsGarcom.trim(),
        resolvido: false,
        horaChamado: hora,
        dataChamado: data,
        criadoEm: serverTimestamp(),
      });
      setModalGarcomAberto(false);
      setObsGarcom('');
      dispararToast(`Chamado "${motivoSelecionado}" enviado ao garçom!`);
    } catch (err) {
      dispararToast('Erro ao chamar garçom: ' + err.message);
    } finally {
      setEnviandoGarcom(false);
    }
  };

  const traduzirStatusPedido = (p) => {
    if (p.status === 'entregue' || p.retiradoBalcao) {
      return {
        label: p.garcomAtendeuNome
          ? `Entregue por ${p.garcomAtendeuNome}`
          : 'Entregue na mesa ✓',
        cor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    }
    if (p.status === 'pronto') {
      return {
        label: 'Pronto! Indo para mesa',
        cor: 'bg-[#a3e635]/20 text-[#a3e635] border-[#a3e635]/40',
      };
    }
    if (p.status === 'preparando') {
      return {
        label: 'Preparando na chapa 🔥',
        cor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    }
    return {
      label: 'Recebido na fila',
      cor: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    };
  };

  const categoriasDisponiveis = Array.from(
    new Set(produtos.map((p) => p.categoria).filter(Boolean))
  );

  const produtosFiltrados = produtos.filter((p) => {
    if (categoriaAtiva === 'Mais Vendidos') return p.maisVendido !== false;
    return p.categoria === categoriaAtiva;
  });

  const storyAtual = produtos[storyIndex] || produtos[0];
  const likedAtual = !!likesStories[storyAtual?.id];
  const nomeParts = String(configLoja.nomeRestaurante || 'SMASH & CO.').split('&');

  if (statusMesaQr === 'verificando') {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-xs font-bold text-zinc-300 bg-[#111217] border border-zinc-800 px-5 py-3.5 rounded-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-[#a3e635] animate-ping" />
          <span>Validando QR Code da Mesa...</span>
        </div>
      </div>
    );
  }

  if (statusMesaQr === 'invalida') {
    return (
      <div className="min-h-screen bg-[#07080a] text-white flex flex-col">
        <TopEcosystemBar mesaAtual="M01" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111217] border border-red-500/40 rounded-[32px] p-8 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-600/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <QrCode className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-red-400">
                QR CODE INVÁLIDO OU NÃO ENCONTRADO
              </span>
              <h1 className="text-xl font-black text-white">
                Mesa &ldquo;{mesaCodigo || 'DESCONHECIDA'}&rdquo; não está ativa
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed">
                O cardápio só pode ser acessado através do QR Code oficial gerado para uma mesa ativa no sistema. Aponte a câmera novamente para o QR Code da sua mesa.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-black text-xs py-3 rounded-xl transition"
            >
              Voltar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080a] text-white flex flex-col">
      {/* Barra Superior Administrativa — visível APENAS se ADM estiver logado */}
      <TopEcosystemBar mesaAtual={mesaCodigo} />

      {/* Palco Central com Foco no Celular (App do Cliente) */}
      <div className="flex-1 flex items-center justify-center px-0 sm:px-4 py-0 sm:py-4">
        <div className="relative w-full sm:w-[410px] min-h-[100dvh] sm:min-h-[780px] sm:h-[800px] bg-[#111216] sm:rounded-[38px] sm:border-[3px] sm:border-zinc-800/95 sm:shadow-[0_25px_90px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">
          {/* MODO STORIES / DESTAQUES */}
          {storiesAberto && storyAtual ? (
            <div className="relative flex-1 flex flex-col justify-between bg-black select-none">
              <img
                src={storyAtual.imagem}
                alt={storyAtual.nome}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_FOOD_SVG;
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/15 to-black/95" />

              <div className="relative z-10 px-3.5 pt-3.5 space-y-3">
                <div className="grid grid-cols-6 gap-1.5">
                  {produtos.slice(0, 6).map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStoryIndex(idx)}
                      className="h-1 rounded-full bg-white/25 overflow-hidden"
                    >
                      <div
                        className={`h-full transition-all ${
                          idx === storyIndex
                            ? 'w-full bg-[#a3e635]'
                            : idx < storyIndex
                            ? 'w-full bg-white/80'
                            : 'w-0'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStoriesAberto(false)}
                    className="bg-black/65 backdrop-blur-md border border-white/15 text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-black/80 transition"
                  >
                    <ChevronLeft className="w-4 h-4" /> Cardápio
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="bg-black/65 backdrop-blur-md border border-white/15 text-white px-3 py-1.5 rounded-full text-[11px] font-bold">
                      Mesa {mesaNumero}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStoriesAberto(false)}
                      className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex-1 flex">
                <div
                  onClick={() =>
                    setStoryIndex((prev) => (prev - 1 + produtos.length) % produtos.length)
                  }
                  className="w-1/3 h-full cursor-pointer"
                />
                <div
                  onClick={() => setStoryIndex((prev) => (prev + 1) % produtos.length)}
                  className="w-2/3 h-full cursor-pointer"
                />
              </div>

              <div className="relative z-10 p-4 space-y-3">
                <div className="flex flex-col items-end gap-3 pr-1">
                  <button
                    type="button"
                    onClick={() =>
                      setLikesStories((prev) => ({
                        ...prev,
                        [storyAtual.id]: !prev[storyAtual.id],
                      }))
                    }
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center">
                      <Heart
                        className={`w-5 h-5 ${
                          likedAtual ? 'fill-red-500 text-red-500' : 'text-white'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-white drop-shadow">
                      {(storyAtual.likes || 428) + (likedAtual ? 1 : 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => dispararToast('Link do prato copiado!')}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-white drop-shadow">Enviar</span>
                  </button>
                </div>

                <div className="bg-[#16171d]/95 backdrop-blur-md border border-zinc-800 rounded-3xl p-4 shadow-2xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">
                        {storyAtual.tag || 'DESTAQUE DA CASA'}
                      </span>
                      <h3 className="text-lg font-black text-white leading-tight mt-0.5">
                        {storyAtual.nome}
                      </h3>
                      <p className="text-emerald-400 font-extrabold text-sm mt-0.5">
                        R$ {Number(storyAtual.preco || 0).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStoriesAberto(false);
                        abrirPersonalizacao(storyAtual);
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 flex-shrink-0 transition"
                    >
                      + Personalizar
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 mt-2.5 leading-relaxed">
                    {storyAtual.descricao}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* MODO CARDÁPIO DIGITAL DO CLIENTE */
            <>
              <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-[#f5f6f8] text-zinc-900">
                {/* Cabeçalho Escuro Gourmet */}
                <div className="relative bg-[#111216] text-white px-4 pt-4 pb-5 rounded-b-[28px] shadow-xl overflow-hidden">
                  <img
                    src={configLoja.bannerUrl}
                    alt={configLoja.nomeRestaurante}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_FOOD_SVG;
                    }}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#111216]/85 to-[#111216]" />

                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        NFC • Mesa {mesaNumero}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {pedidosAtivosMesa.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setModalMeusPedidosAberto(true)}
                            className="bg-[#a3e635] text-zinc-950 px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Pedidos ({pedidosAtivosMesa.length})</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setStoryIndex(0);
                            setStoriesAberto(true);
                          }}
                          className="bg-black/60 backdrop-blur-md border border-white/15 hover:border-[#a3e635] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#a3e635]" />
                          Destaques ▶
                        </button>
                      </div>
                    </div>

                    {toastMsg && (
                      <div className="bg-[#1b1c22]/95 border border-zinc-700/80 px-3.5 py-2 rounded-2xl text-xs font-semibold text-white flex items-center gap-2 shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <span className="truncate">{toastMsg}</span>
                      </div>
                    )}

                    {/* Card de Comprovante com Código Automático logo após pedir */}
                    {comprovanteRecente && (
                      <div className="bg-[#132215] border border-[#a3e635]/60 rounded-2xl p-3.5 space-y-2 shadow-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-[#a3e635] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> PEDIDO REGISTRADO NO SISTEMA
                          </span>
                          <button
                            type="button"
                            onClick={() => setComprovanteRecente(null)}
                            className="text-zinc-400 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-black/40 border border-[#a3e635]/30 rounded-xl px-3 py-2">
                          <div>
                            <span className="block text-[9px] uppercase text-zinc-400 font-bold">
                              SEU CÓDIGO AUTOMÁTICO
                            </span>
                            <span className="text-lg font-black tracking-wider text-[#a3e635] font-mono">
                              {comprovanteRecente.codigoPedido}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              copiarTexto(
                                comprovanteRecente.codigoPedido,
                                `Código ${comprovanteRecente.codigoPedido} copiado!`
                              )
                            }
                            className="bg-[#a3e635] text-zinc-950 font-black text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copiar
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-300">
                          <span>
                            Cliente: <strong className="text-white">{comprovanteRecente.nomeCliente}</strong>
                          </span>
                          <span>Hora: {comprovanteRecente.horaPedido}</span>
                        </div>
                      </div>
                    )}

                    {/* Identidade Dinâmica da Loja (vinda do Firestore) */}
                    <div className="pt-0.5">
                      <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center mb-1.5">
                        <Utensils className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <h1 className="text-2xl font-black tracking-tight leading-none uppercase">
                        {nomeParts.length > 1 ? (
                          <>
                            {nomeParts[0]}
                            <span className="text-red-500">&amp;</span>
                            {nomeParts.slice(1).join('&')}
                          </>
                        ) : (
                          configLoja.nomeRestaurante
                        )}
                      </h1>
                      <p className="text-xs text-zinc-300 mt-1">{configLoja.subtitulo}</p>
                    </div>

                    {/* Cupom Primeira Compra */}
                    {configLoja.cupomCodigo && (
                      <div className="bg-[#191a21]/95 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 flex-shrink-0">
                            <Ticket className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-zinc-400">
                              PRIMEIRA COMPRA?
                            </p>
                            <button
                              type="button"
                              onClick={copiarCupom}
                              className="mt-0.5 inline-flex items-center gap-1.5 border border-dashed border-red-500/70 bg-red-500/10 text-red-400 px-2 py-0.5 rounded-md text-[11px] font-black tracking-wide"
                            >
                              {configLoja.cupomCodigo} <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] uppercase text-zinc-400 font-bold">
                            GANHE
                          </span>
                          <span className="block text-sm font-black text-red-500 leading-tight">
                            {configLoja.cupomDescontoPercent}% OFF
                          </span>
                          <span className="block text-[9px] text-zinc-400">
                            No primeiro pedido
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Tappo Club */}
                    {configLoja.tappoClubAtivo !== false && (
                      <div className="bg-[#191a21]/95 border border-zinc-800 rounded-2xl px-3 py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#a3e635]/20 border border-[#a3e635]/40 text-[#a3e635] font-black text-xs flex items-center justify-center">
                            T
                          </span>
                          <span className="text-[11px] text-zinc-300 font-medium">
                            {tappoClubAtivo ? (
                              <>
                                Você tem{' '}
                                <strong className="text-[#a3e635]">
                                  {configLoja.tappoClubPontos || 150} pts
                                </strong>{' '}
                                no Tappo Club
                              </>
                            ) : (
                              <>
                                Entre no <strong className="text-[#a3e635]">Tappo Club</strong> para
                                ganhar pontos
                              </>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTappoClubAtivo(!tappoClubAtivo);
                            dispararToast(
                              !tappoClubAtivo
                                ? `Tappo Club ativado! +${configLoja.tappoClubPontos || 150} pontos.`
                                : 'Modo visitante ativado.'
                            );
                          }}
                          className="bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 font-black text-[11px] px-3 py-1.5 rounded-xl transition flex-shrink-0"
                        >
                          {tappoClubAtivo ? 'Ativo ✓' : 'Entrar'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Categorias + Cards dos Produtos */}
                <div className="px-4 pt-4 space-y-4">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    <button
                      type="button"
                      onClick={() => setCategoriaAtiva('Mais Vendidos')}
                      className={`px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition shadow-sm ${
                        categoriaAtiva === 'Mais Vendidos'
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      🔥 Mais Vendidos
                    </button>
                    {categoriasDisponiveis.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoriaAtiva(cat)}
                        className={`px-3.5 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition shadow-sm ${
                          categoriaAtiva === cat
                            ? 'bg-red-600 text-white'
                            : 'bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black uppercase text-zinc-900 tracking-tight">
                        {categoriaAtiva}
                      </h2>
                      <p className="text-[11px] text-zinc-500">
                        Toque no item para ver ingredientes e personalizar
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStoryIndex(0);
                        setStoriesAberto(true);
                      }}
                      className="text-red-600 hover:text-red-500 text-xs font-extrabold flex items-center gap-1"
                    >
                      Ver em vídeo ▶
                    </button>
                  </div>

                  {/* Lista de Produtos — Clicar abre modal estilo McDonald's */}
                  <div className="space-y-3">
                    {produtosFiltrados.map((prod) => {
                      const qtdNoCarrinho = carrinho
                        .filter((i) => i.id === prod.id)
                        .reduce((s, i) => s + i.qtd, 0);

                      return (
                        <div
                          key={prod.id}
                          onClick={() => abrirPersonalizacao(prod)}
                          className="bg-white border border-zinc-200/80 hover:border-red-400 rounded-2xl p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition cursor-pointer group"
                        >
                          <img
                            src={prod.imagem}
                            alt={prod.nome}
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_FOOD_SVG;
                            }}
                            className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-zinc-100 group-hover:scale-105 transition"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-extrabold uppercase text-red-500 truncate">
                                {prod.tag || prod.categoria}
                              </span>
                              {qtdNoCarrinho > 0 && (
                                <span className="bg-zinc-900 text-[#a3e635] text-[10px] font-black px-2 py-0.5 rounded-full">
                                  {qtdNoCarrinho} na sacola
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-extrabold text-zinc-900 truncate">
                              {prod.nome}
                            </h3>
                            <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5 leading-snug">
                              {prod.descricao}
                            </p>

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-black text-zinc-900">
                                R$ {Number(prod.preco || 0).toFixed(2).replace('.', ',')}
                              </span>

                              <span className="inline-flex items-center gap-1 bg-red-600 group-hover:bg-red-500 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                                <SlidersHorizontal className="w-3 h-3" /> Personalizar
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Acesso discreto para equipe (Garçom / ADM) */}
                  <div className="pt-4 pb-2 text-center">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-700 transition"
                    >
                      <Lock className="w-2.5 h-2.5" /> Área da Equipe (Staff / ADM)
                    </Link>
                  </div>
                </div>
              </div>

              {/* Barra Inferior Fixa: Chamar Garçom + Enviar / Conta */}
              <div className="bg-white border-t border-zinc-200 p-3 flex items-center gap-2.5 z-20">
                <button
                  type="button"
                  onClick={() => setModalGarcomAberto(true)}
                  className="bg-[#14151a] hover:bg-zinc-800 text-white px-3.5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition flex-shrink-0"
                >
                  <BellRing className="w-4 h-4 text-amber-400" />
                  <span>Chamar Garçom</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalContaAberto(true)}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3.5 py-3 rounded-xl text-xs font-extrabold flex items-center justify-between shadow-lg shadow-red-600/25 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-white text-red-600 font-black text-[11px] flex items-center justify-center">
                      {totalItensQtd}
                    </span>
                    <span>Enviar / Conta</span>
                  </span>
                  <span>
                    R$ {(subtotal + totalJaConsumidoNaMesa).toFixed(2).replace('.', ',')}
                  </span>
                </button>
              </div>
            </>
          )}

          {/* MODAL ESTILO MCDONALD'S: PERSONALIZAR INGREDIENTES (TIRAR / ADICIONAR EXTRAS) */}
          {produtoPersonalizando && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-50 flex flex-col justify-end">
              <div className="bg-[#14151a] border-t border-zinc-800 rounded-t-3xl text-white flex flex-col max-h-[92%] shadow-2xl">
                <div className="relative h-36 w-full flex-shrink-0 overflow-hidden rounded-t-3xl">
                  <img
                    src={produtoPersonalizando.imagem}
                    alt={produtoPersonalizando.nome}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_FOOD_SVG;
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14151a] via-black/40 to-transparent" />
                  <button
                    type="button"
                    onClick={() => setProdutoPersonalizando(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 border border-white/15 flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-5 right-5">
                    <span className="text-[10px] font-black uppercase text-[#a3e635]">
                      PERSONALIZAR ITEM • ESTILO TOTEM
                    </span>
                    <h3 className="text-lg font-black leading-tight">
                      {produtoPersonalizando.nome}
                    </h3>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-5">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {produtoPersonalizando.descricao}
                  </p>

                  {Array.isArray(produtoPersonalizando.ingredientes) &&
                    produtoPersonalizando.ingredientes.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                            INGREDIENTES DO LANCHE (TOQUE PARA TIRAR)
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {ingredientesRemovidos.length > 0
                              ? `${ingredientesRemovidos.length} removido(s)`
                              : 'Completo'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {produtoPersonalizando.ingredientes.map((ing) => {
                            const removido = ingredientesRemovidos.includes(ing);
                            return (
                              <button
                                key={ing}
                                type="button"
                                onClick={() => toggleRemoverIngrediente(ing)}
                                className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition ${
                                  removido
                                    ? 'bg-red-950/30 border-red-500/60 text-red-300'
                                    : 'bg-[#1a1b22] border-zinc-800 text-white hover:border-zinc-700'
                                }`}
                              >
                                <span className={removido ? 'line-through opacity-80' : ''}>
                                  {ing}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    removido
                                      ? 'bg-red-600 text-white'
                                      : 'bg-emerald-500/15 text-emerald-400'
                                  }`}
                                >
                                  {removido ? `SEM ${ing.split(' ')[0]}` : 'Com ✓'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {Array.isArray(produtoPersonalizando.adicionais) &&
                    produtoPersonalizando.adicionais.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#a3e635] block">
                          TURBINAR • ADICIONAR INGREDIENTE A MAIS (+)
                        </span>

                        <div className="space-y-2">
                          {produtoPersonalizando.adicionais.map((extra) => {
                            const q = extrasQtd[extra.id] || 0;
                            return (
                              <div
                                key={extra.id}
                                className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between gap-2 transition ${
                                  q > 0
                                    ? 'bg-[#1a1f16] border-[#a3e635]/60'
                                    : 'bg-[#1a1b22] border-zinc-800'
                                }`}
                              >
                                <div>
                                  <p className="text-xs font-extrabold text-white">{extra.nome}</p>
                                  <p className="text-[11px] font-bold text-[#a3e635]">
                                    + R$ {Number(extra.preco || 0).toFixed(2).replace('.', ',')}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-xl">
                                  <button
                                    type="button"
                                    onClick={() => alterarQtdExtra(extra.id, -1)}
                                    className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-xs font-black min-w-[16px] text-center">
                                    {q}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => alterarQtdExtra(extra.id, 1)}
                                    className="w-6 h-6 rounded-lg bg-[#a3e635] text-zinc-950 flex items-center justify-center font-black"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                      OBSERVAÇÃO PARA A COZINHA (OPCIONAL)
                    </label>
                    <input
                      type="text"
                      value={obsItem}
                      onChange={(e) => setObsItem(e.target.value)}
                      placeholder="Ex: Carne bem passada, cortar ao meio..."
                      className="w-full bg-[#1a1b22] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-800 bg-[#111216] flex items-center gap-3">
                  <div className="flex items-center gap-2.5 bg-[#1a1b22] border border-zinc-800 px-3 py-2.5 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setQtdPersonalizando((q) => Math.max(1, q - 1))}
                      className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-black min-w-[16px] text-center">
                      {qtdPersonalizando}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQtdPersonalizando((q) => q + 1)}
                      className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={confirmarItemPersonalizado}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs py-3.5 px-4 rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-between transition"
                  >
                    <span>Adicionar ao Pedido</span>
                    <span>
                      R${' '}
                      {(calcularPrecoPersonalizadoUnitario() * qtdPersonalizando)
                        .toFixed(2)
                        .replace('.', ',')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 2: CHAMAR ATENDIMENTO NA MESA */}
          {modalGarcomAberto && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs z-40 flex flex-col justify-end">
              <div className="bg-[#14151a] border-t border-zinc-800 rounded-t-3xl p-5 text-white space-y-4 shadow-2xl">
                <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />

                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-red-500 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> NFC • MESA{' '}
                      {mesaNumero}
                    </span>
                    <h3 className="text-lg font-black mt-0.5">
                      Chamar atendimento na Mesa {mesaNumero}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Selecione um motivo rápido para agilizar o atendimento:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalGarcomAberto(false)}
                    className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={confirmarChamadoGarcom} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {MOTIVOS_ATENDIMENTO.map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setMotivoSelecionado(m.titulo)}
                        className={`p-3.5 rounded-2xl border text-left transition ${
                          motivoSelecionado === m.titulo
                            ? 'bg-red-950/35 border-red-500 text-white'
                            : 'bg-[#1a1b22] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-lg block mb-1">{m.emoji}</span>
                        <span className="text-xs font-extrabold block">{m.titulo}</span>
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={obsGarcom}
                    onChange={(e) => setObsGarcom(e.target.value)}
                    placeholder="Observação opcional (ex: trazer ketchup e maionese)..."
                    className="w-full bg-[#1a1b22] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                  />

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setModalGarcomAberto(false)}
                      className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-xs font-extrabold transition"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={enviandoGarcom}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl text-xs font-extrabold transition shadow-lg shadow-red-600/25"
                    >
                      {enviandoGarcom ? 'Enviando...' : 'Confirmar Chamado'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL 3: ENVIAR PEDIDO (COM NOME OBRIGATÓRIO + CÓDIGO AUTOMÁTICO) / FECHAR CONTA */}
          {modalContaAberto && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xs z-40 flex flex-col justify-end">
              <div className="bg-[#14151a] border-t border-zinc-800 rounded-t-3xl p-5 text-white space-y-4 max-h-[92%] overflow-y-auto no-scrollbar shadow-2xl">
                <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-red-500 uppercase">
                      NFC • MESA {mesaNumero}
                    </span>
                    <h3 className="text-lg font-black">Finalizar Pedido / Conta</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalContaAberto(false)}
                    className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* CAMPO OBRIGATÓRIO DO NOME DO CLIENTE PARA GERAR CÓDIGO AUTOMÁTICO */}
                <div className="bg-[#1a1b22] border border-zinc-700/80 rounded-2xl p-3.5 space-y-2">
                  <label className="text-[11px] font-black uppercase text-[#a3e635] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> SEU NOME (PARA GERAR O CÓDIGO DO PEDIDO)
                  </label>
                  <input
                    ref={inputNomeRef}
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => handleAlterarNomeCliente(e.target.value)}
                    placeholder="Digite seu nome (Ex: Maria Oliveira)"
                    className={`w-full bg-zinc-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none ${
                      erroNome
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-zinc-800 focus:border-[#a3e635]'
                    }`}
                  />
                  {erroNome ? (
                    <p className="text-[11px] text-red-400 font-bold">{erroNome}</p>
                  ) : (
                    <p className="text-[10px] text-zinc-400">
                      Ao enviar, você receberá um código automático único (ex: TP-4829) registrado no sistema.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase text-zinc-400">
                    ITENS NA SACOLA ({totalItensQtd})
                  </span>
                  {carrinho.length > 0 && (
                    <button
                      type="button"
                      onClick={enviarPedidoParaCozinha}
                      disabled={enviandoPedido}
                      className="bg-[#a3e635] hover:bg-[#bef264] text-zinc-950 px-3.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-md shadow-[#a3e635]/20 transition"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      {enviandoPedido ? 'Enviando...' : 'Enviar Pedido p/ Cozinha'}
                    </button>
                  )}
                </div>

                {carrinho.length > 0 ? (
                  <div className="space-y-2">
                    {carrinho.map((item) => (
                      <div
                        key={item.cartKey}
                        className="bg-[#1a1b22] border border-zinc-800 rounded-2xl p-3 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-white">{item.nome}</p>
                          <p className="text-[11px] text-zinc-400">
                            R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')} cada
                          </p>
                          {item.ingredientesRemovidos?.length > 0 && (
                            <p className="text-[10px] text-red-400 font-bold mt-0.5">
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
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => alterarQtdCarrinho(item.cartKey, -1)}
                              className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <span className="text-xs font-black">{item.qtd}</span>
                            <button
                              type="button"
                              onClick={() => alterarQtdCarrinho(item.cartKey, 1)}
                              className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs font-black text-white whitespace-nowrap">
                            R$ {(Number(item.preco || 0) * item.qtd).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#1a1b22] border border-zinc-800 rounded-2xl p-3.5 text-center text-xs text-zinc-400">
                    Nenhum item novo na sacola.
                    {pedidosAtivosMesa.length > 0 && (
                      <span className="block text-emerald-400 font-bold mt-1">
                        Você já possui {pedidosAtivosMesa.length} pedido(s) ativo(s) nesta mesa (R${' '}
                        {totalJaConsumidoNaMesa.toFixed(2).replace('.', ',')}).
                      </span>
                    )}
                  </div>
                )}

                {/* Cupom */}
                {configLoja.cupomCodigo && carrinho.length > 0 && (
                  <div className="bg-[#1a1b22] border border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-red-600/15 text-red-500 font-black text-xs flex items-center justify-center">
                        %
                      </span>
                      <div>
                        <p className="text-xs font-extrabold">Cupom {configLoja.cupomCodigo}</p>
                        <p className="text-[10px] text-zinc-400">
                          {configLoja.cupomDescontoPercent}% de desconto na primeira compra
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCupomAplicado(!cupomAplicado)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${
                        cupomAplicado
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                      }`}
                    >
                      {cupomAplicado ? 'Aplicado ✓' : 'Aplicar'}
                    </button>
                  </div>
                )}

                {/* Totais */}
                <div className="bg-[#1a1b22] border border-zinc-800 rounded-2xl p-3.5 space-y-2 text-xs">
                  {totalJaConsumidoNaMesa > 0 && (
                    <div className="flex justify-between text-zinc-300">
                      <span>Pedidos já enviados na Mesa {mesaNumero}</span>
                      <span>R$ {totalJaConsumidoNaMesa.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-400">
                    <span>Sacola atual</span>
                    <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                  </div>
                  {cupomAplicado && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>
                        Desconto {configLoja.cupomCodigo} ({configLoja.cupomDescontoPercent}%)
                      </span>
                      <span>- R$ {desconto.toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}
                  {carrinho.length > 0 && (
                    <label className="flex items-center justify-between text-zinc-300 cursor-pointer">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={incluirGorjeta}
                          onChange={(e) => setIncluirGorjeta(e.target.checked)}
                          className="accent-red-600 rounded"
                        />
                        Incluir {configLoja.taxaGarcomPercent}% do garçom
                      </span>
                      <span>R$ {taxaGarcom.toFixed(2).replace('.', ',')}</span>
                    </label>
                  )}
                  <div className="border-t border-zinc-800 pt-2 flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">Total da Mesa</span>
                    <span className="font-black text-lg text-emerald-400">
                      R$ {(totalFinal + totalJaConsumidoNaMesa).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 block">
                    FORMA DE PAGAMENTO (LEVAREMOS A MAQUININHA CERTA)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cartão', icon: CreditCard },
                      { id: 'PIX', icon: QrCode },
                      { id: 'Dinheiro', icon: Banknote },
                    ].map((fp) => {
                      const Icon = fp.icon;
                      return (
                        <button
                          type="button"
                          key={fp.id}
                          onClick={() => setFormaPagamento(fp.id)}
                          className={`py-3 px-2 rounded-2xl border flex flex-col items-center gap-1.5 text-xs font-extrabold transition ${
                            formaPagamento === fp.id
                              ? 'bg-red-950/35 border-red-500 text-white'
                              : 'bg-[#1a1b22] border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-sky-400" />
                          <span>{fp.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={confirmarFechamentoConta}
                  disabled={enviandoPedido}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs py-3.5 rounded-2xl shadow-lg shadow-red-600/30 transition"
                >
                  {enviandoPedido
                    ? 'Processando...'
                    : `Confirmar e Pedir Conta • ${formaPagamento}`}
                </button>
              </div>
            </div>
          )}

          {/* MODAL 4: ACOMPANHAMENTO DE PEDIDOS ATIVOS DA MESA (COM CÓDIGOS AUTOMÁTICOS) */}
          {modalMeusPedidosAberto && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-50 flex flex-col justify-end">
              <div className="bg-[#14151a] border-t border-zinc-800 rounded-t-3xl p-5 text-white space-y-4 max-h-[88%] overflow-y-auto no-scrollbar shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#a3e635]">
                      COMANDA DA MESA {mesaNumero}
                    </span>
                    <h3 className="text-lg font-black">Seus Pedidos &amp; Códigos</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalMeusPedidosAberto(false)}
                    className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {pedidosAtivosMesa.map((p) => {
                    const st = traduzirStatusPedido(p);
                    return (
                      <div
                        key={p.id}
                        className="bg-[#1a1b22] border border-zinc-800 rounded-2xl p-3.5 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-black text-sm text-[#a3e635] bg-[#a3e635]/10 border border-[#a3e635]/30 px-2.5 py-0.5 rounded-lg">
                            {p.codigoPedido || `#${p.numeroPedido || p.id.slice(0, 4)}`}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${st.cor}`}
                          >
                            {st.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>
                            Cliente: <strong className="text-white">{p.nomeCliente || 'Cliente'}</strong>
                          </span>
                          <span>Hora: {p.horaPedido || 'Agora'}</span>
                        </div>

                        <ul className="text-xs space-y-1 border-t border-zinc-800/80 pt-2">
                          {(p.itens || []).map((it, idx) => (
                            <li key={idx} className="text-zinc-200">
                              • {it.nome}
                            </li>
                          ))}
                        </ul>

                        <div className="flex items-center justify-between text-xs font-black pt-1 border-t border-zinc-800/80">
                          <span className="text-zinc-400">Valor</span>
                          <span className="text-emerald-400">
                            R$ {Number(p.total || 0).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
