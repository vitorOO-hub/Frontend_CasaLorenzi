import { Link } from "react-router-dom";
import { CartaoGrafico, GraficoBarras, GraficoLinhas, Variacao, horasFmt, pct } from "@/components/graficos";
import { Badge, Metrica } from "@/components/ui";
import { useDashboardAtendimento } from "@/hooks/useDashboardAtendimento";
import { COR_MARCA, baldes, serie, variacao } from "@/lib/analise";
import type { DashboardAtendimento, ItemFila } from "@/lib/atendimentoApi";
import { useSessao } from "@/lib/sessao";
import { BarraFiltros, Cabecalho, FiltroSelect, useFiltros } from "./comum";
import { DashboardAtendenteDemo } from "./AtendenteDemo";

const tomPrioridade = { urgente: "perigo", alta: "perigo", media: "alerta", baixa: "neutro" } as const;

const dataHoraBR = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Início do atendente: conta real consulta a API; acesso de demonstração mostra dados simulados. */
export function DashboardAtendente() {
  const sessao = useSessao();
  return sessao?.tipo === "interno" && sessao.real ? <DashboardAtendenteReal /> : <DashboardAtendenteDemo />;
}

function DashboardAtendenteReal() {
  const f = useFiltros();
  const { inicio, fim } = f.intervalo.atual;
  const { dados, carregando, erro, recarregar } = useDashboardAtendimento({
    inicio,
    fim,
    idLoja: f.loja || undefined,
    canal: f.canal || undefined,
    categoria: f.motivo || undefined,
  });

  const d = dados?.dashboard;
  const fila = dados?.fila;
  const loja = d?.opcoes.lojas.find((l) => l.id_loja === (d.escopo.id_loja ?? f.loja));

  return (
    <div>
      <Cabecalho descricao={`Atendimento · todos os canais · ${loja ? loja.nome : "todas as casas"}`} />

      <BarraFiltros filtros={f}>
        {d?.escopo.pode_escolher_loja ? (
          <FiltroSelect
            rotulo="Loja"
            valor={f.loja}
            onChange={(v) => f.definir("loja", v)}
            opcoes={d.opcoes.lojas.map((l) => ({ value: l.id_loja, label: l.nome }))}
            todos="Todas"
          />
        ) : null}
        <FiltroSelect
          rotulo="Canal"
          valor={f.canal}
          onChange={(v) => f.definir("canal", v)}
          opcoes={(d?.opcoes.canais ?? []).map((c) => ({ value: c.codigo, label: c.nome }))}
        />
        <FiltroSelect
          rotulo="Motivo"
          valor={f.motivo}
          onChange={(v) => f.definir("motivo", v)}
          opcoes={(d?.opcoes.categorias ?? []).map((c) => ({ value: c.codigo, label: c.nome }))}
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

      {!d || !fila ? (
        erro ? null : <p className="py-16 text-center text-sm text-suave">Carregando os dados do atendimento…</p>
      ) : (
        <div aria-busy={carregando} className={carregando ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <Painel d={d} fila={fila} periodo={f.periodo} />
        </div>
      )}
    </div>
  );
}

function Painel({
  d,
  fila,
  periodo,
}: {
  d: DashboardAtendimento;
  fila: { total_aberto: number; sem_resposta: number; urgentes: number; itens: ItemFila[] };
  periodo: Parameters<typeof baldes>[0];
}) {
  const bs = baldes(periodo);
  const volume = serie(d.volume_diario, bs, (xs) => xs.reduce((soma, x) => soma + x.total, 0));
  const { atual, anterior } = d;
  const categorias = d.por_categoria.map((c) => c.nome);
  const porCategoria = d.por_categoria.map((c) => c.total);
  const canais = d.resposta_por_canal.map((c) => c.nome);
  const respostaCanal = d.resposta_por_canal.map((c) => c.resposta_media_horas ?? 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metrica
          rotulo="Sem resposta agora"
          valor={fila.sem_resposta}
          nota={`${fila.total_aberto} em aberto · ${fila.urgentes} urgentes`}
          to="/painel/atendimento"
          destaque={fila.sem_resposta > 0}
        />
        <Metrica
          rotulo="Chamados recebidos"
          valor={atual.total}
          extra={<Variacao valor={variacao(atual.total, anterior.total)} inverter />}
        />
        <Metrica
          rotulo="Primeira resposta (média)"
          valor={atual.resposta_media_horas === null ? "—" : horasFmt(atual.resposta_media_horas)}
          extra={
            <Variacao
              valor={
                atual.resposta_media_horas && anterior.resposta_media_horas
                  ? variacao(atual.resposta_media_horas, anterior.resposta_media_horas)
                  : null
              }
              inverter
            />
          }
        />
        <Metrica
          rotulo="Taxa de resolução"
          valor={pct(atual.taxa_resolucao)}
          nota={`${atual.resolvidos} resolvidos no período`}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <CartaoGrafico
          titulo="Chamados recebidos ao longo do tempo"
          tabela={{ cabecalho: ["Período", "Chamados"], linhas: bs.map((b, i) => [b.rotulo, volume[i]!]) }}
        >
          <GraficoLinhas
            rotulos={bs.map((b) => b.rotulo)}
            series={[{ id: "v", nome: "Chamados", cor: COR_MARCA, valores: volume }]}
            formatar={(n) => String(Math.round(n))}
          />
        </CartaoGrafico>

        <section className="rounded-sm border border-linha bg-papel">
          <header className="flex items-start justify-between px-5 pt-4">
            <div>
              <h2 className="font-sans text-sm font-semibold">Próximos da fila</h2>
              <p className="mt-0.5 text-xs text-suave">Prioridade primeiro, depois os mais antigos</p>
            </div>
            <Link to="/painel/atendimento" className="text-xs font-semibold text-marinho">
              Ver fila
            </Link>
          </header>
          <ul className="divide-y divide-linha px-5 pb-2 pt-2">
            {fila.itens.slice(0, 6).map((c) => (
              <li key={c.id_atendimento} className="flex items-center gap-3 py-3 text-sm">
                <Badge tom={tomPrioridade[c.prioridade_codigo as keyof typeof tomPrioridade] ?? "neutro"}>
                  {c.prioridade}
                </Badge>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.assunto}</span>
                  <span className="text-xs text-suave">
                    {c.cliente_nome} · {c.canal} · desde {dataHoraBR(c.aberto_em)}
                  </span>
                </span>
                {c.sem_resposta ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-perigo">Sem resposta</span>
                ) : null}
              </li>
            ))}
            {fila.itens.length === 0 ? <li className="py-6 text-center text-sm text-suave">Fila zerada.</li> : null}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico
          titulo="Por motivo"
          subtitulo="Chamados recebidos no período"
          tabela={{ cabecalho: ["Motivo", "Chamados"], linhas: categorias.map((m, i) => [m, porCategoria[i]!]) }}
        >
          <GraficoBarras
            categorias={categorias}
            series={[{ id: "m", nome: "Chamados", cor: COR_MARCA, valores: porCategoria }]}
            formatar={String}
          />
        </CartaoGrafico>
        <CartaoGrafico
          titulo="Tempo até a primeira resposta, por canal"
          subtitulo="Média no período — quanto menor, melhor"
          tabela={{
            cabecalho: ["Canal", "Primeira resposta"],
            linhas: canais.map((c, i) => [c, respostaCanal[i] ? horasFmt(respostaCanal[i]!) : "—"]),
          }}
        >
          <GraficoBarras
            categorias={canais}
            series={[{ id: "r", nome: "Primeira resposta", cor: COR_MARCA, valores: respostaCanal }]}
            formatar={(n) => (n ? horasFmt(n) : "—")}
          />
        </CartaoGrafico>
      </div>
    </>
  );
}
