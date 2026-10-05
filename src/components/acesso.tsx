import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { telaInicial } from "@/lib/navegacao";
import { rotuloPapel, useSessao, type Papel } from "@/lib/sessao";
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
  const { pathname } = useLocation();
  if (sessao?.tipo === "cliente") return <>{children}</>;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="filete mx-auto mb-6" />
      <h1 className="text-4xl font-light">Entre na sua conta</h1>
      <p className="mt-3 text-sm leading-relaxed text-suave">
        {texto ??
          "Acompanhe pedidos, fale com o atendimento e veja seus dados. Navegar pela coleção continua livre."}
      </p>
      <Link
        to={`/entrar?voltar=${encodeURIComponent(pathname)}`}
        className={`${classesBotao()} mt-8 px-10`}
      >
        Entrar
      </Link>
    </div>
  );
}
