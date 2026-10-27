import { api, type OpcoesApi } from "./api";
import { validarBeneficios, type BeneficiosLorenziMais } from "./beneficiosLorenziMais";
import { validarAvisoDeVencimento, type AvisoDeVencimento } from "./vencimentoPontos";
import { booleanoOuPadrao, lista, numero, objeto, opcao, texto, textoOuNulo, type Opcao } from "./validacao";

/** Tipos e chamadas da área de clientes do painel (espelham app/clientes/schemas.py do backend). */

const BASE = "/api/v1/painel/clientes";

export type SecaoClientes = "todos" | "com_aberto" | "meus";

export type ItemCliente = {
  id_cliente: string;
  nome: string;
  /** Clientes importados do Vulto+ podem não ter e-mail. */
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  cliente_desde: string;
  total_chamados: number;
  chamados_em_aberto: number;
  /** Só gerente e admin; para o atendente vem nulo. */
  compras: number | null;
  total_gasto: number | null;
  /** Loja em que o cliente se cadastrou (clientes vindos da Vulto trazem a loja de origem). */
  id_loja_cadastro: string | null;
  loja_cadastro: string | null;
  /** Nulos quando o cliente não tem movimento de pontos (sem movimento no Lorenzi+). */
  saldo_pontos: number | null;
  categoria_vulto_mais: string | null;
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
  /** `historico_vulto`: atendimento importado do histórico da Vulto (fora das filas da equipe). */
  chamados: {
    id_atendimento: string;
    protocolo: string;
    assunto: string;
    categoria: Opcao;
    status: Opcao;
    aberto_em: string;
    historico_vulto: boolean;
  }[];
  /** Só gerente e admin; para o atendente vem nulo. */
  compras:
    | { id_pedido: string; numero_pedido: string; criado_em: string; loja_nome: string; valor_total: number; status: Opcao }[]
    | null;
};

export type FiltrosClientes = {
  busca?: string;
  secao: SecaoClientes;
  idLoja?: string;
  /** ouro, prata, bronze ou sem_pontos. */
  categoria?: string;
  idLojaCadastro?: string;
  /** Marca do cadastro: casa_lorenzi ou vulto. */
  marca?: string;
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
    email: textoOuNulo(o.email, "email"),
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
    id_loja_cadastro: textoOuNulo(o.id_loja_cadastro, "id_loja_cadastro"),
    loja_cadastro: textoOuNulo(o.loja_cadastro, "loja_cadastro"),
    saldo_pontos: inteiroOuNulo(o.saldo_pontos, "saldo_pontos"),
    categoria_vulto_mais: textoOuNulo(o.categoria_vulto_mais, "categoria_vulto_mais"),
  };
}

/** Opções dos filtros da lista (GET /painel/clientes/opcoes). */
export type OpcoesClientes = { lojas_cadastro: { id_loja: string; nome: string }[]; categorias: Opcao[]; marcas: Opcao[] };

export function validarOpcoesClientes(dados: unknown): OpcoesClientes {
  const o = objeto(dados, "opcoes");
  return {
    lojas_cadastro: lista(o.lojas_cadastro, "lojas_cadastro").map((v, i) => {
      const l = objeto(v, `lojas_cadastro[${i}]`);
      return { id_loja: texto(l.id_loja, "id_loja"), nome: texto(l.nome, "nome") };
    }),
    categorias: lista(o.categorias, "categorias").map((v, i) => opcao(v, `categorias[${i}]`)),
    marcas: (o.marcas === undefined ? [] : lista(o.marcas, "marcas")).map((v, i) => opcao(v, `marcas[${i}]`)),
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
        historico_vulto: booleanoOuPadrao(c.historico_vulto, "historico_vulto"),
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

/** Lorenzi+ do cliente na ficha (GET /painel/clientes/{id}/vulto-mais). */
export type VultoMaisDaFicha = AvisoDeVencimento & BeneficiosLorenziMais & {
  saldo: number;
  categoria: string;
  creditos_no_ano: number;
  proxima_categoria: string | null;
  faltam_para_proxima: number | null;
  loja_cadastro: string | null;
  extrato: { ocorrido_em: string; tipo: string; pontos: number; descricao: string }[];
  /** `desconto` (R$) só para gerente e admin; para o atendente vem nulo. */
  resgates: {
    resgatado_em: string;
    pontos: number;
    desconto: number | null;
    loja_nome: string | null;
    atendente: string | null;
    observacao: string | null;
  }[];
};

export function validarVultoMaisDaFicha(dados: unknown): VultoMaisDaFicha {
  const o = objeto(dados, "vulto_mais");
  return {
    saldo: numero(o.saldo, "saldo"),
    categoria: texto(o.categoria, "categoria"),
    creditos_no_ano: numero(o.creditos_no_ano, "creditos_no_ano"),
    proxima_categoria: textoOuNulo(o.proxima_categoria, "proxima_categoria"),
    faltam_para_proxima: inteiroOuNulo(o.faltam_para_proxima, "faltam_para_proxima"),
    loja_cadastro: textoOuNulo(o.loja_cadastro, "loja_cadastro"),
    ...validarAvisoDeVencimento(o),
    ...validarBeneficios(o),
    extrato: lista(o.extrato, "extrato").map((v, i) => {
      const m = objeto(v, `extrato[${i}]`);
      return {
        ocorrido_em: texto(m.ocorrido_em, "ocorrido_em"),
        tipo: texto(m.tipo, "tipo"),
        pontos: numero(m.pontos, "pontos"),
        descricao: texto(m.descricao, "descricao"),
      };
    }),
    resgates: lista(o.resgates, "resgates").map((v, i) => {
      const r = objeto(v, `resgates[${i}]`);
      return {
        resgatado_em: texto(r.resgatado_em, "resgatado_em"),
        pontos: numero(r.pontos, "pontos"),
        desconto: dinheiro(r.desconto, "desconto"),
        loja_nome: textoOuNulo(r.loja_nome, "loja_nome"),
        atendente: textoOuNulo(r.atendente, "atendente"),
        observacao: textoOuNulo(r.observacao, "observacao"),
      };
    }),
  };
}

// ---------- Chamadas ----------

export const listarClientes = (f: FiltrosClientes, o?: OpcoesApi) =>
  api.get(
    BASE,
    validarListaClientes,
    {
      busca: f.busca?.trim() || undefined,
      secao: f.secao,
      id_loja: f.idLoja,
      categoria: f.categoria,
      id_loja_cadastro: f.idLojaCadastro,
      marca: f.marca,
      limit: f.limit,
      offset: f.offset,
    },
    o,
  );

export const buscarOpcoesClientes = (o?: OpcoesApi) => api.get(`${BASE}/opcoes`, validarOpcoesClientes, undefined, o);

export const buscarFicha = (id: string, idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/${id}`, validarFicha, { id_loja: idLoja }, o);

export const buscarVultoMaisDaFicha = (id: string, idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/${id}/vulto-mais`, validarVultoMaisDaFicha, { id_loja: idLoja }, o);
