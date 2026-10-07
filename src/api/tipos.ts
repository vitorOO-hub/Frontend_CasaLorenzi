/**
 * Contrato com o backend (briefing "Casa Lorenzi — contexto do backend").
 *
 * - Enums: espelham os enums do PostgreSQL (seção 12.2: um só lugar de verdade). Se o
 *   schema final usar outros valores, mude só aqui.
 * - Nomes de campos em snake_case, como saem do banco e do FastAPI.
 * - Modelos de entrada (`...Criar`, `...Atualizar`) nunca levam `papel`, `id_cliente` nem a
 *   loja do próprio usuário: o backend tira esses valores do token (seção 3) e recusa com
 *   422 campos desconhecidos (`extra="forbid"`).
 * - Dinheiro chega como string decimal (`numeric(10,2)` serializado pelo Pydantic como
 *   `Decimal`). Use `dinheiro()` para converter só na hora de exibir ou somar.
 */

// ===================== Básicos =====================

export type Id = number;
/** UUID do Supabase Auth (`auth.users.id`), usado em `cliente` e `usuario_interno`. */
export type Uuid = string;
/** `numeric(10,2)` serializado como texto, ex.: "649.00". */
export type Decimal = string;
/** `timestamptz` em ISO 8601. */
export type DataHora = string;

export const dinheiro = (valor: Decimal | number) => Number(valor);

/** Paginação obrigatória (seção 12.5): limit padrão 20, máximo 100. */
export const LIMITE_PADRAO = 20;
export const LIMITE_MAXIMO = 100;
export type Paginacao = { limit?: number; offset?: number };
export type Pagina<T> = { itens: T[]; total: number; limit: number; offset: number };

// ===================== Enums =====================

export const PAPEIS = ["atendente", "operador_estoque", "gerente_loja", "admin"] as const;
export type Papel = (typeof PAPEIS)[number];

export const TIPOS_MOVIMENTACAO = ["Entrada", "Saída", "Ajuste", "Transferência"] as const;
export type TipoMovimentacao = (typeof TIPOS_MOVIMENTACAO)[number];

export const STATUS_TRANSFERENCIA = ["Pendente", "Aceita", "Recebida", "Recusada"] as const;
export type StatusTransferencia = (typeof STATUS_TRANSFERENCIA)[number];

export const STATUS_REPOSICAO = ["Aberta", "Aceita", "Recusada"] as const;
export type StatusReposicao = (typeof STATUS_REPOSICAO)[number];

export const STATUS_AJUSTE = ["Pendente", "Aprovado", "Recusado"] as const;
export type StatusAjuste = (typeof STATUS_AJUSTE)[number];

/** Status derivado do saldo, nunca armazenado (seção 5). */
export type StatusEstoque = "OK" | "Estoque baixo" | "Esgotado";

