import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { unsplash } from "@/lib/loja";
import { cn } from "./ui";

/** Vídeos de uso livre (Mixkit) — trocar pelos filmes da própria campanha. */
export const video = (id: number, qualidade: 360 | 720 = 720) => `https://assets.mixkit.co/videos/${id}/${id}-${qualidade}.mp4`;

export type Midia = { tipo: "video"; src: string } | { tipo: "foto"; src: string; posicao?: string };

export const foto = (id: string, posicao?: string): Midia => ({ tipo: "foto", src: unsplash(id, 1800), posicao });
export const filme = (id: number): Midia => ({ tipo: "video", src: video(id) });

function useMovimentoReduzido() {
  const [reduzido] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return reduzido;
}

/** Uma mídia em tela cheia: vídeo mudo em loop ou foto com leve aproximação. */
function Camada({ midia, ativa, zoom = true }: { midia: Midia; ativa: boolean; zoom?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduzido = useMovimentoReduzido();

  const tocar = ativa && !reduzido;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true; // navegadores só tocam sozinhos vídeos sem som
    if (tocar) void v.play().catch(() => undefined);
    else v.pause();
  }, [tocar]);

  return (
    <div className={cn("absolute inset-0 transition-opacity duration-[1400ms] ease-out", ativa ? "opacity-100" : "opacity-0")}>
      {midia.tipo === "video" ? (
        <video
          ref={ref}
          src={midia.src}
          muted
          loop
          playsInline
          autoPlay={tocar}
          preload="auto"
          // O vídeo pode ficar pronto depois do efeito: toca assim que puder.
          onCanPlay={(e) => {
            if (tocar) void e.currentTarget.play().catch(() => undefined);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <img
          src={midia.src}
          alt=""
          className={cn(
            "h-full w-full object-cover transition-transform duration-[7000ms] ease-out",
            zoom && !reduzido && (ativa ? "scale-100" : "scale-[1.07]"),
          )}
          style={{ objectPosition: midia.posicao }}
        />
      )}
    </div>
  );
}

/** Troca o índice ativo sozinho, a cada `intervalo` ms (pausa com movimento reduzido). */
function useAlternancia(total: number, intervalo: number) {
  const [ativo, setAtivo] = useState(0);
  const reduzido = useMovimentoReduzido();
  useEffect(() => {
    if (reduzido || total < 2) return;
    const t = setTimeout(() => setAtivo((a) => (a + 1) % total), intervalo);
    return () => clearTimeout(t);
  }, [ativo, total, intervalo, reduzido]);
  return [ativo, setAtivo] as const;
}

const Escurecer = () => (
  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(22,32,58,.55)_0%,rgba(22,32,58,0)_45%),linear-gradient(180deg,rgba(22,32,58,.45)_0%,rgba(22,32,58,0)_22%)]" />
);

function Chamada({ titulo, sobre, acao, to, grande = false }: { titulo: string; sobre?: string; acao: string; to: string; grande?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-[3] px-6 pb-14 text-center text-white">
      {sobre ? <p className="mb-3 text-sm tracking-wide text-white/80">{sobre}</p> : null}
      <h2 className={cn("font-display leading-[1.02] text-white", grande ? "text-[46px] md:text-[76px]" : "text-[36px] md:text-[52px]")}>{titulo}</h2>
      <Link to={to} className="mt-4 inline-block border-b border-white/80 pb-0.5 text-sm tracking-wide hover:border-white">
        {acao}
      </Link>
    </div>
  );
}

export type Slide = { midia: Midia; titulo: string; sobre?: string; acao: string; to: string };

/** Abertura em tela cheia: slides de vídeo e foto que mudam sozinhos, com barras de progresso. */
export function CarrosselCampanha({ slides, intervalo = 6500 }: { slides: Slide[]; intervalo?: number }) {
  const [ativo, setAtivo] = useAlternancia(slides.length, intervalo);
  const atual = slides[ativo]!;
  return (
    <section className="relative h-[100svh] min-h-[560px] overflow-hidden bg-tinta" aria-roledescription="carrossel" aria-label="Campanha">
      {slides.map((s, i) => (
        <Camada key={i} midia={s.midia} ativa={i === ativo} />
      ))}
      <Escurecer />
      <div key={ativo} className="animate-[surgir_900ms_ease-out]">
        <Chamada titulo={atual.titulo} sobre={atual.sobre} acao={atual.acao} to={atual.to} grande />
      </div>
      <div className="absolute inset-x-0 bottom-5 z-[4] flex justify-center gap-2">
        {slides.map((s, i) => (
          <button key={i} onClick={() => setAtivo(i)} aria-label={`Ir para: ${s.titulo}`} className="relative h-[2px] w-12 overflow-hidden bg-white/35">
            {i === ativo ? <span key={ativo} className="absolute inset-0 origin-left bg-white" style={{ animation: `progresso ${intervalo}ms linear` }} /> : null}
          </button>
        ))}
      </div>
    </section>
  );
}
