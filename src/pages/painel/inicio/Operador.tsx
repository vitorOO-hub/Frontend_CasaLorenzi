import { Link } from "react-router-dom";
import { CartaoGrafico, GraficoBarras, GraficoColunas, Variacao } from "@/components/graficos";
import { AvisoErro, Badge, Metrica, cn } from "@/components/ui";
import { useMovimentacoesEstoque, useOpcoesEstoque, useSaldoEstoque, useTransferencias } from "@/hooks/useEstoquePainel";
import { CORES_DUAS_SERIES, COR_MARCA, baldes, serie, variacao } from "@/lib/analise";
import { detalheDaPeca } from "@/lib/estoquePainelUi";
import type { ItemMovimentacao, ItemSaldo } from "@/lib/estoquePainelApi";
import { BarraFiltros, Cabecalho, FiltroSelect, Pendencias, useFiltros } from "./comum";

const LIMITE_DASHBOARD = 200;
const LIMITE_MOVIMENTACOES = 500;

type MovimentoSerie = ItemMovimentacao & { data: string };

const dataDoMovimento = (m: ItemMovimentacao): MovimentoSerie => ({ ...m, data: m.data.slice(0, 10) });

const entradas = (lista: ItemMovimentacao[]) => lista.filter((m) => m.quantidade > 0).reduce((s, m) => s + m.quantidade, 0);
const saidas = (lista: ItemMovimentacao[]) => lista.filter((m) => m.quantidade < 0).reduce((s, m) => s + Math.abs(m.quantidade), 0);

function seloDaPeca(item: ItemSaldo) {
  if (item.total === 0) return { tom: "perigo" as const, texto: "Esgotada" };
  if (item.total <= item.minimo_total) return { tom: "alerta" as const, texto: "Repor" };
  return { tom: "ok" as const, texto: "OK" };
}

