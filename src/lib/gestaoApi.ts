import { api, type OpcoesApi } from "./api";
import { booleano, lista, numero, objeto, texto, textoOuNulo } from "./validacao";

/** Tipos e chamadas da gestão do admin (espelham app/gestao/schemas.py do backend). */

const BASE = "/api/v1/painel/gestao";

export type Cargo = "atendente" | "operador_estoque" | "gerente_loja" | "admin";

export const ROTULO_CARGO: Record<Cargo, string> = {
  atendente: "Atendente",
  operador_estoque: "Operador de estoque",
  gerente_loja: "Gerente de unidade",
  admin: "Administrador",
};

export type UsuarioDaEquipe = {
  id_usuario: string;
  nome: string;
  email: string;
  cargo: string;
  id_loja: string | null;
  loja_nome: string | null;
  ativo: boolean;
  /** A conta já está ligada a um login: a pessoa consegue entrar. */
  com_acesso: boolean;
};

export type Equipe = {
  total: number;
  itens: UsuarioDaEquipe[];
  opcoes: {
    cargos: { codigo: string; nome: string }[];
    lojas: { id_loja: string; nome: string }[];
  };
};

export type MudancaDeUsuario = { cargo?: Cargo; idLoja?: string; ativo?: boolean };

export function validarUsuario(valor: unknown, campo = "usuario"): UsuarioDaEquipe {
  const o = objeto(valor, campo);
  return {
    id_usuario: texto(o.id_usuario, `${campo}.id_usuario`),
    nome: texto(o.nome, `${campo}.nome`),
    email: texto(o.email, `${campo}.email`),
    cargo: texto(o.cargo, `${campo}.cargo`),
    id_loja: textoOuNulo(o.id_loja, `${campo}.id_loja`),
    loja_nome: textoOuNulo(o.loja_nome, `${campo}.loja_nome`),
    ativo: booleano(o.ativo, `${campo}.ativo`),
    com_acesso: booleano(o.com_acesso, `${campo}.com_acesso`),
  };
}

export function validarEquipe(dados: unknown): Equipe {
  const o = objeto(dados, "equipe");
  const opcoes = objeto(o.opcoes, "opcoes");
  return {
    total: Number(o.total),
    itens: lista(o.itens, "itens").map((v, i) => validarUsuario(v, `itens[${i}]`)),
    opcoes: {
      cargos: lista(opcoes.cargos, "opcoes.cargos").map((v, i) => {
        const c = objeto(v, `opcoes.cargos[${i}]`);
        return { codigo: texto(c.codigo, "codigo"), nome: texto(c.nome, "nome") };
      }),
      lojas: lista(opcoes.lojas, "opcoes.lojas").map((v, i) => {
        const l = objeto(v, `opcoes.lojas[${i}]`);
        return { id_loja: texto(l.id_loja, "id_loja"), nome: texto(l.nome, "nome") };
      }),
    },
  };
}

export const buscarEquipe = (o?: OpcoesApi) => api.get(`${BASE}/usuarios`, validarEquipe, undefined, o);

/** Só vai o que mudou; o servidor confere cargo, loja ativa e se não deixa a rede sem administrador. */
export const mudarUsuario = (id: string, m: MudancaDeUsuario, o?: OpcoesApi) =>
  api.patch(
    `${BASE}/usuarios/${encodeURIComponent(id)}`,
    (dados) => validarUsuario(dados),
    { cargo: m.cargo, id_loja: m.idLoja, ativo: m.ativo },
    o,
  );

// ---------------------------------------------------------------- catálogo

export type PecaDoCatalogo = {
  id_produto: string;
  nome: string;
  categoria: string | null;
  preco: number;
  skus: string[];
  variacoes: number;
  estoque_rede: number;
};

export type Catalogo = { total: number; itens: PecaDoCatalogo[] };

export function validarPeca(valor: unknown, campo = "peca"): PecaDoCatalogo {
  const o = objeto(valor, campo);
  return {
    id_produto: texto(o.id_produto, `${campo}.id_produto`),
    nome: texto(o.nome, `${campo}.nome`),
    categoria: textoOuNulo(o.categoria, `${campo}.categoria`),
    preco: numero(o.preco, `${campo}.preco`),
    skus: lista(o.skus, `${campo}.skus`).map((v, i) => texto(v, `${campo}.skus[${i}]`)),
    variacoes: numero(o.variacoes, `${campo}.variacoes`),
    estoque_rede: numero(o.estoque_rede, `${campo}.estoque_rede`),
  };
}

export function validarCatalogo(dados: unknown): Catalogo {
  const o = objeto(dados, "catalogo");
  return {
    total: numero(o.total, "total"),
    itens: lista(o.itens, "itens").map((v, i) => validarPeca(v, `itens[${i}]`)),
  };
}

