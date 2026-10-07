import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { Conversa } from "@/components/Conversa";
import { AvisoErro, Badge, Botao, Card, Voltar } from "@/components/ui";
import { useDetalheChamado } from "@/hooks/useChamados";
import { useChatAoVivo } from "@/hooks/useChat";
import { assumirChamado, resolverChamado } from "@/lib/chamadosApi";
import { chamadoFinalizado, dataBRdoIso, dataHoraBRdoIso, moedaBR, tomPrioridade, tomStatus } from "@/lib/chamadosUi";
import { podeAprovar, usePapel } from "@/lib/sessao";
import { useAcao } from "@/lib/useAcao";

/** Tela do chamado: conversa, ficha do cliente e as ações de assumir, responder e resolver. */
export function Chamado() {
  const { id = "" } = useParams();
  const papel = usePapel();
  const detalhe = useDetalheChamado(id);
  const chat = useChatAoVivo(id);
  const { recarregar: recarregarDetalhe } = detalhe;
  const { sessao } = chat;
  const { executar, ocupado, erro, limparErro } = useAcao();
  const chamado = detalhe.dados;

  // Outra pessoa assumiu ou encerrou o chamado: a ficha se atualiza sozinha (via Realtime).
  const assinatura = sessao ? `${sessao.status.codigo}|${sessao.id_usuario_responsavel ?? ""}` : null;
  const anterior = useRef<string | null>(null);
  useEffect(() => {
    if (assinatura && anterior.current && anterior.current !== assinatura) recarregarDetalhe();
    anterior.current = assinatura;
  }, [assinatura, recarregarDetalhe]);

  if (!chamado) {
    return (
      <div>
        <Voltar to="/painel/atendimento">Fila de chamados</Voltar>
        {detalhe.erro ? (
          <AvisoErro erro={detalhe.erro} className="mt-6" />
        ) : (
          <p className="py-16 text-center text-sm text-suave">Carregando o chamado…</p>
        )}
      </div>
    );
  }

  const gestor = podeAprovar(papel);
  const finalizado = chamadoFinalizado(chamado.status.codigo);
  const semResponsavel = chamado.id_usuario_responsavel === null;
  // O backend também barra, mas a tela evita o clique que daria 409: com outra pessoa só a gestão responde.
  const comOutraPessoa = !semResponsavel && !chamado.sou_responsavel && !gestor;

  const dados: [string, string][] = [
    ["Protocolo", chamado.protocolo],
    ["Motivo", chamado.categoria.nome],
    ["Canal", chamado.canal.nome],
    ["Loja", chamado.loja_nome ?? "Sem loja"],
    ["Aberto em", dataBRdoIso(chamado.aberto_em)],
  ];
  if (chamado.pedido) dados.push(["Pedido", `${chamado.pedido.numero_pedido} · ${chamado.pedido.status}`]);
  for (const p of chamado.pecas) dados.push(["Peça", `${p.nome} · ${p.cor}, ${p.tamanho}`]);

  const mensagens = chat.mensagens.map((m) => ({
    id: m.id_mensagem,
    autor: m.autor,
    nome: m.nome,
    data: dataHoraBRdoIso(m.enviada_em),
    texto: m.texto,
  }));

  const agir = (chave: string, acao: () => Promise<unknown>) =>
    executar(chave, acao).then((ok) => {
      // Qualquer ação muda o chamado (responsável, status, conversa): relê tudo do servidor.
      recarregarDetalhe();
      void chat.recarregar();
      return ok;
    });

  // Com a sessão aberta, quem decide se pode responder é o servidor; antes dela vale a regra local.
  let aviso: string | undefined;
  if (sessao) aviso = sessao.pode_responder ? undefined : (sessao.motivo_bloqueio ?? undefined);
  else if (finalizado) aviso = "Este chamado foi encerrado. Não é possível enviar novas mensagens.";
  else if (comOutraPessoa) aviso = `Este chamado está com ${chamado.responsavel_nome}. Só ele ou a gestão pode responder.`;

  return (
    <div>
      <Voltar to="/painel/atendimento">Fila de chamados</Voltar>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex gap-2">
            <Badge tom={tomPrioridade(chamado.prioridade.codigo)}>Prioridade {chamado.prioridade.nome.toLowerCase()}</Badge>
            <Badge tom={tomStatus(chamado.status.codigo)}>{chamado.status.nome}</Badge>
          </div>
          <h1 className="text-4xl font-light">{chamado.assunto}</h1>
          <p className="mt-1 text-sm text-suave">
            {chamado.cliente.nome} · {chamado.protocolo}
          </p>
        </div>
        {!semResponsavel ? (
          <p className="text-sm text-suave">
            Com <strong className="text-tinta">{chamado.sou_responsavel ? "você" : chamado.responsavel_nome}</strong>
          </p>
        ) : !finalizado ? (
          <Botao disabled={ocupado !== null} onClick={() => void agir("assumir", () => assumirChamado(id))}>
            {ocupado === "assumir" ? "Assumindo…" : "Assumir chamado"}
          </Botao>
        ) : null}
      </div>
      <AvisoErro erro={erro ?? chat.erro} onFechar={limparErro} className="mb-6" />
      <div className="-mt-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-suave">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={chat.conexao === "ao_vivo" ? "h-2 w-2 rounded-full bg-emerald-500" : "h-2 w-2 rounded-full bg-amber-500"}
          />
          {chat.conexao === "ao_vivo" ? "Ao vivo" : chat.conexao === "conectando" ? "Conectando…" : "Reconectando…"}
        </span>
        {chat.presentes.length ? <span>Também nesta conversa: {chat.presentes.join(", ")}</span> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Conversa
          lado="atendente"
          mensagens={mensagens}
          anexos={chamado.anexos.map((a) => ({ id: a.id_anexo, nome: a.nome }))}
          encerrado={finalizado}
          bloqueioAviso={aviso}
          digitando={chat.digitando}
          onDigitando={chat.avisarDigitando}
          onEnviar={(t) => agir("mensagem", () => chat.enviar(t))}
          acoesExtras={
            !finalizado && (chamado.sou_responsavel || gestor) ? (
              <Botao variante="secundario" disabled={ocupado !== null} onClick={() => void agir("resolver", () => resolverChamado(id))}>
                {ocupado === "resolver" ? "Resolvendo…" : "Marcar como resolvido"}
              </Botao>
            ) : null
          }
        />

        <div className="space-y-4">
          <Card className="p-5">
            <p className="rotulo">Cliente</p>
            <p className="mt-2 font-display text-xl">{chamado.cliente.nome}</p>
            <p className="mt-1 break-all text-sm text-suave">{chamado.cliente.email}</p>
            {chamado.cliente.telefone ? <p className="text-sm text-suave">{chamado.cliente.telefone}</p> : null}
            <p className="text-sm text-suave">
              {chamado.cliente.cidade ? `${chamado.cliente.cidade} · ` : ""}desde {dataBRdoIso(chamado.cliente.cliente_desde)}
            </p>
            <Link
              to={`/painel/atendimento/clientes/${chamado.cliente.id_cliente}`}
              className="mt-3 inline-block text-xs font-semibold text-marinho hover:text-dourado"
            >
              Abrir ficha do cliente →
            </Link>
          </Card>

          <Card className="p-5">
            <p className="rotulo mb-3">Detalhes</p>
            <dl className="space-y-2 text-sm">
              {dados.map(([k, v], i) => (
                <div key={`${k}-${i}`} className="flex justify-between gap-3">
                  <dt className="text-suave">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {chamado.compras_recentes ? (
            <Card className="p-5">
              <p className="rotulo mb-3">Compras recentes</p>
              <ul className="space-y-2 text-sm">
                {chamado.compras_recentes.map((p) => (
                  <li key={p.id_pedido} className="flex justify-between gap-3">
                    <span>
                      {p.numero_pedido} <span className="text-xs text-suave">· {dataBRdoIso(p.criado_em)}</span>
                    </span>
                    <span className="font-medium">{moedaBR(p.valor_total)}</span>
                  </li>
                ))}
                {chamado.compras_recentes.length === 0 ? <li className="text-suave">Sem compras.</li> : null}
              </ul>
            </Card>
          ) : null}

          <Card className="p-5">
            <p className="rotulo mb-3">Outros chamados</p>
            <ul className="space-y-2 text-sm">
              {chamado.outros_chamados.map((c) => (
                <li key={c.id_atendimento}>
                  <Link to={`/painel/atendimento/chamado/${c.id_atendimento}`} className="hover:text-marinho">
                    {c.assunto}
                  </Link>
                  <span className="block text-xs text-suave">
                    {c.protocolo} · {c.status.nome}
                  </span>
                </li>
              ))}
              {chamado.outros_chamados.length === 0 ? <li className="text-suave">Primeiro contato do cliente.</li> : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
