import { Link, Navigate, useParams } from "react-router-dom";
import { Conversa } from "@/components/Conversa";
import { AvisoErro, Badge, Botao, Card, Voltar } from "@/components/ui";
import * as acoes from "@/lib/acoes";
import {
  clientes,
  dataBR,
  moeda,
  nomeLoja,
  prioridadeChamado,
  tomChamado,
  tomPrioridade,
} from "@/lib/dados";
import { podeAprovar, useNomeUsuario, usePapel } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { useAcao } from "@/lib/useAcao";

export function Chamado() {
  const { id } = useParams();
  const { chamados, produtos, pedidos } = useEstado();
  const usuario = useNomeUsuario();
  const papel = usePapel();
  const { executar, ocupado, erro, limparErro } = useAcao();
  const chamado = chamados.find((c) => c.id === id);
  if (!chamado) return <Navigate to="/painel/atendimento" replace />;

  const cliente = clientes.find((c) => c.id === chamado.clienteId)!;
  const anteriores = chamados.filter((c) => c.clienteId === cliente.id && c.id !== chamado.id);
  const peca = produtos.find((p) => p.sku === chamado.sku);
  const pedido = pedidos.find((p) => p.id === chamado.pedidoId);
  const compras = pedidos.filter((p) => p.clienteId === cliente.id);
  // Gestão vê a ficha completa (compras e valores); o atendente vê contato e chamados.
  const gestor = podeAprovar(papel);
  const pr = prioridadeChamado(chamado);

  const dados: [string, string][] = [
    ["Protocolo", chamado.protocolo],
    ["Motivo", chamado.motivo],
    ["Canal", chamado.canal],
    ["Loja", nomeLoja(chamado.lojaId)],
    ["Aberto em", dataBR(chamado.abertoEm)],
  ];
  if (pedido) dados.push(["Pedido", `${pedido.id} · ${pedido.status}`]);
  if (peca) dados.push(["Peça", peca.nome]);

  return (
    <div>
      <Voltar to="/painel/atendimento">Fila de chamados</Voltar>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex gap-2">
            <Badge tom={tomPrioridade[pr]}>Prioridade {pr.toLowerCase()}</Badge>
            <Badge tom={tomChamado[chamado.status]}>{chamado.status}</Badge>
          </div>
          <h1 className="text-4xl font-light">{chamado.assunto}</h1>
          <p className="mt-1 text-sm text-suave">
            {cliente.nome} · {chamado.protocolo}
          </p>
        </div>
        {chamado.atendente ? (
          <p className="text-sm text-suave">
            Com <strong className="text-tinta">{chamado.atendente === usuario ? "você" : chamado.atendente}</strong>
          </p>
        ) : chamado.status !== "Resolvido" ? (
          <Botao disabled={ocupado !== null} onClick={() => void executar("assumir", () => acoes.assumirChamado(chamado.id))}>
            {ocupado === "assumir" ? "Assumindo…" : "Assumir chamado"}
          </Botao>
        ) : null}
      </div>
      <AvisoErro erro={erro} onFechar={limparErro} className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Conversa
          chamado={chamado}
          lado="atendente"
          onEnviar={(t) => executar("mensagem", () => acoes.enviarMensagem(chamado.id, t))}
          acoesExtras={
            chamado.status !== "Resolvido" ? (
              <Botao variante="secundario" disabled={ocupado !== null} onClick={() => void executar("resolver", () => acoes.resolverChamado(chamado.id))}>
                {ocupado === "resolver" ? "Resolvendo…" : "Marcar como resolvido"}
              </Botao>
            ) : null
          }
        />

        <div className="space-y-4">
          <Card className="p-5">
            <p className="rotulo">Cliente</p>
            <p className="mt-2 font-display text-xl">{cliente.nome}</p>
            <p className="mt-1 text-sm text-suave">{cliente.email}</p>
            <p className="text-sm text-suave">{cliente.telefone}</p>
            <p className="text-sm text-suave">
              {cliente.cidade} · desde {dataBR(cliente.desde)}
            </p>
            {gestor ? (
              <Link to={`/painel/atendimento/clientes/${cliente.id}`} className="mt-3 inline-block text-xs font-semibold text-marinho hover:text-dourado">
                Abrir ficha completa →
              </Link>
            ) : null}
          </Card>

          <Card className="p-5">
            <p className="rotulo mb-3">Detalhes</p>
            <dl className="space-y-2 text-sm">
              {dados.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-suave">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {gestor ? (
            <Card className="p-5">
              <p className="rotulo mb-3">Compras recentes</p>
              <ul className="space-y-2 text-sm">
                {compras.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span>
                      {p.id} <span className="text-xs text-suave">· {dataBR(p.data)}</span>
                    </span>
                    <span className="font-medium">{moeda(p.valor)}</span>
                  </li>
                ))}
                {compras.length === 0 ? <li className="text-suave">Sem compras.</li> : null}
              </ul>
            </Card>
          ) : null}

          <Card className="p-5">
            <p className="rotulo mb-3">Outros chamados</p>
            <ul className="space-y-2 text-sm">
              {anteriores.map((c) => (
                <li key={c.id}>
                  <Link to={`/painel/atendimento/chamado/${c.id}`} className="hover:text-marinho">
                    {c.assunto}
                  </Link>
                  <span className="block text-xs text-suave">
                    {c.protocolo} · {c.status}
                  </span>
                </li>
              ))}
              {anteriores.length === 0 ? <li className="text-suave">Primeiro contato do cliente.</li> : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
