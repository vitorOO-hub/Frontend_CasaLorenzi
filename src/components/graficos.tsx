import { BarChart3, Table2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./ui";

/**
 * Gráficos em SVG puro, seguindo uma regra visual única:
 * linhas de 2px, barras finas (≤ 24px) com ponta arredondada, grade discreta,
 * legenda sempre que houver 2+ séries, tooltip ao passar o mouse (ou com o teclado)
 * e uma visão em tabela com os mesmos números.
 */

export type Serie = { id: string; nome: string; cor: string; valores: number[] };

const SUAVE = "#5e6b89";
const GRADE = "#eeeae3"; // areia
const BASE = "#dfd9cf"; // linha

// ---------- Formatação ----------

export const compacto = (n: number) =>
  n.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
export const moedaCompacta = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
export const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
export const horasFmt = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`);

/** Escala "redonda" para o eixo: 0 → teto com 4–5 marcas. */
function marcas(maximo: number) {
  if (maximo <= 0) return [0, 1];
  const bruto = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => maximo / p <= 5)!;
  const teto = Math.ceil(maximo / passo) * passo;
  return Array.from({ length: Math.round(teto / passo) + 1 }, (_, i) => i * passo);
}

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(([e]) => setLargura(Math.max(240, e!.contentRect.width)));
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, largura] as const;
}

// ---------- Moldura, legenda e tooltip ----------

export function Legenda({ series, tipo }: { series: Pick<Serie, "id" | "nome" | "cor">[]; tipo: "linha" | "barra" }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-suave">
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={tipo === "linha" ? "h-0.5 w-4 rounded-full" : "h-2.5 w-2.5 rounded-[2px]"}
            style={{ background: s.cor }}
          />
          {s.nome}
        </li>
      ))}
    </ul>
  );
}

export type Tabela = { cabecalho: string[]; linhas: (string | number)[][] };

/** Cartão de gráfico com alternância Gráfico/Tabela (os números ficam acessíveis sem hover). */
export function CartaoGrafico({
  titulo,
  subtitulo,
  tabela,
  children,
  className,
}: {
  titulo: string;
  subtitulo?: string;
  tabela?: Tabela;
  children: ReactNode;
  className?: string;
}) {
  const [verTabela, setVerTabela] = useState(false);
  return (
    <section className={cn("rounded-sm border border-linha bg-papel", className)}>
      <header className="flex items-start justify-between gap-4 px-5 pt-4">
        <div>
          <h2 className="font-sans text-sm font-semibold">{titulo}</h2>
          {subtitulo ? <p className="mt-0.5 text-xs text-suave">{subtitulo}</p> : null}
        </div>
        {tabela ? (
          <button
            onClick={() => setVerTabela((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1 text-[11px] text-suave hover:bg-areia/60 hover:text-tinta"
            aria-pressed={verTabela}
          >
            {verTabela ? <BarChart3 className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
            {verTabela ? "Gráfico" : "Tabela"}
          </button>
        ) : null}
      </header>
      <div className="px-5 pb-5 pt-3">
        {verTabela && tabela ? (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-papel">
                <tr>
                  {tabela.cabecalho.map((c, i) => (
                    <th key={c} className={cn("border-b border-linha py-2 pr-3 font-semibold text-suave", i > 0 && "text-right")}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.linhas.map((l, i) => (
                  <tr key={i}>
                    {l.map((v, j) => (
                      <td key={j} className={cn("border-b border-linha/60 py-1.5 pr-3", j > 0 && "text-right tabular-nums")}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function Dica({
  x,
  y,
  largura,
  titulo,
  linhas,
}: {
  x: number;
  y: number;
  largura: number;
  titulo: string;
  linhas: { cor: string; nome: string; valor: string }[];
}) {
  const aDireita = x < largura - 190;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-40 rounded-sm border border-linha bg-papel px-3 py-2 shadow-suave"
      style={{ top: Math.max(0, y), left: aDireita ? x + 12 : undefined, right: aDireita ? undefined : largura - x + 12 }}
    >
      <p className="mb-1 text-[11px] text-suave">{titulo}</p>
      {linhas.map((l) => (
        <p key={l.nome} className="flex items-center gap-2 text-xs">
          <span className="h-0.5 w-3 rounded-full" style={{ background: l.cor }} />
          <strong className="font-semibold text-tinta">{l.valor}</strong>
          <span className="text-suave">{l.nome}</span>
        </p>
      ))}
    </div>
  );
}


function NotaParcial({ rotulos }: { rotulos: string[] }) {
  return rotulos.some((r) => r.endsWith("*")) ? (
    <p className="text-[11px] text-suave">* mês incompleto — o valor ainda vai crescer</p>
  ) : null;
}

// ---------- Linhas (evolução no tempo) ----------

export function GraficoLinhas({
  rotulos,
  series,
  formatar,
  altura = 240,
}: {
  rotulos: string[];
  series: Serie[];
  formatar: (n: number) => string;
  altura?: number;
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [foco, setFoco] = useState<number | null>(null);
  const m = { t: 12, r: 16, b: 26, l: 64 };
  const w = largura - m.l - m.r;
  const h = altura - m.t - m.b;
  const ticks = marcas(Math.max(0, ...series.flatMap((s) => s.valores)));
  const teto = ticks[ticks.length - 1]!;
  const x = (i: number) => m.l + (rotulos.length === 1 ? w / 2 : (i / (rotulos.length - 1)) * w);
  const y = (v: number) => m.t + h - (v / teto) * h;
  const cadaN = Math.max(1, Math.ceil(rotulos.length / Math.floor(w / 64)));
  const unica = series.length === 1;

  function aoMover(e: React.PointerEvent<SVGRectElement>) {
    const caixa = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - caixa.left) / caixa.width;
    setFoco(Math.round(rel * (rotulos.length - 1)));
  }

  return (
    <div className="space-y-3">
      <Legenda series={series} tipo="linha" />
      <div
        ref={ref}
        className="relative outline-none"
        tabIndex={0}
        aria-label="Gráfico de linhas; use as setas para navegar"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setFoco((f) => Math.min(rotulos.length - 1, (f ?? -1) + 1));
          if (e.key === "ArrowLeft") setFoco((f) => Math.max(0, (f ?? rotulos.length) - 1));
        }}
        onBlur={() => setFoco(null)}
      >
        <svg width={largura} height={altura} role="img">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + w} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASE : GRADE} strokeWidth={1} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={SUAVE} className="tabular-nums">
                {formatar(t)}
              </text>
            </g>
          ))}
          {rotulos.map((r, i) =>
            (i % cadaN === 0 && rotulos.length - 1 - i >= cadaN) || i === rotulos.length - 1 ? (
              <text
                key={r + i}
                x={x(i)}
                y={altura - 6}
                textAnchor={i === 0 ? "start" : i === rotulos.length - 1 ? "end" : "middle"}
                fontSize={10}
                fill={SUAVE}
              >
                {r}
              </text>
            ) : null,
          )}
          {series.map((s) => {
            const caminho = s.valores.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
            return (
              <g key={s.id}>
                {unica ? (
                  <path d={`${caminho}L${x(s.valores.length - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={s.cor} opacity={0.08} />
                ) : null}
                <path d={caminho} fill="none" stroke={s.cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={x(s.valores.length - 1)} cy={y(s.valores.at(-1) ?? 0)} r={4} fill={s.cor} stroke="#fff" strokeWidth={2} />
              </g>
            );
          })}
          {foco !== null ? (
            <g>
              <line x1={x(foco)} x2={x(foco)} y1={m.t} y2={m.t + h} stroke={SUAVE} strokeWidth={1} />
              {series.map((s) => (
                <circle key={s.id} cx={x(foco)} cy={y(s.valores[foco] ?? 0)} r={4} fill={s.cor} stroke="#fff" strokeWidth={2} />
              ))}
            </g>
          ) : null}
          <rect
            x={m.l}
            y={m.t}
            width={w}
            height={h}
            fill="transparent"
            onPointerMove={aoMover}
            onPointerLeave={() => setFoco(null)}
          />
        </svg>
        {foco !== null ? (
          <Dica
            x={x(foco)}
            y={m.t}
            largura={largura}
            titulo={rotulos[foco]!}
            linhas={[...series]
              .sort((a, b) => (b.valores[foco] ?? 0) - (a.valores[foco] ?? 0))
              .map((s) => ({ cor: s.cor, nome: s.nome, valor: formatar(s.valores[foco] ?? 0) }))}
          />
        ) : null}
      </div>
      <NotaParcial rotulos={rotulos} />
    </div>
  );
}

