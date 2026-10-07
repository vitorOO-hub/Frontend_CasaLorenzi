import { api } from "@/api/http";
import { falha, lista, numero, objeto, texto, textoOuNulo } from "./validacao";

type MetodoPagamentoCheckout = "cartao_credito" | "pix" | "boleto";

export type LojaClienteApi = {
  id_loja: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
};

export type ItemPedidoClienteApi = {
  id_item_pedido: string;
  id_variacao: string;
  sku: string;
  produto: string;
  imagem_url: string | null;
  imagem_alt: string | null;
  tecido: string | null;
  cor: string;
  tamanho: string;
  quantidade: number;
  preco_unitario: string;
  valor_total: string;
};

export type PagamentoClienteApi = {
  id_pagamento: string;
  metodo_codigo: string;
  metodo: string;
  status_codigo: string;
  status: string;
  valor: string;
  processado_em: string | null;
};

export type PedidoClienteApi = {
  id_pedido: string;
  numero_pedido: string;
  id_loja: string;
  loja: string;
  status_codigo: string;
  status: string;
  valor_total: string;
  criado_em: string;
  itens: ItemPedidoClienteApi[];
  pagamento: PagamentoClienteApi | null;
};

export type CheckoutClienteCriar = {
  id_loja: string;
  entrega: "casa" | "loja";
  metodo_pagamento: MetodoPagamentoCheckout;
  frete: string;
  endereco_entrega?: {
    cep: string;
    rua: string;
    numero: string;
    complemento?: string | null;
    uf: string;
  } | null;
  itens: { id_variacao: string; quantidade: number }[];
};

function decimal(valor: unknown, campo: string): string {
  if (typeof valor === "string" && valor.trim()) return valor;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor.toFixed(2);
  return falha(campo);
}

export function validarLojaCliente(dados: unknown): LojaClienteApi {
  const o = objeto(dados, "loja");
  return {
    id_loja: texto(o.id_loja, "id_loja"),
    nome: texto(o.nome, "nome"),
    cidade: textoOuNulo(o.cidade, "cidade"),
    uf: textoOuNulo(o.uf, "uf"),
    endereco: textoOuNulo(o.endereco, "endereco"),
  };
}

function validarItemPedido(dados: unknown): ItemPedidoClienteApi {
  const o = objeto(dados, "item");
  return {
    id_item_pedido: texto(o.id_item_pedido, "id_item_pedido"),
    id_variacao: texto(o.id_variacao, "id_variacao"),
    sku: texto(o.sku, "sku"),
    produto: texto(o.produto, "produto"),
    imagem_url: textoOuNulo(o.imagem_url, "imagem_url"),
    imagem_alt: textoOuNulo(o.imagem_alt, "imagem_alt"),
    tecido: textoOuNulo(o.tecido, "tecido"),
    cor: texto(o.cor, "cor"),
    tamanho: texto(o.tamanho, "tamanho"),
    quantidade: numero(o.quantidade, "quantidade"),
    preco_unitario: decimal(o.preco_unitario, "preco_unitario"),
    valor_total: decimal(o.valor_total, "valor_total"),
  };
}

function validarPagamento(dados: unknown): PagamentoClienteApi {
  const o = objeto(dados, "pagamento");
  return {
    id_pagamento: texto(o.id_pagamento, "id_pagamento"),
    metodo_codigo: texto(o.metodo_codigo, "metodo_codigo"),
    metodo: texto(o.metodo, "metodo"),
    status_codigo: texto(o.status_codigo, "status_codigo"),
    status: texto(o.status, "status"),
    valor: decimal(o.valor, "valor"),
    processado_em: textoOuNulo(o.processado_em, "processado_em"),
  };
}

export function validarPedidoCliente(dados: unknown): PedidoClienteApi {
  const o = objeto(dados, "pedido");
  return {
    id_pedido: texto(o.id_pedido, "id_pedido"),
    numero_pedido: texto(o.numero_pedido, "numero_pedido"),
    id_loja: texto(o.id_loja, "id_loja"),
    loja: texto(o.loja, "loja"),
    status_codigo: texto(o.status_codigo, "status_codigo"),
    status: texto(o.status, "status"),
    valor_total: decimal(o.valor_total, "valor_total"),
    criado_em: texto(o.criado_em, "criado_em"),
    itens: lista(o.itens, "itens").map(validarItemPedido),
    pagamento: o.pagamento === null || o.pagamento === undefined ? null : validarPagamento(o.pagamento),
  };
}

export const listarLojasCliente = async () =>
  lista(await api.get<unknown>("/cliente/lojas"), "lojas").map(validarLojaCliente);

export const listarPedidosCliente = async () =>
  lista(await api.get<unknown>("/cliente/pedidos"), "pedidos").map(validarPedidoCliente);

export const fecharPedidoCliente = async (dados: CheckoutClienteCriar, chaveIdempotencia: string) =>
  validarPedidoCliente(await api.post<unknown>("/cliente/pedidos", dados, { idempotencia: chaveIdempotencia }));
