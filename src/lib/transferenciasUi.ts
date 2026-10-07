import type { Tom } from "@/components/ui";
import type { AcaoTransferencia, ItemTransferencia, StatusTransferencia } from "./transferenciasApi";

/** Regras de apresentação de transferências e reposições (sem React, para testar). */

export const ROTULO_STATUS: Record<StatusTransferencia, string> = {
  solicitada: "Pendente",
  aceita: "Em trânsito",
  recebida: "Recebida",
  recusada: "Recusada",
};

export const TOM_STATUS: Record<StatusTransferencia, Tom> = {
  solicitada: "alerta",
  aceita: "destaque",
  recebida: "ok",
  recusada: "perigo",
};

/** Reposição que ninguém atendeu ainda é "Aberta"; as demais seguem o status normal. */
export const rotuloDoStatus = (t: Pick<ItemTransferencia, "status" | "tipo" | "id_loja_origem">) =>
  t.tipo === "reposicao_rede" && t.status === "solicitada" && t.id_loja_origem === null ? "Aberta" : ROTULO_STATUS[t.status];

/** "Centro → Barra"; reposição ainda sem origem vem "da rede". */
export const trajeto = (t: Pick<ItemTransferencia, "origem_nome" | "destino_nome">) =>
  `${t.origem_nome ?? "Toda a rede"} → ${t.destino_nome}`;

/** Rótulo do botão de cada ação, conforme o tipo (na reposição, aceitar se chama "Atender"). */
export function rotuloDaAcao(acao: AcaoTransferencia, t: Pick<ItemTransferencia, "tipo">): string {
  if (acao === "receber") return "Confirmar recebimento";
  if (acao === "recusar") return "Recusar";
  return t.tipo === "reposicao_rede" ? "Atender" : "Aceitar envio";
}

/** O que dizer quando não há ação para quem olha. */
export function textoSemAcao(t: Pick<ItemTransferencia, "status" | "tipo" | "id_loja_origem" | "responsavel">): string {
  if (t.status === "solicitada") return t.tipo === "reposicao_rede" && t.id_loja_origem === null ? "Aguardando outra loja" : "Aguardando a origem";
  if (t.status === "aceita") return "Aguardando o destino";
  if (t.status === "recusada") return t.responsavel ? `Recusada por ${t.responsavel}` : "Recusada";
  return t.responsavel ? `Atendida por ${t.responsavel}` : "—";
}

export const FILTROS_DA_LISTA = [
  { value: "acao", label: "Aguardando você" },
  { value: "andamento", label: "Em andamento" },
  { value: "todas", label: "Todas" },
] as const;

/** Quantidade inteira positiva digitada, ou null se vazia, decimal, negativa ou grande demais. */
export function quantidadeValida(valor: string): number | null {
  if (!/^\d+$/.test(valor.trim())) return null;
  const n = Number(valor);
  return n >= 1 && n <= 100_000 ? n : null;
}

/** Quantos minimos o usuario alterou (compara o rascunho com o valor salvo). */
export function minimosAlterados(
  itens: { sku: string; minimo: number }[],
  rascunho: Record<string, string>,
): { sku: string; minimo: number }[] {
  const salvo = new Map(itens.map((i) => [i.sku, i.minimo]));
  const mudados: { sku: string; minimo: number }[] = [];
  for (const [sku, texto] of Object.entries(rascunho)) {
    if (!/^\d+$/.test(texto.trim())) continue;
    const valor = Number(texto);
    if (valor <= 100_000 && salvo.has(sku) && salvo.get(sku) !== valor) mudados.push({ sku, minimo: valor });
  }
  return mudados;
}

/** Algum campo digitado está fora do formato (vazio, decimal, negativo)? Então não dá para salvar. */
export const rascunhoInvalido = (rascunho: Record<string, string>) =>
  Object.values(rascunho).some((v) => !/^\d+$/.test(v.trim()) || Number(v) > 100_000);
