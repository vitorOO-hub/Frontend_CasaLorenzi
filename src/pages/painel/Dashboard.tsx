import { usePapel } from "@/lib/sessao";
import { DashboardAdmin } from "./inicio/Admin";
import { DashboardAtendente } from "./inicio/Atendente";
import { DashboardGerente } from "./inicio/Gerente";
import { DashboardOperador } from "./inicio/Operador";

/** Início: cada cargo tem o seu dashboard, com filtros próprios. */
export function Dashboard() {
  const papel = usePapel();
  if (papel === "administrador") return <DashboardAdmin />;
  if (papel === "gerente") return <DashboardGerente />;
  if (papel === "operador") return <DashboardOperador />;
  return <DashboardAtendente />;
}
