import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  CONFIG_LOJA_PADRAO,
  PRODUTOS_INICIAIS_SEED,
  MESAS_INICIAIS_SEED,
} from '../data/menuData';

let inicializacaoEmAndamento = false;

/**
 * Garante que a estrutura inicial (configuração da loja, cardápio com ingredientes
 * e mesas QR) esteja gravada no Firebase Firestore para o ADM poder editar depois,
 * mantendo o banco 100% limpo de pedidos e dinheiro fictícios.
 */
export async function garantirBancoProntoNoFirebase(forcar = false) {
  if (inicializacaoEmAndamento) return;
  inicializacaoEmAndamento = true;
  try {
    const configRef = doc(db, 'config_loja', 'geral');
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists() || forcar) {
      await setDoc(
        configRef,
        {
          ...CONFIG_LOJA_PADRAO,
          atualizadoEm: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const prodSnap = await getDocs(collection(db, 'produtos'));
    if (prodSnap.empty) {
      for (const item of PRODUTOS_INICIAIS_SEED) {
        await addDoc(collection(db, 'produtos'), {
          ...item,
          criadoEm: serverTimestamp(),
        });
      }
    }

    const mesasSnap = await getDocs(collection(db, 'mesas'));
    if (mesasSnap.empty) {
      for (const m of MESAS_INICIAIS_SEED) {
        await addDoc(collection(db, 'mesas'), {
          ...m,
          criadoEm: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('Aviso ao verificar estrutura inicial no Firebase:', err?.message);
  } finally {
    inicializacaoEmAndamento = false;
  }
}

/**
 * Limpa pedidos, chamados e histórico de teste para zerar o caixa/faturamento da empresa.
 */
export async function limparPedidosECaixaFirebase() {
  const colecoes = ['pedidos', 'chamados_garcom', 'historico_atendimentos'];
  for (const nomeCol of colecoes) {
    const snap = await getDocs(collection(db, nomeCol));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, nomeCol, d.id));
    }
  }
}
