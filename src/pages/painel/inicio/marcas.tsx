import { CartaoGrafico, GraficoLinhas, Variacao, moedaCompacta, pct } from "@/components/graficos";
import { variacao } from "@/lib/analise";
import { moeda } from "@/lib/dados";
import type { MesDaMarca, VendasDaMarca } from "@/lib/gerenciaApi";

/** Cor de cada marca nos gráficos: azul-aço para a Casa Lorenzi, preto Vulto para a Vulto. */
const COR_DA_MARCA: Record<string, string> = { "casa lorenzi": "#4a7ba0", vulto: "#111111" };
const COR_OUTRA = "#5e6b89";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "casa lorenzi" -> "Casa Lorenzi" (as marcas vêm do banco em minúsculas). */
export const nomeDaMarca = (marca: string) => marca.replace(/(^|\s)\S/g, (l) => l.toUpperCase());

/** "2025-11-01" -> "nov/25". */
const rotuloDoMes = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`;

/** Monta uma série por marca, mês a mês (mês sem venda da marca vale zero). */
export function seriesPorMarca(evolucao: MesDaMarca[]) {
  const meses = Array.from(new Set(evolucao.map((m) => m.mes))).sort();
  const marcas = Array.from(new Set(evolucao.map((m) => m.marca))).sort();
  const valor = new Map(evolucao.map((m) => [`${m.mes}|${m.marca}`, m.faturamento]));
  return {
    rotulos: meses.map(rotuloDoMes),
    series: marcas.map((marca) => ({
      id: marca,
      nome: nomeDaMarca(marca),
      cor: COR_DA_MARCA[marca] ?? COR_OUTRA,
      valores: meses.map((mes) => valor.get(`${mes}|${marca}`) ?? 0),
    })),
  };
}

/**
 * Vendas por marca (pela marca da peça vendida) e a evolução mês a mês dos últimos 12 meses. O
 * gerente vê a própria unidade; o admin, a rede ou as unidades marcadas.
 */
export function PainelMarcas({ marcas, evolucao }: { marcas: VendasDaMarca[]; evolucao: MesDaMarca[] }) {
  const total = marcas.reduce((s, m) => s + m.faturamento, 0);
  const { rotulos, series } = seriesPorMarca(evolucao);
  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
      <CartaoGrafico
        titulo="Vendas por marca"
        subtitulo="Pela marca da peça vendida, no período"
        tabela={{
          cabecalho: ["Marca", "Faturamento", "Pedidos", "Peças"],
          linhas: marcas.map((m) => [nomeDaMarca(m.marca), moeda(m.faturamento), m.pedidos, m.pecas]),
        }}
      >
        <div className="space-y-4 pt-2">
          {marcas.map((m) => {
            const parte = total ? m.faturamento / total : 0;
            const cor = COR_DA_MARCA[m.marca] ?? COR_OUTRA;
            return (
              <div key={m.marca}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cor }} />
                    {nomeDaMarca(m.marca)}
                  </span>
                  <span className="flex items-baseline gap-2 tabular-nums">
                    {moedaCompacta(m.faturamento)}
                    <span className="text-suave">{pct(parte)}</span>
                    <Variacao valor={variacao(m.faturamento, m.faturamento_anterior)} curto />
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-areia">
                  <div className="h-full rounded-r-[4px]" style={{ width: `${parte * 100}%`, background: cor }} />
                </div>
                <p className="mt-1 text-xs text-suave">
                  {m.pedidos.toLocaleString("pt-BR")} pedidos · {m.pecas.toLocaleString("pt-BR")} peças
                </p>
              </div>
            );
          })}
          {marcas.length === 0 ? <p className="text-sm text-suave">Sem vendas no período.</p> : null}
        </div>
      </CartaoGrafico>

      <CartaoGrafico
        titulo="Evolução por marca"
        subtitulo="Faturamento mês a mês, últimos 12 meses"
        tabela={{
          cabecalho: ["Mês", ...series.map((s) => s.nome)],
          linhas: rotulos.map((r, i) => [r, ...series.map((s) => moeda(s.valores[i]!))]),
        }}
      >
        {rotulos.length ? (
          <GraficoLinhas rotulos={rotulos} series={series} formatar={moedaCompacta} />
        ) : (
          <p className="py-10 text-center text-sm text-suave">Sem vendas nos últimos 12 meses.</p>
        )}
      </CartaoGrafico>
    </div>
  );
}
