import { useMemo } from "react";
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
import {
  COR_MARCA,
  baldes,
  corDaLoja,
  filtrarAtendimentos,
  filtrarVendas,
  resumoAtendimentos,
  resumoVendas,
  serie,
  todasAsVendas,
  todosOsAtendimentos,
  totalVenda,
  variacao,
  type Recorte,
} from "@/lib/analise";
import { lojas, moeda, statusProduto, totalProduto } from "@/lib/dados";
import { usePendencias } from "@/lib/pendencias";
import { useEstado } from "@/lib/store";
import { BarraFiltros, Cabecalho, FiltroSelect, Pendencias, SeletorUnidades, useFiltros } from "./comum";

const MOTIVOS = ["Dúvida", "Troca", "Entrega", "Defeito"];

/** Admin: visão geral da rede, filtrável por unidade para comparar as casas lado a lado. */
export function DashboardAdmin() {
  const estado = useEstado();
  const pend = usePendencias();
  const f = useFiltros();

  const vendas = useMemo(() => todasAsVendas(estado.pedidos, estado.produtos), [estado.pedidos, estado.produtos]);
  const atendimentos = useMemo(() => todosOsAtendimentos(estado.chamados), [estado.chamados]);
  const categorias = useMemo(() => Array.from(new Set(estado.produtos.map((p) => p.categoria))).sort(), [estado.produtos]);

  const comparando = f.lojaIds.length > 0;
  // Comparação: uma série por unidade marcada. Sem seleção: a rede como um todo.
  const grupos = comparando
    ? lojas.filter((l) => f.lojaIds.includes(l.id)).map((l) => ({ id: l.id, nome: l.nome, cor: corDaLoja(l.id), lojaIds: [l.id] }))
    : [{ id: "rede", nome: "Rede", cor: COR_MARCA, lojaIds: [] as string[] }];

  const recorte = (r: { inicio: string; fim: string }, lojaIds = f.lojaIds): Recorte => ({
    ...r,
    lojaIds,
    categoria: f.categoria,
    canal: f.canal,
  });

  const atual = filtrarVendas(vendas, recorte(f.intervalo.atual));
  const anterior = filtrarVendas(vendas, recorte(f.intervalo.anterior));
  const rv = resumoVendas(atual);
  const rvAnt = resumoVendas(anterior);
  const ra = resumoAtendimentos(filtrarAtendimentos(atendimentos, { ...f.intervalo.atual, lojaIds: f.lojaIds }));
  const raAnt = resumoAtendimentos(filtrarAtendimentos(atendimentos, { ...f.intervalo.anterior, lojaIds: f.lojaIds }));

  const lojaIdsEstoque = comparando ? f.lojaIds : undefined;
  const produtosFiltrados = estado.produtos.filter((p) => !f.categoria || p.categoria === f.categoria);
  const unidades = produtosFiltrados.reduce((s, p) => s + totalProduto(p, lojaIdsEstoque), 0);
  const esgotadas = produtosFiltrados.filter((p) => statusProduto(p, lojaIdsEstoque) === "Esgotado").length;

  // Evolução do faturamento
  const bs = baldes(f.periodo);
  const seriesTempo: Serie[] = grupos.map((g) => ({
    ...g,
    valores: serie(atual.filter((v) => !comparando || g.lojaIds.includes(v.lojaId)), bs, (vs) => vs.reduce((s, v) => s + totalVenda(v), 0)),
  }));

  // Vendas por categoria
  const catsVisiveis = f.categoria ? [f.categoria] : categorias;
  const seriesCategoria: Serie[] = grupos.map((g) => ({
    ...g,
    valores: catsVisiveis.map((c) =>
      atual
        .filter((v) => !comparando || g.lojaIds.includes(v.lojaId))
        .reduce((s, v) => s + v.itens.filter((i) => i.categoria === c).reduce((t, i) => t + i.valor * i.quantidade, 0), 0),
    ),
  }));
  const ordemCat = catsVisiveis
    .map((c, i) => ({ c, i, total: seriesCategoria.reduce((s, x) => s + x.valores[i]!, 0) }))
    .sort((a, b) => b.total - a.total);
  const seriesCatOrdenadas = seriesCategoria.map((s) => ({ ...s, valores: ordemCat.map((o) => s.valores[o.i]!) }));

  // Chamados por motivo
  const atendAtual = filtrarAtendimentos(atendimentos, { ...f.intervalo.atual, lojaIds: f.lojaIds });
  const seriesMotivo: Serie[] = grupos.map((g) => ({
    ...g,
    valores: MOTIVOS.map((m) => atendAtual.filter((a) => a.motivo === m && (!comparando || g.lojaIds.includes(a.lojaId))).length),
  }));

  // Comparativo entre unidades (sempre todas as selecionadas, ou todas as lojas)
  const lojasTabela = comparando ? lojas.filter((l) => f.lojaIds.includes(l.id)) : lojas;
  const linhas = lojasTabela.map((l) => {
    const v = resumoVendas(filtrarVendas(vendas, recorte(f.intervalo.atual, [l.id])));
    const vAnt = resumoVendas(filtrarVendas(vendas, recorte(f.intervalo.anterior, [l.id])));
    const a = resumoAtendimentos(filtrarAtendimentos(atendimentos, { ...f.intervalo.atual, lojaIds: [l.id] }));
    return {
      loja: l,
      ...v,
      delta: variacao(v.faturamento, vAnt.faturamento),
      estoque: produtosFiltrados.reduce((s, p) => s + totalProduto(p, [l.id]), 0),
      esgotadas: produtosFiltrados.filter((p) => statusProduto(p, [l.id]) === "Esgotado").length,
      abertos: estado.chamados.filter((c) => c.lojaId === l.id && c.status !== "Resolvido").length,
      resposta: a.respostaMedia,
    };
  });
  const maiorFat = Math.max(1, ...linhas.map((l) => l.faturamento));
  const melhor = (campo: "faturamento" | "ticket" | "online", maior = true) => {
    const valores = linhas.map((l) => l[campo]);
    const alvo = maior ? Math.max(...valores) : Math.min(...valores);
    return (v: number) => linhas.length > 1 && v === alvo;
  };

  // Top peças
  const porSku = new Map<string, number>();
  atual.forEach((v) => v.itens.forEach((i) => porSku.set(i.sku, (porSku.get(i.sku) ?? 0) + i.quantidade)));
  const top = [...porSku.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const nome = (sku: string) => estado.produtos.find((p) => p.sku === sku)?.nome ?? sku;

  return (
    <div>
      <Cabecalho descricao="Visão geral da rede. Marque unidades para compará-las lado a lado." />
      <Pendencias
        itens={[
          { texto: "ajustes para aprovar", valor: pend.aprovacoes, to: "/painel/estoque/aprovacoes" },
        ]}
      />

      <BarraFiltros filtros={f}>
        <SeletorUnidades filtros={f} />
        <FiltroSelect rotulo="Categoria" valor={f.categoria} onChange={(v) => f.definir("categoria", v)} opcoes={categorias} todos="Todas" />
        <FiltroSelect rotulo="Canal de venda" valor={f.canal} onChange={(v) => f.definir("canal", v)} opcoes={["Loja", "Online"]} />
      </BarraFiltros>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metrica rotulo="Faturamento" valor={moedaCompacta(rv.faturamento)} extra={<Variacao valor={variacao(rv.faturamento, rvAnt.faturamento)} />} />
        <Metrica rotulo="Pedidos" valor={rv.pedidos.toLocaleString("pt-BR")} extra={<Variacao valor={variacao(rv.pedidos, rvAnt.pedidos)} />} />
        <Metrica rotulo="Ticket médio" valor={moeda(rv.ticket)} extra={<Variacao valor={variacao(rv.ticket, rvAnt.ticket)} />} />
        <Metrica rotulo="Peças vendidas" valor={rv.pecas.toLocaleString("pt-BR")} extra={<Variacao valor={variacao(rv.pecas, rvAnt.pecas)} />} />
        <Metrica rotulo="Venda online" valor={pct(rv.online)} nota="do faturamento no período" />
        <Metrica rotulo="Unidades em estoque" valor={unidades.toLocaleString("pt-BR")} nota="posição de agora" to="/painel/estoque" />
        <Metrica rotulo="Peças esgotadas" valor={esgotadas} nota={`de ${produtosFiltrados.length} no catálogo`} to="/painel/estoque" destaque={esgotadas > 0} />
        <Metrica
          rotulo="Primeira resposta"
          valor={ra.respostaMedia === null ? "—" : horasFmt(ra.respostaMedia)}
          extra={<Variacao valor={ra.respostaMedia && raAnt.respostaMedia ? variacao(ra.respostaMedia, raAnt.respostaMedia) : null} inverter />}
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
                <tr key={l.loja.id} className="border-b border-linha/60">
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: corDaLoja(l.loja.id) }} />
                      {l.loja.nome}
                    </span>
                    <span className="ml-[18px] text-xs text-suave">{l.loja.cidade}</span>
                  </td>
                  <td className={cn("py-3 pr-3 text-right tabular-nums", melhor("faturamento")(l.faturamento) && "font-bold")}>
                    {moeda(l.faturamento)}
                    <span className="mt-1 ml-auto block h-1 w-full max-w-28 overflow-hidden rounded-full bg-areia">
                      <span className="block h-full rounded-full" style={{ width: `${(l.faturamento / maiorFat) * 100}%`, background: corDaLoja(l.loja.id) }} />
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Variacao valor={l.delta} curto />
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{l.pedidos}</td>
                  <td className={cn("py-3 pr-3 text-right tabular-nums", melhor("ticket")(l.ticket) && "font-bold")}>{moeda(l.ticket)}</td>
                  <td className={cn("py-3 pr-3 text-right tabular-nums", melhor("online")(l.online) && "font-bold")}>{pct(l.online)}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{l.estoque}</td>
                  <td className={cn("py-3 pr-3 text-right tabular-nums", l.esgotadas > 0 && "text-perigo")}>{l.esgotadas}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{l.abertos}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{l.resposta === null ? "—" : horasFmt(l.resposta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico
          titulo="Vendas por categoria"
          subtitulo="Faturamento no período"
          tabela={{
            cabecalho: ["Categoria", ...seriesCatOrdenadas.map((s) => s.nome)],
            linhas: ordemCat.map((o, i) => [o.c, ...seriesCatOrdenadas.map((s) => moeda(s.valores[i]!))]),
          }}
        >
          <GraficoBarras categorias={ordemCat.map((o) => o.c)} series={seriesCatOrdenadas} formatar={moedaCompacta} />
        </CartaoGrafico>

        <CartaoGrafico
          titulo="Chamados por motivo"
          subtitulo="Abertos no período"
          tabela={{ cabecalho: ["Motivo", ...seriesMotivo.map((s) => s.nome)], linhas: MOTIVOS.map((m, i) => [m, ...seriesMotivo.map((s) => s.valores[i]!)]) }}
        >
          <GraficoBarras categorias={MOTIVOS} series={seriesMotivo} formatar={(n) => n.toLocaleString("pt-BR")} />
        </CartaoGrafico>

        <CartaoGrafico
          titulo="Peças mais vendidas"
          subtitulo={comparando ? "Somando as unidades selecionadas" : "Na rede"}
          tabela={{ cabecalho: ["Peça", "Unidades"], linhas: top.map(([sku, q]) => [nome(sku), q]) }}
        >
          <GraficoBarras
            categorias={top.map(([sku]) => nome(sku))}
            series={[{ id: "un", nome: "Unidades", cor: COR_MARCA, valores: top.map(([, q]) => q) }]}
            formatar={(n) => `${n} un.`}
          />
        </CartaoGrafico>

        <CartaoGrafico titulo="Atendimento no período" subtitulo={comparando ? "Unidades selecionadas" : "Rede"}>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-linha">
            {(
              [
                ["Chamados recebidos", ra.total.toLocaleString("pt-BR"), <Variacao key="v" valor={variacao(ra.total, raAnt.total)} inverter />],
                ["Taxa de resolução", pct(ra.taxaResolucao), null],
                ["Primeira resposta (média)", ra.respostaMedia === null ? "—" : horasFmt(ra.respostaMedia), null],
                ["Em aberto agora", estado.chamados.filter((c) => c.status !== "Resolvido" && (!comparando || f.lojaIds.includes(c.lojaId))).length, null],
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
    </div>
  );
}
