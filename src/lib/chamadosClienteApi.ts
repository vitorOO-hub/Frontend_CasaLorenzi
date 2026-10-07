import { api } from "@/api/http";
import { lista, numero, objeto, opcao, texto, textoOuNulo, type Opcao } from "./validacao";

export type OpcaoChamadoClienteApi = Opcao;

export type OpcoesChamadoClienteApi = {
  categorias: OpcaoChamadoClienteApi[];
};

export type PecaChamadoClienteApi = {
  id_item_pedido: string;
  id_variacao: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  quantidade: number;
};

export type AnexoChamadoClienteApi = {
  id_anexo: string;
  nome: string;
  caminho: string;
  criado_em: string;
};

export type ChamadoClienteApi = {
  id_atendimento: string;
  protocolo: string;
  assunto: string;
  categoria: OpcaoChamadoClienteApi;
  status: OpcaoChamadoClienteApi;
  id_pedido: string | null;
  numero_pedido: string | null;
  id_loja: string | null;
  loja_nome: string | null;
  aberto_em: string;
  atualizado_em: string;
  ultima_mensagem_em: string | null;
};

export type DetalheChamadoClienteApi = ChamadoClienteApi & {
  pecas: PecaChamadoClienteApi[];
  anexos: AnexoChamadoClienteApi[];
};

export type MensagemChamadoClienteApi = {
  id_mensagem: string;
  autor: "cliente" | "atendente";
  nome: string;
  texto: string;
  enviada_em: string;
};

export type ChamadoClienteCriar = {
  assunto: string;
  categoria: string;
  descricao: string;
  id_loja?: string;
  id_pedido?: string;
  id_item_pedido?: string;
};

function validarOpcoesChamado(dados: unknown): OpcoesChamadoClienteApi {
  const o = objeto(dados, "opcoes");
  return {
    categorias: lista(o.categorias, "categorias").map((valor, i) => opcao(valor, `categorias[${i}]`)),
  };
}

function validarPecaChamado(dados: unknown): PecaChamadoClienteApi {
  const o = objeto(dados, "peca");
  return {
    id_item_pedido: texto(o.id_item_pedido, "id_item_pedido"),
    id_variacao: texto(o.id_variacao, "id_variacao"),
    sku: texto(o.sku, "sku"),
    produto: texto(o.produto, "produto"),
    cor: texto(o.cor, "cor"),
    tamanho: texto(o.tamanho, "tamanho"),
    quantidade: numero(o.quantidade, "quantidade"),
  };
}

function validarAnexoChamado(dados: unknown): AnexoChamadoClienteApi {
  const o = objeto(dados, "anexo");
  return {
    id_anexo: texto(o.id_anexo, "id_anexo"),
    nome: texto(o.nome, "nome"),
    caminho: texto(o.caminho, "caminho"),
    criado_em: texto(o.criado_em, "criado_em"),
  };
}

export function validarChamadoCliente(dados: unknown): ChamadoClienteApi {
  const o = objeto(dados, "chamado");
  return {
    id_atendimento: texto(o.id_atendimento, "id_atendimento"),
    protocolo: texto(o.protocolo, "protocolo"),
    assunto: texto(o.assunto, "assunto"),
    categoria: opcao(o.categoria, "categoria"),
    status: opcao(o.status, "status"),
    id_pedido: textoOuNulo(o.id_pedido, "id_pedido"),
    numero_pedido: textoOuNulo(o.numero_pedido, "numero_pedido"),
    id_loja: textoOuNulo(o.id_loja, "id_loja"),
    loja_nome: textoOuNulo(o.loja_nome, "loja_nome"),
    aberto_em: texto(o.aberto_em, "aberto_em"),
    atualizado_em: texto(o.atualizado_em, "atualizado_em"),
    ultima_mensagem_em: textoOuNulo(o.ultima_mensagem_em, "ultima_mensagem_em"),
  };
}

export function validarDetalheChamadoCliente(dados: unknown): DetalheChamadoClienteApi {
  const base = validarChamadoCliente(dados);
  const o = objeto(dados, "chamado");
  return {
    ...base,
    pecas: lista(o.pecas, "pecas").map(validarPecaChamado),
    anexos: lista(o.anexos, "anexos").map(validarAnexoChamado),
  };
}

export function validarMensagemChamadoCliente(dados: unknown): MensagemChamadoClienteApi {
  const o = objeto(dados, "mensagem");
  const autor = texto(o.autor, "autor");
  if (autor !== "cliente" && autor !== "atendente") throw new Error("autor invalido");
  return {
    id_mensagem: texto(o.id_mensagem, "id_mensagem"),
    autor,
    nome: texto(o.nome, "nome"),
    texto: texto(o.texto, "texto"),
    enviada_em: texto(o.enviada_em, "enviada_em"),
  };
}

export const listarOpcoesChamadoCliente = async () =>
  validarOpcoesChamado(await api.get<unknown>("/cliente/chamados/opcoes"));

export const listarChamadosCliente = async () =>
  lista(await api.get<unknown>("/cliente/chamados"), "chamados").map(validarChamadoCliente);

export const abrirChamadoCliente = async (dados: ChamadoClienteCriar) =>
  validarDetalheChamadoCliente(await api.post<unknown>("/cliente/chamados", dados));

export const obterChamadoCliente = async (id: string) =>
  validarDetalheChamadoCliente(await api.get<unknown>(`/cliente/chamados/${id}`));

export const listarMensagensChamadoCliente = async (id: string) =>
  lista(await api.get<unknown>(`/cliente/chamados/${id}/mensagens`), "mensagens").map(validarMensagemChamadoCliente);

export const enviarMensagemChamadoCliente = async (id: string, mensagem: string) =>
  validarMensagemChamadoCliente(await api.post<unknown>(`/cliente/chamados/${id}/mensagens`, { texto: mensagem }));
