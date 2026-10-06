import { Link, Navigate, useParams } from "react-router-dom";
import { FotoCampanha } from "@/components/vitrine";
import { materias, type Materia } from "@/lib/loja";

export function CartaoMateria({ materia, destaque = false }: { materia: Materia; destaque?: boolean }) {
  return (
    <Link to={`/caderno/${materia.slug}`} className="group block">
      <FotoCampanha id={materia.foto} largura={900} className={destaque ? "aspect-[4/3.6]" : "aspect-[4/3]"} />
      <small className="mt-4 block text-[13px] text-caramelo">
        {materia.secao} · {materia.leitura}
      </small>
      <h3 className={`mb-2 mt-1 leading-tight group-hover:text-caramelo ${destaque ? "text-[34px]" : "text-[26px]"}`}>{materia.titulo}</h3>
      <p className="text-[15px] text-suave">{materia.resumo}</p>
    </Link>
  );
}

export function Caderno() {
  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-12">
      <h1 className="text-[56px] leading-none md:text-[76px]">Caderno do Ateliê</h1>
      <p className="mt-4 max-w-xl font-display text-[21px]">Notas sobre tecidos, provas e a história da casa — escritas por quem corta e costura.</p>
      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {materias.map((m) => (
          <CartaoMateria key={m.slug} materia={m} />
        ))}
      </div>
    </div>
  );
}

export function MateriaPagina() {
  const { slug } = useParams();
  const materia = materias.find((m) => m.slug === slug);
  if (!materia) return <Navigate to="/caderno" replace />;
  return (
    <article className="mx-auto max-w-3xl px-5 pt-12">
      <Link to="/caderno" className="link-tracejado text-sm">
        Caderno do Ateliê
      </Link>
      <p className="mt-8 text-[13px] text-caramelo">
        {materia.secao} · {materia.leitura}
      </p>
      <h1 className="mt-2 text-[44px] leading-tight md:text-[56px]">{materia.titulo}</h1>
      <FotoCampanha id={materia.foto} largura={1400} className="mt-8 aspect-[3/2]" />
      <div className="mt-10 space-y-6 font-display text-[21px] leading-relaxed">
        {materia.corpo.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </article>
  );
}
