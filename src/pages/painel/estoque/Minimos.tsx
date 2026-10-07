import { useState } from "react";
import { AvisoErro, Badge, Botao, Card, Select, Tabela, Titulo, td, th } from "@/components/ui";
import { useMinimos, useOpcoesEstoque } from "@/hooks/useEstoquePainel";
import { detalheDaPeca } from "@/lib/estoquePainelUi";
import { definirMinimos } from "@/lib/transferenciasApi";
import { minimosAlterados, rascunhoInvalido } from "@/lib/transferenciasUi";
import { useAcao } from "@/lib/useAcao";

/** Estoque mínimo por peça: abaixo dele a peça aparece como "estoque baixo". Dados e gravação no servidor. */
export function Minimos() {
  const { executar, ocupado, erro, limparErro } = useAcao();
  const opcoes = useOpcoesEstoque();
  const escopo = opcoes.dados?.escopo;
  const [lojaEscolhida, setLojaEscolhida] = useState("");
  const idLoja = escopo?.pode_escolher_loja ? lojaEscolhida || opcoes.dados?.lojas[0]?.id_loja : undefined;
  const pronto = escopo !== undefined && (!escopo.pode_escolher_loja || idLoja !== undefined);
  const consulta = useMinimos(idLoja, pronto);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [salvo, setSalvo] = useState(false);

  const itens = consulta.dados?.itens ?? [];
  const alterados = minimosAlterados(itens, rascunho);
  const invalido = rascunhoInvalido(rascunho);
  const nomeDaLoja = consulta.dados?.loja_nome ?? escopo?.loja_nome ?? "sua unidade";

  return (
    <div>
      <Titulo
        titulo="Estoque mínimo"
        descricao={`No mínimo ou abaixo dele, a peça aparece como “estoque baixo” em ${nomeDaLoja}.`}
        acao={
          <>
            {escopo?.pode_escolher_loja ? (
              <Select
                aria-label="Unidade"
                value={idLoja ?? ""}
                onChange={(e) => {
                  setLojaEscolhida(e.target.value);
                  setRascunho({});
                }}
                className="w-52"
                opcoes={(opcoes.dados?.lojas ?? []).map((l) => ({ value: l.id_loja, label: l.nome }))}
              />
            ) : null}
            <Botao
              disabled={alterados.length === 0 || invalido || ocupado !== null}
              onClick={() =>
                void executar("minimos", () => definirMinimos(alterados, idLoja)).then((ok) => {
                  if (!ok) return;
                  setRascunho({});
                  setSalvo(true);
                  consulta.recarregar();
                })
              }
            >
              {ocupado ? "Salvando…" : `Salvar ${alterados.length ? `(${alterados.length})` : ""}`}
            </Botao>
          </>
        }
      />
      <AvisoErro erro={erro ?? consulta.erro ?? opcoes.erro} onFechar={limparErro} className="mb-4" />
      {invalido ? <p className="mb-4 text-sm text-perigo">Use só números inteiros, de 0 em diante.</p> : null}
      {salvo && alterados.length === 0 && !invalido ? <p className="mb-4 text-sm text-sucesso">Estoques mínimos atualizados.</p> : null}

      <Card>
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Peça</th>
              <th className={th}>Saldo atual</th>
              <th className={th}>Mínimo</th>
              <th className={th}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((p) => {
              const texto = rascunho[p.sku] ?? String(p.minimo);
              const numero = /^\d+$/.test(texto.trim()) ? Number(texto) : p.minimo;
              const baixo = p.saldo <= numero;
              return (
                <tr key={p.id_variacao}>
                  <td className={td}>
                    <span className="font-medium">{p.produto}</span>
                    <span className="ml-2 text-xs text-suave">{detalheDaPeca(p)}</span>
                    <span className="ml-2 font-mono text-[11px] text-suave">{p.sku}</span>
                  </td>
                  <td className={`${td} tabular-nums`}>{p.saldo}</td>
                  <td className={td}>
                    <input
                      inputMode="numeric"
                      aria-label={`Mínimo de ${p.sku}`}
                      value={texto}
                      onChange={(e) => {
                        setSalvo(false);
                        setRascunho((r) => ({ ...r, [p.sku]: e.target.value }));
                      }}
                      className={`w-20 rounded-sm border px-2 py-1 text-sm outline-none focus:border-marinho ${
                        p.sku in rascunho ? "border-dourado bg-dourado-claro/40" : "border-linha bg-papel"
                      }`}
                    />
                  </td>
                  <td className={td}>
                    <Badge tom={p.saldo === 0 ? "perigo" : baixo ? "alerta" : "ok"}>
                      {p.saldo === 0 ? "Esgotado" : baixo ? "Abaixo do mínimo" : "OK"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {itens.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-suave">
                  {consulta.carregando ? "Carregando o estoque…" : "Nenhuma peça em estoque nesta unidade."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </Tabela>
      </Card>
    </div>
  );
}
