import { api, type OpcoesApi } from "./api";
import { lista, numero, objeto, texto, textoOuNulo } from "./validacao";

/**
 * Fila das vendas do Vulto que a importação não conseguiu virar pedido (só admin). Espelha
 * app/gestao/vendas_pendentes.py: o detalhe nunca traz CPF, telefone nem e-mail (só o fim do CPF).
 */

const BASE = "/api/v1/painel/gestao/vendas-pendentes";

export type EstadoDaVenda = "pendente" | "importada" | "descartada";
const ESTADOS: EstadoDaVenda[] = ["pendente", "importada", "descartada"];

export type ItemDaFila = {
  id_venda_pendente: string;
  venda_id_origem: string;
  status_origem: string | null;
  motivos: string[];
  quantidade_itens: number;
  criada_em: string;
  estado: EstadoDaVenda;
  resolvida_em: string | null;
};

export type FilaDeVendas = { total: number; itens: ItemDaFila[]; por_grupo: { grupo: string; vendas: number }[] };

export type VariacaoSugerida = { id_variacao: string; sku: string; nome: string };

export type VendaPendente = {
  id_venda_pendente: string;
  venda_id_origem: string;
  estado: EstadoDaVenda;
  motivos: string[];
  status_origem: string | null;
  resolvida_em: string | null;
  observacao_resolucao: string | null;
  loja: string | null;
  canal: string | null;
  status_destino: string | null;
  vendida_em: string | null;
  vendedor: string | null;
  total: number | null;
  frete: number;
  desconto: number;
  total_calculado: number | null;
  situacao_valores: string;
  cpf_final: string | null;
  sugestao_cliente: { id_cliente: string; nome: string } | null;
  itens: {
    sku_origem: string;
    descricao: string | null;
    quantidade: number;
    preco_unitario: number | null;
    variacao_sugerida: VariacaoSugerida | null;
  }[];
};

export type ImportacaoDeVenda = {
  id_cliente: string;
  valor_total: number;
  valor_frete: number;
  itens: { id_variacao: string; quantidade: number; preco_unitario: number }[];
  observacao?: string;
};

// ---------- validação ----------

/** O Pydantic serializa Decimal como texto ("199.90"). */
function dinheiro(valor: unknown, campo: string): number | null {
  if (valor === null || valor === undefined) return null;
  return numero(typeof valor === "string" ? Number(valor) : valor, campo);
}

function estado(valor: unknown, campo: string): EstadoDaVenda {
  const e = ESTADOS.find((x) => x === valor);
  if (!e) throw new Error(`campo inválido: ${campo}`);
  return e;
}

const textos = (valor: unknown, campo: string) => lista(valor, campo).map((v, i) => texto(v, `${campo}[${i}]`));

function variacao(valor: unknown, campo: string): VariacaoSugerida {
  const v = objeto(valor, campo);
  return { id_variacao: texto(v.id_variacao, `${campo}.id_variacao`), sku: texto(v.sku, `${campo}.sku`), nome: texto(v.nome, `${campo}.nome`) };
}

export function validarFila(dados: unknown): FilaDeVendas {
  const o = objeto(dados, "fila");
  return {
    total: numero(o.total, "total"),
    itens: lista(o.itens, "itens").map((v, i) => {
      const c = `itens[${i}]`;
      const x = objeto(v, c);
      return {
        id_venda_pendente: texto(x.id_venda_pendente, `${c}.id_venda_pendente`),
        venda_id_origem: texto(x.venda_id_origem, `${c}.venda_id_origem`),
        status_origem: textoOuNulo(x.status_origem, `${c}.status_origem`),
        motivos: textos(x.motivos, `${c}.motivos`),
        quantidade_itens: numero(x.quantidade_itens, `${c}.quantidade_itens`),
        criada_em: texto(x.criada_em, `${c}.criada_em`),
        estado: x.estado === undefined ? "pendente" : estado(x.estado, `${c}.estado`),
        resolvida_em: textoOuNulo(x.resolvida_em ?? null, `${c}.resolvida_em`),
      };
    }),
    por_grupo: (o.por_grupo === undefined ? [] : lista(o.por_grupo, "por_grupo")).map((v, i) => {
      const g = objeto(v, `por_grupo[${i}]`);
      return { grupo: texto(g.grupo, "grupo"), vendas: numero(g.vendas, "vendas") };
    }),
  };
}

