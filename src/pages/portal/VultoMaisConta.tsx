import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { mensagemDeErro } from "@/api/erros";
import { SinalMais } from "@/components/marca";
import { cn } from "@/components/ui";
import { dataBR } from "@/lib/dados";
import { obterVultoMais, pontos, rotuloTipo, type VultoMais } from "@/lib/vultoMais";

/** Vulto+ na área do cliente: o programa de pontos da Casa Lorenzi+ (uma conta, um login). */
export function VultoMaisConta() {
  const modoApi = usandoApi();
  const [dados, setDados] = useState<VultoMais | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!modoApi) return;
    let vivo = true;
    obterVultoMais()
      .then((r) => vivo && setDados(r))
      .catch((e) => vivo && setErro(mensagemDeErro(e)));
    return () => {
      vivo = false;
    };
  }, [modoApi]);

  if (!modoApi) return <p className="text-suave">O saldo de pontos aparece quando a loja está ligada ao sistema.</p>;
  if (erro) return <p className="text-suave">Não foi possível carregar seus pontos agora. {erro}</p>;
  if (!dados) return <p className="text-suave">Carregando seus pontos...</p>;

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-4">
        <section className="relative overflow-hidden bg-marinho p-7 text-creme" aria-label="Cartão Vulto+">
          <div className="flex items-start justify-between gap-4">
            <span className="flex items-end gap-[0.1em] font-display text-[22px] leading-[0.9]">
              <span>
                Casa
                <br />
                Lorenzi
              </span>
              <SinalMais claro className="mb-[0.06em]" />
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-vulto-neon">
              Vulto
              <SinalMais claro className="text-[13px]" />
            </span>
          </div>
          <p className="mt-8 text-[56px] font-medium leading-none tracking-tight text-vulto-neon tabular-nums">
            {pontos(dados.saldo)}
            <span className="ml-2 text-[15px] uppercase tracking-[0.12em]">pts</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-creme/70">
            <span className="border border-creme/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-creme">{dados.categoria}</span>
            {dados.proxima_categoria && dados.faltam_para_proxima ? (
              <span>
                faltam {pontos(dados.faltam_para_proxima)} pontos no ano para {dados.proxima_categoria}
              </span>
            ) : (
              <span>a categoria mais alta do programa</span>
            )}
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-creme/75">
            O programa de pontos da Casa Lorenzi+: vale nas lojas Casa Lorenzi e Vulto e no site. Uma conta, um login.
          </p>
        </section>
        <p className="flex items-start gap-3 border border-linha bg-papel p-4 text-[14px] text-suave">
          <SinalMais className="mt-1 text-[16px]" />
          <span>
            <b className="font-medium text-tinta">Seus pontos Vulto+ continuam valendo.</b> Mesmo saldo de quem já era cliente Vulto; cada
            crédito vale por 365 dias.
          </span>
        </p>
      </div>

      <section aria-label="Extrato de pontos">
        <h2 className="text-[11px] uppercase tracking-[0.16em] text-suave">Últimas movimentações</h2>
        {dados.extrato.length === 0 ? (
          <p className="mt-4 text-suave">
            Nenhuma movimentação ainda. Os pontos entram a cada compra —{" "}
            <Link to="/loja" className="link-tracejado text-tinta">
              ver a coleção
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-dashed divide-linha border-y border-dashed border-linha">
            {dados.extrato.map((m, i) => (
              <li key={`${m.ocorrido_em}-${i}`} className="flex items-baseline justify-between gap-4 py-3 text-[14px]">
                <span className="w-24 shrink-0 text-suave tabular-nums">{dataBR(m.ocorrido_em.slice(0, 10))}</span>
                <span className="min-w-0 flex-1">
                  <span className="text-tinta">{rotuloTipo(m.tipo)}</span>
                  <span className="block truncate text-[12px] text-suave">{m.descricao}</span>
                </span>
                <b className={cn("font-medium tabular-nums", m.pontos < 0 ? "text-ferrugem" : "text-tinta")}>
                  {m.pontos > 0 ? "+" : "−"}
                  {pontos(Math.abs(m.pontos))}
                </b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
