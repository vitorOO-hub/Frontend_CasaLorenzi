import { api, type OpcoesApi } from "./api";
import { soDigitos } from "./cadastro";
import { lista, numero, objeto, texto, textoOuNulo } from "./validacao";

/**
 * Vendas em loja do vendedor (espelha app/vendas do backend): ver todas as vendas e todos os
 * clientes cadastrados e lançar venda para um CPF. A loja e quem vende vêm do token, não daqui.
 */

const BASE = "/api/v1/painel/vendas";

export type MetodoDePagamento = "cartao_credito" | "cartao_debito" | "pix" | "dinheiro";

export type ItemVenda = {
  id_pedido: string;
  numero_pedido: string;
  criado_em: string;
  canal_venda: string;
  loja: string;
  cliente: string;
  vendedor: string | null;
  status_codigo: string;
  status: string;
  pecas: number;
  valor_total: number;
};

export type PecaVendida = {
  sku: string;
  produto: string;
  cor: string | null;
  tamanho: string | null;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
};

export type DetalheVenda = ItemVenda & {
  cliente_cpf: string;
  metodo_pagamento: string | null;
  observacao: string | null;
  itens_da_venda: PecaVendida[];
};

export type ListaVendas = { total: number; itens: ItemVenda[] };

export type ClienteDeVenda = {
  id_cliente: string;
  nome: string;
  /** Já mascarado pelo servidor ("***.***.***-25"). */
  cpf: string;
  email: string | null;
  telefone: string | null;
};

export type ItemCliente = ClienteDeVenda & { cidade: string | null; cliente_desde: string };
export type ListaClientes = { total: number; itens: ItemCliente[] };

export type PecaNoEstoque = {
  id_variacao: string;
  sku: string;
  produto: string;
  cor: string | null;
  tamanho: string | null;
  preco_venda: number;
  disponivel: number;
};

export type OpcoesVenda = { metodos: { codigo: MetodoDePagamento; nome: string }[]; loja: string | null };

export type NovaVenda = {
  cpf: string;
  metodo_pagamento: MetodoDePagamento;
  itens: { id_variacao: string; quantidade: number }[];
};

export type FiltrosVendas = { busca?: string; limit: number; offset: number };

// ---------- Validação ----------

/** O Pydantic serializa Decimal como texto ("199.90"); aceita número também. */
const dinheiro = (valor: unknown, campo: string): number =>
  numero(typeof valor === "string" ? Number(valor) : valor, campo);

function itemVenda(v: unknown, campo: string): ItemVenda {
  const o = objeto(v, campo);
  return {
    id_pedido: texto(o.id_pedido, "id_pedido"),
    numero_pedido: texto(o.numero_pedido, "numero_pedido"),
    criado_em: texto(o.criado_em, "criado_em"),
    canal_venda: texto(o.canal_venda, "canal_venda"),
    loja: texto(o.loja, "loja"),
    cliente: texto(o.cliente, "cliente"),
    vendedor: textoOuNulo(o.vendedor, "vendedor"),
    status_codigo: texto(o.status_codigo, "status_codigo"),
    status: texto(o.status, "status"),
    pecas: numero(o.pecas, "pecas"),
    valor_total: dinheiro(o.valor_total, "valor_total"),
  };
}

export function validarListaVendas(dados: unknown): ListaVendas {
  const o = objeto(dados, "vendas");
  return { total: numero(o.total, "total"), itens: lista(o.itens, "itens").map((v, i) => itemVenda(v, `itens[${i}]`)) };
}

export function validarDetalheVenda(dados: unknown): DetalheVenda {
  const o = objeto(dados, "venda");
  return {
    ...itemVenda(o, "venda"),
    cliente_cpf: texto(o.cliente_cpf, "cliente_cpf"),
    metodo_pagamento: textoOuNulo(o.metodo_pagamento, "metodo_pagamento"),
    observacao: textoOuNulo(o.observacao, "observacao"),
    itens_da_venda: lista(o.itens_da_venda, "itens_da_venda").map((v, i) => {
      const p = objeto(v, `itens_da_venda[${i}]`);
      return {
        sku: texto(p.sku, "sku"),
        produto: texto(p.produto, "produto"),
        cor: textoOuNulo(p.cor, "cor"),
        tamanho: textoOuNulo(p.tamanho, "tamanho"),
        quantidade: numero(p.quantidade, "quantidade"),
        preco_unitario: dinheiro(p.preco_unitario, "preco_unitario"),
        valor_total: dinheiro(p.valor_total, "valor_total"),
      };
    }),
  };
}

