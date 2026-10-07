import { Check, X } from "lucide-react";
import { useState } from "react";
import {
  AvisoErro,
  Badge,
  Botao,
  Campo,
  Card,
  CardTitulo,
  LinhaVazia,
  Modal,
  Tabela,
  Titulo,
  cn,
  inputClasses,
  sinal,
  td,
  th,
} from "@/components/ui";
import { useAjustesEstoque } from "@/hooks/useEstoquePainel";
import { dataBRdoIso } from "@/lib/chamadosUi";
import { aprovarAjusteEstoque, recusarAjusteEstoque } from "@/lib/estoquePainelApi";
import { ROTULO_AJUSTE, TOM_AJUSTE, detalheDaPeca, faixaDaPagina, saldoAposAjuste } from "@/lib/estoquePainelUi";
import { useAcao } from "@/lib/useAcao";

const POR_PAGINA = 15;

/** Ajustes de inventário aguardando a decisão do gerente ou do administrador (dados do servidor). */
export function Aprovacoes() {
  const { executar, ocupado, erro, limparErro } = useAcao();
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [pagina, setPagina] = useState(0);

  const pendentes = useAjustesEstoque({ situacao: "pendente", limit: 50, offset: 0 });
  const decididos = useAjustesEstoque({ situacao: "decididos", limit: POR_PAGINA, offset: pagina * POR_PAGINA });
  const aPendentes = pendentes.dados?.itens ?? [];
  const aDecididos = decididos.dados?.itens ?? [];
  const totalDecididos = decididos.dados?.total ?? 0;

  // Qualquer decisão muda o saldo e as duas listas: relê tudo do servidor.
  const decidir = (chave: string, acao: () => Promise<unknown>) =>
    executar(chave, acao).then((ok) => {
      pendentes.recarregar();
      decididos.recarregar();
      return ok;
    });

  return (
    <div>
      <Titulo titulo="Aprovações" descricao="Ajustes de inventário só alteram o saldo depois da sua decisão." />
      <AvisoErro erro={recusando ? null : (erro ?? pendentes.erro ?? decididos.erro)} onFechar={limparErro} className="mb-6" />

      {pendentes.carregando && !pendentes.dados ? (
        <p className="mb-8 py-10 text-center text-sm text-suave">Carregando os ajustes…</p>
      ) : aPendentes.length === 0 ? (
        <Card className="mb-8 p-10 text-center">
          <Check className="mx-auto h-6 w-6 text-sucesso" />
          <p className="mt-3 text-sm text-suave">Nenhum ajuste aguardando aprovação.</p>
        </Card>
      ) : (
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {aPendentes.map((a) => {
            const depois = saldoAposAjuste(a);
            const naoCabe = depois < 0;
            return (
              <Card key={a.id_ajuste} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl">{a.produto}</p>
                    <p className="text-xs text-suave">
                      {detalheDaPeca(a)} · <span className="font-mono">{a.sku}</span>
                    </p>
                    <p className="text-xs text-suave">
                      {a.loja_nome} · pedido por {a.solicitante} em {dataBRdoIso(a.solicitado_em)}
                    </p>
                  </div>
                  <span className={cn("font-display text-3xl", a.quantidade < 0 ? "text-perigo" : "text-sucesso")}>
                    {sinal(a.quantidade)}
                  </span>
                </div>
                <p className="mt-4 rounded-sm bg-areia/60 px-3 py-2 text-sm">“{a.motivo}”</p>
                <p className={cn("mt-3 text-xs", naoCabe ? "text-perigo" : "text-suave")}>
                  Saldo atual {a.saldo_atual} → depois do ajuste {depois}
                  {naoCabe ? " (o saldo mudou e esta diferença não cabe mais: recuse e peça nova contagem)" : ""}
                </p>
                <div className="mt-4 flex gap-2">
                  <Botao
                    pequeno
                    disabled={ocupado === a.id_ajuste || naoCabe}
                    onClick={() => void decidir(a.id_ajuste, () => aprovarAjusteEstoque(a.id_ajuste))}
                  >
                    <Check className="h-3.5 w-3.5" /> {ocupado === a.id_ajuste ? "Aprovando…" : "Aprovar"}
                  </Botao>
                  <Botao
                    pequeno
                    variante="perigo"
                    disabled={ocupado === a.id_ajuste}
                    onClick={() => {
                      limparErro();
                      setMotivoRecusa("");
                      setRecusando(a.id_ajuste);
                    }}
                  >
                    <X className="h-3.5 w-3.5" /> Recusar
                  </Botao>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardTitulo titulo="Decisões anteriores" />
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Data</th>
              <th className={th}>Peça</th>
              <th className={th}>Loja</th>
              <th className={th}>Qtd.</th>
              <th className={th}>Motivo</th>
              <th className={th}>Solicitante</th>
              <th className={th}>Decisão</th>
            </tr>
          </thead>
          <tbody>
            {aDecididos.map((a) => (
              <tr key={a.id_ajuste}>
                <td className={td}>{a.decidido_em ? dataBRdoIso(a.decidido_em) : "—"}</td>
                <td className={cn(td, "font-medium")}>
                  {a.produto} <span className="font-normal text-suave">· {detalheDaPeca(a)}</span>
                </td>
                <td className={td}>{a.loja_nome}</td>
                <td className={cn(td, "tabular-nums")}>{sinal(a.quantidade)}</td>
                <td className={cn(td, "max-w-64 text-suave")}>
                  {a.motivo}
                  {a.motivo_recusa ? <span className="mt-1 block text-xs text-perigo">Recusa: {a.motivo_recusa}</span> : null}
                </td>
                <td className={cn(td, "text-suave")}>{a.solicitante}</td>
                <td className={td}>
                  <Badge tom={TOM_AJUSTE[a.status]}>{ROTULO_AJUSTE[a.status]}</Badge>
                  {a.decisor ? <span className="mt-1 block text-xs text-suave">por {a.decisor}</span> : null}
                </td>
              </tr>
            ))}
            {aDecididos.length === 0 ? <LinhaVazia colunas={7} texto="Nenhuma decisão registrada ainda." /> : null}
          </tbody>
        </Tabela>
        {totalDecididos > POR_PAGINA ? (
          <div className="flex items-center justify-between border-t border-linha px-5 py-3 text-sm text-suave">
            <span>{faixaDaPagina(pagina, POR_PAGINA, totalDecididos)}</span>
            <div className="flex gap-2">
              <Botao variante="secundario" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>
                Anterior
              </Botao>
              <Botao variante="secundario" disabled={(pagina + 1) * POR_PAGINA >= totalDecididos} onClick={() => setPagina(pagina + 1)}>
                Próxima
              </Botao>
            </div>
          </div>
        ) : null}
      </Card>

      <Modal aberto={recusando !== null} titulo="Recusar ajuste" onFechar={() => setRecusando(null)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const id = recusando!;
            void decidir(id, () => recusarAjusteEstoque(id, motivoRecusa.trim())).then((ok) => ok && setRecusando(null));
          }}
        >
          <Campo label="Motivo da recusa" ajuda="O operador vê este motivo junto com a decisão.">
            <textarea
              required
              rows={3}
              minLength={3}
              maxLength={300}
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              placeholder="Ex.: a contagem não bate com a nota de entrada…"
              className={inputClasses}
            />
          </Campo>
          <AvisoErro erro={erro} />
          <div className="flex justify-end gap-2">
            <Botao variante="secundario" onClick={() => setRecusando(null)}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="perigo" disabled={ocupado !== null || motivoRecusa.trim().length < 3}>
              {ocupado ? "Recusando…" : "Recusar ajuste"}
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