export function validarVendaPendente(dados: unknown): VendaPendente {
  const o = objeto(dados, "venda");
  const sugestao = o.sugestao_cliente === null || o.sugestao_cliente === undefined ? null : objeto(o.sugestao_cliente, "sugestao_cliente");
  return {
    id_venda_pendente: texto(o.id_venda_pendente, "id_venda_pendente"),
    venda_id_origem: texto(o.venda_id_origem, "venda_id_origem"),
    estado: estado(o.estado, "estado"),
    motivos: textos(o.motivos, "motivos"),
    status_origem: textoOuNulo(o.status_origem, "status_origem"),
    resolvida_em: textoOuNulo(o.resolvida_em, "resolvida_em"),
    observacao_resolucao: textoOuNulo(o.observacao_resolucao, "observacao_resolucao"),
    loja: textoOuNulo(o.loja, "loja"),
    canal: textoOuNulo(o.canal, "canal"),
    status_destino: textoOuNulo(o.status_destino, "status_destino"),
    vendida_em: textoOuNulo(o.vendida_em, "vendida_em"),
    vendedor: textoOuNulo(o.vendedor, "vendedor"),
    total: dinheiro(o.total, "total"),
    frete: dinheiro(o.frete, "frete") ?? 0,
    desconto: dinheiro(o.desconto, "desconto") ?? 0,
    total_calculado: dinheiro(o.total_calculado, "total_calculado"),
    situacao_valores: texto(o.situacao_valores, "situacao_valores"),
    cpf_final: textoOuNulo(o.cpf_final, "cpf_final"),
    sugestao_cliente: sugestao ? { id_cliente: texto(sugestao.id_cliente, "id_cliente"), nome: texto(sugestao.nome, "nome") } : null,
    itens: lista(o.itens, "itens").map((v, i) => {
      const c = `itens[${i}]`;
      const x = objeto(v, c);
      return {
        sku_origem: texto(x.sku_origem, `${c}.sku_origem`),
        descricao: textoOuNulo(x.descricao, `${c}.descricao`),
        quantidade: numero(x.quantidade, `${c}.quantidade`),
        preco_unitario: dinheiro(x.preco_unitario, `${c}.preco_unitario`),
        variacao_sugerida: x.variacao_sugerida ? variacao(x.variacao_sugerida, `${c}.variacao_sugerida`) : null,
      };
    }),
  };
}

const validarVariacoes = (dados: unknown) => lista(dados, "variacoes").map((v, i) => variacao(v, `variacoes[${i}]`));

// ---------- chamadas ----------

export const listarFila = (f: { estado: EstadoDaVenda; grupo?: string; limit: number; offset: number }, o?: OpcoesApi) =>
  api.get(BASE, validarFila, { estado: f.estado, grupo: f.grupo, limit: f.limit, offset: f.offset }, o);

export const buscarVendaPendente = (id: string, o?: OpcoesApi) =>
  api.get(`${BASE}/${encodeURIComponent(id)}`, validarVendaPendente, undefined, o);

export const buscarVariacoes = (busca: string, o?: OpcoesApi) =>
  api.get(`${BASE}/variacoes`, validarVariacoes, { busca }, o);

export const importarVenda = (id: string, d: ImportacaoDeVenda, o?: OpcoesApi) =>
  api.post(`${BASE}/${encodeURIComponent(id)}/importar`, validarVendaPendente, d, o);

export const descartarVenda = (id: string, observacao: string, o?: OpcoesApi) =>
  api.post(`${BASE}/${encodeURIComponent(id)}/descartar`, validarVendaPendente, { observacao }, o);

// ---------- apresentação ----------

export const GRUPOS_DE_MOTIVO: Record<string, string> = {
  cliente: "Cliente",
  valores: "Valores",
  sku: "Peça",
  itens: "Sem itens",
  item: "Item inválido",
  loja: "Loja",
  status: "Status",
  data_hora: "Data",
  duplicidade: "Duplicidade",
};

const MOTIVOS: Record<string, string> = {
  "cliente:vinculo_compra_pendente": "Venda sem ligação confirmada com a compra do cliente",
  "cliente:cpf_da_compra_ausente_ambiguo_ou_invalido": "CPF da compra ausente, ambíguo ou inválido",
  "cliente:cpf_da_compra_invalido": "CPF da compra inválido",
  "cliente:cpf_da_venda_invalido": "CPF da venda inválido",
  "cliente:cliente_nao_encontrado_por_cpf": "Nenhum cliente cadastrado com este CPF",
  "cliente:cpf_ambiguo_no_cadastro_de_clientes": "Mais de um cliente com este CPF",
  "cliente:sem_compra_id_resolvida": "Venda sem compra ligada",
  "cliente:compra_nao_encontrada": "Compra ligada não encontrada",
  "valores:pendente_divergencia_total": "Total diferente da soma dos itens",
  "valores:total_ou_frete_invalido": "Total ou frete inválido",
  "valores:pendente_devolucao": "Tem devolução (quantidade negativa)",
  "valores:pendente_rateio_incompativel_com_centavos": "Desconto não fecha nos centavos",
  "valores:pendente_valor_ausente": "Venda sem total",
  "valores:pendente_item_invalido": "Item com quantidade ou preço inválido",
  "sku:variacao_nao_encontrada": "Peça (SKU) não encontrada no catálogo",
  "sku:linhas_duplicadas_com_precos_diferentes": "Mesma peça em linhas com preços diferentes",
  "itens:nenhum_item_importavel": "Nenhum item importável",
  "item:quantidade_nao_positiva_ou_nao_inteira": "Quantidade zero, negativa ou fracionada",
  "item:quantidade_ou_preco_invalido": "Quantidade ou preço inválido",
  "loja:sem_correspondencia_ou_nao_aplicavel": "Loja de origem não reconhecida",
  "status:codigo_ausente_no_destino": "Status de origem não reconhecido",
  "data_hora:ausente_invalida_ou_sem_fuso": "Data da venda ausente ou inválida",
  "duplicidade:sem_confirmacao_para_importar": "Possível venda duplicada",
};

export const rotuloMotivo = (motivo: string) => MOTIVOS[motivo] ?? motivo.replace(/^[^:]+:/, "").replace(/_/g, " ");
