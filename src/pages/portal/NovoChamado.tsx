import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/components/ui";
import { botaoLoja } from "@/components/vitrine";
import * as acoes from "@/lib/acoes";
import { clientes, dataBR, type Chamado } from "@/lib/dados";
import { useClienteId } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { useAcao } from "@/lib/useAcao";
import { CampoLoja, campoLoja } from "./Checkout";

const motivos: { valor: Chamado["motivo"]; rotulo: string }[] = [
  { valor: "Troca", rotulo: "Troca ou ajuste" },
  { valor: "Defeito", rotulo: "Algum problema na peça" },
  { valor: "Entrega", rotulo: "Entrega" },
  { valor: "Dúvida", rotulo: "Dúvida sobre tecido ou tamanho" },
];

export function NovoChamado() {
  const [params] = useSearchParams();
  const sku = params.get("sku") ?? undefined;
  const { pedidos, produtos } = useEstado();
  const clienteId = useClienteId();
  const cliente = clientes.find((c) => c.id === clienteId)!;
  const meusPedidos = pedidos.filter((p) => p.clienteId === cliente.id);
  const peca = produtos.find((p) => p.sku === sku);

  const [assunto, setAssunto] = useState(peca ? `Dúvida sobre ${peca.nome}` : "");
  const [motivo, setMotivo] = useState<Chamado["motivo"]>(peca ? "Dúvida" : "Troca");
  const [pedidoId, setPedidoId] = useState(params.get("pedido") ?? "");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<string[]>([]);
  const [criado, setCriado] = useState<{ id: string; protocolo: string } | null>(null);
  const { executar, ocupado, erro } = useAcao();

  if (criado) {
    return (
      <div className="max-w-xl">
        <h2 className="text-[40px] leading-tight">Recebemos sua mensagem.</h2>
        <p className="mt-3 font-display text-xl">Protocolo {criado.protocolo}. Alguém da loja responde em até um dia útil — normalmente bem antes.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to={`/conta/atendimento/${criado.id}`} className={botaoLoja()}>
            Ver a conversa
          </Link>
          <Link to="/conta/atendimento" className={botaoLoja("contorno")}>
            Todas as conversas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void executar("chamado", async () => {
          const novo = await acoes.abrirChamado({ assunto, motivo, descricao, pedidoId: pedidoId || undefined, sku, anexos });
          setCriado({ id: novo.id, protocolo: novo.protocolo });
        });
      }}
    >
      <Link to="/conta/atendimento" className="link-tracejado text-sm">
        Conversas com a casa
      </Link>
      <h2 className="text-[40px] leading-tight">Escrever para a casa</h2>
      <div>
        <span className="mb-2 block text-sm text-suave">Sobre o que é?</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {motivos.map((m) => (
            <button
              key={m.valor}
              type="button"
              onClick={() => setMotivo(m.valor)}
              className={cn(
                "border-[1.5px] px-4 py-3 text-left text-[15px]",
                motivo === m.valor ? "border-dashed border-tinta bg-pergaminho" : "border-linha hover:border-tinta/50",
              )}
            >
              {m.rotulo}
            </button>
          ))}
        </div>
      </div>
      <CampoLoja rotulo="Assunto">
        <input required value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: ajustar a barra da calça" className={campoLoja} />
      </CampoLoja>
      <CampoLoja rotulo="Pedido relacionado">
        <select value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} className={campoLoja}>
          <option value="">Nenhum</option>
          {meusPedidos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id} · {dataBR(p.data)}
            </option>
          ))}
        </select>
      </CampoLoja>
      <CampoLoja rotulo="Conte com detalhes">
        <textarea required rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={campoLoja} />
      </CampoLoja>
      <CampoLoja rotulo="Fotos da peça (opcional)">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setAnexos(Array.from(e.target.files ?? []).map((f) => f.name))}
          className={cn(campoLoja, "file:mr-3 file:border-0 file:bg-palha file:px-3 file:py-1 file:text-xs")}
        />
      </CampoLoja>
      {erro ? <p role="alert" className="text-sm text-perigo">{erro}</p> : null}
      <button type="submit" disabled={ocupado !== null} className={botaoLoja()}>
        {ocupado ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
