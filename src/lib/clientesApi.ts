import { api, type OpcoesApi } from "./api";
import { lista, numero, objeto, opcao, texto, textoOuNulo, type Opcao } from "./validacao";

/** Tipos e chamadas da área de clientes do painel (espelham app/clientes/schemas.py do backend). */

const BASE = "/api/v1/painel/clientes";

export type SecaoClientes = "todos" | "com_aberto" | "meus";

export type ItemCliente = {
  id_cliente: string;
  nome: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  cliente_desde: string;
  total_chamados: number;
  chamados_em_aberto: number;
  /** Só gerente e admin; para o atendente vem nulo. */
  compras: number | null;
  total_gasto: number | null;
};

export type ListaClientes = { total: number; itens: ItemCliente[] };

export type FichaCliente = {
  cliente: Pick<ItemCliente, "id_cliente" | "nome" | "email" | "telefone" | "cidade" | "cliente_desde">;
  resumo: {
    chamados: number;
    chamados_em_aberto: number;
    compras: number | null;
    total_gasto: number | null;
    ticket_medio: number | null;
  };
  chamados: { id_atendimento: string; protocolo: string; assunto: string; categoria: Opcao; status: Opcao; aberto_em: string }[];
  /** Só gerente e admin; para o atendente vem nulo. */
  compras:
    | { id_pedido: string; numero_pedido: string; criado_em: string; loja_nome: string; valor_total: number; status: Opcao }[]
    | null;
};

export type FiltrosClientes = {
  busca?: string;
  secao: SecaoClientes;
  idLoja?: string;
  limit: number;
  offset: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ehUuid = (valor: string | undefined): valor is string => typeof valor === "string" && UUID.test(valor);

// ---------- Validação ----------

/** O Pydantic serializa Decimal como texto ("199.90"); aceita número também. Nulo continua nulo. */
function dinheiro(valor: unknown, campo: string): number | null {
  if (valor === null || valor === undefined) return null;
  return numero(typeof valor === "string" ? Number(valor) : valor, campo);
}

const inteiroOuNulo = (valor: unknown, campo: string) =>
  valor === null || valor === undefined ? null : numero(valor, campo);

function dadosDoCliente(v: unknown) {
  const o = objeto(v, "cliente");
  return {
    id_cliente: texto(o.id_cliente, "id_cliente"),
    nome: texto(o.nome, "nome"),
    email: texto(o.email, "email"),
    telefone: textoOuNulo(o.telefone, "telefone"),
    cidade: textoOuNulo(o.cidade, "cidade"),
    cliente_desde: texto(o.cliente_desde, "cliente_desde"),
  };
}

export function validarItemCliente(dados: unknown): ItemCliente {
  const o = objeto(dados, "cliente");
  return {
    ...dadosDoCliente(dados),
    total_chamados: numero(o.total_chamados, "total_chamados"),
    chamados_em_aberto: numero(o.chamados_em_aberto, "chamados_em_aberto"),
    compras: inteiroOuNulo(o.compras, "compras"),
    total_gasto: dinheiro(o.total_gasto, "total_gasto"),
  };
}

export function validarListaClientes(dados: unknown): ListaClientes {
  const o = objeto(dados, "lista");
  return { total: numero(o.total, "total"), itens: lista(o.itens, "itens").map(validarItemCliente) };
}

export function validarFicha(dados: unknown): FichaCliente {
  const o = objeto(dados, "ficha");
  const r = objeto(o.resumo, "resumo");
  return {
    cliente: dadosDoCliente(o.cliente),
    resumo: {
      chamados: numero(r.chamados, "chamados"),
      chamados_em_aberto: numero(r.chamados_em_aberto, "chamados_em_aberto"),
      compras: inteiroOuNulo(r.compras, "compras"),
      total_gasto: dinheiro(r.total_gasto, "total_gasto"),
      ticket_medio: dinheiro(r.ticket_medio, "ticket_medio"),
    },
    chamados: lista(o.chamados, "chamados").map((v, i) => {
      const c = objeto(v, `chamados[${i}]`);
      return {
        id_atendimento: texto(c.id_atendimento, "id_atendimento"),
        protocolo: texto(c.protocolo, "protocolo"),
        assunto: texto(c.assunto, "assunto"),
        categoria: opcao(c.categoria, "categoria"),
        status: opcao(c.status, "status"),
        aberto_em: texto(c.aberto_em, "aberto_em"),
      };
    }),
    compras:
      o.compras === null || o.compras === undefined
        ? null
        : lista(o.compras, "compras").map((v, i) => {
            const p = objeto(v, `compras[${i}]`);
            return {
              id_pedido: texto(p.id_pedido, "id_pedido"),
              numero_pedido: texto(p.numero_pedido, "numero_pedido"),
              criado_em: texto(p.criado_em, "criado_em"),
              loja_nome: texto(p.loja_nome, "loja_nome"),
              valor_total: dinheiro(p.valor_total, "valor_total") ?? 0,
              status: opcao(p.status, "status"),
            };
          }),
  };
}

// ---------- Chamadas ----------

export const listarClientes = (f: FiltrosClientes, o?: OpcoesApi) =>
  api.get(
    BASE,
    validarListaClientes,
    { busca: f.busca?.trim() || undefined, secao: f.secao, id_loja: f.idLoja, limit: f.limit, offset: f.offset },
    o,
  );

export const buscarFicha = (id: string, idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/${id}`, validarFicha, { id_loja: idLoja }, o);
