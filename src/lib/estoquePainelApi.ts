import { api, type OpcoesApi } from "./api";
import { falha, lista, numero, objeto, texto, textoOuNulo } from "./validacao";

/** Tipos e chamadas do saldo e do histórico de movimentações (espelham app/painel_estoque/schemas.py). */

const BASE = "/api/v1/painel/estoque";

export type SituacaoSaldo = "ok" | "baixo" | "esgotado";
export type GrupoMovimentacao = "entrada" | "saida" | "ajuste" | "transferencia";

export type Loja = { id_loja: string; nome: string };

export type OpcoesEstoque = {
  lojas: Loja[];
  categorias: string[];
  situacoes: { codigo: string; nome: string }[];
  tipos: { codigo: string; nome: string }[];
  pecas: { id_variacao: string; sku: string; nome: string }[];
  /** Motivos sugeridos para registrar uma entrada ou uma saída. */
  motivos_entrada: string[];
  motivos_saida: string[];
  escopo: {
    papel: string;
    id_loja: string | null;
    loja_nome: string | null;
    pode_escolher_loja: boolean;
    /** O operador de estoque só vê as movimentações que ele mesmo registrou. */
    somente_minhas: boolean;
  };
};

export type ItemSaldo = {
  id_variacao: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  categoria: string | null;
  preco: number;
  total: number;
  minimo_total: number;
  situacao: SituacaoSaldo;
  por_loja: { id_loja: string; quantidade: number; minimo: number }[];
};

export type Saldo = {
  resumo: { unidades: number; pecas: number; estoque_baixo: number; esgotadas: number; valor_em_estoque: number };
  lojas: Loja[];
  total: number;
  itens: ItemSaldo[];
};

export type ItemMovimentacao = {
  id_movimentacao: string;
  data: string;
  id_loja: string;
  loja_nome: string;
  id_variacao: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  tipo_codigo: string;
  tipo_nome: string;
  grupo: GrupoMovimentacao;
  /** Com sinal: entrada positiva, saída negativa. */
  quantidade: number;
  quantidade_anterior: number;
  quantidade_posterior: number;
  responsavel: string | null;
  motivo: string | null;
  numero_pedido: string | null;
};

export type Movimentacoes = { total: number; itens: ItemMovimentacao[] };

export type FiltrosSaldo = {
  busca?: string;
  categoria?: string;
  situacao?: string;
  idLoja?: string;
  limit: number;
  offset: number;
};

export type FiltrosMovimentacoes = {
  tipo?: string;
  sku?: string;
  de?: string;
  ate?: string;
  idLoja?: string;
  limit: number;
  offset: number;
};

export type StatusAjuste = "pendente" | "aprovado" | "rejeitado";

export type ItemAjuste = {
  id_ajuste: string;
  id_loja: string;
  loja_nome: string;
  id_variacao: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  /** Diferença a aplicar ao saldo: positiva soma, negativa tira. */
  quantidade: number;
  saldo_atual: number;
  motivo: string;
  status: StatusAjuste;
  motivo_recusa: string | null;
  solicitante: string;
  decisor: string | null;
  solicitado_em: string;
  decidido_em: string | null;
};

export type Ajustes = {
  total: number;
  /** Pendentes no escopo de quem chamou, qualquer que seja o filtro da lista. */
  pendentes: number;
  itens: ItemAjuste[];
};

export type FiltrosAjustes = {
  situacao?: StatusAjuste | "decididos";
  idLoja?: string;
  limit: number;
  offset: number;
};

export type NovaMovimentacao = {
  sku: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  motivo: string;
  /** Só o admin informa a loja; para os demais vale a do login. */
  idLoja?: string;
};

export type NovoAjuste = { sku: string; quantidadeContada: number; motivo: string; idLoja?: string };

// ---------- Validação ----------

const SITUACOES: SituacaoSaldo[] = ["ok", "baixo", "esgotado"];
const GRUPOS: GrupoMovimentacao[] = ["entrada", "saida", "ajuste", "transferencia"];

const loja = (valor: unknown, campo: string): Loja => {
  const l = objeto(valor, campo);
  return { id_loja: texto(l.id_loja, `${campo}.id_loja`), nome: texto(l.nome, `${campo}.nome`) };
};

const codigoNome = (valor: unknown, campo: string) => {
  const o = objeto(valor, campo);
  return { codigo: texto(o.codigo, `${campo}.codigo`), nome: texto(o.nome, `${campo}.nome`) };
};

