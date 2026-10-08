import { useState } from "react";
import { AvisoErro, Badge, Botao, Card, CardTitulo, LinhaVazia, Select, Tabela, Titulo, td, th } from "@/components/ui";
import { useIntegracoes } from "@/hooks/useGestao";
import { dataBR } from "@/lib/dados";
import { mapearRegistro, type SituacaoDoLote } from "@/lib/gestaoApi";
import { useAcao } from "@/lib/useAcao";

const tomLote = { pendente_mapeamento: "alerta", processado: "ok", com_erro: "perigo" } as const;
const rotuloLote: Record<SituacaoDoLote, string> = {
  pendente_mapeamento: "Pendente de mapeamento",
  processado: "Processado",
  com_erro: "Com erro",
};

/** Lotes recebidos do ERP Vulto e registros que ainda precisam de um SKU (tudo do banco). */
export function Integracoes() {
  const consulta = useIntegracoes();
  const { executar, ocupado, erro, limparErro } = useAcao();
  // SKU escolhido por registro, ainda não confirmado.
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const lotes = consulta.dados?.lotes ?? [];
  const registros = consulta.dados?.registros ?? [];
  const skus = consulta.dados?.skus ?? [];

  return (
    <div>
      <Titulo titulo="Integrações" descricao="Lotes recebidos do ERP Vulto e registros que ainda precisam de um SKU." />

      <AvisoErro erro={erro ?? consulta.erro} onFechar={erro ? limparErro : undefined} className="mb-6" />
      <Card className="mb-6">
        <CardTitulo titulo="Lotes de importação" />
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Lote</th>
              <th className={th}>Origem</th>
              <th className={th}>Registros</th>
              <th className={th}>Pendentes</th>
              <th className={th}>Recebido em</th>
              <th className={th}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((l) => (
              <tr key={l.codigo}>
                <td className={`${td} font-mono text-xs`}>{l.codigo}</td>
                <td className={td}>{l.origem}</td>
                <td className={`${td} tabular-nums`}>{l.registros}</td>
                <td className={`${td} tabular-nums`}>{l.pendentes}</td>
                <td className={td}>{dataBR(l.recebido_em.slice(0, 10))}</td>
                <td className={td}>
                  <Badge tom={tomLote[l.situacao]}>{rotuloLote[l.situacao]}</Badge>
                </td>
              </tr>
            ))}
            {lotes.length === 0 ? (
              <LinhaVazia colunas={6} texto={consulta.carregando ? "Carregando os lotes…" : "Nenhum lote recebido ainda."} />
            ) : null}
          </tbody>
        </Tabela>
      </Card>

      <Card>
        <CardTitulo titulo="Registros aguardando mapeamento" />
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Descrição no ERP</th>
              <th className={th}>Código Vulto</th>
              <th className={th}>SKU Casa Lorenzi</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => {
              const escolhido = escolhas[r.id_registro] ?? "";
              return (
                <tr key={r.id_registro}>
                  <td className={td}>
                    <p className="font-medium">{r.descricao_externa}</p>
                    <p className="font-mono text-[11px] text-suave">{r.lote}</p>
                  </td>
                  <td className={`${td} font-mono text-xs`}>{r.codigo_externo}</td>
                  <td className={td}>
                    {r.sku_mapeado ? (
                      <span className="font-mono text-xs">{r.sku_mapeado}</span>
                    ) : (
                      <Select
                        aria-label="SKU"
                        value={escolhido}
                        onChange={(e) => setEscolhas((m) => ({ ...m, [r.id_registro]: e.target.value }))}
                        className="w-64"
                        opcoes={[{ value: "", label: "Não mapeado" }, ...skus.map((s) => ({ value: s.id_variacao, label: `${s.sku} · ${s.nome}` }))]}
                      />
                    )}
                  </td>
                  <td className={td}>
                    {r.sku_mapeado ? (
                      <Badge tom="ok">Mapeado</Badge>
                    ) : (
                      <Botao
                        pequeno
                        disabled={!escolhido || ocupado === r.id_registro}
                        onClick={() =>
                          void executar(r.id_registro, async () => {
                            await mapearRegistro(r.id_registro, escolhido);
                            consulta.recarregar();
                          })
                        }
                      >
                        Confirmar
                      </Botao>
                    )}
                  </td>
                </tr>
              );
            })}
            {registros.length === 0 ? (
              <LinhaVazia colunas={4} texto={consulta.carregando ? "Carregando os registros…" : "Nenhum registro para mapear."} />
            ) : null}
          </tbody>
        </Tabela>
      </Card>
    </div>
  );
}
