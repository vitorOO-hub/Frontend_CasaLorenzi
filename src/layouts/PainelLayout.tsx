import { LogOut, Store } from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bloqueio } from "@/components/acesso";
import { MenuUsuario } from "@/components/MenuUsuario";
import { cn } from "@/components/ui";
import { abasDoPapel, podeAcessar, secoesDoPapel, type Secao } from "@/lib/navegacao";
import { usePendencias } from "@/lib/pendencias";
import {
  rotuloPapel,
  sair,
  usePapel,
  useSessao,
  useSessaoPronta,
} from "@/lib/sessao";

// O que aparece só com a barra lateral aberta, e o que aparece só com ela recolhida.
const aoAbrir =
  "opacity-0 transition-opacity duration-200 group-hover/menu:opacity-100 group-focus-within/menu:opacity-100";
const aoFechar =
  "transition-opacity duration-200 group-hover/menu:opacity-0 group-focus-within/menu:opacity-0";

// Rótulos em Archivo Narrow e o tom apagado dos textos da barra.
const ROTULO = "[font-family:var(--font-menu)]";
const APAGADO = "text-[#9dabca]";

// Marcações da fita métrica na borda direita da barra.
const FITA = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, rgba(255,255,255,.30) 0 1px, transparent 1px 50px)," +
    "repeating-linear-gradient(to bottom, rgba(255,255,255,.13) 0 1px, transparent 1px 10px)",
  backgroundRepeat: "no-repeat, no-repeat",
  backgroundSize: "15px 100%, 7px 100%",
  backgroundPosition: "right top, right top",
};

/** Iniciais do primeiro e do último nome, para o avatar da barra. */
function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "";
  const ultima = partes.length > 1 ? partes[partes.length - 1]![0] : "";
  return `${partes[0]![0]}${ultima}`.toUpperCase();
}

