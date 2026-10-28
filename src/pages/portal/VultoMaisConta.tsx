import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { mensagemDeErro } from "@/api/erros";
import { SinalMais } from "@/components/marca";
import { cn } from "@/components/ui";
import { dataBR } from "@/lib/dados";
import { nomeDaCategoria, type Beneficio } from "@/lib/beneficiosLorenziMais";
import { obterVultoMais, pontos, rotuloTipo, textoDoAviso, type VultoMais } from "@/lib/vultoMais";

/** Lorenzi+ (antigo Vulto+) na área do cliente: o programa de pontos da casa (uma conta, um login). */
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

  const aviso = textoDoAviso(dados);

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-4">
        <section className="relative overflow-hidden bg-marinho p-7 text-creme" aria-label="Cartão Lorenzi+">
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
              Lorenzi
              <SinalMais claro className="text-[13px]" />
            </span>
          </div>
          <p className="mt-8 text-[56px] font-medium leading-none tracking-tight text-vulto-neon tabular-nums">
            {pontos(dados.saldo)}
            <span className="ml-2 text-[15px] uppercase tracking-[0.12em]">pts</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-creme/70">
            <span className="border border-creme/40 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-creme">{nomeDaCategoria(dados.categoria)}</span>
            {dados.proxima_categoria && dados.faltam_para_proxima ? (
              <span>
                faltam {pontos(dados.faltam_para_proxima)} pontos no ano para {nomeDaCategoria(dados.proxima_categoria)}
              </span>
            ) : (
              <span>a categoria mais alta do programa</span>
            )}
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-creme/75">
            Lorenzi+, o programa de pontos da casa: cada R$ 1 em compra vale 1 ponto, e no site vale o dobro. Vale nas lojas Casa Lorenzi e Vulto. Uma conta, um login.
          </p>
        </section>
        <Beneficios dados={dados} />
        {aviso ? (
          <p role="status" className="border border-ferrugem/40 bg-papel p-4 text-[14px] text-tinta">
            <b className="font-medium">{aviso}.</b> Use antes que expirem.
          </p>
        ) : null}
        <p className="flex items-start gap-3 border border-linha bg-papel p-4 text-[14px] text-suave">
          <SinalMais className="mt-1 text-[16px]" />
          <span>
            <b className="font-medium text-tinta">Pontos do Vulto+ continuam valendo no Lorenzi+.</b> Mesmo saldo de quem já era cliente Vulto; cada
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

/** Os benefícios da categoria do cliente e o que ele ganha ao subir para a próxima. */
export function Beneficios({ dados }: { dados: VultoMais }) {
  const atuais = new Set(dados.beneficios.map((b) => b.codigo));
  const novos = dados.proximos_beneficios.filter((b) => !atuais.has(b.codigo));
  return (
    <section aria-label="Seus benefícios" className="border border-linha bg-papel p-5">
      <h2 className="text-[11px] uppercase tracking-[0.16em] text-suave">Seus benefícios · {nomeDaCategoria(dados.categoria)}</h2>
      {dados.beneficios.length ? (
        <ListaDeBeneficios itens={dados.beneficios} />
      ) : (
        <p className="mt-3 text-[14px] text-suave">Os benefícios começam na categoria Prata.</p>
      )}
      {dados.proxima_categoria && novos.length ? (
        <div className="mt-5 border-t border-dashed border-linha pt-4">
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-suave">Na categoria {nomeDaCategoria(dados.proxima_categoria)}</h3>
          <ListaDeBeneficios itens={novos} apagado />
        </div>
      ) : null}
    </section>
  );
}

function ListaDeBeneficios({ itens, apagado = false }: { itens: Beneficio[]; apagado?: boolean }) {
  return (
    <ul className="mt-3 space-y-3">
      {itens.map((b) => (
        <li key={b.codigo} className="flex items-start gap-3 text-[14px]">
          <SinalMais className={cn("mt-[3px] shrink-0 text-[14px]", apagado && "opacity-40")} />
          <span>
            <b className={cn("block font-medium", apagado ? "text-suave" : "text-tinta")}>{b.titulo}</b>
            <span className="text-[13px] text-suave">{b.descricao}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

