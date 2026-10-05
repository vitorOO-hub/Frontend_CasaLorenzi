import { useState } from "react";
import { Badge, Botao, Card, CardTitulo, Select, Tabela, Titulo, td, th } from "@/components/ui";
import { dataBR, lotesImportacao, registrosImportacao } from "@/lib/dados";
import { useNomeUsuario } from "@/lib/sessao";
import { logAuditoria, useEstado } from "@/lib/store";

const tomLote = { "Pendente de mapeamento": "alerta", Processado: "ok", "Com erro": "perigo" } as const;

export function Integracoes() {
  const { produtos } = useEstado();
  const autor = useNomeUsuario();
  const [mapeamentos, setMapeamentos] = useState<Record<string, string>>({});
  const [confirmados, setConfirmados] = useState<string[]>([]);

  return (
    <div>
      <Titulo titulo="Integrações" descricao="Lotes recebidos do ERP Vulto e registros que ainda precisam de um SKU." />

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
            {lotesImportacao.map((l) => (
              <tr key={l.id}>
                <td className={`${td} font-mono text-xs`}>{l.id}</td>
                <td className={td}>{l.origem}</td>
                <td className={`${td} tabular-nums`}>{l.registros}</td>
                <td className={`${td} tabular-nums`}>{l.pendentes}</td>
                <td className={td}>{dataBR(l.recebidoEm)}</td>
                <td className={td}>
                  <Badge tom={tomLote[l.status]}>{l.status}</Badge>
                </td>
              </tr>
            ))}
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
            {registrosImportacao.map((r) => {
              const valor = mapeamentos[r.id] ?? r.skuMapeado ?? "";
              const feito = confirmados.includes(r.id) || (r.skuMapeado && !mapeamentos[r.id]);
              return (
                <tr key={r.id}>
                  <td className={td}>
                    <p className="font-medium">{r.descricaoExterna}</p>
                    <p className="font-mono text-[11px] text-suave">{r.loteId}</p>
                  </td>
                  <td className={`${td} font-mono text-xs`}>{r.codigoExterno}</td>
                  <td className={td}>
                    <Select
                      aria-label="SKU"
                      value={valor}
                      onChange={(e) => {
                        setMapeamentos((m) => ({ ...m, [r.id]: e.target.value }));
                        setConfirmados((c) => c.filter((x) => x !== r.id));
                      }}
                      className="w-64"
                      opcoes={[{ value: "", label: "Não mapeado" }, ...produtos.map((p) => ({ value: p.sku, label: `${p.sku} · ${p.nome}` }))]}
                    />
                  </td>
                  <td className={td}>
                    {feito ? (
                      <Badge tom="ok">Mapeado</Badge>
                    ) : (
                      <Botao
                        pequeno
                        disabled={!valor}
                        onClick={() => {
                          logAuditoria(autor, "Mapeou registro de importação", `${r.codigoExterno} → ${valor}`);
                          setConfirmados((c) => [...c, r.id]);
                        }}
                      >
                        Confirmar
                      </Botao>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Tabela>
      </Card>
    </div>
  );
}