export function PainelLayout() {
  const sessao = useSessao();
  const pronta = useSessaoPronta();
  const papel = usePapel();
  const pendencias = usePendencias();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!pronta) return null;
  if (sessao?.tipo !== "interno") return <Navigate to={`/entrar?voltar=${encodeURIComponent(pathname)}`} replace />;

  // Nome e loja vêm do cadastro (lidos com RLS); nada daqui é dado de exemplo.
  const pessoa = { nome: sessao.nome, lojaNome: papel === "admin" ? undefined : sessao.lojaNome };
  const visiveis = secoesDoPapel(papel);
  const contagem = (s: Secao) =>
    abasDoPapel(s, papel).reduce((soma, a) => soma + (a.pendencia ? pendencias[a.pendencia] : 0), 0);

  function encerrar() {
    sair();
    navigate("/", { replace: true });
  }

  // Admin vê a rede (cada tela tem o seu filtro de unidade, com as lojas do banco); os demais, a própria loja.
  const escopoTexto = papel === "admin" ? "Todas as unidades" : (pessoa.lojaNome ?? "Sua unidade");

  return (
    <div className="flex min-h-screen bg-creme">
      {/* Barra lateral "fita métrica": no máximo 4 seções; as subdivisões ficam nas abas de cada
          seção. Fica recolhida nos ícones e abre por cima do conteúdo ao passar o mouse (ou focar
          pelo teclado), como o menu da loja. A borda direita traz as marcações de uma fita de
          alfaiate e as seções são numeradas. */}
      <aside className="group/menu sticky top-0 z-40 hidden h-screen w-16 shrink-0 md:block">
        <div className="absolute inset-y-0 left-0 flex w-16 flex-col overflow-hidden bg-marinho text-creme shadow-[1px_0_0_rgba(255,255,255,.07)] transition-[width,box-shadow] duration-[400ms] ease-[cubic-bezier(.4,0,.2,1)] group-focus-within/menu:w-60 group-focus-within/menu:shadow-[1px_0_0_rgba(255,255,255,.07),16px_0_34px_-22px_rgba(22,32,58,.9)] group-hover/menu:w-60 group-hover/menu:shadow-[1px_0_0_rgba(255,255,255,.07),16px_0_34px_-22px_rgba(22,32,58,.9)] motion-reduce:transition-none">
          {/* Fita métrica: traço longo a cada 50px e traço curto a cada 10px. */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[18px]" style={FITA} />

          <NavLink
            to="/painel"
            aria-label="Casa Lorenzi — início do painel"
            className="relative block h-[78px] shrink-0 border-b border-white/[.09]"
          >
            <span className={cn("absolute inset-y-0 left-0 grid w-16 place-items-center font-display text-[22px] tracking-[.03em]", aoFechar)}>
              CL
            </span>
            <span className={cn("absolute left-[22px] top-1/2 flex -translate-y-1/2 flex-col gap-[3px] whitespace-nowrap", aoAbrir)}>
              <span className="font-display text-[21px] leading-none tracking-[.01em]">Casa Lorenzi</span>
              <span className={cn("text-[10.5px] uppercase tracking-[.2em]", ROTULO, APAGADO)}>Operações</span>
            </span>
          </NavLink>

          <nav className="flex flex-1 flex-col gap-0.5 py-3.5" aria-label="Seções">
            {visiveis.map((s, i) => {
              const pendentes = contagem(s);
              return (
                <NavLink
                  key={s.id}
                  to={s.to}
                  end={s.to === "/painel"}
                  className={({ isActive }) =>
                    cn(
                      "relative flex h-12 shrink-0 items-center transition-colors focus-visible:outline-2 focus-visible:-outline-offset-[3px] focus-visible:outline-terracota",
                      isActive
                        ? "bg-white/10 text-creme before:absolute before:inset-y-[7px] before:left-0 before:w-0.5 before:bg-terracota"
                        : cn(APAGADO, "hover:bg-white/5 hover:text-creme"),
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="relative z-[1] grid w-16 shrink-0 place-items-center">
                        <span className="relative">
                          <s.icone className="h-[19px] w-[19px]" strokeWidth={1.5} />
                          {/* Com a barra fechada, as pendências viram um ponto sobre o ícone. */}
                          {pendentes > 0 ? (
                            <span className={cn("absolute -right-1.5 -top-1 h-[7px] w-[7px] rounded-full bg-terracota ring-2 ring-marinho", aoFechar)} />
                          ) : null}
                        </span>
                      </span>
                      <span className={cn("relative z-[1] whitespace-nowrap text-[15px] font-medium tracking-[.01em]", aoAbrir)}>
                        <span className={cn("mr-3 text-xs tracking-[.08em] tabular-nums", ROTULO, isActive ? "text-terracota" : "text-aco")}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {s.rotulo}
                      </span>
                      {pendentes > 0 ? (
                        <span
                          className={cn(
                            "relative z-[1] ml-auto mr-7 h-5 min-w-[23px] rounded-full bg-white/[.13] px-[7px] text-center text-[11px] font-semibold leading-5 text-creme tabular-nums",
                            aoAbrir,
                          )}
                        >
                          {pendentes}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="relative z-[1] shrink-0 border-t border-white/[.09] pb-3.5 pt-2.5">
            {/* Largura fixa da barra aberta: o texto não se rearruma durante a animação e termina antes da
                fita métrica (pr-7 = régua de 18px + folga), com reticências se ainda assim não couber. */}
            <div className="flex min-h-12 w-60 items-center py-1">
              <span className="grid w-16 shrink-0 place-items-center">
                <span className={cn("grid h-[30px] w-[30px] place-items-center rounded-full bg-terracota text-[11px] font-semibold tracking-[.06em] text-white", ROTULO)}>
                  {iniciais(pessoa.nome)}
                </span>
              </span>
              <span className={cn("flex min-w-0 flex-1 flex-col pr-7 leading-snug", aoAbrir)}>
                <span className="truncate text-[13.5px] font-medium text-creme">{pessoa.nome}</span>
                <span className={cn("truncate text-[11.5px]", APAGADO)}>{rotuloPapel[papel]}</span>
                {pessoa.lojaNome ? <span className={cn("truncate text-[11.5px]", APAGADO)}>{pessoa.lojaNome}</span> : null}
              </span>
            </div>
            <div className={cn("flex gap-5 whitespace-nowrap pl-[22px] pt-2 text-[13px] font-medium", APAGADO, aoAbrir)}>
              <NavLink to="/" className="flex items-center gap-2 hover:text-creme">
                <Store className="h-4 w-4" strokeWidth={1.5} /> Ver loja
              </NavLink>
              <button onClick={encerrar} className="flex items-center gap-2 hover:text-creme">
                <LogOut className="h-4 w-4" strokeWidth={1.5} /> Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-linha bg-papel/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-5 py-3 md:px-8">
            <div className="min-w-0">
              <p className="whitespace-nowrap font-display text-xl leading-none md:hidden">Casa Lorenzi</p>
              <p className="hidden truncate text-sm text-suave md:block">
                {rotuloPapel[papel]} · <span className="text-tinta">{escopoTexto}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <MenuUsuario
                nome={pessoa.nome}
                detalhe={`${rotuloPapel[papel]}${pessoa.lojaNome ? ` · ${pessoa.lojaNome}` : ""}`}
                email={sessao.email}
                onSair={encerrar}
              />
            </div>
          </div>
          {/* Navegação de seções no celular */}
          <nav className="flex gap-1 overflow-x-auto border-t border-linha px-3 py-2 md:hidden">
            {visiveis.map((s) => (
              <NavLink
                key={s.id}
                to={s.to}
                end={s.to === "/painel"}
                className={({ isActive }) =>
                  cn(
                    "flex shrink-0 items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm",
                    isActive ? "bg-marinho text-white" : "text-suave",
                  )
                }
              >
                <s.icone className="h-3.5 w-3.5" />
                {s.rotulo}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-5 py-8 md:px-8">
          {podeAcessar(papel, pathname) ? <Outlet /> : <Bloqueio papel={papel} />}
        </main>
      </div>
    </div>
  );
}
