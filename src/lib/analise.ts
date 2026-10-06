/**
 * Camada analítica dos dashboards.
 *
 * O protótipo tem poucos pedidos e chamados reais, então geramos um histórico
 * simulado de 2 anos (para o período "12 meses" ter com o que comparar) (determinístico: sempre os mesmos números) e somamos a
 * ele o que acontece na sessão (compras, chamados e movimentações novas).
 */
import {
  lojas,
  produtosIniciais,
  type Chamado,
  type Pedido,
  type Prioridade,
  type Produto,
} from "./dados";

// ===================== Datas =====================

const agora = new Date();
export const HOJE = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()))
  .toISOString()
  .slice(0, 10);

export function addDias(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const diaDaSemana = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
const mes = (iso: string) => Number(iso.slice(5, 7));

export type Periodo = 7 | 30 | 90 | 365;

export const rotuloPeriodo: Record<Periodo, string> = {
  7: "7 dias",
  30: "30 dias",
  90: "90 dias",
  365: "12 meses",
};

/** Intervalo [inicio, fim] do período atual e do período imediatamente anterior. */
export function intervalos(periodo: Periodo) {
  const fim = HOJE;
  const inicio = addDias(fim, -(periodo - 1));
  return {
    atual: { inicio, fim },
    anterior: { inicio: addDias(inicio, -periodo), fim: addDias(inicio, -1) },
  };
}

// ===================== Gerador determinístico =====================

function mulberry32(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(1962);

function poisson(lambda: number) {
  const limite = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rnd();
  } while (p > limite);
  return k - 1;
}

function sortear<T>(itens: T[], pesos: number[]): T {
  const total = pesos.reduce((s, p) => s + p, 0);
  let alvo = rnd() * total;
  for (let i = 0; i < itens.length; i++) {
    alvo -= pesos[i]!;
    if (alvo <= 0) return itens[i]!;
  }
  return itens[itens.length - 1]!;
}

// ===================== Tipos analíticos =====================

export type Canal = "Loja" | "Online";

export type ItemVenda = { sku: string; categoria: string; quantidade: number; valor: number };

export type Venda = { data: string; lojaId: string; canal: Canal; itens: ItemVenda[] };

export type Atendimento = {
  data: string;
  lojaId: string;
  canal: Chamado["canal"];
  motivo: Chamado["motivo"];
  prioridade: Prioridade;
  resolvido: boolean;
  /** Horas até a primeira resposta do time; null = ainda sem resposta. */
  respostaHoras: number | null;
};

export type Movimento = {
  data: string;
  lojaId: string;
  sku: string;
  categoria: string;
  tipo: "Entrada" | "Saída";
  quantidade: number;
};

// ===================== Histórico simulado =====================

const pesoLoja: Record<string, number> = { l1: 1, l2: 0.8, l3: 0.6 };
const fatorSemana = [0.8, 0.65, 0.8, 0.9, 1, 1.25, 1.55]; // dom..sáb
const fatorMes = [0, 0.85, 0.8, 0.9, 0.95, 1.05, 1.1, 0.95, 0.9, 1, 1.05, 1.3, 1.65]; // índice 1..12
const pesoProduto = produtosIniciais.map((p) => (1 / Math.sqrt(p.preco)) * (0.6 + rnd()));
const somaPesos = pesoProduto.reduce((s, p) => s + p, 0);
const categoriaDe = new Map(produtosIniciais.map((p) => [p.sku, p.categoria]));

const vendasSimuladas: Venda[] = [];
const atendimentosSimulados: Atendimento[] = [];
const entradasSimuladas: Movimento[] = [];

for (let d = 729; d >= 0; d--) {
  const data = addDias(HOJE, -d);
  const tendencia = 1 + ((730 - d) / 730) * 0.35;
  const fator = fatorSemana[diaDaSemana(data)]! * fatorMes[mes(data)]! * tendencia;

  for (const loja of ["l1", "l2", "l3"]) {
    // Vendas
    const pedidos = poisson(3.1 * pesoLoja[loja]! * fator);
    for (let i = 0; i < pedidos; i++) {
      const qtdItens = rnd() < 0.7 ? 1 : rnd() < 0.8 ? 2 : 3;
      const itens: ItemVenda[] = [];
      for (let j = 0; j < qtdItens; j++) {
        const p = sortear(produtosIniciais, pesoProduto);
        itens.push({ sku: p.sku, categoria: p.categoria, quantidade: rnd() < 0.9 ? 1 : 2, valor: p.preco });
      }
      vendasSimuladas.push({
        data,
        lojaId: loja,
        canal: rnd() < (loja === "l1" ? 0.36 : 0.28) ? "Online" : "Loja",
        itens,
      });
    }

    // Atendimentos já encerrados (os abertos são os chamados reais da fila)
    {
      const chamados = poisson(0.45 * pesoLoja[loja]! * fatorSemana[diaDaSemana(data)]!);
      for (let i = 0; i < chamados; i++) {
        const motivo = sortear<Chamado["motivo"]>(["Dúvida", "Troca", "Entrega", "Defeito"], [4, 3, 2, 1]);
        const canal = sortear<Chamado["canal"]>(["WhatsApp", "Portal", "E-mail", "Loja"], [3.5, 2.5, 2, 2]);
        const base = { Loja: 1.5, WhatsApp: 4, Portal: 9, "E-mail": 16 }[canal];
        // O tempo de resposta melhora ao longo do ano.
        const respostaHoras = Math.max(0.3, base * (0.4 + rnd() * 1.2) * (0.7 + (d / 730) * 0.6));
        atendimentosSimulados.push({
          data,
          lojaId: loja,
          canal,
          motivo,
          prioridade: motivo === "Defeito" ? "Alta" : motivo === "Entrega" ? (rnd() < 0.5 ? "Alta" : "Média") : rnd() < 0.3 ? "Média" : "Baixa",
          resolvido: true,
          respostaHoras: Math.round(respostaHoras * 10) / 10,
        });
      }
    }
  }
}

// Reposição de fornecedor toda segunda-feira, proporcional ao giro de cada peça.
for (let d = 729; d >= 0; d--) {
  const data = addDias(HOJE, -d);
  if (diaDaSemana(data) !== 1) continue;
  for (const loja of ["l1", "l2", "l3"]) {
    produtosIniciais.forEach((p, i) => {
      // Venda semanal esperada da peça: pedidos/dia × itens por pedido × fatia da peça.
      const esperado = 7 * 3.1 * pesoLoja[loja]! * 1.45 * (pesoProduto[i]! / somaPesos);
      const quantidade = Math.round(esperado * (0.6 + rnd() * 0.8));
      if (quantidade > 0)
        entradasSimuladas.push({ data, lojaId: loja, sku: p.sku, categoria: p.categoria, tipo: "Entrada", quantidade });
    });
  }
}

// ===================== Junção com os dados da sessão =====================

const categoriaSku = (sku: string, produtos: Produto[]) =>
  produtos.find((p) => p.sku === sku.slice(0, 7))?.categoria ?? categoriaDe.get(sku.slice(0, 7)) ?? "Outros";

export function todasAsVendas(pedidos: Pedido[], produtos: Produto[]): Venda[] {
  const daSessao = pedidos
    .filter((p) => p.status !== "Cancelado")
    .map<Venda>((p) => ({
      data: p.data,
      lojaId: p.lojaId,
      canal: "Online",
      itens: p.itens.map((i) => ({ ...i, sku: i.sku.slice(0, 7), categoria: categoriaSku(i.sku, produtos) })),
    }));
  return [...vendasSimuladas, ...daSessao];
}

const horas = (dataHora: string) => new Date(dataHora.replace(" ", "T")).getTime() / 36e5;

export function todosOsAtendimentos(chamados: Chamado[]): Atendimento[] {
  const daSessao = chamados.map<Atendimento>((c) => {
    const primeira = c.mensagens[0];
    const resposta = c.mensagens.find((m) => m.autor === "atendente");
    return {
      data: c.abertoEm,
      lojaId: c.lojaId,
      canal: c.canal,
      motivo: c.motivo,
      prioridade: c.prioridade ?? (c.motivo === "Defeito" ? "Alta" : "Baixa"),
      resolvido: c.status === "Resolvido",
      respostaHoras:
        primeira && resposta ? Math.max(0.1, Math.round((horas(resposta.data) - horas(primeira.data)) * 10) / 10) : null,
    };
  });
  return [...atendimentosSimulados, ...daSessao];
}

/** Entradas e saídas de estoque: reposições + vendas (saídas) + movimentações da sessão. */
export function todosOsMovimentos(vendas: Venda[], produtos: Produto[]): Movimento[] {
  const saidasDeVenda = vendas.flatMap((v) =>
    v.itens.map<Movimento>((i) => ({
      data: v.data,
      lojaId: v.lojaId,
      sku: i.sku,
      categoria: i.categoria,
      tipo: "Saída",
      quantidade: i.quantidade,
    })),
  );
  const daSessao = produtos.flatMap((p) =>
    p.movimentacoes
      .filter((m) => m.tipo === "Entrada" || m.tipo === "Saída" || m.tipo === "Transferência")
      .map<Movimento>((m) => ({
        data: m.data,
        lojaId: m.lojaId,
        sku: p.sku,
        categoria: p.categoria,
        tipo: m.quantidade >= 0 ? "Entrada" : "Saída",
        quantidade: Math.abs(m.quantidade),
      })),
  );
  return [...entradasSimuladas, ...saidasDeVenda, ...daSessao];
}

// ===================== Filtros e agregações =====================

export type Recorte = {
  inicio: string;
  fim: string;
  lojaIds?: string[]; // vazio/undefined = todas
  categoria?: string;
  canal?: string;
};

const naLoja = (r: Recorte, lojaId: string) => !r.lojaIds?.length || r.lojaIds.includes(lojaId);
const noPeriodo = (r: Recorte, data: string) => data >= r.inicio && data <= r.fim;

/** Vendas do recorte; com filtro de categoria, cada pedido mantém só os itens da categoria. */
export function filtrarVendas(vendas: Venda[], r: Recorte): Venda[] {
  return vendas
    .filter((v) => noPeriodo(r, v.data) && naLoja(r, v.lojaId) && (!r.canal || v.canal === r.canal))
    .map((v) => (r.categoria ? { ...v, itens: v.itens.filter((i) => i.categoria === r.categoria) } : v))
    .filter((v) => v.itens.length > 0);
}

export const totalVenda = (v: Venda) => v.itens.reduce((s, i) => s + i.valor * i.quantidade, 0);

export function resumoVendas(vendas: Venda[]) {
  const faturamento = vendas.reduce((s, v) => s + totalVenda(v), 0);
  const pecas = vendas.reduce((s, v) => s + v.itens.reduce((t, i) => t + i.quantidade, 0), 0);
  const online = vendas.filter((v) => v.canal === "Online").reduce((s, v) => s + totalVenda(v), 0);
  return {
    faturamento,
    pedidos: vendas.length,
    ticket: vendas.length ? faturamento / vendas.length : 0,
    pecas,
    online: faturamento ? online / faturamento : 0,
  };
}

export function filtrarAtendimentos(lista: Atendimento[], r: Recorte & { motivo?: string }) {
  return lista.filter(
    (a) =>
      noPeriodo(r, a.data) &&
      naLoja(r, a.lojaId) &&
      (!r.canal || a.canal === r.canal) &&
      (!r.motivo || a.motivo === r.motivo),
  );
}

export function resumoAtendimentos(lista: Atendimento[]) {
  const respondidos = lista.filter((a) => a.respostaHoras !== null);
  return {
    total: lista.length,
    resolvidos: lista.filter((a) => a.resolvido).length,
    taxaResolucao: lista.length ? lista.filter((a) => a.resolvido).length / lista.length : 0,
    respostaMedia: respondidos.length
      ? respondidos.reduce((s, a) => s + a.respostaHoras!, 0) / respondidos.length
      : null,
  };
}

export function filtrarMovimentos(lista: Movimento[], r: Recorte) {
  return lista.filter(
    (m) => noPeriodo(r, m.data) && naLoja(r, m.lojaId) && (!r.categoria || m.categoria === r.categoria),
  );
}

/** Variação percentual entre dois valores (null quando não há base de comparação). */
export const variacao = (atual: number, anterior: number) =>
  anterior > 0 ? (atual - anterior) / anterior : null;

// ===================== Séries temporais =====================

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type Balde = { inicio: string; fim: string; rotulo: string };

/**
 * Divide o período em blocos de mesmo tamanho — dias (7), 3 dias (30), 10 dias (90) —
 * ou em meses (12 meses), marcando como "parcial" o mês que não está completo.
 */
export function baldes(periodo: Periodo): Balde[] {
  const { inicio, fim } = intervalos(periodo).atual;
  const lista: Balde[] = [];
  if (periodo <= 90) {
    const passo = periodo === 7 ? 1 : periodo === 30 ? 3 : 10;
    for (let d = inicio; d <= fim; d = addDias(d, passo)) {
      const f = addDias(d, passo - 1) > fim ? fim : addDias(d, passo - 1);
      lista.push({ inicio: d, fim: f, rotulo: `${d.slice(8, 10)}/${d.slice(5, 7)}` });
    }
  } else {
    let d = inicio;
    while (d <= fim) {
      const proximo = new Date(`${d.slice(0, 7)}-01T00:00:00Z`);
      proximo.setUTCMonth(proximo.getUTCMonth() + 1);
      const f = addDias(proximo.toISOString().slice(0, 10), -1);
      const parcial = d.slice(8, 10) !== "01" || f > fim;
      lista.push({
        inicio: d,
        fim: f > fim ? fim : f,
        rotulo: `${MESES[mes(d) - 1]}/${d.slice(2, 4)}${parcial ? "*" : ""}`,
      });
      d = proximo.toISOString().slice(0, 10);
    }
  }
  return lista;
}

export function serie<T extends { data: string }>(lista: T[], bs: Balde[], valor: (itens: T[]) => number) {
  return bs.map((b) => valor(lista.filter((x) => x.data >= b.inicio && x.data <= b.fim)));
}

// ===================== Estoque =====================

/** Média diária de saída por peça e loja nos últimos 30 dias. */
export function giroDiario(movimentos: Movimento[], lojaId: string) {
  const inicio = addDias(HOJE, -30);
  const mapa = new Map<string, number>();
  movimentos
    .filter((m) => m.tipo === "Saída" && m.lojaId === lojaId && m.data >= inicio)
    .forEach((m) => mapa.set(m.sku, (mapa.get(m.sku) ?? 0) + m.quantidade));
  mapa.forEach((v, k) => mapa.set(k, v / 30));
  return mapa;
}

// ===================== Cores =====================

/**
 * Cor de cada unidade nos comparativos — fixa por loja (nunca pela posição na tela),
 * validada para daltonismo. Lojas criadas depois ficam em cinza neutro.
 */
const coresUnidade = ["#1f2a48", "#b46746", "#4a7ba0"];
export const corDaLoja = (lojaId: string) => coresUnidade[lojas.findIndex((l) => l.id === lojaId)] ?? "#5e6b89";

/** Série única usa a cor da marca. */
export const COR_MARCA = "#1f2a48";
export const CORES_DUAS_SERIES = ["#4a7ba0", "#b46746"] as const;