export const buscarCatalogo = (busca: string | undefined, o?: OpcoesApi) =>
  api.get(`${BASE}/catalogo`, validarCatalogo, { busca, limit: 100 }, o);

export const criarPeca = (d: { sku: string; nome: string; categoria: string; preco: number }, o?: OpcoesApi) =>
  api.post(`${BASE}/catalogo`, (dados) => validarPeca(dados), d, o);

export const editarPeca = (id: string, d: { nome?: string; categoria?: string; preco?: number }, o?: OpcoesApi) =>
  api.patch(`${BASE}/catalogo/${encodeURIComponent(id)}`, (dados) => validarPeca(dados), d, o);

export const excluirPeca = (id: string, o?: OpcoesApi) =>
  api.delete(
    `${BASE}/catalogo/${encodeURIComponent(id)}`,
    (dados) => booleano(objeto(dados, "excluida").excluido, "excluido"),
    undefined,
    o,
  );

// ---------------------------------------------------------------- auditoria

export type RegistroDeAuditoria = { id_auditoria: string; data: string; autor: string; acao: string; detalhe: string };
export type Auditoria = { total: number; itens: RegistroDeAuditoria[] };

export function validarAuditoria(dados: unknown): Auditoria {
  const o = objeto(dados, "auditoria");
  return {
    total: numero(o.total, "total"),
    itens: lista(o.itens, "itens").map((v, i) => {
      const r = objeto(v, `itens[${i}]`);
      return {
        id_auditoria: texto(r.id_auditoria, "id_auditoria"),
        data: texto(r.data, "data"),
        autor: texto(r.autor, "autor"),
        acao: texto(r.acao, "acao"),
        detalhe: texto(r.detalhe, "detalhe"),
      };
    }),
  };
}

export const buscarAuditoria = (busca: string | undefined, o?: OpcoesApi) =>
  api.get(`${BASE}/auditoria`, validarAuditoria, { busca, limit: 100 }, o);

// ---------------------------------------------------------------- integrações

export type SituacaoDoLote = "pendente_mapeamento" | "processado" | "com_erro";
export type LoteImportado = {
  codigo: string;
  origem: string;
  recebido_em: string;
  registros: number;
  pendentes: number;
  situacao: SituacaoDoLote;
};
export type RegistroImportado = {
  id_registro: string;
  lote: string;
  descricao_externa: string;
  codigo_externo: string;
  sku_mapeado: string | null;
};
export type Integracoes = {
  lotes: LoteImportado[];
  registros: RegistroImportado[];
  skus: { id_variacao: string; sku: string; nome: string }[];
};

const SITUACOES: SituacaoDoLote[] = ["pendente_mapeamento", "processado", "com_erro"];

export function validarRegistro(valor: unknown, campo = "registro"): RegistroImportado {
  const r = objeto(valor, campo);
  return {
    id_registro: texto(r.id_registro, `${campo}.id_registro`),
    lote: texto(r.lote, `${campo}.lote`),
    descricao_externa: texto(r.descricao_externa, `${campo}.descricao_externa`),
    codigo_externo: texto(r.codigo_externo, `${campo}.codigo_externo`),
    sku_mapeado: textoOuNulo(r.sku_mapeado, `${campo}.sku_mapeado`),
  };
}

export function validarIntegracoes(dados: unknown): Integracoes {
  const o = objeto(dados, "integracoes");
  return {
    lotes: lista(o.lotes, "lotes").map((v, i) => {
      const l = objeto(v, `lotes[${i}]`);
      const situacao = SITUACOES.find((s) => s === l.situacao);
      if (!situacao) throw new Error(`campo inválido: lotes[${i}].situacao`);
      return {
        codigo: texto(l.codigo, "codigo"),
        origem: texto(l.origem, "origem"),
        recebido_em: texto(l.recebido_em, "recebido_em"),
        registros: numero(l.registros, "registros"),
        pendentes: numero(l.pendentes, "pendentes"),
        situacao,
      };
    }),
    registros: lista(o.registros, "registros").map((v, i) => validarRegistro(v, `registros[${i}]`)),
    skus: lista(o.skus, "skus").map((v, i) => {
      const s = objeto(v, `skus[${i}]`);
      return { id_variacao: texto(s.id_variacao, "id_variacao"), sku: texto(s.sku, "sku"), nome: texto(s.nome, "nome") };
    }),
  };
}

export const buscarIntegracoes = (o?: OpcoesApi) => api.get(`${BASE}/integracoes`, validarIntegracoes, undefined, o);

export const mapearRegistro = (idRegistro: string, idVariacao: string, o?: OpcoesApi) =>
  api.post(
    `${BASE}/integracoes/registros/${encodeURIComponent(idRegistro)}/mapear`,
    (dados) => validarRegistro(dados),
    { id_variacao: idVariacao },
    o,
  );
