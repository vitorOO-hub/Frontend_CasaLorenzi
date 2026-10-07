import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { mensagemDeErro } from "@/api/erros";
import { cn } from "@/components/ui";
import { botaoLoja } from "@/components/vitrine";
import * as acoes from "@/lib/acoes";
import { abrirChamadoCliente, listarOpcoesChamadoCliente } from "@/lib/chamadosClienteApi";
import { listarPedidosCliente, type PedidoClienteApi } from "@/lib/comprasClienteApi";
import { clientes, dataBR, type Chamado } from "@/lib/dados";
import { useClienteId, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { useAcao } from "@/lib/useAcao";
import { CampoLoja, campoLoja } from "./Checkout";

const categoriaPorMotivo: Record<Chamado["motivo"], string> = {
  Troca: "troca_devolucao",
  Defeito: "produto",
  Entrega: "entrega",
  Dúvida: "outro",
};

const motivos: { valor: Chamado["motivo"]; rotulo: string; categoria: string }[] = [
  { valor: "Troca", rotulo: "Troca ou ajuste", categoria: categoriaPorMotivo.Troca },
  { valor: "Defeito", rotulo: "Algum problema na peça", categoria: categoriaPorMotivo.Defeito },
  { valor: "Entrega", rotulo: "Entrega", categoria: categoriaPorMotivo.Entrega },
  { valor: "Dúvida", rotulo: "Dúvida sobre tecido ou tamanho", categoria: categoriaPorMotivo.Dúvida },
];

function pedidoApiParaOpcao(pedido: PedidoClienteApi) {
  return { id: pedido.id_pedido, rotulo: pedido.numero_pedido, data: pedido.criado_em.slice(0, 10) };
}

export function NovoChamado() {
  const [params] = useSearchParams();
  const sku = params.get("sku") ?? undefined;
  const sessao = useSessao();
  const modoApi = usandoApi();
  const { pedidos, produtos } = useEstado();
  const clienteId = useClienteId();
  const cliente = clientes.find((c) => c.id === clienteId)!;
  const [pedidosApi, setPedidosApi] = useState<PedidoClienteApi[] | null>(null);
  const [categoriasApi, setCategoriasApi] = useState<Set<string> | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const meusPedidos = useMemo(() => {
    if (pedidosApi) return pedidosApi.map(pedidoApiParaOpcao);
    return pedidos.filter((p) => p.clienteId === cliente.id).map((p) => ({ id: p.id, rotulo: p.id, data: p.data }));
  }, [cliente.id, pedidos, pedidosApi]);
  const peca = produtos.find((p) => p.sku === sku);
  const motivosDisponiveis = motivos.filter((m) => !categoriasApi || categoriasApi.has(m.categoria));

  const [assunto, setAssunto] = useState(peca ? `Dúvida sobre ${peca.nome}` : "");
  const [motivo, setMotivo] = useState<Chamado["motivo"]>(peca ? "Dúvida" : "Troca");
  const [pedidoId, setPedidoId] = useState(params.get("pedido") ?? "");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<string[]>([]);
  const [criado, setCriado] = useState<{ id: string; protocolo: string } | null>(null);
  const { executar, ocupado, erro } = useAcao();
  const motivoSelecionado = motivosDisponiveis.some((m) => m.valor === motivo) ? motivo : (motivosDisponiveis[0]?.valor ?? motivo);

  useEffect(() => {
    if (!modoApi || sessao?.tipo !== "cliente") return;
    let ativo = true;
    Promise.all([listarOpcoesChamadoCliente(), listarPedidosCliente()])
      .then(([opcoes, pedidos]) => {
        if (!ativo) return;
        setCategoriasApi(new Set(opcoes.categorias.map((c) => c.codigo)));
        setPedidosApi(pedidos);
      })
      .catch((erro) => {
        if (ativo) setErroApi(mensagemDeErro(erro));
      });
    return () => {
      ativo = false;
    };
  }, [modoApi, sessao?.tipo]);

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

  if (modoApi && (pedidosApi === null || categoriasApi === null) && !erroApi) {
    return <p className="font-display text-2xl text-suave">Carregando atendimento...</p>;
  }

  if (erroApi) {
    return <p role="alert" className="font-display text-2xl text-perigo">{erroApi}</p>;
  }

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void executar("chamado", async () => {
          if (modoApi) {
            const novo = await abrirChamadoCliente({ assunto, categoria: categoriaPorMotivo[motivoSelecionado], descricao, id_pedido: pedidoId || undefined });
            setCriado({ id: novo.id_atendimento, protocolo: novo.protocolo });
            return;
          }
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
          {motivosDisponiveis.map((m) => (
            <button
              key={m.valor}
              type="button"
              onClick={() => setMotivo(m.valor)}
              className={cn(
                "border-[1.5px] px-4 py-3 text-left text-[15px]",
                motivoSelecionado === m.valor ? "border-dashed border-tinta bg-pergaminho" : "border-linha hover:border-tinta/50",
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
              {p.rotulo} · {dataBR(p.data)}
            </option>
          ))}
        </select>
      </CampoLoja>
      <CampoLoja rotulo="Conte com detalhes">
        <textarea required rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} className={campoLoja} />
      </CampoLoja>
      {modoApi ? null : (
        <CampoLoja rotulo="Fotos da peça (opcional)">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setAnexos(Array.from(e.target.files ?? []).map((f) => f.name))}
            className={cn(campoLoja, "file:mr-3 file:border-0 file:bg-palha file:px-3 file:py-1 file:text-xs")}
          />
        </CampoLoja>
      )}
      {erro ? <p role="alert" className="text-sm text-perigo">{erro}</p> : null}
      <button type="submit" disabled={ocupado !== null} className={botaoLoja()}>
        {ocupado ? "Enviando…" : "Enviar"}
      </button>
    </form>
  );
}