export function validarOpcoes(dados: unknown): OpcoesEstoque {
  const o = objeto(dados, "opcoes");
  const escopo = objeto(o.escopo, "escopo");
  return {
    lojas: lista(o.lojas, "lojas").map((v, i) => loja(v, `lojas[${i}]`)),
    categorias: lista(o.categorias, "categorias").map((v, i) => texto(v, `categorias[${i}]`)),
    situacoes: lista(o.situacoes, "situacoes").map((v, i) => codigoNome(v, `situacoes[${i}]`)),
    tipos: lista(o.tipos, "tipos").map((v, i) => codigoNome(v, `tipos[${i}]`)),
    pecas: lista(o.pecas, "pecas").map((v, i) => {
      const p = objeto(v, `pecas[${i}]`);
      return { id_variacao: texto(p.id_variacao, "id_variacao"), sku: texto(p.sku, "sku"), nome: texto(p.nome, "nome") };
    }),
    motivos_entrada: lista(o.motivos_entrada, "motivos_entrada").map((v, i) => texto(v, `motivos_entrada[${i}]`)),
    motivos_saida: lista(o.motivos_saida, "motivos_saida").map((v, i) => texto(v, `motivos_saida[${i}]`)),
    escopo: {
      papel: texto(escopo.papel, "escopo.papel"),
      id_loja: textoOuNulo(escopo.id_loja, "escopo.id_loja"),
      loja_nome: textoOuNulo(escopo.loja_nome, "escopo.loja_nome"),
      pode_escolher_loja: escopo.pode_escolher_loja === true,
      somente_minhas: escopo.somente_minhas === true,
    },
  };
}

export function validarSaldo(dados: unknown): Saldo {
  const o = objeto(dados, "saldo");
  const r = objeto(o.resumo, "resumo");
  return {
    resumo: {
      unidades: numero(r.unidades, "resumo.unidades"),
      pecas: numero(r.pecas, "resumo.pecas"),
      estoque_baixo: numero(r.estoque_baixo, "resumo.estoque_baixo"),
      esgotadas: numero(r.esgotadas, "resumo.esgotadas"),
      valor_em_estoque: numero(r.valor_em_estoque, "resumo.valor_em_estoque"),
    },
    lojas: lista(o.lojas, "lojas").map((v, i) => loja(v, `lojas[${i}]`)),
    total: numero(o.total, "total"),
    itens: lista(o.itens, "itens").map((v, i) => {
      const x = objeto(v, `itens[${i}]`);
      const situacao = SITUACOES.find((s) => s === x.situacao) ?? falha(`itens[${i}].situacao`);
      return {
        id_variacao: texto(x.id_variacao, "id_variacao"),
        sku: texto(x.sku, "sku"),
        produto: texto(x.produto, "produto"),
        cor: texto(x.cor, "cor"),
        tamanho: texto(x.tamanho, "tamanho"),
        categoria: textoOuNulo(x.categoria, "categoria"),
        preco: numero(x.preco, "preco"),
        total: numero(x.total, "total"),
        minimo_total: numero(x.minimo_total, "minimo_total"),
        situacao,
        por_loja: lista(x.por_loja, "por_loja").map((p, j) => {
          const s = objeto(p, `por_loja[${j}]`);
          return {
            id_loja: texto(s.id_loja, "id_loja"),
            quantidade: numero(s.quantidade, "quantidade"),
            minimo: numero(s.minimo, "minimo"),
          };
        }),
      };
    }),
  };
}

export function validarMovimentacoes(dados: unknown): Movimentacoes {
  const o = objeto(dados, "movimentacoes");
  return {
    total: numero(o.total, "total"),
    itens: lista(o.itens, "itens").map((v, i) => {
      const x = objeto(v, `itens[${i}]`);
      const grupo = GRUPOS.find((g) => g === x.grupo) ?? falha(`itens[${i}].grupo`);
      return {
        id_movimentacao: texto(x.id_movimentacao, "id_movimentacao"),
        data: texto(x.data, "data"),
        id_loja: texto(x.id_loja, "id_loja"),
        loja_nome: texto(x.loja_nome, "loja_nome"),
        id_variacao: texto(x.id_variacao, "id_variacao"),
        sku: texto(x.sku, "sku"),
        produto: texto(x.produto, "produto"),
        cor: texto(x.cor, "cor"),
        tamanho: texto(x.tamanho, "tamanho"),
        tipo_codigo: texto(x.tipo_codigo, "tipo_codigo"),
        tipo_nome: texto(x.tipo_nome, "tipo_nome"),
        grupo,
        quantidade: numero(x.quantidade, "quantidade"),
        quantidade_anterior: numero(x.quantidade_anterior, "quantidade_anterior"),
        quantidade_posterior: numero(x.quantidade_posterior, "quantidade_posterior"),
        responsavel: textoOuNulo(x.responsavel, "responsavel"),
        motivo: textoOuNulo(x.motivo, "motivo"),
        numero_pedido: textoOuNulo(x.numero_pedido, "numero_pedido"),
      };
    }),
  };
}

