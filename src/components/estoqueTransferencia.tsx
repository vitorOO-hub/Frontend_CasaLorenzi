import { useState } from "react";
import {
  pedirReposicaoRede,
  pedirTransferencia,
} from "@/lib/transferenciasApi";
import type { OpcoesEstoque } from "@/lib/estoquePainelApi";
import { quantidadeValida } from "@/lib/transferenciasUi";
import { useAcao } from "@/lib/useAcao";
import { AvisoErro, Botao, Campo, Modal, Select, inputClasses } from "./ui";

type Props = {
  aberto: boolean;
  onFechar: () => void;
  opcoes: OpcoesEstoque;
  /** Chamado depois de gravar, para a tela reler a lista do servidor. */
  onSucesso: () => void;
};

/** Peça, quantidade e (para o admin) a loja que pede: campos comuns às duas janelas. */
function useCamposComuns(opcoes: OpcoesEstoque) {
  const [sku, setSku] = useState(opcoes.pecas[0]?.sku ?? "");
  const [quantidadeTexto, setQuantidadeTexto] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [lojaQuePede, setLojaQuePede] = useState(opcoes.lojas[0]?.id_loja ?? "");
  const { escopo } = opcoes;
  const quantidade = quantidadeValida(quantidadeTexto);
  // Para quem tem loja, o servidor usa a do login; o admin precisa dizer qual loja está pedindo.
  const idLoja = escopo.pode_escolher_loja ? lojaQuePede : undefined;
  const idDoDestino = escopo.id_loja ?? lojaQuePede;

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
    <Campo label="Loja que precisa da peça">
      <Select
        value={lojaQuePede}
        onChange={(e) => setLojaQuePede(e.target.value)}
        opcoes={opcoes.lojas.map((l) => ({ value: l.id_loja, label: l.nome }))}
      />
    </Campo>
  ) : (
    <Campo label="Para">
      <input value={escopo.loja_nome ?? ""} readOnly className={inputClasses} />
    </Campo>
  );
  const campoQuantidade = (
    <Campo label="Quantidade">
      <input
        inputMode="numeric"
        value={quantidadeTexto}
        onChange={(e) => setQuantidadeTexto(e.target.value)}
        aria-invalid={quantidade === null}
        className={inputClasses}
      />
    </Campo>
  );
  const campoObservacao = (
    <Campo label="Observação (opcional)">
      <textarea
        rows={2}
        maxLength={300}
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        className={inputClasses}
      />
    </Campo>
  );
  return { sku, quantidade, observacao: observacao.trim() || undefined, idLoja, idDoDestino, campoPeca, campoLoja, campoQuantidade, campoObservacao };
}

function Rodape({ onFechar, enviar, ocupado, erro, desativado }: { onFechar: () => void; enviar: string; ocupado: boolean; erro: string | null; desativado: boolean }) {
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

/** Pede peças a outra loja. A origem aceita e, quando as peças chegarem, a sua loja confirma. */
export function ModalTransferenciaEstoque({ aberto, onFechar, opcoes, onSucesso }: Props) {
  const { executar, ocupado, erro } = useAcao();
  const campos = useCamposComuns(opcoes);
  const origens = opcoes.rede.filter((l) => l.id_loja !== campos.idDoDestino);
  const [origemEscolhida, setOrigemEscolhida] = useState("");
  const origem = origens.some((l) => l.id_loja === origemEscolhida) ? origemEscolhida : (origens[0]?.id_loja ?? "");
  const invalido = !campos.sku || campos.quantidade === null || !origem;

  return (
    <Modal aberto={aberto} titulo="Solicitar transferência" onFechar={onFechar}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalido || campos.quantidade === null) return;
          void executar("transferencia", () =>
            pedirTransferencia({
              sku: campos.sku,
              quantidade: campos.quantidade!,
              idLojaOrigem: origem,
              observacao: campos.observacao,
              idLoja: campos.idLoja,
            }),
          ).then((ok) => {
            if (!ok) return;
            onSucesso();
            onFechar();
          });
        }}
      >
        {campos.campoPeca}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Trazer de">
            <Select value={origem} onChange={(e) => setOrigemEscolhida(e.target.value)} opcoes={origens.map((l) => ({ value: l.id_loja, label: l.nome }))} />
          </Campo>
          {campos.campoLoja}
        </div>
        {campos.campoQuantidade}
        {campos.campoObservacao}
        <p className="text-xs leading-relaxed text-suave">
          A loja de origem aceita o envio (a peça sai do estoque dela) e, quando as peças chegarem, a sua loja confirma o
          recebimento. Acompanhe tudo na aba Transferências.
        </p>
        <Rodape onFechar={onFechar} enviar="Solicitar" ocupado={!!ocupado} erro={erro} desativado={invalido} />
      </form>
    </Modal>
  );
}

/** Pedido de reposição à rede toda: a primeira outra loja que atender vira a origem. */
export function ModalReposicaoEstoque({ aberto, onFechar, opcoes, onSucesso }: Props) {
  const { executar, ocupado, erro } = useAcao();
  const campos = useCamposComuns(opcoes);
  const invalido = !campos.sku || campos.quantidade === null;

  return (
    <Modal aberto={aberto} titulo="Pedir reposição à rede" onFechar={onFechar}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalido || campos.quantidade === null) return;
          void executar("reposicao", () =>
            pedirReposicaoRede({
              sku: campos.sku,
              quantidade: campos.quantidade!,
              observacao: campos.observacao,
              idLoja: campos.idLoja,
            }),
          ).then((ok) => {
            if (!ok) return;
            onSucesso();
            onFechar();
          });
        }}
      >
        {campos.campoPeca}
        {campos.campoLoja}
        {campos.campoQuantidade}
        {campos.campoObservacao}
        <p className="text-xs leading-relaxed text-suave">Quando uma loja atender, a peça sai do estoque dela e fica em trânsito até você confirmar o recebimento.</p>
        <Rodape onFechar={onFechar} enviar="Abrir pedido" ocupado={!!ocupado} erro={erro} desativado={invalido} />
      </form>
    </Modal>
  );
}
