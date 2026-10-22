import { Navigate } from "react-router-dom";
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
  // O vendedor não tem painel de início: trabalha em Vendas.
  if (papel === "vendedor") return <Navigate to="/painel/vendas" replace />;
  return <DashboardAtendente />;
}
