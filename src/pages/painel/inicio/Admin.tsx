import {
  CartaoGrafico,
  GraficoBarras,
  GraficoLinhas,
  Variacao,
  horasFmt,
  moedaCompacta,
  pct,
  type Serie,
} from "@/components/graficos";
import { Metrica, cn } from "@/components/ui";
import { useDashboardRede, type DadosRede } from "@/hooks/useDashboardRede";
import { COR_MARCA, baldes, serie, variacao, type Periodo } from "@/lib/analise";
import { moeda } from "@/lib/dados";
import { pendenciasDoGerente } from "@/lib/gerenciaUi";
import { BarraFiltros, Cabecalho, FiltroSelect, Pendencias, SeletorUnidades, useFiltros } from "./comum";

const CANAIS_DE_VENDA = ["loja", "online"];
const CORES_DAS_UNIDADES = ["#1f2a48", "#b46746", "#4a7ba0", "#5f8a5a", "#8a6bb0", "#b08a3c"];

/** Admin: visão geral da rede, tudo vindo da API; marque unidades para compará-las lado a lado. */
export function DashboardAdmin() {
  const f = useFiltros();
  const { inicio, fim } = f.intervalo.atual;
  const canal = CANAIS_DE_VENDA.includes(f.canal) ? f.canal : undefined;
  const { dados, carregando, erro, recarregar } = useDashboardRede({
    inicio,
    fim,
    idsLoja: f.lojaIds,
    categoria: f.categoria || undefined,
    canal,
  });
  const opcoes = dados?.rede.opcoes;
  const unidades = (opcoes?.lojas ?? []).map((l, i) => ({
    id: l.id_loja,
    nome: l.nome,
    cor: CORES_DAS_UNIDADES[i % CORES_DAS_UNIDADES.length]!,
  }));

  return (
    <div>
      <Cabecalho descricao="Visão geral da rede. Marque unidades para compará-las lado a lado." />
      {dados ? <Pendencias itens={pendenciasDoGerente(dados.pendencias)} /> : null}

      <BarraFiltros filtros={f}>
        <SeletorUnidades filtros={f} unidades={unidades} />
        <FiltroSelect
          rotulo="Categoria"
          valor={f.categoria}
          onChange={(v) => f.definir("categoria", v)}
          opcoes={opcoes?.categorias ?? []}
          todos="Todas"
        />
        <FiltroSelect
          rotulo="Canal de venda"
          valor={canal ?? ""}
          onChange={(v) => f.definir("canal", v)}
          opcoes={(opcoes?.canais ?? []).map((c) => ({ value: c.codigo, label: c.nome }))}
        />
      </BarraFiltros>

      {erro ? (
        <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-sm border border-perigo/40 bg-papel p-4 text-sm">
          <span>{erro}</span>
          <button onClick={recarregar} className="shrink-0 text-xs font-semibold text-marinho">
            Tentar de novo
          </button>
        </div>
      ) : null}

      {!dados ? (
        erro ? null : <p className="py-16 text-center text-sm text-suave">Carregando os dados da rede…</p>
      ) : (
        <div aria-busy={carregando} className={carregando ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <Painel dados={dados} periodo={f.periodo} cores={Object.fromEntries(unidades.map((u) => [u.id, u.cor]))} />
        </div>
      )}
    </div>
  );
}

function Painel({ dados, periodo, cores }: { dados: DadosRede; periodo: Periodo; cores: Record<string, string> }) {
  const { rede } = dados;
  const { atual, anterior, atendimento, estoque } = rede;
  const comparando = rede.grupos.length > 1 || rede.grupos[0]?.id_loja != null;
  const bs = baldes(periodo);
  const cor = (id: string | null) => (id ? (cores[id] ?? "#5e6b89") : COR_MARCA);

  // Evolução do faturamento: uma linha por grupo (a rede, ou cada unidade marcada).
  const seriesTempo: Serie[] = rede.grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    cor: cor(g.id_loja),
    valores: serie(g.serie_diaria, bs, (xs) => xs.reduce((s, x) => s + x.faturamento, 0)),
  }));

  // Vendas por categoria: união das categorias de todos os grupos, da maior para a menor.
  const categorias = Array.from(new Set(rede.grupos.flatMap((g) => g.categorias.map((c) => c.categoria))));
  const valorCategoria = (g: (typeof rede.grupos)[number], c: string) =>
    g.categorias.find((x) => x.categoria === c)?.faturamento ?? 0;
  const totalCategoria = (c: string) => rede.grupos.reduce((s, g) => s + valorCategoria(g, c), 0);
  const ordemCat = [...categorias].sort((a, b) => totalCategoria(b) - totalCategoria(a));
  const seriesCategoria: Serie[] = rede.grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    cor: cor(g.id_loja),
    valores: ordemCat.map((c) => valorCategoria(g, c)),
  }));

  // Chamados por motivo (categorias de atendimento do banco).
  const motivos = rede.grupos[0]?.motivos ?? [];
  const seriesMotivo: Serie[] = rede.grupos.map((g) => ({
    id: g.id,
    nome: g.nome,
    cor: cor(g.id_loja),
    valores: motivos.map((m) => g.motivos.find((x) => x.codigo === m.codigo)?.total ?? 0),
  }));

  const linhas = rede.unidades;
  const maiorFat = Math.max(1, ...linhas.map((l) => l.faturamento));
  const melhor = (campo: "faturamento" | "ticket_medio" | "participacao_online") => {
    const alvo = Math.max(...linhas.map((l) => l[campo]));
    return (v: number) => linhas.length > 1 && v === alvo && alvo > 0;
  };

  const top = rede.pecas_mais_vendidas;
  const respostaAtual = atendimento.atual.resposta_media_horas;
  const respostaAnterior = atendimento.anterior.resposta_media_horas;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metrica rotulo="Faturamento" valor={moedaCompacta(atual.faturamento)} extra={<Variacao valor={variacao(atual.faturamento, anterior.faturamento)} />} />
        <Metrica rotulo="Pedidos" valor={atual.pedidos.toLocaleString("pt-BR")} extra={<Variacao valor={variacao(atual.pedidos, anterior.pedidos)} />} />
        <Metrica rotulo="Ticket médio" valor={moeda(atual.ticket_medio)} extra={<Variacao valor={variacao(atual.ticket_medio, anterior.ticket_medio)} />} />
        <Metrica rotulo="Peças vendidas" valor={atual.pecas.toLocaleString("pt-BR")} extra={<Variacao valor={variacao(atual.pecas, anterior.pecas)} />} />
        <Metrica rotulo="Venda online" valor={pct(atual.participacao_online)} nota="do faturamento no período" />
        <Metrica rotulo="Unidades em estoque" valor={estoque.unidades.toLocaleString("pt-BR")} nota="posição de agora" to="/painel/estoque" />
        <Metrica
          rotulo="Peças esgotadas"
          valor={estoque.pecas_esgotadas}
          nota={`de ${estoque.pecas} no catálogo`}
          to="/painel/estoque"
          destaque={estoque.pecas_esgotadas > 0}
        />
        <Metrica
          rotulo="Primeira resposta"
          valor={respostaAtual === null ? "—" : horasFmt(respostaAtual)}
          extra={<Variacao valor={respostaAtual && respostaAnterior ? variacao(respostaAtual, respostaAnterior) : null} inverter />}
        />
      </div>

      <CartaoGrafico
        className="mb-6"
        titulo="Faturamento ao longo do tempo"
        subtitulo={comparando ? "Uma linha por unidade selecionada" : "Rede consolidada"}
        tabela={{
          cabecalho: ["Período", ...seriesTempo.map((s) => s.nome)],
          linhas: bs.map((b, i) => [b.rotulo, ...seriesTempo.map((s) => moeda(s.valores[i]!))]),
        }}
      >
        <GraficoLinhas rotulos={bs.map((b) => b.rotulo)} series={seriesTempo} formatar={moedaCompacta} />
      </CartaoGrafico>

      <section className="mb-6 rounded-sm border border-linha bg-papel">
        <header className="px-5 pt-4">
          <h2 className="font-sans text-sm font-semibold">Comparativo entre unidades</h2>
          <p className="mt-0.5 text-xs text-suave">
            {comparando ? "Unidades selecionadas" : "Todas as unidades"} · o melhor resultado de cada coluna aparece em negrito
          </p>
        </header>
        <div className="overflow-x-auto px-5 pb-4 pt-3">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.12em] text-suave">
                {["Unidade", "Faturamento", "Variação", "Pedidos", "Ticket médio", "Online", "Estoque", "Esgotadas", "Chamados abertos", "Primeira resposta"].map((c, i) => (
                  <th key={i} className={cn("border-b border-linha py-2 pr-3 font-semibold", i > 0 && "text-right")}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id_loja} className="border-b border-linha/60">
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: cor(l.id_loja) }} />
                      {l.nome}
                    </span>
                    {l.cidade ? <span className="ml-[18px] text-xs text-suave">{l.cidade}</span> : null}
                  </td>
                  <td className={cn("py-3 pr-3 text-right tabular-nums", melhor("faturamento")(l.faturamento) && "font-bold")}>
                    {moeda(l.faturamento)}
                    <span className="mt-1 ml-auto block h-1 w-full max-w-28 overflow-hidden rounded-full bg-areia">
                      <span className="block h-full rounded-full" style={{ width: `${(l.faturamento / maiorFat) * 100}%`, background: cor(l.id_loja) }} />
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Variacao valor={variacao(l.faturamento, l.faturamento_anterior)} curto />
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{l.pedidos}</td>
                  <td className={cn("py-3 pr-3 text-right tabular-nums", melhor("ticket_medio")(l.ticket_medio) && "font-bold")}>{moeda(l.ticket_medio)}</td>
                  <td className={cn("py-3 pr-3 text-right tabular-nums", melhor("participacao_online")(l.participacao_online) && "font-bold")}>{pct(l.participacao_online)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{l.unidades_em_estoque}</td>
                  <td className={cn("py-3 pr-3 text-right tabular-nums", l.pecas_esgotadas > 0 && "text-perigo")}>{l.pecas_esgotadas}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{l.chamados_abertos}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{l.resposta_media_horas === null ? "—" : horasFmt(l.resposta_media_horas)}</td>
                </tr>
              ))}
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-sm text-suave">
                    Nenhuma unidade encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico
          titulo="Vendas por categoria"
          subtitulo="Faturamento no período"
          tabela={{
            cabecalho: ["Categoria", ...seriesCategoria.map((s) => s.nome)],
            linhas: ordemCat.map((c, i) => [c, ...seriesCategoria.map((s) => moeda(s.valores[i]!))]),
          }}
        >
          <GraficoBarras categorias={ordemCat} series={seriesCategoria} formatar={moedaCompacta} />
        </CartaoGrafico>

        <CartaoGrafico
          titulo="Chamados por motivo"
          subtitulo="Abertos no período"
          tabela={{ cabecalho: ["Motivo", ...seriesMotivo.map((s) => s.nome)], linhas: motivos.map((m, i) => [m.nome, ...seriesMotivo.map((s) => s.valores[i]!)]) }}
        >
          <GraficoBarras categorias={motivos.map((m) => m.nome)} series={seriesMotivo} formatar={(n) => n.toLocaleString("pt-BR")} />
        </CartaoGrafico>

        <CartaoGrafico
          titulo="Peças mais vendidas"
          subtitulo={comparando ? "Somando as unidades selecionadas" : "Na rede"}
          tabela={{ cabecalho: ["Peça", "Unidades"], linhas: top.map((p) => [p.nome, p.unidades]) }}
        >
          <GraficoBarras
            categorias={top.map((p) => p.nome)}
            series={[{ id: "un", nome: "Unidades", cor: COR_MARCA, valores: top.map((p) => p.unidades) }]}
            formatar={(n) => `${n} un.`}
          />
        </CartaoGrafico>

        <CartaoGrafico titulo="Atendimento no período" subtitulo={comparando ? "Unidades selecionadas" : "Rede"}>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-linha">
            {(
              [
                ["Chamados recebidos", atendimento.atual.total.toLocaleString("pt-BR"), <Variacao key="v" valor={variacao(atendimento.atual.total, atendimento.anterior.total)} inverter />],
                ["Taxa de resolução", pct(atendimento.atual.taxa_resolucao), null],
                ["Primeira resposta (média)", respostaAtual === null ? "—" : horasFmt(respostaAtual), null],
                ["Em aberto agora", atendimento.abertos_agora, null],
              ] as const
            ).map(([k, v, extra]) => (
              <div key={k} className="bg-papel p-4">
                <dt className="rotulo !text-[9px]">{k}</dt>
                <dd className="mt-1 font-display text-3xl text-marinho">{v}</dd>
                {extra}
              </div>
            ))}
          </dl>
        </CartaoGrafico>
      </div>
    </>
  );
}
