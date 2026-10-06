import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ExigeLogin } from "./components/acesso";
import { ContaLayout } from "./layouts/ContaLayout";
import { PainelLayout } from "./layouts/PainelLayout";
import { PortalLayout } from "./layouts/PortalLayout";
import { SecaoLayout } from "./layouts/SecaoLayout";
import { Entrar } from "./pages/Entrar";
import { Dashboard } from "./pages/painel/Dashboard";
import { Chamado } from "./pages/painel/atendimento/Chamado";
import { Chamados } from "./pages/painel/atendimento/Chamados";
import { Cliente } from "./pages/painel/atendimento/Cliente";
import { Clientes } from "./pages/painel/atendimento/Clientes";
import { Aprovacoes } from "./pages/painel/estoque/Aprovacoes";
import { Minimos } from "./pages/painel/estoque/Minimos";
import { Movimentacoes } from "./pages/painel/estoque/Movimentacoes";
import { Peca } from "./pages/painel/estoque/Peca";
import { Saldo } from "./pages/painel/estoque/Saldo";
import { Transferencias } from "./pages/painel/estoque/Transferencias";
import { Auditoria } from "./pages/painel/gestao/Auditoria";
import { CatalogoAdmin } from "./pages/painel/gestao/CatalogoAdmin";
import { Integracoes } from "./pages/painel/gestao/Integracoes";
import { Lojas } from "./pages/painel/gestao/Lojas";
import { Usuarios } from "./pages/painel/gestao/Usuarios";
import { Agendar } from "./pages/portal/Agendar";
import { Caderno, MateriaPagina } from "./pages/portal/Caderno";
import { Casas } from "./pages/portal/Casas";
import { Catalogo } from "./pages/portal/Catalogo";
import { Checkout } from "./pages/portal/Checkout";
import { Inicio } from "./pages/portal/Inicio";
import { MeuChamado } from "./pages/portal/MeuChamado";
import { MeusChamados } from "./pages/portal/MeusChamados";
import { MeusPedidos } from "./pages/portal/MeusPedidos";
import { NovoChamado } from "./pages/portal/NovoChamado";
import { Perfil } from "./pages/portal/Perfil";
import { Produto } from "./pages/portal/Produto";
import { Sacola } from "./pages/portal/Sacola";
import { SobMedida } from "./pages/portal/SobMedida";

function RolarAoTopo() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <RolarAoTopo />
      <Routes>
        {/* Loja (cliente) */}
        <Route element={<PortalLayout />}>
          <Route index element={<Inicio />} />
          <Route path="loja" element={<Catalogo />} />
          <Route path="loja/:sku" element={<Produto />} />
          <Route path="sacola" element={<Sacola />} />
          <Route path="sob-medida" element={<SobMedida />} />
          <Route path="agendar" element={<Agendar />} />
          <Route path="caderno" element={<Caderno />} />
          <Route path="caderno/:slug" element={<MateriaPagina />} />
          <Route path="casas" element={<Casas />} />
          <Route
            path="checkout"
            element={
              <ExigeLogin texto="Entre na sua conta para concluir a compra.">
                <Checkout />
              </ExigeLogin>
            }
          />
          <Route path="conta" element={<ContaLayout />}>
            <Route index element={<Navigate to="pedidos" replace />} />
            <Route path="pedidos" element={<MeusPedidos />} />
            <Route path="atendimento" element={<MeusChamados />} />
            <Route path="atendimento/novo" element={<NovoChamado />} />
            <Route path="atendimento/:id" element={<MeuChamado />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>
        </Route>

        <Route path="entrar" element={<Entrar />} />

        {/* Área interna: 4 seções, cada uma com abas (ver lib/navegacao.ts) */}
        <Route path="painel" element={<PainelLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="estoque" element={<SecaoLayout />}>
            <Route index element={<Saldo />} />
            <Route path="peca/:sku" element={<Peca />} />
            <Route path="movimentacoes" element={<Movimentacoes />} />
            <Route path="transferencias" element={<Transferencias />} />
            <Route path="aprovacoes" element={<Aprovacoes />} />
            <Route path="minimos" element={<Minimos />} />
          </Route>
          <Route path="atendimento" element={<SecaoLayout />}>
            <Route index element={<Chamados />} />
            <Route path="chamado/:id" element={<Chamado />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/:id" element={<Cliente />} />
          </Route>
          <Route path="gestao" element={<SecaoLayout />}>
            <Route index element={<Lojas />} />
            <Route path="catalogo" element={<CatalogoAdmin />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="auditoria" element={<Auditoria />} />
            <Route path="integracoes" element={<Integracoes />} />
          </Route>
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