export const STATUS_PEDIDO = ["Separação", "Em transporte", "Entregue", "Cancelado"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const METODOS_PAGAMENTO = ["Cartão", "Pix"] as const;
export type MetodoPagamento = (typeof METODOS_PAGAMENTO)[number];

export const TIPOS_ENTREGA = ["Entrega", "Retirada"] as const;
export type TipoEntrega = (typeof TIPOS_ENTREGA)[number];

export const MOTIVOS_CHAMADO = ["Defeito", "Troca", "Entrega", "Dúvida"] as const;
export type MotivoChamado = (typeof MOTIVOS_CHAMADO)[number];

export const PRIORIDADES = ["Alta", "Média", "Baixa"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const STATUS_CHAMADO = ["Aberto", "Em andamento", "Resolvido"] as const;
export type StatusChamado = (typeof STATUS_CHAMADO)[number];

export const CANAIS_CHAMADO = ["Portal", "WhatsApp", "E-mail", "Loja"] as const;
export type CanalChamado = (typeof CANAIS_CHAMADO)[number];

export const STATUS_DADO_RECEBIDO = ["Pendente", "Processado", "Revisão manual", "Erro"] as const;
export type StatusDadoRecebido = (typeof STATUS_DADO_RECEBIDO)[number];

// ===================== Regras espelhadas do backend =====================

/** Status do saldo: Esgotado (0), Estoque baixo (0 < qtd <= mínimo), senão OK. */
export function statusEstoque(quantidade: number, minimo: number): StatusEstoque {
  if (quantidade <= 0) return "Esgotado";
  if (quantidade <= minimo) return "Estoque baixo";
  return "OK";
}

/** Prioridade inicial pelo motivo: defeito = alta; troca e entrega = média; dúvida = baixa. */
export const prioridadeInicial: Record<MotivoChamado, Prioridade> = {
  Defeito: "Alta",
  Troca: "Média",
  Entrega: "Média",
  Dúvida: "Baixa",
};

/** Prazo de primeira resposta, em minutos. */
export const prazoPrimeiraResposta: Record<Prioridade, number> = { Alta: 30, Média: 120, Baixa: 240 };

// ===================== Sessão (claims do JWT) =====================

/**
 * Claims que o Custom Access Token Hook grava no JWT do usuário interno.
 * Cliente não tem `papel`. `loja_id` é nulo só para admin.
 */
export type ClaimsToken = {
  sub: Uuid;
  email?: string;
  exp: number;
  aud?: string | string[];
  papel?: Papel;
  loja_id?: Id | null;
};

// ===================== Lojas e catálogo =====================

export type LojaLer = {
  id: Id;
  nome: string;
  cidade: string;
  endereco: string;
  responsavel: string | null;
  id_empresa: Id | null;
};
export type LojaCriar = { nome: string; cidade: string; endereco: string; responsavel?: string | null };
export type LojaAtualizar = Partial<LojaCriar>;

export type VariacaoLer = {
  id: Id;
  id_produto: Id;
  sku: string;
  tamanho: string;
  cor: string;
  codigo_barras: string | null;
  preco: Decimal;
};
export type VariacaoCriar = { sku: string; tamanho: string; cor: string; codigo_barras?: string | null; preco: Decimal };

export type ProdutoLer = {
  id: Id;
  nome: string;
  categoria: string;
  descricao: string | null;
  ativo: boolean;
  variacoes: VariacaoLer[];
};
export type ProdutoCriar = {
  nome: string;
  categoria: string;
  descricao?: string | null;
  ativo?: boolean;
  variacoes: VariacaoCriar[];
};
export type ProdutoAtualizar = Partial<Omit<ProdutoCriar, "variacoes">>;

// ===================== Estoque =====================

/** Saldo de uma variação numa loja (`estoque`, UNIQUE (id_loja, id_variacao)). */
export type EstoqueLer = {
  id: Id;
  id_loja: Id;
  id_variacao: Id;
  quantidade: number;
  minimo: number;
};

export type MovimentacaoLer = {
  id: Id;
  id_loja: Id;
  id_variacao: Id;
  tipo: TipoMovimentacao;
  /** Positiva para entrada/crédito, negativa para saída/débito. */
  quantidade: number;
  observacao: string | null;
  id_usuario: Uuid;
  id_transferencia: Id | null;
  id_solicitacao_ajuste: Id | null;
  criado_em: DataHora;
};

/**
 * POST /movimentacoes — entrada ou saída com lastro físico (sem aprovação).
 * `id_loja` é a loja onde a peça entra ou sai: para operador e gerente o backend exige que
 * seja a do token; o admin escolhe qualquer uma.
 */
export type MovimentacaoCriar = {
  tipo: Extract<TipoMovimentacao, "Entrada" | "Saída">;
  id_loja: Id;
  id_variacao: Id;
  quantidade: number; // > 0; o sinal vem do tipo
  observacao?: string | null;
};

export type TransferenciaLer = {
  id: Id;
  id_loja_origem: Id;
  id_loja_destino: Id;
  status: StatusTransferencia;
  id_solicitante: Uuid;
  id_solicitacao_estoque: Id | null;
  criado_em: DataHora;
  itens: { id_variacao: Id; quantidade: number }[];
};
/** POST /transferencias — origem diferente de destino (CHECK no banco). */
export type TransferenciaCriar = {
  id_loja_origem: Id;
  id_loja_destino: Id;
  itens: { id_variacao: Id; quantidade: number }[];
};
export type TransferenciaRecusar = { motivo?: string | null };

/** Reposição (pull): `id_loja_destinatario` nulo = qualquer loja pode aceitar. */
export type ReposicaoLer = {
  id: Id;
  id_loja_solicitante: Id;
  id_loja_destinatario: Id | null;
  status: StatusReposicao;
  id_solicitante: Uuid;
  id_transferencia: Id | null;
  criado_em: DataHora;
  itens: { id_variacao: Id; quantidade: number }[];
};
export type ReposicaoCriar = {
  id_loja_destinatario: Id | null;
  itens: { id_variacao: Id; quantidade: number }[];
};

export type AjusteLer = {
  id: Id;
  id_loja: Id;
  id_variacao: Id;
  quantidade_atual: number;
  quantidade_proposta: number;
  motivo: string;
  status: StatusAjuste;
  motivo_recusa: string | null;
  id_solicitante: Uuid;
  id_aprovador: Uuid | null;
  criado_em: DataHora;
  decidido_em: DataHora | null;
};
/** POST /ajustes — exatamente o exemplo da seção 12.2.1; a loja vem do token. */
export type AjusteCriar = { id_variacao: Id; quantidade_proposta: number; motivo: string };
export type AjusteRecusar = { motivo_recusa: string };

/** PUT /estoque/minimos — gerente só na própria loja; admin em qualquer uma. */
export type MinimosDefinir = { itens: { id_loja: Id; id_variacao: Id; minimo: number }[] };

// ===================== Clientes, carrinho e compra =====================

export type ClienteLer = {
  id: Uuid;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  criado_em: DataHora;
};

export type EnderecoLer = {
  id: Id;
  cep: string;
  uf: string;
  cidade: string;
  rua: string;
  numero: string;
  complemento: string | null;
  principal: boolean;
};
export type EnderecoCriar = Omit<EnderecoLer, "id">;

export type ItemCarrinhoLer = { id: Id; id_variacao: Id; quantidade: number };

export type ItemPedidoLer = {
  id: Id;
  id_variacao: Id;
  /** Nome e preço gravados na época da compra. */
  nome_produto: string;
  preco_unitario: Decimal;
  quantidade: number;
};

export type PagamentoLer = {
  metodo: MetodoPagamento;
  valor: Decimal;
  parcelas: number;
  cartao_ultimos_digitos: string | null;
  pix_copia_cola: string | null;
  pix_expira_em: DataHora | null;
  status: string;
};

export type EntregaLer = {
  tipo: TipoEntrega;
  id_endereco: Id | null;
  frete: Decimal;
  codigo_rastreio: string | null;
};

export type PedidoLer = {
  id: Id;
  codigo: string; // ex.: PD-10501
  id_loja: Id;
  status: StatusPedido;
  valor_total: Decimal;
  criado_em: DataHora;
  itens: ItemPedidoLer[];
  pagamento: PagamentoLer;
  entrega: EntregaLer;
};

/**
 * POST /pedidos — checkout transacional, com header Idempotency-Key.
 * Nunca mandar número completo do cartão nem CVV: só o token do gateway e os 4 últimos dígitos.
 */
export type PedidoCriar = {
  id_loja: Id; // loja que separa
  itens: { id_variacao: Id; quantidade: number }[];
  entrega: { tipo: TipoEntrega; id_endereco?: Id | null };
  pagamento:
    | { metodo: "Pix" }
    | { metodo: "Cartão"; parcelas: number; token_cartao: string; cartao_ultimos_digitos: string };
};

export type HistoricoPedidoLer = { status: StatusPedido; criado_em: DataHora; observacao: string | null };

// ===================== Atendimento =====================

export type ChamadoLer = {
  id: Id;
  protocolo: string; // ex.: AT-2026-0901
  id_cliente: Uuid;
  id_loja: Id;
  id_atendente: Uuid | null; // nulo = na fila
  id_pedido: Id | null;
  id_item_pedido: Id | null;
  motivo: MotivoChamado;
  prioridade: Prioridade;
  canal: CanalChamado;
  assunto: string;
  status: StatusChamado;
  criado_em: DataHora;
  ultima_mensagem_em: DataHora | null;
  ultima_mensagem_autor: "cliente" | "atendente" | null;
};

/** POST /chamados — o backend confere que o pedido é do cliente do token. */
export type ChamadoCriar = {
  motivo: MotivoChamado;
  assunto: string;
  descricao: string;
  id_pedido?: Id | null;
  id_item_pedido?: Id | null;
};

export type MensagemLer = {
  id: Id;
  id_atendimento: Id;
  autor: "cliente" | "atendente";
  id_autor: Uuid;
  texto: string;
  criado_em: DataHora;
};
export type MensagemCriar = { id_atendimento: Id; texto: string };

export type AnexoLer = { id: Id; id_atendimento: Id; caminho: string; nome: string; criado_em: DataHora };

/** Uma avaliação por atendimento, nota 1 a 5, só do dono e só depois de resolvido. */
export type AvaliacaoCriar = { id_atendimento: Id; nota: 1 | 2 | 3 | 4 | 5; comentario?: string | null };

// ===================== Admin e auditoria =====================

export type UsuarioLer = {
  id: Uuid;
  nome: string;
  email: string;
  papel: Papel;
  id_loja: Id | null;
  ativo: boolean;
};
/** POST /usuarios — fluxo admin: cria no Supabase Auth e em usuario_interno. */
export type UsuarioCriar = { nome: string; email: string; papel: Papel; id_loja: Id | null };
/** PATCH /usuarios/{id}/papel — vale quando o token do usuário renovar. */
export type UsuarioPapelAtualizar = { papel?: Papel; id_loja?: Id | null; ativo?: boolean };

export type AuditoriaLer = {
  id: Id;
  id_usuario: Uuid;
  acao: string;
  entidade: string;
  id_entidade: string | null;
  detalhe: string | null;
  id_loja: Id | null;
  criado_em: DataHora;
};

// ===================== Integração (Vulto) =====================

export type LoteCriar = {
  origem: string;
  tipo_evento: string;
  registros: { id_externo: string; id_loja?: Id | null; conteudo: Record<string, unknown> }[];
};
/** A importação responde rápido com o id do lote e processa depois (seção 12.4). */
export type LoteCriado = { id_lote: Id; recebidos: number };
export type DadoRecebidoLer = {
  id: Id;
  origem: string;
  tipo_evento: string;
  id_externo: string;
  id_loja: Id | null;
  status: StatusDadoRecebido;
  id_registro_final: Id | null;
  recebido_em: DataHora;
};
export type RegistroMapear = { id_registro_final: Id };

// ===================== Dashboard =====================

/** GET /dashboard — indicadores já filtrados pelo escopo do token. */
export type DashboardLer = {
  escopo: { papel: Papel; id_loja: Id | null };
  indicadores: { chave: string; rotulo: string; valor: number; unidade?: string }[];
  series?: { chave: string; pontos: { data: string; valor: number }[] }[];
};
