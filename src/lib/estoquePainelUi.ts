import type { Tom } from "@/components/ui";
import type { ItemAjuste, ItemMovimentacao, Saldo, SituacaoSaldo, StatusAjuste } from "./estoquePainelApi";

/** Regras de apresentação do saldo e das movimentações (sem React, para testar). */

export const ROTULO_SITUACAO: Record<SituacaoSaldo, string> = {
  ok: "OK",
  baixo: "Estoque baixo",
  esgotado: "Esgotado",
};

export const TOM_SITUACAO: Record<SituacaoSaldo, Tom> = { ok: "ok", baixo: "alerta", esgotado: "perigo" };

/** "Branco · M" (o SKU aparece à parte). */
export const detalheDaPeca = (p: { cor: string; tamanho: string }) => `${p.cor} · ${p.tamanho}`;

/** Quantidade de uma loja destacada: esgotada em vermelho, no mínimo ou abaixo em âmbar. */
export function destaqueDaQuantidade(quantidade: number, minimo: number): "perigo" | "alerta" | null {
  if (quantidade === 0) return "perigo";
  return quantidade <= minimo ? "alerta" : null;
}

/** Observação da linha do histórico: o motivo, e o pedido quando a movimentação veio de uma venda. */
export function observacaoDaMovimentacao(m: Pick<ItemMovimentacao, "motivo" | "numero_pedido">): string {
  const partes = [m.motivo, m.numero_pedido && !m.motivo?.includes(m.numero_pedido) ? `Pedido ${m.numero_pedido}` : null];
  return partes.filter(Boolean).join(" · ") || "—";
}

/** Quem registrou: o nome, ou "Sistema" quando foi automático (venda no site, por exemplo). */
export const responsavelDaMovimentacao = (m: Pick<ItemMovimentacao, "responsavel">) => m.responsavel ?? "Sistema";

/** Texto "1–25 de 1.840" da paginação. */
export function faixaDaPagina(pagina: number, porPagina: number, total: number): string {
  if (total === 0) return "0 de 0";
  const inicio = pagina * porPagina + 1;
  const fim = Math.min((pagina + 1) * porPagina, total);
  return `${inicio.toLocaleString("pt-BR")}–${fim.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")}`;
}

// ---------- Registrar entrada, saída e ajuste ----------

export const ROTULO_AJUSTE: Record<StatusAjuste, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Recusado",
};

export const TOM_AJUSTE: Record<StatusAjuste, Tom> = { pendente: "alerta", aprovado: "ok", rejeitado: "perigo" };

/** Saldo depois de uma entrada ou saída. Negativo significa que a saída não cabe no estoque. */
export const saldoDepois = (tipo: "entrada" | "saida", atual: number, quantidade: number) =>
  tipo === "entrada" ? atual + quantidade : atual - quantidade;

/** Diferença entre a contagem física e o saldo do sistema (a que o ajuste vai aplicar). */
export const diferencaDoAjuste = (contado: number, atual: number) => contado - atual;

/** Saldo de uma peça numa loja, lido da resposta do servidor (0 se a loja não mantém a peça). */
export function saldoNaLoja(saldo: Saldo | null, sku: string, idLoja: string | null): number | null {
  if (!saldo) return null;
  const item = saldo.itens.find((i) => i.sku === sku);
  if (!item) return 0;
  if (!idLoja) return item.total;
  return item.por_loja.find((l) => l.id_loja === idLoja)?.quantidade ?? 0;
}

/** Saldo que a peça terá se o ajuste for aprovado agora. */
export const saldoAposAjuste = (a: Pick<ItemAjuste, "saldo_atual" | "quantidade">) => a.saldo_atual + a.quantidade;

/** Quantidade inteira digitada, ou null se o campo está vazio, é decimal ou negativo. */
export function inteiroDoCampo(valor: string, minimo = 0): number | null {
  if (!/^\d+$/.test(valor.trim())) return null;
  const n = Number(valor);
  return Number.isSafeInteger(n) && n >= minimo && n <= 100_000 ? n : null;
}
