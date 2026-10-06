import { Link } from "react-router-dom";
import { Foto } from "@/components/vitrine";
import { dataBR, moeda, nomeLoja, type StatusPedido } from "@/lib/dados";
import { fotoEstudio, fotoVestida } from "@/lib/loja";
import { useClienteId } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

const etapas: StatusPedido[] = ["Separação", "Em transporte", "Entregue"];
const frase: Record<StatusPedido, string> = {
  Separação: "Estamos separando e passando as peças no ateliê.",
  "Em transporte": "As peças saíram do ateliê e estão a caminho.",
  Entregue: "Entregue. Se algo não vestir bem, a barra e as mangas a gente ajusta.",
  Cancelado: "Pedido cancelado — o estorno aparece em até duas faturas.",
};

function Progresso({ status }: { status: StatusPedido }) {
  if (status === "Cancelado") return null;
  const atual = etapas.indexOf(status);
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2 text-xs">
      {etapas.map((e, i) => (
        <li key={e}>
          <span className={`mb-2 block border-t-[1.5px] ${i <= atual ? "border-caramelo" : "border-dashed border-linha"}`} />
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

  if (meus.length === 0)
    return (
      <p className="font-display text-2xl text-suave">
        Você ainda não fez pedidos.{" "}
        <Link to="/loja" className="link-tracejado text-tinta">
          Veja a Edição 64
        </Link>
        .
      </p>
    );

  return (
    <div className="space-y-12">
      {meus.map((p) => (
        <article key={p.id} className="alinhavo pt-8 first:border-t-0 first:pt-0">
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-[28px]">Pedido {p.id}</h2>
              <p className="text-sm text-suave">
                {dataBR(p.data)} · {nomeLoja(p.lojaId)}
              </p>
            </div>
            <span className="font-display text-[28px]">{moeda(p.valor)}</span>
          </header>
          <p className="mt-3 font-display text-lg">{frase[p.status]}</p>
          <Progresso status={p.status} />
          <ul className="mt-6 flex flex-wrap gap-6">
            {p.itens.map((i) => (
              <li key={i.sku} className="flex items-center gap-3 text-sm">
                <Foto src={fotoVestida(i.sku, 200) ?? fotoEstudio(i.sku)} className="aspect-[3/4] w-14" />
                <span>
                  <span className="font-display text-[17px]">{i.nome}</span>
                  <span className="block text-xs text-suave">
                    {i.quantidade} × {moeda(i.valor)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <Link to={`/conta/atendimento/novo?pedido=${p.id}`} className="link-tracejado mt-6 inline-block text-sm">
            Precisa de ajuste ou troca? Fale com a casa
          </Link>
        </article>
      ))}
    </div>
  );
}
