import { useState, type ReactNode } from "react";
import { useSaldoEstoque } from "@/hooks/useEstoquePainel";
import {
  registrarMovimentacao,
  solicitarAjusteEstoque,
  type OpcoesEstoque,
} from "@/lib/estoquePainelApi";
import { diferencaDoAjuste, inteiroDoCampo, saldoDepois, saldoNaLoja } from "@/lib/estoquePainelUi";
import { useAcao } from "@/lib/useAcao";
import { AvisoErro, Botao, Campo, Modal, Segmentado, Select, inputClasses } from "./ui";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  opcoes: OpcoesEstoque;
  /** Peça já escolhida (vindo do filtro da tela). */
  skuInicial?: string;
  /** Chamado depois de gravar, para a tela reler a lista do servidor. */
  onSucesso: () => void;
};

/** Peça e loja da operação, e o saldo dela lido do servidor. */
function usePecaELoja(opcoes: OpcoesEstoque, skuInicial?: string) {
  const [sku, setSku] = useState(skuInicial ?? opcoes.pecas[0]?.sku ?? "");
  const [lojaEscolhida, setLojaEscolhida] = useState(opcoes.lojas[0]?.id_loja ?? "");
  const { escopo } = opcoes;
  const idLoja = escopo.id_loja ?? (escopo.pode_escolher_loja ? lojaEscolhida : "");
  const consulta = useSaldoEstoque({ busca: sku || undefined, limit: 20, offset: 0 });
  const atual = sku ? saldoNaLoja(consulta.dados, sku, idLoja || null) : null;

  const campoPeca = (
    <Campo label="Peça">
      <Select
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        opcoes={opcoes.pecas.map((p) => ({ value: p.sku, label: `${p.sku} · ${p.nome}` }))}
      />
    </Campo>
  );
  const campoLoja = escopo.pode_escolher_loja ? (
    <Campo label="Loja">
      <Select
        value={lojaEscolhida}
        onChange={(e) => setLojaEscolhida(e.target.value)}
        opcoes={opcoes.lojas.map((l) => ({ value: l.id_loja, label: l.nome }))}
      />
    </Campo>
  ) : (
    <Campo label="Loja">
      <input value={escopo.loja_nome ?? ""} readOnly className={inputClasses} />
    </Campo>
  );
  const nomeDaLoja = escopo.pode_escolher_loja
    ? (opcoes.lojas.find((l) => l.id_loja === lojaEscolhida)?.nome ?? "")
    : (escopo.loja_nome ?? "");
  return {
    sku,
    // O admin precisa informar a loja; para os demais o servidor usa a do login.
    idLojaParaEnviar: escopo.pode_escolher_loja ? lojaEscolhida : undefined,
    atual,
    nomeDaLoja,
    campoPeca,
    campoLoja,
  };
}

function Rodape({ onFechar, enviar, ocupado, erro, desativado }: { onFechar: () => void; enviar: string; ocupado: boolean; erro: string | null; desativado: boolean }): ReactNode {
  return (
    <>
      <AvisoErro erro={erro} />
      <div className="flex justify-end gap-2 pt-2">
        <Botao variante="secundario" onClick={onFechar}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={ocupado || desativado}>
          {ocupado ? "Enviando…" : enviar}
        </Botao>
      </div>
    </>
  );
}

