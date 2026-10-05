import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ModalReposicao, ModalTransferencia } from "@/components/estoque";
import {
  Badge,
  Botao,
  Card,
  CardTitulo,
  LinhaVazia,
  Segmentado,
  Tabela,
  Titulo,
  td,
  th,
} from "@/components/ui";
import { dataBR, lojas, nomeLoja, tomReposicao, tomTransferencia, type SolicitacaoTransferencia } from "@/lib/dados";
import { useLojaEscopo, useNomeUsuario } from "@/lib/sessao";
import {
  aceitarReposicao,
  aceitarTransferencia,
  confirmarRecebimento,
  recusarReposicao,
  recusarTransferencia,
  useEstado,
} from "@/lib/store";

type Filtro = "acao" | "andamento" | "todas";

/** Transferências = enviar, receber e pedidos de reposição (antes 3 telas). */
export function Transferencias() {
  const { produtos, transferencias, reposicoes } = useEstado();
  const escopo = useLojaEscopo();
  const usuario = useNomeUsuario();
  const [filtro, setFiltro] = useState<Filtro>("acao");
  const [modal, setModal] = useState<"transferencia" | "reposicao" | null>(null);

  const minha = (lojaId: string | null) => !escopo || lojaId === escopo;
  const nomeDe = (sku: string) => produtos.find((p) => p.sku === sku)?.nome ?? sku;

  const acaoDe = (t: SolicitacaoTransferencia) =>
    t.status === "Pendente" && minha(t.origemId) ? "enviar" : t.status === "Aceita" && minha(t.destinoId) ? "receber" : null;

  const visiveis = transferencias
    .filter((t) => minha(t.origemId) || minha(t.destinoId))
    .filter((t) =>
      filtro === "acao" ? acaoDe(t) !== null : filtro === "andamento" ? t.status === "Pendente" || t.status === "Aceita" : true,
    );

  const reposVisiveis = reposicoes.filter(
    (r) => minha(r.solicitanteLojaId) || r.destinatarioLojaId === null || minha(r.destinatarioLojaId),
  );

  return (
    <div>
      <Titulo
        titulo="Transferências"
        descricao={
          escopo
            ? `Peças entrando e saindo de ${nomeLoja(escopo)}, e pedidos de reposição entre as casas.`
            : "Peças em circulação entre as unidades da rede."
        }
        acao={
          <>
            <Botao variante="secundario" onClick={() => setModal("reposicao")}>
              Pedir reposição à rede
            </Botao>
            <Botao onClick={() => setModal("transferencia")}>Nova transferência</Botao>
          </>
        }
      />

      <div className="mb-4">
        <Segmentado
          valor={filtro}
          onChange={setFiltro}
          opcoes={[
            { value: "acao", label: "Aguardando você" },
            { value: "andamento", label: "Em andamento" },
            { value: "todas", label: "Todas" },
          ]}
        />
      </div>

      <Card>
        <Tabela>
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
          <tbody>
            {visiveis.map((t) => {
              const acao = acaoDe(t);
              return (
                <tr key={t.id}>
                  <td className={td}>{dataBR(t.data)}</td>
                  <td className={td}>
                    <Link to={`/painel/estoque/peca/${t.sku}`} className="font-medium hover:text-marinho">
                      {nomeDe(t.sku)}
                    </Link>
                  </td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      {nomeLoja(t.origemId)} <ArrowRight className="h-3 w-3 text-dourado" /> {nomeLoja(t.destinoId)}
                    </span>
                  </td>
                  <td className={`${td} tabular-nums`}>{t.quantidade}</td>
                  <td className={`${td} text-suave`}>{t.solicitante}</td>
                  <td className={td}>
                    <Badge tom={tomTransferencia[t.status]}>{t.status === "Aceita" ? "Em trânsito" : t.status}</Badge>
                  </td>
                  <td className={td}>
                    {acao === "enviar" ? (
                      <div className="flex gap-2">
                        <Botao pequeno onClick={() => aceitarTransferencia(t.id, usuario)}>
                          Aceitar envio
                        </Botao>
                        <Botao pequeno variante="secundario" onClick={() => recusarTransferencia(t.id)}>
                          Recusar
                        </Botao>
                      </div>
                    ) : acao === "receber" ? (
                      <Botao pequeno onClick={() => confirmarRecebimento(t.id, usuario)}>
                        Confirmar recebimento
                      </Botao>
                    ) : (
                      <span className="text-xs text-suave">
                        {t.status === "Pendente" ? "Aguardando a origem" : t.status === "Aceita" ? "Aguardando o destino" : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visiveis.length === 0 ? (
              <LinhaVazia colunas={7} texto={filtro === "acao" ? "Nada aguardando você." : "Nenhuma transferência."} />
            ) : null}
          </tbody>
        </Tabela>
      </Card>

      <Card className="mt-8">
        <CardTitulo titulo="Pedidos de reposição" />
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Data</th>
              <th className={th}>Peça</th>
              <th className={th}>Quem pede</th>
              <th className={th}>Pedido para</th>
              <th className={th}>Qtd.</th>
              <th className={th}>Situação</th>
              <th className={th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {reposVisiveis.map((r) => {
              const paraMim = r.status === "Aberta" && r.solicitanteLojaId !== escopo;
              const quemAtende =
                escopo ?? r.destinatarioLojaId ?? lojas.find((l) => l.id !== r.solicitanteLojaId)!.id;
              return (
                <tr key={r.id}>
                  <td className={td}>{dataBR(r.data)}</td>
                  <td className={`${td} font-medium`}>{nomeDe(r.sku)}</td>
                  <td className={td}>{nomeLoja(r.solicitanteLojaId)}</td>
                  <td className={td}>{r.destinatarioLojaId ? nomeLoja(r.destinatarioLojaId) : "Toda a rede"}</td>
                  <td className={`${td} tabular-nums`}>{r.quantidade}</td>
                  <td className={td}>
                    <Badge tom={tomReposicao[r.status]}>{r.status}</Badge>
                  </td>
                  <td className={td}>
                    {paraMim ? (
                      <div className="flex gap-2">
                        <Botao pequeno onClick={() => aceitarReposicao(r.id, quemAtende, usuario)}>
                          Atender{escopo ? "" : ` (${nomeLoja(quemAtende)})`}
                        </Botao>
                        <Botao pequeno variante="secundario" onClick={() => recusarReposicao(r.id, usuario)}>
                          Recusar
                        </Botao>
                      </div>
                    ) : (
                      <span className="text-xs text-suave">{r.atendidaPor ? `por ${r.atendidaPor}` : "Aguardando outra loja"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {reposVisiveis.length === 0 ? <LinhaVazia colunas={7} texto="Nenhum pedido de reposição." /> : null}
          </tbody>
        </Tabela>
      </Card>

      {modal === "transferencia" ? <ModalTransferencia aberto onFechar={() => setModal(null)} /> : null}
      {modal === "reposicao" ? <ModalReposicao aberto onFechar={() => setModal(null)} /> : null}
    </div>
  );
}
