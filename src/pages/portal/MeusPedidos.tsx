import { Link } from "react-router-dom";
import { Badge } from "@/components/ui";
import { FotoProduto } from "@/components/vitrine";
import { dataBR, moeda, nomeLoja, tomPedido, type StatusPedido } from "@/lib/dados";
import { useClienteId } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

const etapas: StatusPedido[] = ["Separação", "Em transporte", "Entregue"];

function Progresso({ status }: { status: StatusPedido }) {
  if (status === "Cancelado") return null;
  const atual = etapas.indexOf(status);
  return (
    <ol className="mt-4 grid grid-cols-3 gap-2">
      {etapas.map((e, i) => (
        <li key={e} className="text-[10px] uppercase tracking-[0.14em]">
          <span className={`mb-2 block h-0.5 ${i <= atual ? "bg-dourado" : "bg-linha"}`} />
          <span className={i <= atual ? "text-tinta" : "text-suave/60"}>{e}</span>
        </li>
      ))}
    </ol>
  );
}

export function MeusPedidos() {
  const { pedidos } = useEstado();
  const clienteId = useClienteId();
  const meus = pedidos.filter((p) => p.clienteId === clienteId);

  return (
    <div>
      <h2 className="mb-6 text-3xl font-light">Meus pedidos</h2>
      <div className="space-y-4">
        {meus.map((p) => (
          <article key={p.id} className="bg-papel p-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-suave">{p.id}</p>
                <p className="mt-1 text-sm">
                  {dataBR(p.data)} · {nomeLoja(p.lojaId)}
                </p>
              </div>
              <div className="text-right">
                <Badge tom={tomPedido[p.status]}>{p.status}</Badge>
                <p className="mt-2 font-display text-2xl text-marinho">{moeda(p.valor)}</p>
              </div>
            </header>
            <Progresso status={p.status} />
            <ul className="mt-5 flex flex-wrap gap-4 border-t border-linha pt-5">
              {p.itens.map((i) => (
                <li key={i.sku} className="flex items-center gap-3 text-sm">
                  <FotoProduto sku={i.sku} alt="" className="aspect-[4/5] w-12" />
                  <span>
                    {i.nome}
                    <span className="block text-xs text-suave">
                      {i.quantidade} × {moeda(i.valor)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <Link
              to={`/conta/atendimento/novo?pedido=${p.id}`}
              className="mt-5 inline-block text-xs font-semibold text-marinho underline underline-offset-4 hover:text-dourado"
            >
              Precisa de ajuda com este pedido?
            </Link>
          </article>
        ))}
        {meus.length === 0 ? (
          <p className="bg-papel p-10 text-center text-sm text-suave">
            Você ainda não fez pedidos.{" "}
            <Link to="/loja" className="text-marinho underline">
              Conheça a coleção
            </Link>
            .
          </p>
        ) : null}
      </div>
    </div>
  );
}