export function validarClienteDeVenda(dados: unknown): ClienteDeVenda {
  const o = objeto(dados, "cliente");
  return {
    id_cliente: texto(o.id_cliente, "id_cliente"),
    nome: texto(o.nome, "nome"),
    cpf: texto(o.cpf, "cpf"),
    email: textoOuNulo(o.email, "email"),
    telefone: textoOuNulo(o.telefone, "telefone"),
  };
}

export function validarListaClientes(dados: unknown): ListaClientes {
  const o = objeto(dados, "clientes");
  return {
    total: numero(o.total, "total"),
    itens: lista(o.itens, "itens").map((v, i) => {
      const c = objeto(v, `itens[${i}]`);
      return {
        ...validarClienteDeVenda(c),
        cidade: textoOuNulo(c.cidade, "cidade"),
        cliente_desde: texto(c.cliente_desde, "cliente_desde"),
      };
    }),
  };
}

export function validarPecas(dados: unknown): PecaNoEstoque[] {
  return lista(dados, "pecas").map((v, i) => {
    const p = objeto(v, `pecas[${i}]`);
    return {
      id_variacao: texto(p.id_variacao, "id_variacao"),
      sku: texto(p.sku, "sku"),
      produto: texto(p.produto, "produto"),
      cor: textoOuNulo(p.cor, "cor"),
      tamanho: textoOuNulo(p.tamanho, "tamanho"),
      preco_venda: dinheiro(p.preco_venda, "preco_venda"),
      disponivel: numero(p.disponivel, "disponivel"),
    };
  });
}

export function validarOpcoes(dados: unknown): OpcoesVenda {
  const o = objeto(dados, "opcoes");
  return {
    metodos: lista(o.metodos, "metodos").map((v, i) => {
      const m = objeto(v, `metodos[${i}]`);
      return { codigo: texto(m.codigo, "codigo") as MetodoDePagamento, nome: texto(m.nome, "nome") };
    }),
    loja: textoOuNulo(o.loja, "loja"),
  };
}

// ---------- Chamadas ----------

const busca = (f: FiltrosVendas) => ({ busca: f.busca?.trim() || undefined, limit: f.limit, offset: f.offset });

export const listarVendas = (f: FiltrosVendas, o?: OpcoesApi) => api.get(BASE, validarListaVendas, busca(f), o);

export const obterVenda = (id: string, o?: OpcoesApi) => api.get(`${BASE}/${id}`, validarDetalheVenda, undefined, o);

export const listarClientesCadastrados = (f: FiltrosVendas, o?: OpcoesApi) =>
  api.get(`${BASE}/clientes`, validarListaClientes, busca(f), o);

/** O CPF vai no corpo (não na URL), só com dígitos. */
export const buscarClientePorCpf = (cpf: string, o?: OpcoesApi) =>
  api.post(`${BASE}/clientes/buscar`, validarClienteDeVenda, { cpf: soDigitos(cpf) }, o);

export const opcoesDeVenda = (o?: OpcoesApi) => api.get(`${BASE}/opcoes`, validarOpcoes, undefined, o);

export const pecasDaLoja = (termo: string, o?: OpcoesApi) =>
  api.get(`${BASE}/pecas`, validarPecas, { busca: termo.trim() || undefined, limit: 20 }, o);

/** A chave de idempotência evita lançar a mesma venda duas vezes num duplo clique. */
export const lancarVenda = (venda: NovaVenda, chave: string) =>
  api.post(BASE, validarDetalheVenda, { ...venda, cpf: soDigitos(venda.cpf) }, { idempotencia: chave });
