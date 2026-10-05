import { useState } from "react";
import { Badge, Botao, Card, Tabela, Titulo, td, th } from "@/components/ui";
import { lojas, nomeLoja } from "@/lib/dados";
import { useLojaEscopo, useNomeUsuario } from "@/lib/sessao";
import { definirMinimo, useEstado } from "@/lib/store";
import { Select } from "@/components/ui";

export function Minimos() {
  const { produtos } = useEstado();
  const escopo = useLojaEscopo();
  const autor = useNomeUsuario();
  const [lojaLivre, setLojaLivre] = useState(lojas[0]!.id);
  const lojaId = escopo ?? lojaLivre;
  const [rascunho, setRascunho] = useState<Record<string, number>>({});
  const [salvo, setSalvo] = useState(false);
  const alterados = Object.keys(rascunho).length;

  return (
    <div>
      <Titulo
        titulo="Estoque mínimo"
        descricao={`Abaixo deste número a peça aparece como “estoque baixo” em ${nomeLoja(lojaId)}.`}
        acao={
          <>
            {!escopo ? (
              <Select
                aria-label="Unidade"
                value={lojaLivre}
                onChange={(e) => {
                  setLojaLivre(e.target.value);
                  setRascunho({});
                }}
                className="w-52"
                opcoes={lojas.map((l) => ({ value: l.id, label: l.nome }))}
              />
            ) : null}
            <Botao
              disabled={!alterados}
              onClick={() => {
                Object.entries(rascunho).forEach(([sku, v]) => definirMinimo(sku, lojaId, v, autor));
                setRascunho({});
                setSalvo(true);
              }}
            >
              Salvar {alterados ? `(${alterados})` : ""}
            </Botao>
          </>
        }
      />
      {salvo && !alterados ? <p className="mb-4 text-sm text-sucesso">Estoques mínimos atualizados.</p> : null}

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
            {produtos.map((p) => {
              const saldo = p.saldos.find((s) => s.lojaId === lojaId);
              if (!saldo) return null;
              const minimo = rascunho[p.sku] ?? saldo.minimo;
              const baixo = saldo.quantidade <= minimo;
              return (
                <tr key={p.sku}>
                  <td className={td}>
                    <span className="font-medium">{p.nome}</span>
                    <span className="ml-2 font-mono text-[11px] text-suave">{p.sku}</span>
                  </td>
                  <td className={`${td} tabular-nums`}>{saldo.quantidade}</td>
                  <td className={td}>
                    <input
                      type="number"
                      min={0}
                      value={minimo}
                      onChange={(e) => {
                        setSalvo(false);
                        setRascunho((r) => ({ ...r, [p.sku]: Number(e.target.value) }));
                      }}
                      className={`w-20 rounded-sm border px-2 py-1 text-sm outline-none focus:border-marinho ${
                        p.sku in rascunho ? "border-dourado bg-dourado-claro/40" : "border-linha bg-papel"
                      }`}
                    />
                  </td>
                  <td className={td}>
                    <Badge tom={saldo.quantidade === 0 ? "perigo" : baixo ? "alerta" : "ok"}>
                      {saldo.quantidade === 0 ? "Esgotado" : baixo ? "Abaixo do mínimo" : "OK"}
                    </Badge>
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
