import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { telaInicial } from "@/lib/navegacao";
import { rotuloPapel, useSessao, useSessaoPronta, type Papel } from "@/lib/sessao";
import { classesBotao } from "./ui";

/** Tela exibida quando o cargo tenta abrir uma área que não é dele. */
export function Bloqueio({ papel }: { papel: Papel }) {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-sm border border-linha bg-papel p-10 text-center">
      <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-areia">
        <Lock className="h-5 w-5 text-marinho" strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-light">Acesso restrito</h1>
      <p className="mt-3 text-sm leading-relaxed text-suave">
        Esta área não faz parte do perfil <strong>{rotuloPapel[papel]}</strong>. Se precisar dela,
        fale com a administração da rede.
      </p>
      <Link to={telaInicial(papel)} className={`${classesBotao()} mt-6`}>
        Voltar para o início
      </Link>
    </div>
  );
}

/** Áreas da loja que exigem conta de cliente (conta, checkout). */
export function ExigeLogin({ children, texto }: { children: ReactNode; texto?: string }) {
  const sessao = useSessao();
  const pronta = useSessaoPronta();
  const { pathname } = useLocation();
  if (!pronta) return null;
  if (sessao?.tipo === "cliente") return <>{children}</>;

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="text-[48px] leading-none">Entre na sua conta.</h1>
      <p className="mt-4 font-display text-xl text-suave">
        {texto ?? "Seus pedidos e suas conversas com a casa ficam aqui."}
      </p>
      <Link
        to={`/entrar?voltar=${encodeURIComponent(pathname)}`}
        className="mt-10 inline-block bg-tabaco px-8 py-4 text-sm tracking-wide text-creme hover:bg-tinta"
      >
        Entrar
      </Link>
    </div>
  );
}
