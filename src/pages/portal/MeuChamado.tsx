import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { mensagemDeErro } from "@/api/erros";
import { cn } from "@/components/ui";
import { botaoLoja } from "@/components/vitrine";
import * as acoes from "@/lib/acoes";
import {
  enviarMensagemChamadoCliente,
  listarMensagensChamadoCliente,
  obterChamadoCliente,
  type DetalheChamadoClienteApi,
  type MensagemChamadoClienteApi,
} from "@/lib/chamadosClienteApi";
import { dataBR, nomeLoja } from "@/lib/dados";
import { useClienteId, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { useAcao } from "@/lib/useAcao";
import { campoLoja } from "./Checkout";

function motivoDaCategoria(codigo: string): string {
  if (codigo === "troca_devolucao") return "Troca";
  if (codigo === "produto") return "Defeito";
  if (codigo === "entrega") return "Entrega";
  return "Dúvida";
}

function statusDaApi(codigo: string): "Aberto" | "Em andamento" | "Resolvido" {
  if (["resolvido", "encerrado", "cancelado"].includes(codigo)) return "Resolvido";
  if (codigo === "aberto") return "Aberto";
  return "Em andamento";
}

function dataHoraBR(iso: string) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export function MeuChamado() {
  const { id } = useParams();
  const { chamados } = useEstado();
  const sessao = useSessao();
  const modoApi = usandoApi();
  const clienteId = useClienteId();
  const [texto, setTexto] = useState("");
  const [chamadoApi, setChamadoApi] = useState<DetalheChamadoClienteApi | null>(null);
  const [mensagensApi, setMensagensApi] = useState<MensagemChamadoClienteApi[]>([]);
  const [carregandoApi, setCarregandoApi] = useState(modoApi);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const { executar, ocupado, erro } = useAcao();
  const chamadoLocal = chamados.find((c) => c.id === id && c.clienteId === clienteId);
  const chamado = useMemo(() => {
    if (modoApi && chamadoApi) {
      return {
        id: chamadoApi.id_atendimento,
        assunto: chamadoApi.assunto,
        protocolo: chamadoApi.protocolo,
        motivo: motivoDaCategoria(chamadoApi.categoria.codigo),
        loja: chamadoApi.loja_nome ?? "Sem loja definida",
        pedido: chamadoApi.numero_pedido,
        status: statusDaApi(chamadoApi.status.codigo),
        abertoEm: chamadoApi.aberto_em.slice(0, 10),
        pecas: chamadoApi.pecas.map((p) => `${p.produto} · ${p.cor}, ${p.tamanho}`),
        anexos: chamadoApi.anexos.map((a) => a.nome),
        mensagens: mensagensApi.map((m) => ({ id: m.id_mensagem, autor: m.autor, nome: m.nome, data: dataHoraBR(m.enviada_em), texto: m.texto })),
      };
    }
    if (!chamadoLocal) return null;
    return {
      id: chamadoLocal.id,
      assunto: chamadoLocal.assunto,
      protocolo: chamadoLocal.protocolo,
      motivo: chamadoLocal.motivo,
      loja: nomeLoja(chamadoLocal.lojaId),
      pedido: chamadoLocal.pedidoId ?? null,
      status: chamadoLocal.status,
      abertoEm: chamadoLocal.abertoEm,
      pecas: chamadoLocal.sku ? [chamadoLocal.sku] : [],
      anexos: (chamadoLocal.anexos ?? []).map((a) => a.nome),
      mensagens: chamadoLocal.mensagens,
    };
  }, [chamadoApi, chamadoLocal, mensagensApi, modoApi]);

  useEffect(() => {
    if (!modoApi || sessao?.tipo !== "cliente" || !id) return;
    let ativo = true;
    Promise.all([obterChamadoCliente(id), listarMensagensChamadoCliente(id)])
      .then(([detalhe, mensagens]) => {
        if (!ativo) return;
        setChamadoApi(detalhe);
        setMensagensApi(mensagens);
        setErroApi(null);
      })
      .catch((erro) => {
        if (ativo) setErroApi(mensagemDeErro(erro));
      })
      .finally(() => {
        if (ativo) setCarregandoApi(false);
      });
    return () => {
      ativo = false;
    };
  }, [id, modoApi, sessao?.tipo]);

  if (modoApi && carregandoApi) return <p className="font-display text-2xl text-suave">Carregando a conversa...</p>;
  if (erroApi) return <p role="alert" className="font-display text-2xl text-perigo">{erroApi}</p>;
  if (!chamado) return <Navigate to="/conta/atendimento" replace />;

  return (
    <div className="max-w-3xl">
      <Link to="/conta/atendimento" className="link-tracejado text-sm">
        Conversas com a casa
      </Link>
      <h2 className="mt-4 text-[40px] leading-tight">{chamado.assunto}</h2>
      <p className="mt-1 text-sm text-suave">
        {chamado.protocolo} · {chamado.motivo} · {chamado.loja} · desde {dataBR(chamado.abertoEm)}
        {chamado.pedido ? ` · pedido ${chamado.pedido}` : ""}
      </p>
      {chamado.pecas.length ? <p className="mt-3 text-sm text-suave">Peça: {chamado.pecas.join("; ")}</p> : null}
      {chamado.anexos.length ? <p className="mt-2 text-sm text-suave">Anexos: {chamado.anexos.join("; ")}</p> : null}

      <div className="mt-8 space-y-5">
        {chamado.mensagens.map((m) => {
          const minha = m.autor === "cliente";
          return (
            <div key={m.id} className={cn("max-w-[85%]", minha && "ml-auto")}>
              <p className="mb-1 text-xs text-suave">
                {m.nome} · {m.data}
              </p>
              {minha ? (
                <p className="bg-pergaminho px-5 py-4 text-[15px] leading-relaxed">{m.texto}</p>
              ) : (
                <p className="rotate-[-0.3deg] border-l-2 border-dashed border-caramelo bg-etiqueta/60 px-5 py-4 font-display text-[19px] leading-relaxed">
                  {m.texto}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {chamado.status === "Resolvido" ? (
        <p className="alinhavo mt-10 pt-6 font-display text-lg text-suave">
          Esta conversa foi encerrada. Precisa de mais alguma coisa?{" "}
          <Link to="/conta/atendimento/novo" className="link-tracejado text-tinta">
            Escreva de novo
          </Link>
          .
        </p>
      ) : (
        <form
          className="alinhavo mt-10 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!texto.trim()) return;
            void executar("mensagem", async () => {
              if (modoApi) {
                const nova = await enviarMensagemChamadoCliente(chamado.id, texto);
                setMensagensApi((atuais) => [...atuais, nova]);
              } else {
                await acoes.enviarMensagem(chamado.id, texto);
              }
              setTexto("");
            });
          }}
        >
          <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem…" className={campoLoja} />
          {erro ? <p role="alert" className="mt-3 text-sm text-perigo">{erro}</p> : null}
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={!texto.trim() || ocupado !== null} className={botaoLoja()}>
              {ocupado ? "Enviando…" : "Enviar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
