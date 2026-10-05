import { useMemo } from "react";
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
import {
  COR_MARCA,
  baldes,
  filtrarAtendimentos,
  filtrarVendas,
  giroDiario,
  resumoAtendimentos,
  resumoVendas,
  serie,
  todasAsVendas,
  todosOsAtendimentos,
  todosOsMovimentos,
  totalVenda,
  variacao,
} from "@/lib/analise";
import { moeda, nomeLoja } from "@/lib/dados";
import { usePendencias } from "@/lib/pendencias";
import { useLojaEscopo } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { BarraFiltros, Cabecalho, FiltroSelect, Pendencias, useFiltros } from "./comum";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MOTIVOS = ["Dúvida", "Troca", "Entrega", "Defeito"];

/** Gerente: os números da própria unidade, com período, categoria e canal. */
export function DashboardGerente() {
  const estado = useEstado();
  const pend = usePendencias();
  const f = useFiltros();
  const lojaId = useLojaEscopo() ?? "l1";

  const vendas = useMemo(() => todasAsVendas(estado.pedidos, estado.produtos), [estado.pedidos, estado.produtos]);
  const atendimentos = useMemo(() => todosOsAtendimentos(estado.chamados), [estado.chamados]);
  const movimentos = useMemo(() => todosOsMovimentos(vendas, estado.produtos), [vendas, estado.produtos]);
  const categorias = useMemo(() => Array.from(new Set(estado.produtos.map((p) => p.categoria))).sort(), [estado.produtos]);

  const recorte = (r: { inicio: string; fim: string }) => ({ ...r, lojaIds: [lojaId], categoria: f.categoria, canal: f.canal });
  const atual = filtrarVendas(vendas, recorte(f.intervalo.atual));
  const rv = resumoVendas(atual);
  const rvAnt = resumoVendas(filtrarVendas(vendas, recorte(f.intervalo.anterior)));
  const atendAtual = filtrarAtendimentos(atendimentos, { ...f.intervalo.atual, lojaIds: [lojaId] });
  const ra = resumoAtendimentos(atendAtual);
  const raAnt = resumoAtendimentos(filtrarAtendimentos(atendimentos, { ...f.intervalo.anterior, lojaIds: [lojaId] }));

  const bs = baldes(f.periodo);
  const fatTempo = serie(atual, bs, (vs) => vs.reduce((s, v) => s + totalVenda(v), 0));

  // Movimento por dia da semana (média de pedidos), útil para a escala da equipe.
  const contagemDias = DIAS.map((_, d) => {
    const dias = new Set<string>();
    for (let x = f.intervalo.atual.inicio; x <= f.intervalo.atual.fim; ) {
      if (new Date(`${x}T00:00:00Z`).getUTCDay() === d) dias.add(x);
      const prox = new Date(`${x}T00:00:00Z`);
      prox.setUTCDate(prox.getUTCDate() + 1);
      x = prox.toISOString().slice(0, 10);
    }
    const pedidos = atual.filter((v) => dias.has(v.data)).length;
    return dias.size ? pedidos / dias.size : 0;
  });

  // Peças mais vendidas
  const porSku = new Map<string, number>();
  atual.forEach((v) => v.itens.forEach((i) => porSku.set(i.sku, (porSku.get(i.sku) ?? 0) + i.quantidade)));
  const top = [...porSku.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const nome = (sku: string) => estado.produtos.find((p) => p.sku === sku)?.nome ?? sku;

  // Reposição: dias de cobertura = saldo ÷ venda média diária.
  const giro = giroDiario(movimentos, lojaId);
  const cobertura = estado.produtos
    .filter((p) => !f.categoria || p.categoria === f.categoria)
    .map((p) => {
      const s = p.saldos.find((x) => x.lojaId === lojaId)!;
      const media = giro.get(p.sku) ?? 0;
      return { p, saldo: s.quantidade, minimo: s.minimo, dias: media > 0 ? s.quantidade / media : Infinity };
    })
    .filter((x) => x.saldo <= x.minimo || x.dias < 21)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 6);

  const motivos = MOTIVOS.map((m) => atendAtual.filter((a) => a.motivo === m).length);

  return (
    <div>
      <Cabecalho descricao={`Gestão da unidade · ${nomeLoja(lojaId)}`} />
      <Pendencias
        itens={[
          { texto: "ajustes para aprovar", valor: pend.aprovacoes, to: "/painel/estoque/aprovacoes" },
          { texto: "transferências aguardando", valor: pend.transferencias, to: "/painel/estoque/transferencias" },
          { texto: "chamados sem resposta", valor: pend.chamados, to: "/painel/atendimento" },
        ]}
      />

      <BarraFiltros filtros={f}>
        <FiltroSelect rotulo="Categoria" valor={f.categoria} onChange={(v) => f.definir("categoria", v)} opcoes={categorias} todos="Todas" />
        <FiltroSelect rotulo="Canal de venda" valor={f.canal} onChange={(v) => f.definir("canal", v)} opcoes={["Loja", "Online"]} />
      </BarraFiltros>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metrica rotulo="Faturamento" valor={moedaCompacta(rv.faturamento)} extra={<Variacao valor={variacao(rv.faturamento, rvAnt.faturamento)} />} />
        <Metrica rotulo="Pedidos" valor={rv.pedidos} extra={<Variacao valor={variacao(rv.pedidos, rvAnt.pedidos)} />} />
        <Metrica rotulo="Ticket médio" valor={moeda(rv.ticket)} extra={<Variacao valor={variacao(rv.ticket, rvAnt.ticket)} />} />
        <Metrica
          rotulo="1ª resposta ao cliente"
          valor={ra.respostaMedia === null ? "—" : horasFmt(ra.respostaMedia)}
          extra={<Variacao valor={ra.respostaMedia && raAnt.respostaMedia ? variacao(ra.respostaMedia, raAnt.respostaMedia) : null} inverter />}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <CartaoGrafico
          titulo="Faturamento ao longo do tempo"
          subtitulo={`Venda online: ${pct(rv.online)} do total`}
          tabela={{ cabecalho: ["Período", "Faturamento"], linhas: bs.map((b, i) => [b.rotulo, moeda(fatTempo[i]!)]) }}
        >
          <GraficoLinhas rotulos={bs.map((b) => b.rotulo)} series={[{ id: "fat", nome: "Faturamento", cor: COR_MARCA, valores: fatTempo }]} formatar={moedaCompacta} />
        </CartaoGrafico>
        <CartaoGrafico
          titulo="Movimento por dia da semana"
          subtitulo="Média de pedidos por dia — apoio à escala da equipe"
          tabela={{ cabecalho: ["Dia", "Pedidos/dia"], linhas: DIAS.map((d, i) => [d, contagemDias[i]!.toFixed(1)]) }}
        >
          <GraficoColunas
            rotulos={DIAS}
            series={[{ id: "ped", nome: "Pedidos por dia", cor: COR_MARCA, valores: contagemDias }]}
            formatar={(n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            altura={200}
          />
        </CartaoGrafico>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoGrafico
          titulo="Peças mais vendidas"
          tabela={{ cabecalho: ["Peça", "Unidades"], linhas: top.map(([sku, q]) => [nome(sku), q]) }}
        >
          <GraficoBarras
            categorias={top.map(([sku]) => nome(sku))}
            series={[{ id: "un", nome: "Unidades", cor: COR_MARCA, valores: top.map(([, q]) => q) }]}
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
            {cobertura.map((c) => (
              <li key={c.p.sku}>
                <Link to={`/painel/estoque/peca/${c.p.sku}`} className="flex items-center gap-3 py-3 text-sm hover:text-marinho">
                  <span className="flex-1 truncate">{c.p.nome}</span>
                  <span className="text-xs tabular-nums text-suave">
                    {c.saldo} un. · mín. {c.minimo}
                  </span>
                  <Badge tom={c.saldo === 0 ? "perigo" : c.dias < 7 ? "alerta" : "neutro"}>
                    {c.saldo === 0 ? "Esgotada" : c.dias === Infinity ? "Sem giro" : `~${Math.max(1, Math.round(c.dias))} dias`}
                  </Badge>
                </Link>
              </li>
            ))}
            {cobertura.length === 0 ? <li className="py-6 text-center text-sm text-suave">Estoque confortável.</li> : null}
          </ul>
        </section>

        <CartaoGrafico
          titulo="Chamados da unidade por motivo"
          subtitulo={`${ra.total} no período · ${pct(ra.taxaResolucao)} resolvidos`}
          tabela={{ cabecalho: ["Motivo", "Chamados"], linhas: MOTIVOS.map((m, i) => [m, motivos[i]!]) }}
        >
          <GraficoBarras
            categorias={MOTIVOS}
            series={[{ id: "ch", nome: "Chamados", cor: COR_MARCA, valores: motivos }]}
            formatar={(n) => String(n)}
          />
        </CartaoGrafico>

        <CartaoGrafico titulo="Mix de venda" subtitulo="Loja física × online, no período">
          <div className="space-y-4 pt-2">
            {(
              [
                ["Loja física", 1 - rv.online, "#2f5fa8"],
                ["Online", rv.online, "#c47a1e"],
              ] as const
            ).map(([rotulo, v, cor]) => (
              <div key={rotulo}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: cor }} />
                    {rotulo}
                  </span>
                  <span className="tabular-nums">
                    {pct(v)} · <span className="text-suave">{moeda(rv.faturamento * v)}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-areia">
                  <div className="h-full rounded-r-[4px]" style={{ width: `${v * 100}%`, background: cor }} />
                </div>
              </div>
            ))}
            <p className="text-xs text-suave">{rv.pecas} peças vendidas em {rv.pedidos} pedidos.</p>
          </div>
        </CartaoGrafico>
      </div>
    </div>
  );
}
