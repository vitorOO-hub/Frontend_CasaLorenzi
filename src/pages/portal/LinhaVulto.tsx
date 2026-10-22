import { Link, useSearchParams } from "react-router-dom";
import { SinalMais } from "@/components/marca";
import { cn } from "@/components/ui";
import { CartaoProduto } from "@/components/vitrine";
import { useProdutosCatalogo } from "@/lib/catalogoApi";
import { useEstado } from "@/lib/store";
import { ehVulto } from "@/lib/vultoMais";

/**
 * Linha Vulto dentro da Casa Lorenzi+: a marca urbana que se uniu à casa tem a sua entrada no menu,
 * mas o mesmo cabeçalho, sacola, conta e Lorenzi+. Abertura em preto, catálogo só com as peças Vulto.
 */
export function LinhaVulto() {
  const estado = useEstado();
  const { produtos, carregando, erro } = useProdutosCatalogo(estado.produtos);
  const [params, setParams] = useSearchParams();
  const categoria = params.get("categoria") ?? "";
  const daLinha = produtos.filter(ehVulto);
  const categorias = Array.from(new Set(daLinha.map((p) => p.categoria))).sort();
  const lista = daLinha.filter((p) => !categoria || p.categoria === categoria);

  function escolher(valor: string) {
    const novo = new URLSearchParams(params);
    if (valor) novo.set("categoria", valor);
    else novo.delete("categoria");
    setParams(novo);
  }

  return (
    <div>
      <section className="bg-vulto-preto text-creme">
        <div className="mx-auto max-w-[1360px] px-5 pb-16 pt-14 md:px-12 md:pb-20 md:pt-20">
          <p className="text-[11px] uppercase tracking-[0.22em] text-creme/60">Casa Lorenzi+ · Linha</p>
          <h1 className="mt-4 font-sans text-[56px] font-semibold uppercase leading-none tracking-[0.12em] text-creme md:text-[88px]">
            Vulto
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-creme/75">
            A linha urbana da casa: as mesmas medidas, ajustes e trocas da Casa Lorenzi, e os pontos valem no mesmo{" "}
            <Link to="/conta/lorenzi-mais" className="inline-flex items-center gap-1 whitespace-nowrap text-creme underline-offset-4 hover:underline">
              Lorenzi
              <SinalMais claro className="text-[14px]" />
            </Link>
            .
          </p>
          <Link to="/entrar?ativar=1" className="mt-4 inline-block text-[13px] text-creme/70 underline-offset-4 hover:text-creme hover:underline">
            Já era cliente Vulto+ e ainda não tem senha? Ative sua conta
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-[1360px] px-5 md:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-linha py-6">
          <nav className="flex min-w-0 gap-6 overflow-x-auto text-[13px] uppercase tracking-[0.12em] [scrollbar-width:none]" aria-label="Categorias da linha Vulto">
            {["", ...categorias].map((c) => (
              <button
                key={c || "todas"}
                onClick={() => escolher(c)}
                className={cn(
                  "shrink-0 whitespace-nowrap border-b pb-1 transition-colors",
                  categoria === c ? "border-tinta text-tinta" : "border-transparent text-suave hover:text-tinta",
                )}
              >
                {c || "Toda a linha"}
              </button>
            ))}
          </nav>
          <span className="text-sm text-suave">
            {lista.length} {lista.length === 1 ? "peça" : "peças"}
          </span>
        </div>

        {carregando || erro ? <p className="py-6 text-sm text-suave">{carregando ? "Carregando peças..." : erro}</p> : null}

        <div className="grid gap-x-6 gap-y-14 pt-10 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => (
            <CartaoProduto key={p.sku} produto={p} />
          ))}
        </div>
        {!carregando && !erro && lista.length === 0 ? (
          <p className="py-24 text-center font-display text-2xl text-suave">
            As peças da linha Vulto chegam à vitrine em breve. Enquanto isso,{" "}
            <Link to="/loja" className="link-tracejado text-tinta">
              veja a coleção da casa
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
