import { api, type OpcoesApi } from "./api";
import { booleano, lista, objeto, texto, textoOuNulo } from "./validacao";

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
