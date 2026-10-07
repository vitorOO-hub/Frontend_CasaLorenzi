import { Link } from "react-router-dom";
import { clientes, dataBR, moeda, nomeLoja } from "@/lib/dados";
import { casas } from "@/lib/loja";
import { useClienteId } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

export function Perfil() {
  const { pedidos, chamados } = useEstado();
  const clienteId = useClienteId();
  const cliente = clientes.find((c) => c.id === clienteId)!;
  const meusPedidos = pedidos.filter((p) => p.clienteId === cliente.id && p.status !== "Cancelado");
  const casaId = meusPedidos[0]?.lojaId ?? "l1";

  const dados: [string, string][] = [
    ["Nome", cliente.nome],
    ["E-mail", cliente.email],
    ["Telefone", cliente.telefone],
    ["Cidade", cliente.cidade],
    ["Cliente desde", dataBR(cliente.desde)],
    ["Sua casa", nomeLoja(casaId)],
  ];

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_22rem]">
      <dl>
        {dados.map(([k, v]) => (
          <div key={k} className="alinhavo grid grid-cols-[140px_1fr] py-3.5 text-[15px]">
            <dt className="text-suave">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <p className="mt-6 text-sm text-suave">
          Para mudar algum dado,{" "}
          <Link to="/conta/atendimento/novo" className="link-tracejado text-tinta">
            escreva para a casa
          </Link>
          .
        </p>
      </dl>

      <aside className="costurado h-fit bg-pergaminho p-8">
        <p className="font-display text-[22px] leading-snug">
          {meusPedidos.length} {meusPedidos.length === 1 ? "pedido" : "pedidos"}, {moeda(meusPedidos.reduce((s, p) => s + p.valor, 0))} em peças e{" "}
          {chamados.filter((c) => c.clienteId === cliente.id).length} conversas com a casa.
        </p>
        <p className="mt-5 font-mao text-[14px] leading-relaxed text-caramelo">
          Sua casa é o {nomeLoja(casaId)}. Quem faz os seus ajustes é {casas[casaId]?.alfaiate.split(",")[0] ?? "o alfaiate"}.
        </p>
      </aside>
    </div>
  );
}
