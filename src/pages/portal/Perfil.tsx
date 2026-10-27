import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usandoApi } from "@/api/config";
import { mensagemDeErro } from "@/api/erros";
import { clientes, dataBR, moeda, nomeLoja } from "@/lib/dados";
import { casas } from "@/lib/loja";
import { alterarAceitaMensagens, obterPerfilCliente, type PerfilClienteApi } from "@/lib/perfilClienteApi";
import { useClienteId, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

function dataIsoParaDia(iso: string) {
  return iso.slice(0, 10);
}

/** Aceite dos avisos de pontos a vencer. Grava na hora; se falhar, a caixa volta ao que era. */
function AvisosPorMensagem({ aceita, aoMudar }: { aceita: boolean; aoMudar: (aceita: boolean) => void }) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function mudar(nova: boolean) {
    setSalvando(true);
    setErro(null);
    try {
      aoMudar(await alterarAceitaMensagens(nova));
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="alinhavo py-3.5 text-[15px]">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 accent-tabaco"
          checked={aceita}
          disabled={salvando}
          onChange={(e) => void mudar(e.target.checked)}
        />
        <span>
          Quero receber avisos dos meus pontos Lorenzi+ por e-mail e WhatsApp
          <span className="mt-1 block text-sm text-suave">Por exemplo, quando houver pontos perto de vencer.</span>
        </span>
      </label>
      {erro ? (
        <p role="alert" className="mt-2 text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

export function Perfil() {
  const { pedidos, chamados } = useEstado();
  const sessao = useSessao();
  const modoApi = usandoApi();
  const clienteId = useClienteId();
  const clienteLocal = clientes.find((c) => c.id === clienteId)!;
  const [perfilApi, setPerfilApi] = useState<PerfilClienteApi | null>(null);
  const [erroApi, setErroApi] = useState<string | null>(null);

  useEffect(() => {
    if (!modoApi || sessao?.tipo !== "cliente") return;
    let ativo = true;
    obterPerfilCliente()
      .then((perfil) => {
        if (!ativo) return;
        setPerfilApi(perfil);
        setErroApi(null);
      })
      .catch((erro) => {
        if (ativo) setErroApi(mensagemDeErro(erro));
      });
    return () => {
      ativo = false;
    };
  }, [modoApi, sessao?.tipo]);

  const resumo = useMemo(() => {
    if (perfilApi) {
      return {
        nome: perfilApi.nome,
        email: perfilApi.email,
        telefone: perfilApi.telefone ?? "Não informado",
        documento: perfilApi.documento ?? "Não informado",
        desde: dataIsoParaDia(perfilApi.cliente_desde),
        casa: perfilApi.loja_preferida ?? "Ainda sem casa preferida",
        casaId: perfilApi.id_loja_preferida,
        totalPedidos: perfilApi.total_pedidos,
        totalGasto: Number(perfilApi.valor_total_pedidos),
        totalChamados: perfilApi.total_chamados,
      };
    }

    const meusPedidos = pedidos.filter((p) => p.clienteId === clienteLocal.id && p.status !== "Cancelado");
    const casaId = meusPedidos[0]?.lojaId ?? "l1";
    return {
      nome: clienteLocal.nome,
      email: clienteLocal.email,
      telefone: clienteLocal.telefone,
      documento: "Não informado",
      desde: clienteLocal.desde,
      casa: nomeLoja(casaId),
      casaId,
      totalPedidos: meusPedidos.length,
      totalGasto: meusPedidos.reduce((s, p) => s + p.valor, 0),
      totalChamados: chamados.filter((c) => c.clienteId === clienteLocal.id).length,
    };
  }, [chamados, clienteLocal, pedidos, perfilApi]);

  const dados: [string, string][] = [
    ["Nome", resumo.nome],
    ["E-mail", resumo.email],
    ["Telefone", resumo.telefone],
    ["Documento", resumo.documento],
    ["Cliente desde", dataBR(resumo.desde)],
    ["Sua casa", resumo.casa],
  ];
  const alfaiate = resumo.casaId ? casas[resumo.casaId]?.alfaiate.split(",")[0] : undefined;

  if (modoApi && sessao?.tipo === "cliente" && !perfilApi && !erroApi) {
    return <p className="font-display text-2xl text-suave">Carregando seu perfil...</p>;
  }

  if (erroApi) {
    return <p role="alert" className="font-display text-2xl text-perigo">{erroApi}</p>;
  }

  return (
    <div className="grid gap-12 md:grid-cols-[1fr_22rem]">
      <dl>
        {dados.map(([k, v]) => (
          <div key={k} className="alinhavo grid grid-cols-[140px_1fr] py-3.5 text-[15px]">
            <dt className="text-suave">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {perfilApi ? (
          <AvisosPorMensagem
            aceita={perfilApi.aceita_mensagens}
            aoMudar={(aceita) => setPerfilApi({ ...perfilApi, aceita_mensagens: aceita })}
          />
        ) : null}
        <p className="mt-6 text-sm text-suave">
          Para mudar algum dado,{" "}
          <Link to="/conta/atendimento/novo" className="link-tracejado text-tinta">
            escreva para a casa
          </Link>
          .
        </p>
      </dl>

      <aside className="costurado h-fit bg-pergaminho p-8">
        <p className="font-display text-[22px] leading-snug">
          {resumo.totalPedidos} {resumo.totalPedidos === 1 ? "pedido" : "pedidos"}, {moeda(resumo.totalGasto)} em peças e {resumo.totalChamados} conversas com a casa.
        </p>
        <p className="mt-5 font-mao text-[14px] leading-relaxed text-caramelo">
          Sua casa é {resumo.casa}. Quem faz os seus ajustes é {alfaiate ?? "o alfaiate"}.
        </p>
      </aside>
    </div>
  );
}