const STATUS_AJUSTE: StatusAjuste[] = ["pendente", "aprovado", "rejeitado"];

export function validarAjuste(dados: unknown): ItemAjuste {
  const x = objeto(dados, "ajuste");
  const status = STATUS_AJUSTE.find((s) => s === x.status) ?? falha("status");
  return {
    id_ajuste: texto(x.id_ajuste, "id_ajuste"),
    id_loja: texto(x.id_loja, "id_loja"),
    loja_nome: texto(x.loja_nome, "loja_nome"),
    id_variacao: texto(x.id_variacao, "id_variacao"),
    sku: texto(x.sku, "sku"),
    produto: texto(x.produto, "produto"),
    cor: texto(x.cor, "cor"),
    tamanho: texto(x.tamanho, "tamanho"),
    quantidade: numero(x.quantidade, "quantidade"),
    saldo_atual: numero(x.saldo_atual, "saldo_atual"),
    motivo: texto(x.motivo, "motivo"),
    status,
    motivo_recusa: textoOuNulo(x.motivo_recusa, "motivo_recusa"),
    solicitante: texto(x.solicitante, "solicitante"),
    decisor: textoOuNulo(x.decisor, "decisor"),
    solicitado_em: texto(x.solicitado_em, "solicitado_em"),
    decidido_em: textoOuNulo(x.decidido_em, "decidido_em"),
  };
}

export function validarAjustes(dados: unknown): Ajustes {
  const o = objeto(dados, "ajustes");
  return {
    total: numero(o.total, "total"),
    pendentes: numero(o.pendentes, "pendentes"),
    itens: lista(o.itens, "itens").map(validarAjuste),
  };
}

export const validarMovimentacao = (dados: unknown): ItemMovimentacao => validarMovimentacoes({ total: 1, itens: [dados] }).itens[0]!;

// ---------- Chamadas ----------

export const buscarOpcoesEstoque = (idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/opcoes`, validarOpcoes, { id_loja: idLoja }, o);

export const buscarSaldo = (f: FiltrosSaldo, o?: OpcoesApi) =>
  api.get(
    `${BASE}/saldo`,
    validarSaldo,
    {
      busca: f.busca,
      categoria: f.categoria,
      situacao: f.situacao,
      id_loja: f.idLoja,
      limit: f.limit,
      offset: f.offset,
    },
    o,
  );

export const buscarMovimentacoes = (f: FiltrosMovimentacoes, o?: OpcoesApi) =>
  api.get(
    `${BASE}/movimentacoes`,
    validarMovimentacoes,
    { tipo: f.tipo, sku: f.sku, de: f.de, ate: f.ate, id_loja: f.idLoja, limit: f.limit, offset: f.offset },
    o,
  );

export const listarAjustes = (f: FiltrosAjustes, o?: OpcoesApi) =>
  api.get(`${BASE}/ajustes`, validarAjustes, { situacao: f.situacao, id_loja: f.idLoja, limit: f.limit, offset: f.offset }, o);

/** Entrada ou saída avulsa. Quem registra é o dono do login: o servidor não aceita outro. */
export const registrarMovimentacao = (m: NovaMovimentacao, o?: OpcoesApi) =>
  api.post(
    `${BASE}/movimentacoes`,
    validarMovimentacao,
    { sku: m.sku, tipo: m.tipo, quantidade: m.quantidade, motivo: m.motivo, id_loja: m.idLoja },
    o,
  );

/** Pede ajuste de inventário: informa a quantidade contada; o saldo só muda quando a gestão aprova. */
export const solicitarAjusteEstoque = (a: NovoAjuste, o?: OpcoesApi) =>
  api.post(
    `${BASE}/ajustes`,
    validarAjuste,
    { sku: a.sku, quantidade_contada: a.quantidadeContada, motivo: a.motivo, id_loja: a.idLoja },
    o,
  );

export const aprovarAjusteEstoque = (id: string, o?: OpcoesApi) =>
  api.post(`${BASE}/ajustes/${id}/aprovar`, validarAjuste, undefined, o);

export const recusarAjusteEstoque = (id: string, motivo: string, o?: OpcoesApi) =>
  api.post(`${BASE}/ajustes/${id}/recusar`, validarAjuste, { motivo }, o);
