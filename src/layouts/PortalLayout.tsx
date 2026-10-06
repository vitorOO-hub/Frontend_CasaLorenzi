import { Menu, Plus, Search, ShoppingBag, X } from "lucide-react";
import { SeletorFontes } from "@/components/SeletorFontes";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
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

  const secaoDaRota = secoesMenu.find((m) => m.itens.some(([, to]) => to.split("?")[0] === pathname && pathname !== "/loja"))?.id ?? (pathname === "/loja" ? "pronta" : null);
  const contaLink = cliente ? "/conta/pedidos" : "/entrar";

  return (
    <div className="loja min-h-screen lg:pl-[248px]">
      {/* Menu vertical fixo (desktop): marca, navegação em acordeão e atalhos */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-dashed border-linha bg-creme px-7 pb-7 pt-8 [font-family:var(--font-menu)] lg:flex"
        aria-label="Menu"
      >
        <Link to="/" aria-label="Casa Lorenzi — início" className="[font-family:var(--font-display)]">
          <span className="block text-[30px] leading-[0.92] text-marinho">
            Casa
            <br />
            Lorenzi
          </span>
          <small className="mt-2 block font-sans text-[11px] tracking-wide text-suave">Alfaiates desde 1962</small>
        </Link>

        <form onSubmit={buscar} className="mt-8 flex items-center gap-2 border-b border-linha pb-1.5 focus-within:border-tinta">
          <Search className="h-3.5 w-3.5 shrink-0 text-suave" strokeWidth={1.5} />
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="BUSCAR"
            aria-label="Buscar"
            className="w-full bg-transparent text-[12px] uppercase tracking-[0.14em] outline-none placeholder:text-suave"
          />
        </form>

        <div className="-mr-3 mt-7 flex-1 overflow-y-auto pr-3">
          <NavegacaoVertical secoes={secoesMenu} inicial={secaoDaRota} pathname={pathname} search={search} />
        </div>

        <div className="mt-6 flex flex-col gap-0.5 border-t border-dashed border-linha pt-5 text-[12px] uppercase tracking-[0.14em]">
          <Link to="/sacola" className="flex justify-between py-1.5 hover:text-terracota">
            Sacola <span>{itensSacola}</span>
          </Link>
          <Link to={contaLink} className="py-1.5 hover:text-terracota">
            {cliente ? `Conta · ${cliente.nome.split(" ")[0]}` : "Entrar"}
          </Link>
          {cliente ? (
            <button
              onClick={() => {
                sair();
                navigate("/");
              }}
              className="py-1.5 text-left text-suave hover:text-terracota"
            >
              Sair
            </button>
          ) : null}
          <Link to="/agendar" className="py-1.5 hover:text-terracota">
            Agendar uma prova
          </Link>
          <Link to="/entrar?time=1" className="py-1.5 text-[11px] text-suave hover:text-tinta">
            Área interna
          </Link>
        </div>
        <p className="mt-4 font-sans text-[11px] leading-snug text-suave">
          <b className="font-medium text-tinta">
            Edição {EDICAO.numero} · {EDICAO.nome}
          </b>
          <br />
          Frete por nossa conta acima de R$ 1.000.
        </p>
      </aside>

      {/* Celular e tablet: barra no topo + o mesmo menu vertical em gaveta */}
      <div
        className={cn(
          "inset-x-0 top-0 z-40 transition-colors duration-500 lg:hidden",
          home ? "fixed" : "sticky",
          transparente ? "bg-transparent text-white" : "bg-creme text-tinta shadow-[0_1px_0_#dfd9cf]",
        )}
      >
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 md:px-8">
          <button onClick={() => setMenuEm(rota)} className="flex items-center gap-3 justify-self-start text-sm hover:opacity-70" aria-label="Abrir menu">
            <Menu className="h-5 w-5" strokeWidth={1.4} />
          </button>
          <Link to="/" aria-label="Casa Lorenzi — início" className="whitespace-nowrap text-center font-display text-[24px] leading-none sm:text-[28px]">
            Casa Lorenzi
          </Link>
          <nav className="flex items-center gap-4 justify-self-end text-sm" aria-label="Atalhos">
            <button onClick={() => setBuscaEm(buscaAberta ? null : rota)} aria-label="Buscar" className="hover:opacity-70">
              <Search className="h-[18px] w-[18px]" strokeWidth={1.4} />
            </button>
            <Link to="/sacola" className="flex items-center gap-1 whitespace-nowrap hover:opacity-70" aria-label={`Sacola com ${itensSacola} peças`}>
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.4} /> {itensSacola}
            </Link>
          </nav>
        </header>

        {buscaAberta ? (
          <form onSubmit={buscar} className="border-t border-dashed border-linha bg-creme px-5 py-4 text-tinta">
            <div className="flex items-center gap-3 border-b border-tinta pb-2">
              <Search className="h-4 w-4 text-suave" />
              <input
                autoFocus
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Peça, tecido ou cor"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-suave"
              />
              <button type="submit" className="link-tracejado text-sm">
                Buscar
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div
        className={cn("fixed inset-0 z-50 bg-tinta/30 transition-opacity duration-300 lg:hidden", menuAberto ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setMenuEm(null)}
        aria-hidden={!menuAberto}
      >
        <aside
          className={cn(
            "loja flex h-full w-[340px] max-w-[88%] flex-col overflow-y-auto px-7 pb-8 pt-5 transition-transform duration-500 ease-out [font-family:var(--font-menu)]",
            menuAberto ? "translate-x-0" : "-translate-x-full",
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label="Menu"
        >
          <button onClick={() => setMenuEm(null)} aria-label="Fechar menu" className="mb-6 self-end hover:text-terracota">
            <X className="h-5 w-5" strokeWidth={1.3} />
          </button>
          <NavegacaoVertical secoes={secoesMenu} inicial={secaoDaRota} pathname={pathname} search={search} />
          <div className="mt-auto flex flex-col gap-1 pt-10 text-[13px] uppercase tracking-[0.14em]">
            <Link to={contaLink} className="py-1.5 hover:text-terracota">
              {cliente ? `Conta · ${cliente.nome.split(" ")[0]}` : "Entrar"}
            </Link>
            <Link to="/agendar" className="py-1.5 hover:text-terracota">
              Agendar uma prova
            </Link>
            <Link to="/entrar?time=1" className="py-1.5 text-[11px] text-suave hover:text-tinta">
              Área interna
            </Link>
          </div>
        </aside>
      </div>

      <main>
        <Outlet />
      </main>

      <CartaMensal />
      <Rodape />
      <SeletorFontes />
    </div>
  );
}

type SecaoMenu = { id: string; rotulo: string; itens: [string, string][] };

/** Navegação em coluna: cada seção abre logo abaixo (acordeão), sem sair da lista. */
function NavegacaoVertical({ secoes, inicial, pathname, search }: { secoes: SecaoMenu[]; inicial: string | null; pathname: string; search: string }) {
  const [aberta, setAberta] = useState<string | null>(inicial);
  const atual = `${pathname}${search}`;
  return (
    <nav className="flex flex-col" aria-label="Principal">
      {secoes.map((m) => {
        const ativa = aberta === m.id;
        return (
          <div key={m.id}>
            <button
              onClick={() => setAberta(ativa ? null : m.id)}
              aria-expanded={ativa}
              className={cn("flex w-full items-center justify-between py-2.5 text-left text-[14px] uppercase tracking-[0.14em] hover:text-terracota", ativa && "text-terracota")}
            >
              {m.rotulo}
              <Plus className={cn("h-3.5 w-3.5 transition-transform duration-300", ativa && "rotate-45")} strokeWidth={1.4} />
            </button>
            <div className={cn("grid transition-[grid-template-rows] duration-400 ease-out", ativa ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <ul className="overflow-hidden border-l border-dashed border-linha pl-4">
                {m.itens.map(([rotulo, to], i) => (
                  <li key={rotulo} className={cn(i === 0 && "pt-1", i === m.itens.length - 1 && "pb-3")}>
                    <Link
                      to={to}
                      tabIndex={ativa ? 0 : -1}
                      className={cn("block py-1.5 text-[12.5px] uppercase tracking-[0.12em] text-suave hover:text-tinta", atual === to && "text-tinta")}
                    >
                      {rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
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
