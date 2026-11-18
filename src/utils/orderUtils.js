// Utilitários para geração de código automático de pedido e formatação oficial de data/hora

/**
 * Gera um código único automático para o pedido (ex: TP-4829)
 * combinando segundos atuais + dígitos aleatórios para evitar colisões.
 */
export function gerarCodigoAutomaticoPedido() {
  const agora = Date.now().toString().slice(-2);
  const aleatorio = Math.floor(10 + Math.random() * 90);
  return `TP-${agora}${aleatorio}`;
}

/**
 * Retorna data, hora e dataHora formatados no padrão brasileiro (DD/MM/AAAA e HH:mm:ss)
 * para salvar junto com o serverTimestamp() no Firebase Firestore.
 */
export function obterDataHoraAtualBR(date = new Date()) {
  const data = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hora = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return {
    data,
    hora,
    dataHora: `${data} às ${hora}`,
    iso: date.toISOString(),
  };
}
