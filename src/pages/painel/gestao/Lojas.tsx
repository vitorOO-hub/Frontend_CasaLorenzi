import { MapPin, UserRound } from "lucide-react";
import { useState } from "react";
import { AvisoErro, Botao, Campo, Card, Modal, Titulo, inputClasses } from "@/components/ui";
import * as acoes from "@/lib/acoes";
import { moeda, type Loja } from "@/lib/dados";
import { useLojasVisiveis, usePapel } from "@/lib/sessao";
import { useEstado } from "@/lib/store";
import { useAcao } from "@/lib/useAcao";

const vazio = { nome: "", cidade: "", endereco: "", responsavel: "" };

export function Lojas() {
  const { produtos, chamados, pedidos, usuarios } = useEstado();
  const lojas = useLojasVisiveis();
  const admin = usePapel() === "admin";
  const { executar, ocupado, erro, limparErro } = useAcao();
  const [editando, setEditando] = useState<Loja | "nova" | null>(null);
  const [form, setForm] = useState(vazio);

  function abrir(l: Loja | "nova") {
    limparErro();
    setEditando(l);
    setForm(l === "nova" ? vazio : { nome: l.nome, cidade: l.cidade, endereco: l.endereco, responsavel: l.responsavel });
  }

  return (
    <div>
      <Titulo
        titulo="Lojas"
        descricao={lojas.length === 1 ? "Os números da sua unidade." : "As casas da rede lado a lado."}
        acao={admin ? <Botao onClick={() => abrir("nova")}>Cadastrar loja</Botao> : null}
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lojas.map((l) => {
          const unidades = produtos.reduce((s, p) => s + (p.saldos.find((x) => x.lojaId === l.id)?.quantidade ?? 0), 0);
          const baixos = produtos.filter((p) => {
            const s = p.saldos.find((x) => x.lojaId === l.id);
            return s && s.quantidade <= s.minimo;
          }).length;
          const vendas = pedidos.filter((p) => p.lojaId === l.id && p.status !== "Cancelado").reduce((s, p) => s + p.valor, 0);
          const abertos = chamados.filter((c) => c.lojaId === l.id && c.status !== "Resolvido").length;
          const time = usuarios.filter((u) => u.lojaId === l.id && u.ativo).length;
          return (
            <Card key={l.id} className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="rotulo !text-dourado">{l.cidade}</p>
                  <h2 className="mt-1 text-3xl">{l.nome}</h2>
                </div>
                {admin ? (
                  <Botao pequeno variante="fantasma" onClick={() => abrir(l)}>
                    Editar
                  </Botao>
                ) : null}
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-suave">
                <MapPin className="h-3.5 w-3.5" /> {l.endereco}
              </p>
              <p className="mt-1 flex items-center gap-2 text-xs text-suave">
                <UserRound className="h-3.5 w-3.5" /> {l.responsavel} · {time} no time
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-linha">
                {(
                  [
                    ["Unidades", unidades],
                    ["Peças em alerta", baixos],
                    ["Vendas", moeda(vendas)],
                    ["Chamados abertos", abertos],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="bg-papel p-3">
                    <dt className="rotulo !text-[9px]">{k}</dt>
                    <dd className="mt-1 font-display text-2xl text-marinho">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
      </div>

      <Modal aberto={editando !== null} titulo={editando === "nova" ? "Nova loja" : "Editar loja"} onFechar={() => setEditando(null)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const id = editando === "nova" || !editando ? null : editando.id;
            void executar("loja", () => acoes.salvarLoja(id, form)).then((ok) => ok && setEditando(null));
          }}
        >
          {(
            [
              ["nome", "Nome da loja", "Shopping Iguatemi"],
              ["cidade", "Cidade", "Curitiba, PR"],
              ["endereco", "Endereço", "Rua, número — bairro"],
              ["responsavel", "Gerente responsável", "Nome do gerente"],
            ] as const
          ).map(([campo, rotulo, ph]) => (
            <Campo key={campo} label={rotulo}>
              <input
                required
                value={form[campo]}
                onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                placeholder={ph}
                className={inputClasses}
              />
            </Campo>
          ))}
          <AvisoErro erro={erro} />
          <div className="flex justify-end gap-2 pt-2">
            <Botao variante="secundario" onClick={() => setEditando(null)}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={ocupado !== null}>
              {ocupado ? "Salvando…" : "Salvar"}
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
