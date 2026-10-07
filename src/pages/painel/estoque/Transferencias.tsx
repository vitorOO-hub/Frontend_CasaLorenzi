import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ModalReposicaoEstoque, ModalTransferenciaEstoque } from "@/components/estoqueTransferencia";
import {
  AvisoErro,
  Badge,
  Botao,
  Card,
  CardTitulo,
  LinhaVazia,
  Segmentado,
  Select,
  Tabela,
  Titulo,
  td,
  th,
} from "@/components/ui";
import { useOpcoesEstoque, useTransferencias } from "@/hooks/useEstoquePainel";
import { dataBRdoIso } from "@/lib/chamadosUi";
import {
  aceitarTransferencia,
  receberTransferencia,
  recusarTransferencia,
  type ItemTransferencia,
  type SituacaoLista,
} from "@/lib/transferenciasApi";
import { FILTROS_DA_LISTA, TOM_STATUS, rotuloDaAcao, rotuloDoStatus, textoSemAcao } from "@/lib/transferenciasUi";
import { detalheDaPeca } from "@/lib/estoquePainelUi";
import { useAcao } from "@/lib/useAcao";

/** Transferências e reposições da loja, direto do servidor: quem pode agir e quando vem calculado lá. */
export function Transferencias() {
  const { executar, ocupado, erro, limparErro } = useAcao();
  const [filtro, setFiltro] = useState<SituacaoLista>("acao");
  const [modal, setModal] = useState<"transferencia" | "reposicao" | null>(null);
  const [lojaQueAtende, setLojaQueAtende] = useState<Record<string, string>>({});

  const opcoes = useOpcoesEstoque();
  const transferencias = useTransferencias({ situacao: filtro, tipo: "transferencia", limit: 50, offset: 0 });
  const reposicoes = useTransferencias({ situacao: filtro, tipo: "reposicao_rede", limit: 50, offset: 0 });
  const escopo = opcoes.dados?.escopo;
  const admin = escopo?.pode_escolher_loja === true;

  const recarregar = () => {
    transferencias.recarregar();
    reposicoes.recarregar();
  };
  const agir = (chave: string, acao: () => Promise<unknown>) =>
    executar(chave, acao).then((ok) => {
      recarregar();
      return ok;
    });

  const acoesDaLinha = (t: ItemTransferencia) => {
    if (t.acoes.length === 0) return <span className="text-xs text-suave">{textoSemAcao(t)}</span>;
    // O admin atende uma reposição aberta por uma loja que ele escolhe; os demais, pela própria.
    const escolheLoja = admin && t.id_loja_origem === null && t.acoes.includes("aceitar");
    const candidatas = (opcoes.dados?.rede ?? []).filter((l) => l.id_loja !== t.id_loja_destino);
    const escolhida = lojaQueAtende[t.id_transferencia] ?? candidatas[0]?.id_loja;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {escolheLoja ? (
          <Select
            aria-label="Loja que atende"
            value={escolhida ?? ""}
            onChange={(e) => setLojaQueAtende((m) => ({ ...m, [t.id_transferencia]: e.target.value }))}
            className="w-40"
            opcoes={candidatas.map((l) => ({ value: l.id_loja, label: l.nome }))}
          />
        ) : null}
        {t.acoes.map((acao) => (
          <Botao
            key={acao}
            pequeno
            variante={acao === "recusar" ? "secundario" : "primario"}
            disabled={ocupado === t.id_transferencia}
            onClick={() =>
              void agir(t.id_transferencia, () =>
                acao === "aceitar"
                  ? aceitarTransferencia(t.id_transferencia, escolheLoja ? escolhida : undefined)
                  : acao === "recusar"
                    ? recusarTransferencia(t.id_transferencia, undefined, escolheLoja ? escolhida : undefined)
                    : receberTransferencia(t.id_transferencia),
              )
            }
          >
            {rotuloDaAcao(acao, t)}
          </Botao>
        ))}
      </div>
    );
  };

  const linha = (t: ItemTransferencia, comPedido: boolean) => (
    <tr key={t.id_transferencia}>
      <td className={td}>{dataBRdoIso(t.solicitada_em)}</td>
      <td className={td}>
        <p className="font-medium">{t.produto}</p>
        <p className="text-[11px] text-suave">
          {detalheDaPeca(t)} · <span className="font-mono">{t.sku}</span>
        </p>
      </td>
      <td className={td}>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          {t.origem_nome ?? "Toda a rede"} <ArrowRight className="h-3 w-3 text-dourado" /> {t.destino_nome}
        </span>
      </td>
      <td className={`${td} tabular-nums`}>{t.quantidade}</td>
      <td className={`${td} text-suave`}>
        {t.solicitante}
        {comPedido && t.observacao ? <span className="block text-xs">“{t.observacao}”</span> : null}
      </td>
      <td className={td}>
        <Badge tom={TOM_STATUS[t.status]}>{rotuloDoStatus(t)}</Badge>
        {t.motivo_recusa ? <span className="mt-1 block text-xs text-perigo">Recusa: {t.motivo_recusa}</span> : null}
      </td>
      <td className={td}>{acoesDaLinha(t)}</td>
    </tr>
  );

  const cabecalho = (
    <thead>
      <tr>
        <th className={th}>Data</th>
        <th className={th}>Peça</th>
        <th className={th}>Trajeto</th>
        <th className={th}>Qtd.</th>
        <th className={th}>Solicitante</th>
        <th className={th}>Situação</th>
        <th className={th}>Ação</th>
      </tr>
    </thead>
  );

  const itensT = transferencias.dados?.itens ?? [];
  const itensR = reposicoes.dados?.itens ?? [];

  return (
    <div>
      <Titulo
        titulo="Transferências"
        descricao={
          escopo?.id_loja
            ? `Peças entrando e saindo de ${escopo.loja_nome ?? "sua unidade"}, e pedidos de reposição entre as casas.`
            : "Peças em circulação entre as unidades da rede."
        }
        acao={
          <>
            <Botao variante="secundario" disabled={!opcoes.dados} onClick={() => setModal("reposicao")}>
              Pedir reposição à rede
            </Botao>
            <Botao disabled={!opcoes.dados} onClick={() => setModal("transferencia")}>
              Nova transferência
            </Botao>
          </>
        }
      />

      <div className="mb-4">
        <Segmentado valor={filtro} onChange={setFiltro} opcoes={[...FILTROS_DA_LISTA]} />
      </div>

      <AvisoErro erro={erro ?? transferencias.erro ?? reposicoes.erro ?? opcoes.erro} onFechar={limparErro} className="mb-6" />

      <Card>
        <Tabela>
          {cabecalho}
          <tbody>
            {itensT.map((t) => linha(t, true))}
            {itensT.length === 0 ? (
              <LinhaVazia
                colunas={7}
                texto={transferencias.carregando ? "Carregando as transferências…" : filtro === "acao" ? "Nada aguardando você." : "Nenhuma transferência."}
              />
            ) : null}
          </tbody>
        </Tabela>
      </Card>

      <Card className="mt-8">
        <CardTitulo titulo="Pedidos de reposição" />
        <Tabela>
          {cabecalho}
          <tbody>
            {itensR.map((t) => linha(t, true))}
            {itensR.length === 0 ? (
              <LinhaVazia colunas={7} texto={reposicoes.carregando ? "Carregando os pedidos…" : "Nenhum pedido de reposição."} />
            ) : null}
          </tbody>
        </Tabela>
      </Card>

      {modal === "transferencia" && opcoes.dados ? (
        <ModalTransferenciaEstoque aberto opcoes={opcoes.dados} onFechar={() => setModal(null)} onSucesso={recarregar} />
      ) : null}
      {modal === "reposicao" && opcoes.dados ? (
        <ModalReposicaoEstoque aberto opcoes={opcoes.dados} onFechar={() => setModal(null)} onSucesso={recarregar} />
      ) : null}
    </div>
  );
}
