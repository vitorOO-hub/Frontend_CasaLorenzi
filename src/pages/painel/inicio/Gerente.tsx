import { Link } from "react-router-dom";
import {
  CartaoGrafico,
  GraficoBarras,
  GraficoColunas,
  GraficoLinhas,
  Variacao,
  horasFmt,
  moedaCompacta,
  pct,
} from "@/components/graficos";
import { Badge, Metrica } from "@/components/ui";
import { useDashboardGerente, type DadosGerente } from "@/hooks/useDashboardGerente";
import { COR_MARCA, baldes, serie, variacao, type Periodo } from "@/lib/analise";
import { moeda } from "@/lib/dados";
import {
  DIAS_DA_SEMANA,
  descricaoDaPeca,
  pedidosPorDiaDaSemana,
  pendenciasDoGerente,
  selosDaReposicao,
} from "@/lib/gerenciaUi";
import { BarraFiltros, Cabecalho, FiltroSelect, Pendencias, useFiltros } from "./comum";

const CANAIS_DE_VENDA = ["loja", "online"];

/** Gerente: vendas, estoque e atendimento da própria unidade, tudo vindo da API (escopo no servidor). */
export function DashboardGerente() {
  const f = useFiltros();
  const { inicio, fim } = f.intervalo.atual;
  // O filtro de canal compartilha a URL com o dashboard do atendente; aqui só valem os canais de venda.
  const canal = CANAIS_DE_VENDA.includes(f.canal) ? f.canal : undefined;
  const { dados, carregando, erro, recarregar } = useDashboardGerente({
    inicio,
    fim,
    categoria: f.categoria || undefined,
    canal,
  });
  const opcoes = dados?.vendas.opcoes;

  return (
    <div>
      <Cabecalho
        descricao={`Gestão da unidade · ${dados?.vendas.escopo.loja_nome ?? "carregando…"}`}
      />
      {dados ? <Pendencias itens={pendenciasDoGerente(dados.pendencias)} /> : null}

      <BarraFiltros filtros={f}>
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
        erro ? null : <p className="py-16 text-center text-sm text-suave">Carregando os dados da unidade…</p>
      ) : (
        <div aria-busy={carregando} className={carregando ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <Painel dados={dados} periodo={f.periodo} />
        </div>
      )}
    </div>
  );
}

