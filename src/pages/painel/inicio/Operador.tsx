import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CartaoGrafico, GraficoBarras, GraficoColunas, Variacao } from "@/components/graficos";
import { Badge, Metrica, cn } from "@/components/ui";
import {
  CORES_DUAS_SERIES,
  COR_MARCA,
  baldes,
  filtrarMovimentos,
  giroDiario,
  serie,
  todasAsVendas,
  todosOsMovimentos,
  variacao,
} from "@/lib/analise";
import { nomeLoja } from "@/lib/dados";
import { usePendencias } from "@/lib/pendencias";
import { useLojaEscopo } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { BarraFiltros, Cabecalho, FiltroSelect, Pendencias, useFiltros } from "./comum";

/** Operador: o fluxo físico da loja — o que entrou, o que saiu e o que vai faltar. */
export function DashboardOperador() {
  const estado = useEstado();
  const pend = usePendencias();
  const f = useFiltros();
  const lojaId = useLojaEscopo() ?? "l1";

  const vendas = useMemo(() => todasAsVendas(estado.pedidos, estado.produtos), [estado.pedidos, estado.produtos]);
  const movimentos = useMemo(() => todosOsMovimentos(vendas, estado.produtos), [vendas, estado.produtos]);
  const categorias = useMemo(() => Array.from(new Set(estado.produtos.map((p) => p.categoria))).sort(), [estado.produtos]);

  const recorte = (r: { inicio: string; fim: string }) => ({ ...r, lojaIds: [lojaId], categoria: f.categoria });
  const atual = filtrarMovimentos(movimentos, recorte(f.intervalo.atual));
  const anterior = filtrarMovimentos(movimentos, recorte(f.intervalo.anterior));
  const soma = (lista: typeof atual, tipo: "Entrada" | "Saída") =>
    lista.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.quantidade, 0);

  const bs = baldes(f.periodo);
  const entradas = serie(atual.filter((m) => m.tipo === "Entrada"), bs, (ms) => ms.reduce((s, m) => s + m.quantidade, 0));
  const saidas = serie(atual.filter((m) => m.tipo === "Saída"), bs, (ms) => ms.reduce((s, m) => s + m.quantidade, 0));

  const produtos = estado.produtos.filter((p) => !f.categoria || p.categoria === f.categoria);
  const saldoDe = (sku: string) => estado.produtos.find((p) => p.sku === sku)!.saldos.find((s) => s.lojaId === lojaId)!;
  const abaixo = produtos.filter((p) => saldoDe(p.sku).quantidade <= saldoDe(p.sku).minimo);
  const esgotadas = produtos.filter((p) => saldoDe(p.sku).quantidade === 0);
  const aReceber = estado.transferencias.filter((t) => t.destinoId === lojaId && t.status === "Aceita");

  const giro = giroDiario(movimentos, lojaId);
  const fila = produtos
    .map((p) => {
      const s = saldoDe(p.sku);
      const media = giro.get(p.sku) ?? 0;
      return { p, saldo: s.quantidade, minimo: s.minimo, dias: media > 0 ? s.quantidade / media : Infinity };
    })
    .sort((a, b) => a.saldo / Math.max(1, a.minimo) - b.saldo / Math.max(1, b.minimo))
    .slice(0, 8);

  const porCategoria = Array.from(new Set(produtos.map((p) => p.categoria))).map((c) => ({
    c,
    saldo: produtos.filter((p) => p.categoria === c).reduce((s, p) => s + saldoDe(p.sku).quantidade, 0),
  }));
  porCategoria.sort((a, b) => b.saldo - a.saldo);

  return (
    <div>
      <Cabecalho descricao={`Estoque · ${nomeLoja(lojaId)}`} />
      <Pendencias
        itens={[
          { texto: "transferências e reposições aguardando você", valor: pend.transferencias, to: "/painel/estoque/transferencias" },
        ]}
      />

      <BarraFiltros filtros={f}>
        <FiltroSelect rotulo="Categoria" valor={f.categoria} onChange={(v) => f.definir("categoria", v)} opcoes={categorias} todos="Todas" />
      </BarraFiltros>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metrica rotulo="Peças que entraram" valor={soma(atual, "Entrada")} nota="unidades no período" extra={<Variacao valor={variacao(soma(atual, "Entrada"), soma(anterior, "Entrada"))} />} />
        <Metrica rotulo="Peças que saíram" valor={soma(atual, "Saída")} nota="vendas e envios" extra={<Variacao valor={variacao(soma(atual, "Saída"), soma(anterior, "Saída"))} />} />
        <Metrica rotulo="Abaixo do mínimo" valor={abaixo.length} nota={`${esgotadas.length} esgotadas`} to="/painel/estoque" destaque={abaixo.length > 0} />
        <Metrica rotulo="A caminho da loja" valor={aReceber.reduce((s, t) => s + t.quantidade, 0)} nota={`${aReceber.length} ${aReceber.length === 1 ? "transferência" : "transferências"} para conferir`} to="/painel/estoque/transferencias" />
      </div>

      <CartaoGrafico
        className="mb-6"
        titulo="Entradas × saídas"
        subtitulo="Unidades movimentadas na loja"
        tabela={{ cabecalho: ["Período", "Entradas", "Saídas"], linhas: bs.map((b, i) => [b.rotulo, entradas[i]!, saidas[i]!]) }}
      >
        <GraficoColunas
          rotulos={bs.map((b) => b.rotulo)}
          series={[
            { id: "e", nome: "Entradas", cor: CORES_DUAS_SERIES[0], valores: entradas },
            { id: "s", nome: "Saídas", cor: CORES_DUAS_SERIES[1], valores: saidas },
          ]}
          formatar={(n) => n.toLocaleString("pt-BR")}
        />
      </CartaoGrafico>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="rounded-sm border border-linha bg-papel">
          <header className="px-5 pt-4">
            <h2 className="font-sans text-sm font-semibold">Situação das peças</h2>
            <p className="mt-0.5 text-xs text-suave">Mais perto do mínimo primeiro · a barra mostra o saldo em relação ao mínimo</p>
          </header>
          <ul className="divide-y divide-linha px-5 pb-2 pt-2">
            {fila.map((x) => {
              const proporcao = Math.min(1, x.saldo / Math.max(1, x.minimo * 2));
              const critico = x.saldo <= x.minimo;
              return (
                <li key={x.p.sku}>
                  <Link to={`/painel/estoque/peca/${x.p.sku}`} className="grid grid-cols-[1fr_5rem_8.5rem] items-center gap-3 py-3 text-sm hover:text-marinho">
                    <span className="truncate">{x.p.nome}</span>
                    <span className="relative h-2 overflow-hidden rounded-full bg-areia" title={`${x.saldo} de mínimo ${x.minimo}`}>
                      <span className={cn("absolute inset-y-0 left-0 rounded-r-[4px]", critico ? "bg-alerta" : "bg-marinho")} style={{ width: `${proporcao * 100}%` }} />
                      <span className="absolute inset-y-0 left-1/2 w-px bg-tinta/40" />
                    </span>
                    <span className="flex items-center justify-end gap-2">
                      <span className="w-10 text-right text-xs tabular-nums text-suave">
                        {x.saldo}/{x.minimo}
                      </span>
                      <Badge tom={x.saldo === 0 ? "perigo" : critico ? "alerta" : "ok"}>
                        {x.saldo === 0 ? "Esgotada" : critico ? (x.dias === Infinity ? "Repor" : `~${Math.max(1, Math.round(x.dias))} dias`) : "OK"}
                      </Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="px-5 pb-4 text-[11px] text-suave">O traço no meio da barra marca o estoque mínimo.</p>
        </section>

        <CartaoGrafico
          titulo="Saldo por categoria"
          subtitulo="Unidades na loja agora"
          tabela={{ cabecalho: ["Categoria", "Unidades"], linhas: porCategoria.map((c) => [c.c, c.saldo]) }}
        >
          <GraficoBarras
            categorias={porCategoria.map((c) => c.c)}
            series={[{ id: "s", nome: "Unidades", cor: COR_MARCA, valores: porCategoria.map((c) => c.saldo) }]}
            formatar={(n) => `${n} un.`}
          />
        </CartaoGrafico>
      </div>
    </div>
  );
}
