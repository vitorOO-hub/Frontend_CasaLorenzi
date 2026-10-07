import { Link, useParams } from "react-router-dom";
import { Conversa } from "@/components/Conversa";
import { AvisoErro, Badge, Botao, Card, Voltar } from "@/components/ui";
import { useChamado } from "@/hooks/useChamados";
import { assumirChamado, enviarMensagem, resolverChamado } from "@/lib/chamadosApi";
import { chamadoFinalizado, dataBRdoIso, dataHoraBRdoIso, moedaBR, tomPrioridade, tomStatus } from "@/lib/chamadosUi";
import { podeAprovar, usePapel } from "@/lib/sessao";
import { useAcao } from "@/lib/useAcao";

/** Tela do chamado: conversa, ficha do cliente e as ações de assumir, responder e resolver. */
export function Chamado() {
  const { id = "" } = useParams();
  const papel = usePapel();
  const { detalhe, conversa, recarregar } = useChamado(id);
  const { executar, ocupado, erro, limparErro } = useAcao();
  const chamado = detalhe.dados;

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

  const mensagens = (conversa.dados ?? []).map((m) => ({
    id: m.id_mensagem,
    autor: m.autor,
    nome: m.nome,
    data: dataHoraBRdoIso(m.enviada_em),
    texto: m.texto,
  }));

  const agir = (chave: string, acao: () => Promise<unknown>) =>
    executar(chave, acao).then((ok) => {
      // Qualquer ação muda o chamado (responsável, status, conversa): relê tudo do servidor.
      recarregar();
      return ok;
    });

  let aviso: string | undefined;
  if (finalizado) aviso = "Este chamado foi encerrado. Não é possível enviar novas mensagens.";
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
      <AvisoErro erro={erro ?? conversa.erro} onFechar={limparErro} className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Conversa
          lado="atendente"
          mensagens={mensagens}
          anexos={chamado.anexos.map((a) => ({ id: a.id_anexo, nome: a.nome }))}
          encerrado={finalizado}
          bloqueioAviso={aviso}
          onEnviar={(t) => agir("mensagem", () => enviarMensagem(id, t))}
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