function Painel({ dados, periodo }: { dados: DadosGerente; periodo: Periodo }) {
  const { vendas, reposicao, chamados } = dados;
  const { atual, anterior } = vendas;
  const bs = baldes(periodo);
  const faturamento = serie(vendas.serie_diaria, bs, (xs) => xs.reduce((soma, x) => soma + x.faturamento, 0));
  const porDia = pedidosPorDiaDaSemana(vendas.movimento_semana);
  const top = vendas.pecas_mais_vendidas;
  const motivos = chamados.por_categoria;
  const respostaAtual = chamados.atual.resposta_media_horas;
  const respostaAnterior = chamados.anterior.resposta_media_horas;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metrica
          rotulo="Faturamento"
          valor={moedaCompacta(atual.faturamento)}
          extra={<Variacao valor={variacao(atual.faturamento, anterior.faturamento)} />}
        />
        <Metrica rotulo="Pedidos" valor={atual.pedidos} extra={<Variacao valor={variacao(atual.pedidos, anterior.pedidos)} />} />
        <Metrica
          rotulo="Ticket médio"
          valor={moeda(atual.ticket_medio)}
          extra={<Variacao valor={variacao(atual.ticket_medio, anterior.ticket_medio)} />}
        />
        <Metrica
          rotulo="Primeira resposta"
          valor={respostaAtual === null ? "—" : horasFmt(respostaAtual)}
          extra={<Variacao valor={respostaAtual && respostaAnterior ? variacao(respostaAtual, respostaAnterior) : null} inverter />}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <CartaoGrafico
          titulo="Faturamento ao longo do tempo"
          subtitulo={`Venda online: ${pct(atual.participacao_online)} do total`}
          tabela={{ cabecalho: ["Período", "Faturamento"], linhas: bs.map((b, i) => [b.rotulo, moeda(faturamento[i]!)]) }}
        >
          <GraficoLinhas
            rotulos={bs.map((b) => b.rotulo)}
            series={[{ id: "fat", nome: "Faturamento", cor: COR_MARCA, valores: faturamento }]}
            formatar={moedaCompacta}
          />
        </CartaoGrafico>
        <CartaoGrafico
          titulo="Movimento por dia da semana"
          subtitulo="Média de pedidos por dia — apoio à escala da equipe"
          tabela={{ cabecalho: ["Dia", "Pedidos/dia"], linhas: DIAS_DA_SEMANA.map((d, i) => [d, porDia[i]!.toFixed(1)]) }}
        >
          <GraficoColunas
            rotulos={DIAS_DA_SEMANA}
            series={[{ id: "ped", nome: "Pedidos por dia", cor: COR_MARCA, valores: porDia }]}
            formatar={(n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            altura={200}
          />
        </CartaoGrafico>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico
          titulo="Peças mais vendidas"
          tabela={{ cabecalho: ["Peça", "Unidades"], linhas: top.map((p) => [p.nome, p.unidades]) }}
        >
          <GraficoBarras
            categorias={top.map((p) => p.nome)}
            series={[{ id: "un", nome: "Unidades", cor: COR_MARCA, valores: top.map((p) => p.unidades) }]}
            formatar={(n) => `${n} un.`}
          />
        </CartaoGrafico>

        <section className="rounded-sm border border-linha bg-papel">
          <header className="flex items-start justify-between px-5 pt-4">
            <div>
              <h2 className="font-sans text-sm font-semibold">Reposição prioritária</h2>
              <p className="mt-0.5 text-xs text-suave">Peças que acabam primeiro, pelo ritmo de venda dos últimos 30 dias</p>
            </div>
            <Link to="/painel/estoque/transferencias" className="text-xs font-semibold text-marinho">
              Pedir reposição
            </Link>
          </header>
          <ul className="divide-y divide-linha px-5 pb-2 pt-2">
            {reposicao.itens.map((item) => {
              const selo = selosDaReposicao(item);
              return (
                <li key={item.id_variacao} className="flex items-center gap-3 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{descricaoDaPeca(item)}</span>
                    <span className="font-mono text-[11px] text-suave">{item.sku}</span>
                  </span>
                  <span className="text-xs tabular-nums text-suave">
                    {item.saldo} un. · mín. {item.minimo}
                  </span>
                  <Badge tom={selo.tom}>{selo.texto}</Badge>
                </li>
              );
            })}
            {reposicao.itens.length === 0 ? <li className="py-6 text-center text-sm text-suave">Estoque confortável.</li> : null}
          </ul>
          {reposicao.total > reposicao.itens.length ? (
            <p className="border-t border-linha px-5 py-2 text-xs text-suave">
              Mostrando {reposicao.itens.length} de {reposicao.total} peças que precisam de atenção.
            </p>
          ) : null}
        </section>

        <CartaoGrafico
          titulo="Chamados da unidade por motivo"
          subtitulo={`${chamados.atual.total} no período · ${pct(chamados.atual.taxa_resolucao)} resolvidos`}
          tabela={{ cabecalho: ["Motivo", "Chamados"], linhas: motivos.map((m) => [m.nome, m.total]) }}
        >
          <GraficoBarras
            categorias={motivos.map((m) => m.nome)}
            series={[{ id: "ch", nome: "Chamados", cor: COR_MARCA, valores: motivos.map((m) => m.total) }]}
            formatar={(n) => String(n)}
          />
        </CartaoGrafico>

        <CartaoGrafico titulo="Mix de venda" subtitulo="Loja física × online, no período">
          <div className="space-y-4 pt-2">
            {(
              [
                ["Loja física", 1 - atual.participacao_online, "#4a7ba0"],
                ["Online", atual.participacao_online, "#b46746"],
              ] as const
            ).map(([rotulo, v, cor]) => (
              <div key={rotulo}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cor }} />
                    {rotulo}
                  </span>
                  <span className="tabular-nums">
                    {pct(v)} · <span className="text-suave">{moeda(atual.faturamento * v)}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-areia">
                  <div className="h-full rounded-r-[4px]" style={{ width: `${v * 100}%`, background: cor }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-suave">
              {atual.pecas} peças vendidas em {atual.pedidos} pedidos.
            </p>
          </div>
        </CartaoGrafico>
      </div>
    </>
  );
}
