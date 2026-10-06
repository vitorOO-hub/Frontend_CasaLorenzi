import { ChevronLeft, ChevronRight, Menu, Search, ShoppingBag, X } from "lucide-react";
import { SeletorFontes } from "@/components/SeletorFontes";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MenuUsuario } from "@/components/MenuUsuario";
import { cn } from "@/components/ui";
import { EDICAO } from "@/lib/loja";
import { sair, useSessao } from "@/lib/sessao";
import { useEstado } from "@/lib/store";

/** Marca empilhada, alinhada à esquerda. */
export function Marca({ claro = false, grande = false, className }: { claro?: boolean; grande?: boolean; className?: string }) {
  return (
    <span className={cn("block font-display leading-[0.9]", claro ? "text-creme" : "text-marinho", className)}>
      <span className={cn("block", grande ? "text-[60px] md:text-[88px]" : "text-[34px]")}>
        Casa
        <br />
        Lorenzi
      </span>
      {grande ? null : (
        <small className={cn("mt-2 block font-sans text-[11px] tracking-wide", claro ? "text-creme/60" : "text-suave")}>
          Alfaiates desde 1962
        </small>
      )}
    </span>
  );
}

export function PortalLayout() {
  const sessao = useSessao();
  const { carrinho, produtos } = useEstado();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // Menus guardam a rota em que foram abertos: ao navegar, fecham sozinhos.
  const rota = `${pathname}${search}`;
  const [menuEm, setMenuEm] = useState<string | null>(null);
  const [buscaEm, setBuscaEm] = useState<string | null>(null);
  const [termo, setTermo] = useState("");
  const [rolou, setRolou] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const menuAberto = menuEm === rota;
  const buscaAberta = buscaEm === rota;
  const itensSacola = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const cliente = sessao?.tipo === "cliente" ? sessao : null;
  const home = pathname === "/";
  // Na home o cabeçalho fica transparente sobre o vídeo até a página rolar.
  const transparente = home && !rolou && !buscaAberta;

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 60);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  function buscar(e: FormEvent) {
    e.preventDefault();
    navigate(`/loja?busca=${encodeURIComponent(termo.trim())}`);
    setTermo("");
  }

  const categorias = Array.from(new Set(produtos.map((p) => p.categoria))).sort();
  const secoesMenu: { id: string; rotulo: string; itens: [string, string][] }[] = [
    { id: "destaques", rotulo: "Destaques", itens: [[`Edição ${EDICAO.numero} · ${EDICAO.nome}`, "/loja"], ["Novidades", "/loja"], ["Casacos da estação", "/loja?categoria=Outerwear"], ["Últimas peças", "/loja?ordem=maior"]] },
    { id: "pronta", rotulo: "Pronta-entrega", itens: [["Ver tudo", "/loja"], ...categorias.map((c): [string, string] => [c, `/loja?categoria=${c}`])] },
    { id: "sob", rotulo: "Sob medida", itens: [["Como funciona", "/sob-medida"], ["Tecidos da estação", "/sob-medida"], ["Agendar uma conversa", "/agendar?tipo=sob-medida"]] },
    { id: "casa", rotulo: "A casa", itens: [["Caderno do Ateliê", "/caderno"], ["As três casas", "/casas"], ["1962: a primeira tesoura", "/caderno/1962"]] },
  ];

  return (
    <div className="loja flex min-h-screen flex-col">
      <div
        className={cn(
          "inset-x-0 top-0 z-40 transition-colors duration-500",
          home ? "fixed" : "sticky",
          transparente ? "bg-transparent text-white" : "bg-creme text-tinta shadow-[0_1px_0_#ddd2c0]",
        )}
      >
        <div className={cn("flex justify-center px-5 py-2 text-xs md:px-12", transparente ? "text-white/80" : "border-b border-dashed border-linha text-suave")}>
          <span>
            <b className={cn("font-medium", transparente ? "text-white" : "text-tinta")}>
              Edição {EDICAO.numero} · {EDICAO.nome}
            </b>{" "}
            <span className="hidden sm:inline">— frete por nossa conta acima de R$ 1.000 · ajustes sempre sem custo</span>
          </span>
        </div>

        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 md:px-12">
          <button
            onClick={() => {
              setSubmenu(null);
              setMenuEm(rota);
            }}
            className="flex items-center gap-3 justify-self-start text-sm hover:opacity-70"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.4} />
            <span className="hidden md:inline">Menu</span>
          </button>

          <Link to="/" aria-label="Casa Lorenzi — início" className="whitespace-nowrap text-center font-display text-[24px] leading-none sm:text-[28px] md:text-[34px]">
            Casa Lorenzi
          </Link>

          <nav className="flex items-center gap-4 justify-self-end text-sm md:gap-7" aria-label="Atalhos">
            <button onClick={() => setBuscaEm(buscaAberta ? null : rota)} aria-label="Buscar" className="hover:opacity-70">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </button>
            {cliente ? (
              <MenuUsuario
                compacto
                nome={cliente.nome}
                detalhe="Cliente Casa Lorenzi"
                email={cliente.email}
                onSair={() => {
                  sair();
                  navigate("/");
                }}
                itens={
                  <div className="py-1 text-tinta">
                    {[
                      ["/conta/pedidos", "Meus pedidos"],
                      ["/conta/atendimento", "Conversas com a casa"],
                      ["/conta/perfil", "Meus dados"],
                    ].map(([to, rotulo]) => (
                      <Link key={to} to={to!} className="block px-4 py-2 text-sm hover:bg-palha/60">
                        {rotulo}
                      </Link>
                    ))}
                  </div>
                }
              />
            ) : (
              <Link to="/entrar" className="hidden hover:opacity-70 sm:inline">
                Entrar
              </Link>
            )}
            <Link to="/sacola" className="flex items-center gap-1 whitespace-nowrap hover:opacity-70" aria-label={`Sacola com ${itensSacola} peças`}>
              <ShoppingBag className="h-[18px] w-[18px] sm:hidden" strokeWidth={1.4} />
              <span className="hidden sm:inline">Sacola</span> ({itensSacola})
            </Link>
          </nav>
        </header>

        {buscaAberta ? (
          <form onSubmit={buscar} className="border-t border-dashed border-linha px-5 py-4 md:px-12">
            <div className="mx-auto flex max-w-2xl items-center gap-3 border-b border-tinta pb-2">
              <Search className="h-4 w-4 text-suave" />
              <input
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Peça, tecido ou cor — “linho”, “merino”, “Areia de Ipanema”"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-suave"
              />
              <button type="submit" className="link-tracejado text-sm">
                Buscar
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {/* Menu lateral (inspirado na Fear of God): itens em caixa alta, submenus que deslizam */}
      <div
        className={cn("fixed inset-0 z-50 bg-tinta/30 transition-opacity duration-300", menuAberto ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setMenuEm(null)}
        aria-hidden={!menuAberto}
      >
        <aside
          className={cn(
            "loja flex h-full w-[440px] max-w-[90%] flex-col overflow-hidden transition-transform duration-500 ease-out [font-family:var(--font-menu)]",
            menuAberto ? "translate-x-0" : "-translate-x-full",
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label="Menu"
        >
          <div className="flex h-14 shrink-0 items-center justify-between px-7">
            {submenu ? (
              <button onClick={() => setSubmenu(null)} className="flex items-center gap-2 text-[13px] uppercase tracking-[0.14em] hover:text-caramelo">
                <ChevronLeft className="h-4 w-4" strokeWidth={1.4} /> {secoesMenu.find((m) => m.id === submenu)?.rotulo}
              </button>
            ) : (
              <span />
            )}
            <button onClick={() => setMenuEm(null)} aria-label="Fechar menu" className="hover:text-caramelo">
              <X className="h-5 w-5" strokeWidth={1.3} />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {/* Nível 1 */}
            <div className={cn("absolute inset-0 flex flex-col overflow-y-auto px-7 pb-8 pt-4 transition-transform duration-500 ease-out", submenu && "-translate-x-full")}>
              <nav className="flex flex-col" aria-label="Principal">
                {secoesMenu.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSubmenu(m.id)}
                    className="flex items-center justify-between py-3 text-left text-[15px] uppercase tracking-[0.14em] hover:text-caramelo"
                  >
                    {m.rotulo}
                    <ChevronRight className="h-4 w-4" strokeWidth={1.3} />
                  </button>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-1 pt-10 text-[13px] uppercase tracking-[0.14em] text-suave">
                <Link to={cliente ? "/conta/pedidos" : "/entrar"} className="py-1.5 hover:text-tinta">
                  {cliente ? `Conta · ${cliente.nome.split(" ")[0]}` : "Conta"}
                </Link>
                <Link to="/conta/atendimento/novo" className="py-1.5 hover:text-tinta">
                  Contato
                </Link>
                <Link to="/agendar" className="py-1.5 hover:text-tinta">
                  Agendar uma prova
                </Link>
                <Link to="/entrar?time=1" className="py-1.5 text-[11px] text-suave/70 hover:text-tinta">
                  Área interna
                </Link>
              </div>
            </div>

            {/* Nível 2: submenu da seção escolhida */}
            <div className={cn("absolute inset-0 overflow-y-auto px-7 pb-8 pt-4 transition-transform duration-500 ease-out", submenu ? "translate-x-0" : "translate-x-full")}>
              <nav className="flex flex-col">
                {(secoesMenu.find((m) => m.id === submenu)?.itens ?? []).map(([rotulo, to]) => (
                  <Link key={rotulo} to={to} className="py-3 text-[15px] uppercase tracking-[0.14em] hover:text-caramelo">
                    {rotulo}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </aside>
      </div>

      <main className="flex-1">
        <Outlet />
      </main>

      <CartaMensal />
      <Rodape />
      <SeletorFontes />
    </div>
  );
}

function CartaMensal() {
  const [inscrito, setInscrito] = useState(false);
  return (
    <div className="mt-28 border-y border-dashed border-linha py-14">
      <div className="mx-auto grid max-w-[1360px] items-center gap-10 px-5 md:grid-cols-2 md:px-12">
        <p className="font-display text-[30px] leading-tight md:text-[34px]">
          Uma carta por mês, escrita no ateliê.
          <span className="block text-[20px] text-suave md:text-[22px]">
            Novas edições, convites para provas e nenhuma promoção-relâmpago.
          </span>
        </p>
        {inscrito ? (
          <p className="font-mao text-[14px] leading-relaxed text-caramelo">Anotado. A primeira carta chega no começo do mês.</p>
        ) : (
          <form
            className="flex border-b-[1.5px] border-tinta"
            onSubmit={(e) => {
              e.preventDefault();
              setInscrito(true);
            }}
          >
            <input type="email" required placeholder="Seu e-mail" className="flex-1 bg-transparent py-3.5 outline-none" />
            <button type="submit" className="text-sm font-medium text-caramelo">
              Quero receber
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Rodape() {
  const colunas: [string, [string, string][]][] = [
    [
      "Comprar",
      [
        ["Edição 64 · Garoa", "/loja"],
        ["Pronta-entrega", "/loja"],
        ["Sob medida", "/sob-medida"],
        ["Agendar uma prova", "/agendar"],
      ],
    ],
    [
      "Ajuda",
      [
        ["Meus pedidos", "/conta/pedidos"],
        ["Trocas e ajustes", "/conta/atendimento"],
        ["Fale com a casa", "/conta/atendimento/novo"],
        ["WhatsApp (11) 99876-5432", "/conta/atendimento"],
      ],
    ],
    [
      "A casa",
      [
        ["Caderno do Ateliê", "/caderno"],
        ["As três casas", "/casas"],
        ["1962: a primeira tesoura", "/caderno/1962"],
        ["Área interna", "/entrar?time=1"],
      ],
    ],
  ];
  return (
    <footer className="px-5 pb-10 pt-20 md:px-12">
      <div className="mx-auto grid max-w-[1360px] gap-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <Link to="/" className="sm:col-span-2 md:col-span-1">
          <Marca grande />
        </Link>
        {colunas.map(([titulo, links]) => (
          <div key={titulo}>
            <h5 className="mb-3 text-[13px] font-medium text-caramelo">{titulo}</h5>
            <ul className="space-y-2 text-[15px]">
              {links.map(([rotulo, to]) => (
                <li key={rotulo}>
                  <Link to={to} className="hover:text-caramelo">
                    {rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-14 max-w-[1360px] border-t border-dashed border-linha pt-5 text-center text-xs text-suave">
        © 2026 Casa Lorenzi · Protótipo — fotos do Unsplash com tratamento de cor; nomes, histórias e eventos são ilustrativos.
      </p>
    </footer>
  );
}
