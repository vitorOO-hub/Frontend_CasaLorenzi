import { usePapel } from "@/lib/sessao";
import { DashboardAdmin } from "./inicio/Admin";
import { DashboardAtendente } from "./inicio/Atendente";
import { DashboardGerente } from "./inicio/Gerente";
import { DashboardOperador } from "./inicio/Operador";

/** Início: cada cargo tem o seu dashboard, com filtros próprios. */
export function Dashboard() {
  const papel = usePapel();
  if (papel === "admin") return <DashboardAdmin />;
  if (papel === "gerente_loja") return <DashboardGerente />;
  if (papel === "operador_estoque") return <DashboardOperador />;
  return <DashboardAtendente />;
}
