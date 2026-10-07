import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { mensagemDeErro } from "@/api/erros";
import { cn } from "@/components/ui";
import { botaoLoja } from "@/components/vitrine";
import { dataBR } from "@/lib/dados";
import { listarChamadosCliente, type ChamadoClienteApi } from "@/lib/chamadosClienteApi";
import { useClienteId, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

const situacao = { Aberto: "Aguardando a casa", "Em andamento": "Em conversa", Resolvido: "Resolvido" } as const;

type ChamadoLista = {
  id: string;
  protocolo: string;
  assunto: string;
  motivo: string;
  status: keyof typeof situacao;
  abertoEm: string;
  detalhe: string;
};

function motivoDaCategoria(codigo: string): string {
  if (codigo === "troca_devolucao") return "Troca";
  if (codigo === "produto") return "Defeito";
  if (codigo === "entrega") return "Entrega";
  return "Dúvida";
}

function statusDaApi(codigo: string): keyof typeof situacao {
  if (["resolvido", "encerrado", "cancelado"].includes(codigo)) return "Resolvido";
  if (codigo === "aberto") return "Aberto";
  return "Em andamento";
}

function chamadoApiParaTela(chamado: ChamadoClienteApi): ChamadoLista {
  const ultima = chamado.ultima_mensagem_em ?? chamado.atualizado_em;
  return {
    id: chamado.id_atendimento,
    protocolo: chamado.protocolo,
    assunto: chamado.assunto,
    motivo: motivoDaCategoria(chamado.categoria.codigo),
    status: statusDaApi(chamado.status.codigo),
    abertoEm: chamado.aberto_em.slice(0, 10),
    detalhe: `última atualização em ${dataBR(ultima.slice(0, 10))}`,
  };
}

export function MeusChamados() {
  const { chamados } = useEstado();
  const sessao = useSessao();
  const modoApi = usandoApi();
  const clienteId = useClienteId();
  const [chamadosApi, setChamadosApi] = useState<ChamadoClienteApi[] | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);
  const meus = useMemo<ChamadoLista[]>(() => {
    if (chamadosApi) return chamadosApi.map(chamadoApiParaTela);
    return chamados.filter((c) => c.clienteId === clienteId).map((c) => ({
      id: c.id,
      protocolo: c.protocolo,
      assunto: c.assunto,
      motivo: c.motivo,
      status: c.status,
      abertoEm: c.abertoEm,
      detalhe: `${c.mensagens.length} ${c.mensagens.length === 1 ? "mensagem" : "mensagens"}`,
    }));
  }, [chamados, chamadosApi, clienteId]);

  useEffect(() => {
    if (!modoApi || sessao?.tipo !== "cliente") return;
    let ativo = true;
    listarChamadosCliente()
      .then((lista) => {
        if (ativo) setChamadosApi(lista);
      })
      .catch((erro) => {
        if (ativo) setErroApi(mensagemDeErro(erro));
      });
    return () => {
      ativo = false;
    };
  }, [modoApi, sessao?.tipo]);

  if (modoApi && chamadosApi === null && !erroApi) {
    return <p className="font-display text-2xl text-suave">Carregando suas conversas...</p>;
  }

  if (erroApi) {
    return <p role="alert" className="font-display text-2xl text-perigo">{erroApi}</p>;
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-lg font-display text-xl">Trocas, ajustes, entregas ou uma dúvida sobre tecido — quem responde é gente da loja, em até um dia útil.</p>
        <Link to="/conta/atendimento/novo" className={botaoLoja()}>
          Escrever para a casa
        </Link>
      </div>

      <ul>
        {meus.map((c) => (
          <li key={c.id}>
            <Link to={`/conta/atendimento/${c.id}`} className="alinhavo flex flex-wrap items-center gap-4 py-5 hover:bg-pergaminho/60">
              <div className="flex-1">
                <p className="font-display text-[22px] leading-tight">{c.assunto}</p>
                <p className="mt-1 text-sm text-suave">
                  {c.protocolo} · {c.motivo} · desde {dataBR(c.abertoEm)} · {c.detalhe}
                </p>
              </div>
              <span className={cn("text-sm", c.status === "Resolvido" ? "text-suave" : "text-caramelo")}>{situacao[c.status]}</span>
            </Link>
          </li>
        ))}
        {meus.length === 0 ? <li className="py-10 font-display text-xl text-suave">Nenhuma conversa ainda.</li> : null}
      </ul>
    </div>
  );
}
