import { ArrowRight, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Segmentado, Select, cn } from "@/components/ui";
import { HOJE, intervalos, rotuloPeriodo, type Periodo } from "@/lib/analise";
import { dataBR } from "@/lib/dados";
import { useNomeUsuario } from "@/lib/sessao";

const PERIODOS: Periodo[] = [7, 30, 90, 365];

/** Filtros do dashboard guardados na URL (dá para compartilhar o mesmo recorte). */
export function useFiltros() {
  const [params, setParams] = useSearchParams();
  const periodoBruto = Number(params.get("periodo"));
  const periodo: Periodo = PERIODOS.includes(periodoBruto as Periodo) ? (periodoBruto as Periodo) : 30;
  // Ids de loja vindos da URL: só o formato é conferido aqui; o servidor valida e escopa.
  const lojaIds = (params.get("lojas") ?? "").split(",").filter((id) => /^[\w-]{1,64}$/.test(id)).slice(0, 10);

  function definir(chave: string, valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set(chave, valor);
    else novo.delete(chave);
    setParams(novo, { replace: true });
  }

  return {
    periodo,
    lojaIds,
    categoria: params.get("categoria") ?? "",
    canal: params.get("canal") ?? "",
    motivo: params.get("motivo") ?? "",
    loja: params.get("loja") ?? "",
    intervalo: intervalos(periodo),
    definir,
    alternarLoja(id: string) {
      const proximo = lojaIds.includes(id) ? lojaIds.filter((x) => x !== id) : [...lojaIds, id];
      definir("lojas", proximo.join(","));
    },
    limpar: () => setParams({}, { replace: true }),
    ativos: [...params.keys()].length > 0,
  };
}

export type Filtros = ReturnType<typeof useFiltros>;

/** Linha única de filtros acima de todos os gráficos; tudo abaixo obedece a ela. */
export function BarraFiltros({ filtros, children }: { filtros: Filtros; children?: ReactNode }) {
  const { inicio, fim } = filtros.intervalo.atual;
  return (
    <div className="z-20 md:sticky md:top-[57px] -mx-5 mb-6 border-b border-linha bg-creme/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="rotulo mb-1.5 block">Período</span>
          <Segmentado
            valor={String(filtros.periodo)}
            onChange={(v) => filtros.definir("periodo", v === "30" ? "" : v)}
            opcoes={PERIODOS.map((p) => ({ value: String(p), label: rotuloPeriodo[p] }))}
          />
        </div>
        {children}
        {filtros.ativos ? (
          <button
            onClick={filtros.limpar}
            className="mb-2 flex items-center gap-1 text-xs text-suave hover:text-marinho"
          >
            <RotateCcw className="h-3 w-3" /> Limpar filtros
          </button>
        ) : null}
        <p className="mb-2 ml-auto text-xs text-suave">
          {dataBR(inicio)} a {dataBR(fim)}
        </p>
      </div>
    </div>
  );
}

export function FiltroSelect({
  rotulo,
  valor,
  onChange,
  opcoes,
  todos = "Todos",
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: { value: string; label: string }[] | string[];
  todos?: string;
}) {
  const lista = opcoes.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className="min-w-36">
      <span className="rotulo mb-1.5 block">{rotulo}</span>
      <Select
        aria-label={rotulo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        opcoes={[{ value: "", label: todos }, ...lista]}
      />
    </div>
  );
}

/** Seleção de unidades para comparar: nenhuma marcada = rede consolidada. */
export function SeletorUnidades({
  filtros,
  unidades,
}: {
  filtros: Filtros;
  unidades: { id: string; nome: string; cor: string }[];
}) {
  const nenhuma = filtros.lojaIds.length === 0;
  return (
    <div>
      <span className="rotulo mb-1.5 block">Unidades</span>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => filtros.definir("lojas", "")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs transition-colors",
            nenhuma ? "border-marinho bg-marinho text-white" : "border-linha bg-papel text-suave hover:border-marinho",
          )}
        >
          Rede consolidada
        </button>
        {unidades.map((l) => {
          const ativa = filtros.lojaIds.includes(l.id);
          return (
            <button
              key={l.id}
              onClick={() => filtros.alternarLoja(l.id)}
              aria-pressed={ativa}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                ativa ? "border-tinta bg-papel text-tinta" : "border-linha bg-papel text-suave hover:border-marinho",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: l.cor, opacity: ativa ? 1 : 0.35 }} />
              {l.nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function Cabecalho({ descricao }: { descricao: string }) {
  const nome = useNomeUsuario();
  return (
    <div className="mb-5">
      <p className="rotulo !text-dourado">{dataBR(HOJE)}</p>
      <h1 className="mt-1 text-4xl font-light">
        {saudacao()}, {nome.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-suave">{descricao}</p>
    </div>
  );
}

/** Faixa de pendências: cada uma leva direto à tela que resolve. */
export function Pendencias({ itens }: { itens: { texto: string; valor: number; to: string }[] }) {
  const ativos = itens.filter((i) => i.valor > 0);
  if (!ativos.length) return null;
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {ativos.map((i) => (
        <Link
          key={i.texto}
          to={i.to}
          className="group flex items-center gap-2 rounded-full border border-dourado/50 bg-dourado-claro/50 py-1 pl-1 pr-3 text-xs transition-colors hover:border-dourado"
        >
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-marinho px-1.5 text-[11px] font-bold text-white">
            {i.valor}
          </span>
          {i.texto}
          <ArrowRight className="h-3 w-3 text-suave transition-transform group-hover:translate-x-0.5" />
        </Link>
      ))}
    </div>
  );
}

export function Grade({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4", className)}>{children}</div>;
}
