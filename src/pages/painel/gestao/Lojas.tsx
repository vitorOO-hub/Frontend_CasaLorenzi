import { MapPin, UserRound } from "lucide-react";
import { AvisoErro, Card, Titulo } from "@/components/ui";
import { useLojasDaRede } from "@/hooks/useDashboardGerente";
import { moedaBR } from "@/lib/chamadosUi";

/** Cartão de cada loja com números reais do banco: gerente vê a unidade dele, o admin vê a rede. */
export function Lojas() {
  const consulta = useLojasDaRede();
  const lojas = consulta.dados ?? [];

  return (
    <div>
      <Titulo
        titulo="Lojas"
        descricao={lojas.length === 1 ? "Os números da sua unidade." : "As casas da rede lado a lado."}
      />
      <AvisoErro erro={consulta.erro} className="mb-6" />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lojas.map((l) => (
          <Card key={l.id_loja} className="p-6">
            <p className="rotulo !text-dourado">{[l.cidade, l.uf].filter(Boolean).join(", ") || "—"}</p>
            <h2 className="mt-1 text-3xl">{l.nome}</h2>
            {l.endereco ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-suave">
                <MapPin className="h-3.5 w-3.5" /> {l.endereco}
              </p>
            ) : null}
            <p className="mt-1 flex items-center gap-2 text-xs text-suave">
              <UserRound className="h-3.5 w-3.5" /> {l.gerente ?? "Sem gerente"} · {l.equipe} no time
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-linha">
              {(
                [
                  ["Unidades", l.unidades_em_estoque],
                  ["SKUs em alerta", l.pecas_em_alerta],
                  ["Vendas (30 dias)", moedaBR(l.vendas_30_dias)],
                  ["Chamados abertos", l.chamados_abertos],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="bg-papel p-3">
                  <dt className="rotulo !text-[9px]">{k}</dt>
                  <dd className="mt-1 font-display text-2xl text-marinho">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
      {lojas.length === 0 ? (
        <p className="py-10 text-center text-sm text-suave">{consulta.carregando ? "Carregando as lojas…" : "Nenhuma loja."}</p>
      ) : null}
    </div>
  );
}
