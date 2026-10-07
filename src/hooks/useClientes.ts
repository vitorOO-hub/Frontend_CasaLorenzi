import { useEffect, useState } from "react";
import { buscarFicha, ehUuid, listarClientes, type FichaCliente, type FiltrosClientes, type ListaClientes } from "@/lib/clientesApi";
import { useConsulta, type Consulta } from "./useChamados";

/** Valor que só muda depois de `ms` sem novas alterações (para não consultar a cada tecla). */
export function useAtraso<T>(valor: T, ms = 350): T {
  const [atrasado, setAtrasado] = useState(valor);
  useEffect(() => {
    const relogio = setTimeout(() => setAtrasado(valor), ms);
    return () => clearTimeout(relogio);
  }, [valor, ms]);
  return atrasado;
}

export const useListaClientes = (filtros: FiltrosClientes): Consulta<ListaClientes> =>
  useConsulta((sinal) => listarClientes(filtros, { sinal }), JSON.stringify(filtros));

/** Ficha do cliente. Id que não é um UUID nem chega a consultar o servidor. */
export const useFichaCliente = (id: string | undefined): Consulta<FichaCliente> =>
  useConsulta((sinal) => buscarFicha(id as string, undefined, { sinal }), `ficha:${id}`, { ativa: ehUuid(id) });
