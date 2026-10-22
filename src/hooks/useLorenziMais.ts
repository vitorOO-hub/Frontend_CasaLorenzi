import { useEffect, useState } from "react";
import { usandoApi } from "@/api/config";
import { useSessao } from "@/lib/sessao";
import { obterVultoMais, type VultoMais } from "@/lib/vultoMais";

/** Saldo e regras do Lorenzi+ do cliente logado; nulo sem login, sem API ou se a consulta falhar. */
export function useLorenziMais(): VultoMais | null {
  const modoApi = usandoApi();
  const cliente = useSessao()?.tipo === "cliente";
  const [dados, setDados] = useState<VultoMais | null>(null);
  useEffect(() => {
    if (!modoApi || !cliente) return;
    let vivo = true;
    obterVultoMais()
      .then((r) => vivo && setDados(r))
      .catch(() => undefined); // sem o saldo, a compra segue sem resgate
    return () => {
      vivo = false;
    };
  }, [modoApi, cliente]);
  return modoApi && cliente ? dados : null;
}