/** Operador: fluxo físico da loja, agora sincronizado com o banco pelas rotas do painel de estoque. */
export function DashboardOperador() {
  const f = useFiltros();
  const bs = baldes(f.periodo);
  const { inicio, fim } = f.intervalo.atual;
  const anterior = f.intervalo.anterior;

  const opcoes = useOpcoesEstoque();
  const saldo = useSaldoEstoque({
    categoria: f.categoria || undefined,
    limit: LIMITE_DASHBOARD,
    offset: 0,
  });
  const movimentosAtuais = useMovimentacoesEstoque({
    de: inicio,
    ate: fim,
    limit: LIMITE_MOVIMENTACOES,
    offset: 0,
  });
  const movimentosAnteriores = useMovimentacoesEstoque({
    de: anterior.inicio,
    ate: anterior.fim,
    limit: LIMITE_MOVIMENTACOES,
    offset: 0,
  });
  const transferenciasAcao = useTransferencias({ situacao: "acao", limit: 20, offset: 0 });
  const transferenciasAndamento = useTransferencias({ situacao: "andamento", limit: 50, offset: 0 });

  const itensSaldo = saldo.dados?.itens ?? [];
  const skusVisiveis = new Set(itensSaldo.map((p) => p.sku));
  const filtrarCategoria = (lista: ItemMovimentacao[]) =>
    f.categoria ? lista.filter((m) => skusVisiveis.has(m.sku)) : lista;

  const movAtual = filtrarCategoria(movimentosAtuais.dados?.itens ?? []);
  const movAnterior = filtrarCategoria(movimentosAnteriores.dados?.itens ?? []);
  const movSerie = movAtual.map(dataDoMovimento);
  const serieEntradas = serie(
    movSerie.filter((m) => m.quantidade > 0),
    bs,
    entradas,
  );
  const serieSaidas = serie(
    movSerie.filter((m) => m.quantidade < 0),
    bs,
    saidas,
  );

  const resumo = saldo.dados?.resumo;
  const loja = opcoes.dados?.escopo.loja_nome ?? saldo.dados?.lojas[0]?.nome ?? "carregando...";
  const erro = opcoes.erro ?? saldo.erro ?? movimentosAtuais.erro ?? movimentosAnteriores.erro ?? transferenciasAcao.erro ?? transferenciasAndamento.erro;
  const carregando = opcoes.carregando || saldo.carregando || movimentosAtuais.carregando || transferenciasAcao.carregando;
  const aguardando = transferenciasAcao.dados?.aguardando_voce ?? 0;
  const aReceber = (transferenciasAndamento.dados?.itens ?? []).filter((t) => t.status === "aceita" && t.acoes.includes("receber"));

  const fila = [...itensSaldo]
    .sort((a, b) => a.total / Math.max(1, a.minimo_total) - b.total / Math.max(1, b.minimo_total))
    .slice(0, 8);

  const porCategoria = Array.from(
    itensSaldo.reduce((mapa, p) => {
      const categoria = p.categoria ?? "Sem categoria";
      mapa.set(categoria, (mapa.get(categoria) ?? 0) + p.total);
      return mapa;
    }, new Map<string, number>()),
    ([categoria, total]) => ({ categoria, total }),
  ).sort((a, b) => b.total - a.total);

  return (
    <div>
      <Cabecalho descricao={`Estoque · ${loja}`} />
      <Pendencias
        itens={[
          { texto: "transferências e reposições aguardando você", valor: aguardando, to: "/painel/estoque/transferencias" },
        ]}
      />

      <BarraFiltros filtros={f}>
        <FiltroSelect
          rotulo="Categoria"
          valor={f.categoria}
          onChange={(v) => f.definir("categoria", v)}
          opcoes={opcoes.dados?.categorias ?? []}
          todos="Todas"
        />
      </BarraFiltros>

      <AvisoErro erro={erro} className="mb-4" />

      {!saldo.dados && !erro ? (
        <p className="py-16 text-center text-sm text-suave">Carregando o estoque da unidade...</p>
      ) : (
        <div aria-busy={carregando} className={carregando ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Metrica
              rotulo="Peças que entraram"
              valor={entradas(movAtual)}
              nota="unidades no período"
              extra={<Variacao valor={variacao(entradas(movAtual), entradas(movAnterior))} />}
            />
            <Metrica
              rotulo="Peças que saíram"
              valor={saidas(movAtual)}
              nota="vendas, transferências e ajustes"
              extra={<Variacao valor={variacao(saidas(movAtual), saidas(movAnterior))} />}
            />
            <Metrica
              rotulo="Abaixo do mínimo"
              valor={resumo?.estoque_baixo ?? "—"}
              nota={`${resumo?.esgotadas ?? 0} esgotadas`}
              to="/painel/estoque"
              destaque={(resumo?.estoque_baixo ?? 0) > 0}
            />
            <Metrica
              rotulo="A caminho da loja"
              valor={aReceber.reduce((s, t) => s + t.quantidade, 0)}
              nota={`${aReceber.length} ${aReceber.length === 1 ? "transferência" : "transferências"} para conferir`}
              to="/painel/estoque/transferencias"
            />
          </div>

          <section className="mb-6 grid gap-3 rounded-sm border border-linha bg-papel p-4 md:grid-cols-3">
            <Link to="/painel/estoque/movimentacoes" className="rounded-sm border border-linha px-4 py-3 text-sm hover:border-marinho">
              <strong className="block font-semibold">Registrar entrada / saída</strong>
              <span className="text-xs text-suave">Lança movimentações reais no estoque da sua loja.</span>
            </Link>
            <Link to="/painel/estoque/movimentacoes" className="rounded-sm border border-linha px-4 py-3 text-sm hover:border-marinho">
              <strong className="block font-semibold">Ajuste de inventário</strong>
              <span className="text-xs text-suave">Solicita correção para aprovação da gestão.</span>
            </Link>
            <Link to="/painel/estoque/transferencias" className="rounded-sm border border-linha px-4 py-3 text-sm hover:border-marinho">
              <strong className="block font-semibold">Transferências e reposições</strong>
              <span className="text-xs text-suave">Pede peças à rede e aceita pedidos de outras lojas.</span>
            </Link>
          </section>

          <CartaoGrafico
            className="mb-6"
            titulo="Entradas x saídas"
            subtitulo="Unidades movimentadas na loja"
            tabela={{ cabecalho: ["Período", "Entradas", "Saídas"], linhas: bs.map((b, i) => [b.rotulo, serieEntradas[i]!, serieSaidas[i]!]) }}
          >
            <GraficoColunas
              rotulos={bs.map((b) => b.rotulo)}
              series={[
                { id: "e", nome: "Entradas", cor: CORES_DUAS_SERIES[0], valores: serieEntradas },
                { id: "s", nome: "Saídas", cor: CORES_DUAS_SERIES[1], valores: serieSaidas },
              ]}
              formatar={(n) => n.toLocaleString("pt-BR")}
            />
          </CartaoGrafico>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <section className="rounded-sm border border-linha bg-papel">
              <header className="px-5 pt-4">
                <h2 className="font-sans text-sm font-semibold">Situação das peças</h2>
                <p className="mt-0.5 text-xs text-suave">Mais perto do mínimo primeiro · dados do banco da sua unidade</p>
              </header>
              <ul className="divide-y divide-linha px-5 pb-2 pt-2">
                {fila.map((item) => {
                  const proporcao = Math.min(1, item.total / Math.max(1, item.minimo_total * 2));
                  const critico = item.total <= item.minimo_total;
                  const selo = seloDaPeca(item);
                  return (
                    <li key={item.id_variacao}>
                      <Link
                        to={`/painel/estoque/peca/${encodeURIComponent(item.sku)}`}
                        className="grid grid-cols-[1fr_5rem_8.5rem] items-center gap-3 py-3 text-sm hover:text-marinho"
                      >
                        <span className="truncate">
                          {item.produto} <span className="text-suave">· {detalheDaPeca(item)}</span>
                        </span>
                        <span className="relative h-2 overflow-hidden rounded-full bg-areia" title={`${item.total} de mínimo ${item.minimo_total}`}>
                          <span className={cn("absolute inset-y-0 left-0 rounded-r-[4px]", critico ? "bg-alerta" : "bg-marinho")} style={{ width: `${proporcao * 100}%` }} />
                          <span className="absolute inset-y-0 left-1/2 w-px bg-tinta/40" />
                        </span>
                        <span className="flex items-center justify-end gap-2">
                          <span className="w-10 text-right text-xs tabular-nums text-suave">
                            {item.total}/{item.minimo_total}
                          </span>
                          <Badge tom={selo.tom}>{selo.texto}</Badge>
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {fila.length === 0 ? <li className="py-6 text-center text-sm text-suave">Nenhuma peça encontrada nesta unidade.</li> : null}
              </ul>
              <p className="px-5 pb-4 text-[11px] text-suave">O traço no meio da barra marca o estoque mínimo.</p>
            </section>

            <CartaoGrafico
              titulo="Saldo por categoria"
              subtitulo="Unidades na loja agora"
              tabela={{ cabecalho: ["Categoria", "Unidades"], linhas: porCategoria.map((c) => [c.categoria, c.total]) }}
            >
              <GraficoBarras
                categorias={porCategoria.map((c) => c.categoria)}
                series={[{ id: "s", nome: "Unidades", cor: COR_MARCA, valores: porCategoria.map((c) => c.total) }]}
                formatar={(n) => `${n} un.`}
              />
            </CartaoGrafico>
          </div>
        </div>
      )}
    </div>
  );
}
