import { api, type OpcoesApi } from "./api";
import { lista, numero, numeroOuNulo, objeto, texto, textoOuNulo } from "./validacao";

/** Tipos e chamadas do início do gerente (espelham app/gerencia/schemas.py do backend). */

const BASE = "/api/v1/painel/gerencia";

export type CanalVenda = "loja" | "online";

export type ResumoVendas = {
  /** Faturamento de produtos: soma dos itens dos pedidos pagos, sem o frete. */
  faturamento: number;
  pedidos: number;
  pecas: number;
  ticket_medio: number;
  faturamento_online: number;
  pedidos_online: number;
  /** Parte do faturamento que veio do online, de 0 a 1. */
  participacao_online: number;
};

export type VendaDia = { data: string; faturamento: number; pedidos: number; pecas: number };

export type MovimentoDiaSemana = {
  /** 0 = domingo ... 6 = sábado. */
  dia_semana: number;
  pedidos: number;
  dias: number;
  pedidos_por_dia: number;
};

export type PecaMaisVendida = {
  id_produto: string;
  nome: string;
  categoria: string | null;
  unidades: number;
  faturamento: number;
};

export type DashboardGerente = {
  periodo: { inicio: string; fim: string };
  periodo_anterior: { inicio: string; fim: string };
  atual: ResumoVendas;
  anterior: ResumoVendas;
  serie_diaria: VendaDia[];
  movimento_semana: MovimentoDiaSemana[];
  pecas_mais_vendidas: PecaMaisVendida[];
  opcoes: {
    lojas: { id_loja: string; nome: string }[];
    canais: { codigo: string; nome: string }[];
    categorias: string[];
  };
  escopo: { papel: string; id_loja: string | null; loja_nome: string | null; pode_escolher_loja: boolean };
};

export type SituacaoReposicao = "esgotada" | "abaixo_do_minimo" | "cobertura_curta";

export type ItemReposicao = {
  id_variacao: string;
  sku: string;
  produto: string;
  cor: string;
  tamanho: string;
  categoria: string | null;
  saldo: number;
  minimo: number;
  giro_diario: number | null;
  dias_cobertura: number | null;
  situacao: SituacaoReposicao;
};

export type Reposicao = { total: number; itens: ItemReposicao[] };

export type Pendencias = {
  ajustes_para_aprovar: number;
  transferencias_aguardando: number;
  chamados_sem_resposta: number;
  total: number;
};

export type FiltrosGerente = {
  inicio: string;
  fim: string;
  idLoja?: string;
  categoria?: string;
  canal?: string;
};

// ---------- Validação ----------

function resumo(valor: unknown, campo: string): ResumoVendas {
  const o = objeto(valor, campo);
  return {
    faturamento: numero(o.faturamento, `${campo}.faturamento`),
    pedidos: numero(o.pedidos, `${campo}.pedidos`),
    pecas: numero(o.pecas, `${campo}.pecas`),
    ticket_medio: numero(o.ticket_medio, `${campo}.ticket_medio`),
    faturamento_online: numero(o.faturamento_online, `${campo}.faturamento_online`),
    pedidos_online: numero(o.pedidos_online, `${campo}.pedidos_online`),
    participacao_online: numero(o.participacao_online, `${campo}.participacao_online`),
  };
}

function periodo(valor: unknown, campo: string) {
  const o = objeto(valor, campo);
  return { inicio: texto(o.inicio, `${campo}.inicio`), fim: texto(o.fim, `${campo}.fim`) };
}

export function validarDashboardGerente(dados: unknown): DashboardGerente {
  const o = objeto(dados, "dashboard");
  const opcoes = objeto(o.opcoes, "opcoes");
  const escopo = objeto(o.escopo, "escopo");
  return {
    periodo: periodo(o.periodo, "periodo"),
    periodo_anterior: periodo(o.periodo_anterior, "periodo_anterior"),
    atual: resumo(o.atual, "atual"),
    anterior: resumo(o.anterior, "anterior"),
    serie_diaria: lista(o.serie_diaria, "serie_diaria").map((v, i) => {
      const d = objeto(v, `serie_diaria[${i}]`);
      return {
        data: texto(d.data, "data"),
        faturamento: numero(d.faturamento, "faturamento"),
        pedidos: numero(d.pedidos, "pedidos"),
        pecas: numero(d.pecas, "pecas"),
      };
    }),
    movimento_semana: lista(o.movimento_semana, "movimento_semana").map((v, i) => {
      const d = objeto(v, `movimento_semana[${i}]`);
      return {
        dia_semana: numero(d.dia_semana, "dia_semana"),
        pedidos: numero(d.pedidos, "pedidos"),
        dias: numero(d.dias, "dias"),
        pedidos_por_dia: numero(d.pedidos_por_dia, "pedidos_por_dia"),
      };
    }),
    pecas_mais_vendidas: lista(o.pecas_mais_vendidas, "pecas_mais_vendidas").map((v, i) => {
      const p = objeto(v, `pecas_mais_vendidas[${i}]`);
      return {
        id_produto: texto(p.id_produto, "id_produto"),
        nome: texto(p.nome, "nome"),
        categoria: textoOuNulo(p.categoria, "categoria"),
        unidades: numero(p.unidades, "unidades"),
        faturamento: numero(p.faturamento, "faturamento"),
      };
    }),
    opcoes: {
      lojas: lista(opcoes.lojas, "opcoes.lojas").map((v, i) => {
        const l = objeto(v, `opcoes.lojas[${i}]`);
        return { id_loja: texto(l.id_loja, "id_loja"), nome: texto(l.nome, "nome") };
      }),
      canais: lista(opcoes.canais, "opcoes.canais").map((v, i) => {
        const c = objeto(v, `opcoes.canais[${i}]`);
        return { codigo: texto(c.codigo, "codigo"), nome: texto(c.nome, "nome") };
      }),
      categorias: lista(opcoes.categorias, "opcoes.categorias").map((v, i) => texto(v, `opcoes.categorias[${i}]`)),
    },
    escopo: {
      papel: texto(escopo.papel, "escopo.papel"),
      id_loja: textoOuNulo(escopo.id_loja, "escopo.id_loja"),
      loja_nome: textoOuNulo(escopo.loja_nome, "escopo.loja_nome"),
      pode_escolher_loja: escopo.pode_escolher_loja === true,
    },
  };
}

