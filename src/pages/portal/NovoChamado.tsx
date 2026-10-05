import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Botao, Campo, Select, Voltar, classesBotao, inputClasses } from "@/components/ui";
import { clientes, dataBR, type Chamado } from "@/lib/dados";
import { useClienteId } from "@/lib/sessao";
import { abrirChamado, useEstado } from "@/lib/store";

const motivos: Chamado["motivo"][] = ["Troca", "Defeito", "Entrega", "Dúvida"];

export function NovoChamado() {
  const [params] = useSearchParams();
  const pedidoInicial = params.get("pedido") ?? "";
  const sku = params.get("sku") ?? undefined;
  const { pedidos, produtos } = useEstado();
  const clienteId = useClienteId();
  const cliente = clientes.find((c) => c.id === clienteId)!;
  const meusPedidos = pedidos.filter((p) => p.clienteId === cliente.id);
  const peca = produtos.find((p) => p.sku === sku);

  const [assunto, setAssunto] = useState(peca ? `Dúvida sobre ${peca.nome}` : "");
  const [motivo, setMotivo] = useState<Chamado["motivo"]>(peca ? "Dúvida" : "Troca");
  const [pedidoId, setPedidoId] = useState(pedidoInicial);
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<string[]>([]);
  const [criado, setCriado] = useState<{ id: string; protocolo: string } | null>(null);

  if (criado) {
    return (
      <div className="bg-papel p-10 text-center">
        <span className="filete mx-auto mb-5" />
        <p className="rotulo !text-dourado">Chamado registrado</p>
        <h2 className="mt-2 text-4xl font-light">{criado.protocolo}</h2>
        <p className="mt-3 text-sm text-suave">
          Recebemos sua mensagem. Nosso time responde em até 1 dia útil.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to={`/conta/atendimento/${criado.id}`} className={classesBotao()}>
            Acompanhar conversa
          </Link>
          <Link to="/conta/atendimento" className={classesBotao("secundario")}>
            Ver todos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Voltar to="/conta/atendimento">Atendimento</Voltar>
      <h2 className="text-3xl font-light">Abrir chamado</h2>
      <p className="mt-1 text-sm text-suave">
        Conte o que aconteceu — o time já enxerga seu histórico em todas as casas.
      </p>

      <form
        className="mt-6 space-y-4 bg-papel p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const relacionado = meusPedidos.find((p) => p.id === pedidoId);
          const novo = abrirChamado({
            clienteId: cliente.id,
            nomeCliente: cliente.nome,
            assunto,
            motivo,
            descricao,
            lojaId: relacionado?.lojaId ?? "l1",
            pedidoId: pedidoId || undefined,
            sku,
            anexos,
          });
          setCriado({ id: novo.id, protocolo: novo.protocolo });
        }}
      >
        <Campo label="Assunto">
          <input
            required
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Ex.: Ajuste de barra da calça"
            className={inputClasses}
          />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Motivo">
            <Select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as Chamado["motivo"])}
              opcoes={motivos.map((m) => ({ value: m, label: m }))}
            />
          </Campo>
          <Campo label="Pedido relacionado">
            <Select
              value={pedidoId}
              onChange={(e) => setPedidoId(e.target.value)}
              opcoes={[
                { value: "", label: "Nenhum" },
                ...meusPedidos.map((p) => ({ value: p.id, label: `${p.id} · ${dataBR(p.data)}` })),
              ]}
            />
          </Campo>
        </div>
        <Campo label="Mensagem">
          <textarea
            required
            rows={5}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva com detalhes"
            className={inputClasses}
          />
        </Campo>
        <Campo label="Fotos (opcional)" ajuda={anexos.length ? anexos.join(", ") : undefined}>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setAnexos(Array.from(e.target.files ?? []).map((f) => f.name))}
            className={`${inputClasses} file:mr-3 file:border-0 file:bg-areia file:px-3 file:py-1 file:text-xs`}
          />
        </Campo>
        <div className="flex justify-end pt-2">
          <Botao type="submit">Enviar chamado</Botao>
        </div>
      </form>
    </div>
  );
}
