import { Navigate, useParams } from "react-router-dom";
import { Conversa } from "@/components/Conversa";
import { Badge, Voltar } from "@/components/ui";
import { dataBR, nomeCliente, nomeLoja, tomChamado } from "@/lib/dados";
import { useClienteId } from "@/lib/sessao";
import { responderChamado, useEstado } from "@/lib/store";

export function MeuChamado() {
  const { id } = useParams();
  const { chamados } = useEstado();
  const clienteId = useClienteId();
  const chamado = chamados.find((c) => c.id === id && c.clienteId === clienteId);
  if (!chamado) return <Navigate to="/conta/atendimento" replace />;

  return (
    <div>
      <Voltar to="/conta/atendimento">Atendimento</Voltar>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-light">{chamado.assunto}</h2>
          <p className="mt-1 text-xs text-suave">
            {chamado.protocolo} · {chamado.motivo} · {nomeLoja(chamado.lojaId)} · aberto em{" "}
            {dataBR(chamado.abertoEm)}
            {chamado.pedidoId ? ` · pedido ${chamado.pedidoId}` : ""}
          </p>
        </div>
        <Badge tom={tomChamado[chamado.status]}>{chamado.status}</Badge>
      </div>
      <Conversa
        chamado={chamado}
        lado="cliente"
        onEnviar={(t) => responderChamado(chamado.id, t, "cliente", nomeCliente(clienteId))}
      />
    </div>
  );
}
