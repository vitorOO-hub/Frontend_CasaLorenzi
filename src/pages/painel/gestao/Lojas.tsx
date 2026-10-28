import { Clock, MapPin, Phone, UserRound } from "lucide-react";
import { useState } from "react";
import { mensagemDeErro } from "@/api/erros";
import { AvisoErro, Botao, Card, Modal, Titulo, cn, inputClasses } from "@/components/ui";
import { useLojasDaRede } from "@/hooks/useDashboardGerente";
import { moedaBR } from "@/lib/chamadosUi";
import type { LojaDaRede } from "@/lib/gerenciaApi";
import { alterarHorarioDaLoja } from "@/lib/gestaoApi";
import { ROTULO_DIA, horarioDasLinhas, linhasDoHorario, resumoHorario, type LinhaHorario } from "@/lib/horarioLoja";
import { usePapel } from "@/lib/sessao";

/** Edição do horário de funcionamento (só admin). O site e o assistente do cliente leem daqui. */
function EditarHorario({ loja, aoFechar, aoSalvar }: { loja: LojaDaRede; aoFechar: () => void; aoSalvar: () => void }) {
  const [linhas, setLinhas] = useState<LinhaHorario[]>(() => linhasDoHorario(loja.horario_funcionamento));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mudar = (i: number, parte: Partial<LinhaHorario>) =>
    setLinhas((atuais) => atuais.map((l, j) => (j === i ? { ...l, ...parte } : l)));

  async function salvar() {
    const resultado = horarioDasLinhas(linhas);
    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await alterarHorarioDaLoja(loja.id_loja, resultado.horario);
      aoSalvar();
    } catch (e) {
      setErro(mensagemDeErro(e));
      setSalvando(false);
    }
  }

  return (
    <Modal aberto titulo={`Horário · ${loja.nome}`} onFechar={aoFechar}>
      <div className="space-y-2">
        {linhas.map((l, i) => (
          <div key={l.dia} className="grid grid-cols-[6.5rem_1fr_1fr] items-center gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={l.aberta} onChange={(e) => mudar(i, { aberta: e.target.checked })} />
              {ROTULO_DIA[l.dia]}
            </label>
            {l.aberta ? (
              <>
                <input
                  type="time"
                  aria-label={`${ROTULO_DIA[l.dia]}: abre`}
                  className={inputClasses}
                  value={l.abre}
                  onChange={(e) => mudar(i, { abre: e.target.value })}
                />
                <input
                  type="time"
                  aria-label={`${ROTULO_DIA[l.dia]}: fecha`}
                  className={inputClasses}
                  value={l.fecha}
                  onChange={(e) => mudar(i, { fecha: e.target.value })}
                />
              </>
            ) : (
              <span className="col-span-2 text-suave">Fechada</span>
            )}
          </div>
        ))}
      </div>
      <AvisoErro erro={erro} className="mt-4" />
      <div className="mt-6 flex justify-end gap-2">
        <Botao variante="secundario" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao onClick={() => void salvar()} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar horário"}
        </Botao>
      </div>
    </Modal>
  );
}

/** Cartão de cada loja com números reais do banco: gerente vê a unidade dele, o admin vê a rede. */
export function Lojas() {
  const consulta = useLojasDaRede();
  const lojas = consulta.dados ?? [];
  const admin = usePapel() === "admin";
  const [editando, setEditando] = useState<LojaDaRede | null>(null);

  return (
    <div>
      <Titulo
        titulo="Lojas"
        descricao={lojas.length === 1 ? "Os números da sua unidade." : "As casas da rede lado a lado."}
      />
      <AvisoErro erro={consulta.erro} className="mb-6" />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lojas.map((l) => (
          <Card key={l.id_loja} className="p-6">
            <p className="rotulo !text-dourado">{[l.cidade, l.uf].filter(Boolean).join(", ") || "—"}</p>
            <h2 className="mt-1 text-3xl">{l.nome}</h2>
            {l.endereco ? (
              <p className="mt-3 flex items-center gap-2 text-xs text-suave">
                <MapPin className="h-3.5 w-3.5" /> {l.endereco}
              </p>
            ) : null}
            {l.telefone ? (
              <p className="mt-1 flex items-center gap-2 text-xs text-suave">
                <Phone className="h-3.5 w-3.5" /> {l.telefone}
              </p>
            ) : null}
            <p className="mt-1 flex items-center gap-2 text-xs text-suave">
              <UserRound className="h-3.5 w-3.5" /> {l.gerente ?? "Sem gerente"} · {l.equipe} no time
            </p>
            <p className={cn("mt-1 flex items-start gap-2 text-xs", l.horario_funcionamento ? "text-suave" : "text-perigo")}>
              <Clock className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>
                {resumoHorario(l.horario_funcionamento)}
                {admin ? (
                  <button className="link-tracejado ml-2 text-marinho" onClick={() => setEditando(l)}>
                    {l.horario_funcionamento ? "editar" : "cadastrar"}
                  </button>
                ) : null}
              </span>
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-linha">
              {(
                [
                  ["Unidades", l.unidades_em_estoque],
                  ["SKUs em alerta", l.pecas_em_alerta],
                  ["Vendas (30 dias)", moedaBR(l.vendas_30_dias)],
                  ["Chamados abertos", l.chamados_abertos],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="bg-papel p-3">
                  <dt className="rotulo !text-[9px]">{k}</dt>
                  <dd className="mt-1 font-display text-2xl text-marinho">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
      {lojas.length === 0 ? (
        <p className="py-10 text-center text-sm text-suave">{consulta.carregando ? "Carregando as lojas…" : "Nenhuma loja."}</p>
      ) : null}
      {editando ? (
        <EditarHorario
          loja={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null);
            consulta.recarregar();
          }}
        />
      ) : null}
    </div>
  );
}
