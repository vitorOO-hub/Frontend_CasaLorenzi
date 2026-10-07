import { api, type OpcoesApi } from "./api";
import { falha, lista, numero, objeto, texto, textoOuNulo } from "./validacao";

/** Transferências, reposições e estoque mínimo (espelham app/painel_estoque/transferencias.py e minimos.py). */

const BASE = "/api/v1/painel/estoque";

export type TipoTransferencia = "transferencia" | "reposicao_rede";
export type StatusTransferencia = "solicitada" | "aceita" | "recebida" | "recusada";
export type AcaoTransferencia = "aceitar" | "recusar" | "receber";
export type SituacaoLista = "acao" | "andamento" | "todas";

export type ItemTransferencia = {
  id_transferencia: string;
  tipo: TipoTransferencia;
  status: StatusTransferencia;
  solicitada_em: string;
  aceita_em: string | null;
  recebida_em: string | null;
  id_loja_origem: string | null;
  origem_nome: string | null;
  id_loja_destino: string;
  destino_nome: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  quantidade: number;
  observacao: string | null;
  motivo_recusa: string | null;
  solicitante: string;
  responsavel: string | null;
  /** O que quem consulta pode fazer agora (decidido pelo servidor). */
  acoes: AcaoTransferencia[];
};

export type Transferencias = {
  total: number;
  /** Quantas esperam uma ação de quem consulta, qualquer que seja o filtro. */
  aguardando_voce: number;
  itens: ItemTransferencia[];
};

export type FiltrosTransferencias = {
  situacao: SituacaoLista;
  tipo?: TipoTransferencia;
  idLoja?: string;
  limit: number;
  offset: number;
};

export type NovaTransferencia = {
  sku: string;
  quantidade: number;
  idLojaOrigem: string;
  observacao?: string;
  /** Só o admin informa a loja que pede. */
  idLoja?: string;
};

export type NovaReposicao = { sku: string; quantidade: number; observacao?: string; idLoja?: string };

export type ItemMinimo = {
  id_variacao: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  saldo: number;
  minimo: number;
};

export type Minimos = { id_loja: string; loja_nome: string; total: number; itens: ItemMinimo[] };

// ---------- Validação ----------

const TIPOS: TipoTransferencia[] = ["transferencia", "reposicao_rede"];
const STATUS: StatusTransferencia[] = ["solicitada", "aceita", "recebida", "recusada"];
const ACOES: AcaoTransferencia[] = ["aceitar", "recusar", "receber"];

export function validarTransferencia(dados: unknown): ItemTransferencia {
  const x = objeto(dados, "transferencia");
  return {
    id_transferencia: texto(x.id_transferencia, "id_transferencia"),
    tipo: TIPOS.find((t) => t === x.tipo) ?? falha("tipo"),
    status: STATUS.find((s) => s === x.status) ?? falha("status"),
    solicitada_em: texto(x.solicitada_em, "solicitada_em"),
    aceita_em: textoOuNulo(x.aceita_em, "aceita_em"),
    recebida_em: textoOuNulo(x.recebida_em, "recebida_em"),
    id_loja_origem: textoOuNulo(x.id_loja_origem, "id_loja_origem"),
    origem_nome: textoOuNulo(x.origem_nome, "origem_nome"),
    id_loja_destino: texto(x.id_loja_destino, "id_loja_destino"),
    destino_nome: texto(x.destino_nome, "destino_nome"),
    sku: texto(x.sku, "sku"),
    produto: texto(x.produto, "produto"),
    cor: texto(x.cor, "cor"),
    tamanho: texto(x.tamanho, "tamanho"),
    quantidade: numero(x.quantidade, "quantidade"),
    observacao: textoOuNulo(x.observacao, "observacao"),
    motivo_recusa: textoOuNulo(x.motivo_recusa, "motivo_recusa"),
    solicitante: texto(x.solicitante, "solicitante"),
    responsavel: textoOuNulo(x.responsavel, "responsavel"),
    acoes: lista(x.acoes, "acoes").map((a, i) => ACOES.find((c) => c === a) ?? falha(`acoes[${i}]`)),
  };
}

export function validarTransferencias(dados: unknown): Transferencias {
  const o = objeto(dados, "transferencias");
  return {
    total: numero(o.total, "total"),
    aguardando_voce: numero(o.aguardando_voce, "aguardando_voce"),
    itens: lista(o.itens, "itens").map(validarTransferencia),
  };
}

export function validarMinimos(dados: unknown): Minimos {
  const o = objeto(dados, "minimos");
  return {
    id_loja: texto(o.id_loja, "id_loja"),
    loja_nome: texto(o.loja_nome, "loja_nome"),
    total: numero(o.total, "total"),
    itens: lista(o.itens, "itens").map((v, i) => {
      const x = objeto(v, `itens[${i}]`);
      return {
        id_variacao: texto(x.id_variacao, "id_variacao"),
        sku: texto(x.sku, "sku"),
        produto: texto(x.produto, "produto"),
        cor: texto(x.cor, "cor"),
        tamanho: texto(x.tamanho, "tamanho"),
        saldo: numero(x.saldo, "saldo"),
        minimo: numero(x.minimo, "minimo"),
      };
    }),
  };
}

const validarAtualizados = (dados: unknown) => numero(objeto(dados, "atualizados").atualizados, "atualizados");

// ---------- Chamadas ----------

export const listarTransferencias = (f: FiltrosTransferencias, o?: OpcoesApi) =>
  api.get(
    `${BASE}/transferencias`,
    validarTransferencias,
    { situacao: f.situacao, tipo: f.tipo, id_loja: f.idLoja, limit: f.limit, offset: f.offset },
    o,
  );

export const pedirTransferencia = (t: NovaTransferencia, o?: OpcoesApi) =>
  api.post(
    `${BASE}/transferencias`,
    validarTransferencia,
    { sku: t.sku, quantidade: t.quantidade, id_loja_origem: t.idLojaOrigem, observacao: t.observacao, id_loja: t.idLoja },
    o,
  );

export const pedirReposicaoRede = (r: NovaReposicao, o?: OpcoesApi) =>
  api.post(
    `${BASE}/transferencias/reposicoes`,
    validarTransferencia,
    { sku: r.sku, quantidade: r.quantidade, observacao: r.observacao, id_loja: r.idLoja },
    o,
  );

/** `idLoja` só importa para o admin atender uma reposição (diz por qual loja age). */
export const aceitarTransferencia = (id: string, idLoja?: string, o?: OpcoesApi) =>
  api.post(`${BASE}/transferencias/${id}/aceitar`, validarTransferencia, { id_loja: idLoja }, o);

export const recusarTransferencia = (id: string, motivo?: string, idLoja?: string, o?: OpcoesApi) =>
  api.post(`${BASE}/transferencias/${id}/recusar`, validarTransferencia, { motivo, id_loja: idLoja }, o);

export const receberTransferencia = (id: string, o?: OpcoesApi) =>
  api.post(`${BASE}/transferencias/${id}/receber`, validarTransferencia, undefined, o);

export const listarMinimos = (f: { idLoja?: string; busca?: string }, o?: OpcoesApi) =>
  api.get(`${BASE}/minimos`, validarMinimos, { id_loja: f.idLoja, busca: f.busca, limit: 200 }, o);

export const definirMinimos = (itens: { sku: string; minimo: number }[], idLoja?: string, o?: OpcoesApi) =>
  api.put(`${BASE}/minimos`, validarAtualizados, { itens, id_loja: idLoja }, o);