// ---------- Barras horizontais (ranking / comparação por categoria) ----------

export function GraficoBarras({
  categorias,
  series,
  formatar,
}: {
  categorias: string[];
  series: Serie[];
  formatar: (n: number) => string;
}) {
  const [foco, setFoco] = useState<{ c: number; s: number } | null>(null);
  const maximo = Math.max(1, ...series.flatMap((s) => s.valores));
  const espessura = series.length === 1 ? 14 : series.length === 2 ? 10 : 8;

  return (
    <div className="space-y-3">
      <Legenda series={series} tipo="barra" />
      <ul className="space-y-3">
        {categorias.map((cat, c) => (
          <li key={cat} className="grid grid-cols-[minmax(5rem,8rem)_1fr] items-center gap-3">
            <span className="truncate text-xs text-suave" title={cat}>
              {cat}
            </span>
            <div className="space-y-[2px]">
              {series.map((s, si) => {
                const v = s.valores[c] ?? 0;
                const ativo = foco?.c === c && foco.s === si;
                return (
                  <div
                    key={s.id}
                    className="group relative flex items-center gap-2 py-0.5 outline-none"
                    tabIndex={0}
                    onPointerEnter={() => setFoco({ c, s: si })}
                    onPointerLeave={() => setFoco(null)}
                    onFocus={() => setFoco({ c, s: si })}
                    onBlur={() => setFoco(null)}
                  >
                    <span
                      className="block rounded-r-[4px] transition-opacity"
                      style={{
                        width: `${Math.max(v > 0 ? 0.6 : 0, (v / maximo) * 82)}%`,
                        height: espessura,
                        background: s.cor,
                        opacity: foco && !ativo ? 0.45 : 1,
                      }}
                    />
                    <span className="whitespace-nowrap text-[11px] tabular-nums text-suave">{formatar(v)}</span>
                    {ativo && series.length > 1 ? (
                      <span className="pointer-events-none absolute -top-7 left-0 z-10 whitespace-nowrap rounded-sm border border-linha bg-papel px-2 py-1 text-[11px] shadow-suave">
                        <strong className="text-tinta">{formatar(v)}</strong> <span className="text-suave">{s.nome} · {cat}</span>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Colunas agrupadas por período (ex.: entradas × saídas) ----------

export function GraficoColunas({
  rotulos,
  series,
  formatar,
  altura = 220,
}: {
  rotulos: string[];
  series: Serie[];
  formatar: (n: number) => string;
  altura?: number;
}) {
  const [ref, largura] = useLargura<HTMLDivElement>();
  const [foco, setFoco] = useState<number | null>(null);
  const m = { t: 12, r: 8, b: 26, l: 44 };
  const w = largura - m.l - m.r;
  const h = altura - m.t - m.b;
  const ticks = marcas(Math.max(0, ...series.flatMap((s) => s.valores)));
  const teto = ticks[ticks.length - 1]!;
  const banda = w / rotulos.length;
  const coluna = Math.max(2, Math.min(24, (banda * 0.7 - 2 * (series.length - 1)) / series.length));
  const y = (v: number) => m.t + h - (v / teto) * h;
  const cadaN = Math.max(1, Math.ceil(rotulos.length / Math.floor(w / 56)));

  return (
    <div className="space-y-3">
      <Legenda series={series} tipo="barra" />
      <div ref={ref} className="relative">
        <svg width={largura} height={altura} role="img">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + w} y1={y(t)} y2={y(t)} stroke={t === 0 ? BASE : GRADE} />
              <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={10} fill={SUAVE}>
                {formatar(t)}
              </text>
            </g>
          ))}
          {rotulos.map((r, i) => {
            const inicioGrupo = m.l + i * banda + (banda - (coluna * series.length + 2 * (series.length - 1))) / 2;
            return (
              <g
                key={r + i}
                onPointerEnter={() => setFoco(i)}
                onPointerLeave={() => setFoco(null)}
                opacity={foco !== null && foco !== i ? 0.5 : 1}
              >
                <rect x={m.l + i * banda} y={m.t} width={banda} height={h} fill="transparent" />
                {series.map((s, si) => {
                  const v = s.valores[i] ?? 0;
                  const alto = Math.max(0, y(0) - y(v));
                  const raio = Math.min(4, alto, coluna / 2);
                  const x0 = inicioGrupo + si * (coluna + 2);
                  const topo = y(v);
                  // Ponta arredondada só em cima; base reta na linha zero.
                  const d = `M${x0},${y(0)}V${topo + raio}Q${x0},${topo} ${x0 + raio},${topo}H${x0 + coluna - raio}Q${x0 + coluna},${topo} ${x0 + coluna},${topo + raio}V${y(0)}Z`;
                  return alto > 0 ? <path key={s.id} d={d} fill={s.cor} /> : null;
                })}
                {i % cadaN === 0 ? (
                  <text x={m.l + i * banda + banda / 2} y={altura - 6} textAnchor="middle" fontSize={10} fill={SUAVE}>
                    {r}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        {foco !== null ? (
          <Dica
            x={m.l + foco * banda + banda / 2}
            y={m.t}
            largura={largura}
            titulo={rotulos[foco]!}
            linhas={series.map((s) => ({ cor: s.cor, nome: s.nome, valor: formatar(s.valores[foco] ?? 0) }))}
          />
        ) : null}
      </div>
      <NotaParcial rotulos={rotulos} />
    </div>
  );
}

/** Indicador com variação vs período anterior (seta + texto, nunca só cor). */
export function Variacao({
  valor,
  inverter = false,
  curto = false,
}: {
  valor: number | null;
  inverter?: boolean;
  curto?: boolean;
}) {
  if (valor === null || !Number.isFinite(valor))
    return <span className="text-xs text-suave">{curto ? "—" : "sem base de comparação"}</span>;
  const sobe = valor >= 0;
  const bom = inverter ? !sobe : sobe;
  return (
    <span className={cn("whitespace-nowrap text-xs font-semibold", Math.abs(valor) < 0.005 ? "text-suave" : bom ? "text-sucesso" : "text-perigo")}>
      {sobe ? "▲" : "▼"} {pct(Math.abs(valor))}
      {curto ? null : <span className="font-normal text-suave"> vs período anterior</span>}
    </span>
  );
}

