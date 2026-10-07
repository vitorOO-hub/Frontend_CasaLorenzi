/**
 * Rotas do FastAPI (seção 6 do briefing): só as ações sensíveis, que mexem em várias tabelas,
 * dependem do estado atual, coordenam algo externo ou gravam auditoria. Cada escrita passa
 * por aqui OU pelo Supabase direto (./dados.ts), nunca pelos dois.
 */
import { config } from "./config";
import { ErroApi } from "./erros";
import { api } from "./http";
import type {
  AjusteCriar,
  AjusteLer,
  AjusteRecusar,
  ChamadoCriar,
  ChamadoLer,
  DadoRecebidoLer,
  DashboardLer,
  Id,
  LojaAtualizar,
  LojaCriar,
  LojaLer,
  LoteCriado,
  LoteCriar,
  MinimosDefinir,
  MovimentacaoCriar,
  MovimentacaoLer,
  PedidoCriar,
  PedidoLer,
  ProdutoAtualizar,
  ProdutoCriar,
  ProdutoLer,
  RegistroMapear,
  ReposicaoCriar,
  ReposicaoLer,
  TransferenciaCriar,
  TransferenciaLer,
  TransferenciaRecusar,
  UsuarioCriar,
  UsuarioLer,
  UsuarioPapelAtualizar,
  Uuid,
} from "./tipos";

// ---------- Estoque (operador_estoque+, na própria loja) ----------

export const estoque = {
  movimentar: (dados: MovimentacaoCriar) => api.post<MovimentacaoLer>("/movimentacoes", dados),

  solicitarTransferencia: (dados: TransferenciaCriar) => api.post<TransferenciaLer>("/transferencias", dados),
  /** Origem aceita: debita a origem. 409 se já não estiver Pendente. */
  aceitarTransferencia: (id: Id) => api.post<TransferenciaLer>(`/transferencias/${id}/aceitar`),
  /** Destino confirma a chegada: credita o destino. 409 se não estiver Aceita. */
  receberTransferencia: (id: Id) => api.post<TransferenciaLer>(`/transferencias/${id}/receber`),
  recusarTransferencia: (id: Id, dados: TransferenciaRecusar = {}) =>
    api.post<TransferenciaLer>(`/transferencias/${id}/recusar`, dados),

  pedirReposicao: (dados: ReposicaoCriar) => api.post<ReposicaoLer>("/reposicoes", dados),
  /** Aceitar gera a transferência automaticamente, vinculada à reposição. */
  aceitarReposicao: (id: Id) => api.post<ReposicaoLer>(`/reposicoes/${id}/aceitar`),
  recusarReposicao: (id: Id) => api.post<ReposicaoLer>(`/reposicoes/${id}/recusar`),

  /** Solicita ajuste; o saldo não muda até a aprovação. */
  solicitarAjuste: (dados: AjusteCriar) => api.post<AjusteLer>("/ajustes", dados),
  /** gerente_loja ou admin. Segunda decisão sobre o mesmo ajuste devolve 409. */
  aprovarAjuste: (id: Id) => api.post<AjusteLer>(`/ajustes/${id}/aprovar`),
  recusarAjuste: (id: Id, dados: AjusteRecusar) => api.post<AjusteLer>(`/ajustes/${id}/recusar`, dados),

  /** gerente_loja ou admin; grava auditoria. */
  definirMinimos: (dados: MinimosDefinir) => api.put<{ atualizados: number }>("/estoque/minimos", dados),
};

// ---------- Compras (cliente) ----------

export const compras = {
  /** Checkout transacional. Gere a `chaveIdempotencia` uma vez por tentativa de compra. */
  fecharPedido: (dados: PedidoCriar, chaveIdempotencia: string) =>
    api.post<PedidoLer>("/pedidos", dados, { idempotencia: chaveIdempotencia }),
  cancelarPedido: (id: Id) => api.post<PedidoLer>(`/pedidos/${id}/cancelar`),
};

// ---------- Atendimento ----------

export const atendimento = {
  /** Cliente abre já com pedido e item de contexto (botão "Ajuda" no pedido). */
  abrirChamado: (dados: ChamadoCriar) => api.post<ChamadoLer>("/chamados", dados),
  /** Assume se ainda estiver na fila; 409 quando outro atendente pegou primeiro. */
  assumirChamado: (id: Id) => api.post<ChamadoLer>(`/chamados/${id}/assumir`),
  /** Resolve e libera o convite de avaliação. */
  resolverChamado: (id: Id) => api.post<ChamadoLer>(`/chamados/${id}/resolver`),
};

// ---------- Admin (com auditoria) ----------

export const admin = {
  criarUsuario: (dados: UsuarioCriar) => api.post<UsuarioLer>("/usuarios", dados),
  alterarPapel: (id: Uuid, dados: UsuarioPapelAtualizar) => api.patch<UsuarioLer>(`/usuarios/${id}/papel`, dados),

  criarLoja: (dados: LojaCriar) => api.post<LojaLer>("/lojas", dados),
  editarLoja: (id: Id, dados: LojaAtualizar) => api.put<LojaLer>(`/lojas/${id}`, dados),

  criarProduto: (dados: ProdutoCriar) => api.post<ProdutoLer>("/produtos", dados),
  editarProduto: (id: Id, dados: ProdutoAtualizar) => api.put<ProdutoLer>(`/produtos/${id}`, dados),
  /** Bloqueado (409) se houver estoque ou pedido; prefira editar com `ativo: false`. */
  excluirProduto: (id: Id) => api.delete<void>(`/produtos/${id}`),
};

// ---------- Integração (Vulto) ----------

export const integracao = {
  enviarLote: (dados: LoteCriar) => api.post<LoteCriado>("/integracao/lotes", dados),
  /** Idempotente: pode rodar várias vezes sobre o mesmo lote. */
  processarLote: (id: Id) => api.post<{ processados: number; revisao_manual: number }>(`/integracao/lotes/${id}/processar`),
  mapearRegistro: (id: Id, dados: RegistroMapear) => api.patch<DadoRecebidoLer>(`/integracao/registros/${id}/mapear`, dados),
};

// ---------- Dashboard ----------

export const dashboard = {
  /** Indicadores já filtrados pelo escopo do token (papel e loja). */
  obter: (params: { de?: string; ate?: string; id_loja?: Id } = {}) => api.get<DashboardLer>("/dashboard", params),
};

// ---------- Saúde ----------

/** GET /health (fora de /api/v1, sem autenticação): o backend está no ar? */
export async function backendNoAr(): Promise<boolean> {
  if (!config.apiUrl) throw new ErroApi("configuracao");
  try {
    const r = await fetch(`${config.apiUrl}/health`);
    return r.ok;
  } catch {
    return false;
  }
}
