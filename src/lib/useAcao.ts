import { useCallback, useState } from "react";
import { mensagemDeErro } from "@/api/erros";

/**
 * Estado de uma ação assíncrona na tela: qual item está em andamento e a mensagem de erro.
 * `executar` devolve true quando deu certo, para a tela fechar o modal ou limpar o formulário.
 */
export function useAcao() {
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const executar = useCallback(async (chave: string, acao: () => Promise<unknown>) => {
    setOcupado(chave);
    setErro(null);
    try {
      await acao();
      return true;
    } catch (e) {
      setErro(mensagemDeErro(e));
      return false;
    } finally {
      setOcupado(null);
    }
  }, []);

  return { executar, ocupado, erro, limparErro: () => setErro(null) };
}