const SITUACOES: SituacaoReposicao[] = ["esgotada", "abaixo_do_minimo", "cobertura_curta"];

export function validarReposicao(dados: unknown): Reposicao {
  const o = objeto(dados, "reposicao");
  return {
    total: numero(o.total, "total"),
    itens: lista(o.itens, "itens").map((v, i) => {
      const x = objeto(v, `itens[${i}]`);
      const situacao = SITUACOES.find((s) => s === x.situacao);
      if (!situacao) throw new Error(`campo inválido: itens[${i}].situacao`);
      return {
        id_variacao: texto(x.id_variacao, "id_variacao"),
        sku: texto(x.sku, "sku"),
        produto: texto(x.produto, "produto"),
        cor: texto(x.cor, "cor"),
        tamanho: texto(x.tamanho, "tamanho"),
        categoria: textoOuNulo(x.categoria, "categoria"),
        saldo: numero(x.saldo, "saldo"),
        minimo: numero(x.minimo, "minimo"),
        giro_diario: numeroOuNulo(x.giro_diario, "giro_diario"),
        dias_cobertura: numeroOuNulo(x.dias_cobertura, "dias_cobertura"),
        situacao,
      };
    }),
  };
}

export function validarPendencias(dados: unknown): Pendencias {
  const o = objeto(dados, "pendencias");
  return {
    ajustes_para_aprovar: numero(o.ajustes_para_aprovar, "ajustes_para_aprovar"),
    transferencias_aguardando: numero(o.transferencias_aguardando, "transferencias_aguardando"),
    chamados_sem_resposta: numero(o.chamados_sem_resposta, "chamados_sem_resposta"),
    total: numero(o.total, "total"),
  };
}

// ---------- Chamadas ----------

export const buscarDashboardGerente = (f: FiltrosGerente, o?: OpcoesApi) =>
  api.get(
    `${BASE}/dashboard`,
    validarDashboardGerente,
    { inicio: f.inicio, fim: f.fim, id_loja: f.idLoja, categoria: f.categoria, canal: f.canal },
    o,
  );

export const buscarReposicao = (f: { idLoja?: string; categoria?: string; limite?: number }, o?: OpcoesApi) =>
  api.get(`${BASE}/reposicao`, validarReposicao, { id_loja: f.idLoja, categoria: f.categoria, limit: f.limite }, o);

export const buscarPendencias = (idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/pendencias`, validarPendencias, { id_loja: idLoja }, o);

export type LojaDaRede = {
  id_loja: string;
  codigo: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  endereco: string | null;
  gerente: string | null;
  equipe: number;
  unidades_em_estoque: number;
  pecas_em_alerta: number;
  /** Faturamento de produtos dos últimos 30 dias. */
  vendas_30_dias: number;
  chamados_abertos: number;
};

export function validarLojas(dados: unknown): LojaDaRede[] {
  return lista(objeto(dados, "lojas").itens, "itens").map((v, i) => {
    const l = objeto(v, `itens[${i}]`);
    return {
      id_loja: texto(l.id_loja, "id_loja"),
      codigo: texto(l.codigo, "codigo"),
      nome: texto(l.nome, "nome"),
      cidade: textoOuNulo(l.cidade, "cidade"),
      uf: textoOuNulo(l.uf, "uf"),
      endereco: textoOuNulo(l.endereco, "endereco"),
      gerente: textoOuNulo(l.gerente, "gerente"),
      equipe: numero(l.equipe, "equipe"),
      unidades_em_estoque: numero(l.unidades_em_estoque, "unidades_em_estoque"),
      pecas_em_alerta: numero(l.pecas_em_alerta, "pecas_em_alerta"),
      vendas_30_dias: numero(l.vendas_30_dias, "vendas_30_dias"),
      chamados_abertos: numero(l.chamados_abertos, "chamados_abertos"),
    };
  });
}

export const buscarLojas = (idLoja?: string, o?: OpcoesApi) =>
  api.get(`${BASE}/lojas`, validarLojas, { id_loja: idLoja }, o);
