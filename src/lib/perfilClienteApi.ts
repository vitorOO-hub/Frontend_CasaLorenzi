import { api } from "@/api/http";
import { booleano, booleanoOuPadrao, numero, objeto, texto, textoOuNulo } from "./validacao";

export type PerfilClienteApi = {
  id_cliente: string;
  nome: string;
  email: string;
  telefone: string | null;
  documento: string | null;
  cliente_desde: string;
  total_pedidos: number;
  valor_total_pedidos: string;
  total_chamados: number;
  id_loja_preferida: string | null;
  loja_preferida: string | null;
  /** Endereço do cadastro; contas antigas podem não ter. */
  cep: string | null;
  rua: string | null;
  bairro: string | null;
  numero_endereco: string | null;
  complemento: string | null;
  /** Aceita receber avisos (pontos a vencer) por e-mail e WhatsApp. */
  aceita_mensagens: boolean;
};

function decimal(valor: unknown, campo: string): string {
  if (typeof valor === "string" && valor.trim()) return valor;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor.toFixed(2);
  throw new Error(`Campo invalido: ${campo}`);
}

export function validarPerfilCliente(dados: unknown): PerfilClienteApi {
  const o = objeto(dados, "perfil");
  return {
    id_cliente: texto(o.id_cliente, "id_cliente"),
    nome: texto(o.nome, "nome"),
    email: texto(o.email, "email"),
    telefone: textoOuNulo(o.telefone, "telefone"),
    documento: textoOuNulo(o.documento, "documento"),
    cliente_desde: texto(o.cliente_desde, "cliente_desde"),
    total_pedidos: numero(o.total_pedidos, "total_pedidos"),
    valor_total_pedidos: decimal(o.valor_total_pedidos, "valor_total_pedidos"),
    total_chamados: numero(o.total_chamados, "total_chamados"),
    id_loja_preferida: textoOuNulo(o.id_loja_preferida, "id_loja_preferida"),
    loja_preferida: textoOuNulo(o.loja_preferida, "loja_preferida"),
    cep: textoOuNulo(o.cep, "cep"),
    rua: textoOuNulo(o.rua, "rua"),
    bairro: textoOuNulo(o.bairro, "bairro"),
    numero_endereco: textoOuNulo(o.numero_endereco, "numero_endereco"),
    complemento: textoOuNulo(o.complemento, "complemento"),
    aceita_mensagens: booleanoOuPadrao(o.aceita_mensagens, "aceita_mensagens", true),
  };
}

export const obterPerfilCliente = async () =>
  validarPerfilCliente(await api.get<unknown>("/cliente/perfil"));

/** O cliente aceita ou recusa os avisos; a escolha dele vale sobre o padrão e sobre a planilha da Vulto. */
export const alterarAceitaMensagens = async (aceita: boolean) =>
  booleano(
    objeto(await api.patch<unknown>("/cliente/preferencias", { aceita_mensagens: aceita }), "preferencias")
      .aceita_mensagens,
    "aceita_mensagens",
  );
