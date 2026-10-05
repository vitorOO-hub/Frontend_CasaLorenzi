import { clientes, dataBR, moeda, nomeLoja } from "@/lib/dados";
import { useClienteId } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

export function Perfil() {
  const { pedidos, chamados } = useEstado();
  const clienteId = useClienteId();
  const cliente = clientes.find((c) => c.id === clienteId)!;
  const meusPedidos = pedidos.filter((p) => p.clienteId === cliente.id && p.status !== "Cancelado");

  const dados = [
    ["Nome", cliente.nome],
    ["E-mail", cliente.email],
    ["Telefone", cliente.telefone],
    ["Cidade", cliente.cidade],
    ["Cliente desde", dataBR(cliente.desde)],
    ["Casa preferida", nomeLoja(meusPedidos[0]?.lojaId ?? "l1")],
  ];

  const resumo = [
    ["Pedidos", meusPedidos.length],
    ["Investido na casa", moeda(meusPedidos.reduce((s, p) => s + p.valor, 0))],
    ["Chamados", chamados.filter((c) => c.clienteId === cliente.id).length],
  ];

  return (
    <div>
      <h2 className="mb-6 text-3xl font-light">Meus dados</h2>
      <div className="mb-4 grid grid-cols-3 gap-px bg-linha">
        {resumo.map(([rotulo, valor]) => (
          <div key={rotulo} className="bg-papel p-5 text-center">
            <p className="font-display text-3xl text-marinho">{valor}</p>
            <p className="rotulo mt-1">{rotulo}</p>
          </div>
        ))}
      </div>
      <dl className="grid gap-6 bg-papel p-6 sm:grid-cols-2">
        {dados.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="rotulo">{rotulo}</dt>
            <dd className="mt-1 text-sm">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-suave">
        Estes dados são usados no atendimento de qualquer casa da rede. Para alterá-los, fale com o
        atendimento.
      </p>
    </div>
  );
}