/** Entrada ou saída avulsa: grava no servidor, que confere o saldo e lança a movimentação. */
export function ModalMovimentoEstoque({ aberto, onFechar, opcoes, skuInicial, onSucesso }: Props) {
  const { executar, ocupado, erro } = useAcao();
  const { sku, idLojaParaEnviar, atual, nomeDaLoja, campoPeca, campoLoja } = usePecaELoja(opcoes, skuInicial);
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [quantidadeTexto, setQuantidadeTexto] = useState("1");
  const [motivo, setMotivo] = useState(opcoes.motivos_entrada[0] ?? "");

  const motivos = tipo === "entrada" ? opcoes.motivos_entrada : opcoes.motivos_saida;
  const quantidade = inteiroDoCampo(quantidadeTexto, 1);
  const depois = atual !== null && quantidade !== null ? saldoDepois(tipo, atual, quantidade) : null;
  const naoCabe = depois !== null && depois < 0;
  const invalido = !sku || quantidade === null || !motivo || naoCabe || atual === null;

  return (
    <Modal aberto={aberto} titulo="Registrar entrada ou saída" onFechar={onFechar}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalido || quantidade === null) return;
          void executar("movimento", () =>
            registrarMovimentacao({ sku, tipo, quantidade, motivo, idLoja: idLojaParaEnviar }),
          ).then((ok) => {
            if (!ok) return;
            onSucesso();
            onFechar();
          });
        }}
      >
        <Segmentado
          valor={tipo}
          onChange={(t) => {
            setTipo(t);
            setMotivo((t === "entrada" ? opcoes.motivos_entrada : opcoes.motivos_saida)[0] ?? "");
          }}
          opcoes={[
            { value: "entrada", label: "Entrada" },
            { value: "saida", label: "Saída" },
          ]}
        />
        {campoPeca}
        {campoLoja}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Quantidade">
            <input
              inputMode="numeric"
              value={quantidadeTexto}
              onChange={(e) => setQuantidadeTexto(e.target.value)}
              aria-invalid={quantidade === null}
              className={inputClasses}
            />
          </Campo>
          <Campo label="Motivo">
            <Select value={motivo} onChange={(e) => setMotivo(e.target.value)} opcoes={motivos.map((m) => ({ value: m, label: m }))} />
          </Campo>
        </div>
        <p className="rounded-sm bg-areia/60 px-4 py-3 text-sm">
          {atual === null ? (
            "Consultando o saldo…"
          ) : (
            <>
              Saldo em {nomeDaLoja || "sua unidade"}: <strong>{atual}</strong> →{" "}
              <strong className={naoCabe ? "text-perigo" : "text-marinho"}>{depois ?? atual}</strong>
            </>
          )}
        </p>
        {naoCabe ? <p className="text-sm text-perigo">A saída é maior que o saldo disponível.</p> : null}
        <Rodape onFechar={onFechar} enviar="Registrar" ocupado={!!ocupado} erro={erro} desativado={invalido} />
      </form>
    </Modal>
  );
}

/** Pedido de ajuste de inventário: o saldo só muda quando o gerente aprova. */
export function ModalAjusteEstoque({ aberto, onFechar, opcoes, skuInicial, onSucesso }: Props) {
  const { executar, ocupado, erro, limparErro } = useAcao();
  const { sku, idLojaParaEnviar, atual, campoPeca, campoLoja } = usePecaELoja(opcoes, skuInicial);
  const [contadoTexto, setContadoTexto] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviado, setEnviado] = useState(false);

  // Enquanto a pessoa não digita, a contagem proposta é o próprio saldo.
  const texto = contadoTexto ?? (atual === null ? "" : String(atual));
  const contado = inteiroDoCampo(texto, 0);
  const diferenca = contado !== null && atual !== null ? diferencaDoAjuste(contado, atual) : null;
  const invalido = !sku || contado === null || diferenca === null || diferenca === 0 || motivo.trim().length < 3;

  function fechar() {
    setEnviado(false);
    setContadoTexto(null);
    setMotivo("");
    limparErro();
    onFechar();
  }

  return (
    <Modal aberto={aberto} titulo="Solicitar ajuste de inventário" onFechar={fechar}>
      {enviado ? (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-suave">
            Solicitação enviada com status <strong className="text-tinta">pendente</strong>. O saldo só muda depois da aprovação do
            gerente da unidade.
          </p>
          <div className="flex justify-end">
            <Botao onClick={fechar}>Fechar</Botao>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (invalido || contado === null) return;
            void executar("ajuste", () =>
              solicitarAjusteEstoque({ sku, quantidadeContada: contado, motivo: motivo.trim(), idLoja: idLojaParaEnviar }),
            ).then((ok) => {
              if (!ok) return;
              onSucesso();
              setEnviado(true);
            });
          }}
        >
          {campoPeca}
          {campoLoja}
          <Campo
            label="Quantidade contada"
            ajuda={
              atual === null
                ? "Consultando o saldo…"
                : `Saldo no sistema: ${atual} · diferença: ${diferenca === null ? "—" : diferenca > 0 ? `+${diferenca}` : diferenca}`
            }
          >
            <input
              inputMode="numeric"
              value={texto}
              onChange={(e) => setContadoTexto(e.target.value)}
              aria-invalid={contado === null}
              className={inputClasses}
            />
          </Campo>
          <Campo label="Motivo">
            <textarea
              required
              rows={3}
              maxLength={300}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: peça avariada, divergência na contagem…"
              className={inputClasses}
            />
          </Campo>
          {diferenca === 0 ? <p className="text-sm text-suave">A contagem é igual ao saldo: não há o que ajustar.</p> : null}
          <Rodape onFechar={fechar} enviar="Enviar para aprovação" ocupado={!!ocupado} erro={erro} desativado={invalido} />
        </form>
      )}
    </Modal>
  );
}
