import { FotoCampanha } from "@/components/vitrine";
import { lojas, type Loja } from "@/lib/dados";
import { casas } from "@/lib/loja";

/** Cartão de uma casa: foto da cidade, alfaiate, horário, agenda e bilhete do gerente. */
export function CasaCartao({ loja }: { loja: Loja }) {
  const info = casas[loja.id];
  return (
    <div>
      {info ? <FotoCampanha id={info.foto} largura={900} className="aspect-[4/3]" /> : null}
      <h3 className="mt-4 text-[32px]">{loja.nome}</h3>
      <dl className="mt-2.5 text-sm">
        {[
          ["Endereço", `${loja.endereco} · ${loja.cidade}`],
          ["Alfaiate", info?.alfaiate ?? "—"],
          ["Provas", info?.provas ?? "—"],
        ].map(([k, v]) => (
          <div key={k} className="alinhavo grid grid-cols-[110px_1fr] py-2">
            <dt className="text-suave">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {info ? (
        <>
          <span className="mt-3.5 inline-block bg-palha px-3 py-1.5 text-[13px]">{info.agenda}</span>
          <p className="mt-4 rotate-[-0.6deg] bg-pergaminho px-4 py-3.5 font-mao text-[14px] leading-relaxed text-tabaco shadow-[0_6px_16px_#4a33261a]">
            “{info.bilhete}” — {info.autor}
          </p>
        </>
      ) : null}
    </div>
  );
}

export function Casas() {
  return (
    <div className="mx-auto max-w-[1360px] px-5 pt-12 md:px-12">
      <h1 className="text-[56px] leading-none md:text-[76px]">As três casas</h1>
      <p className="mt-4 max-w-xl font-display text-[21px]">Em cada uma há um alfaiate, uma mesa de corte e café passado. Os ajustes, em qualquer casa, são por nossa conta.</p>
      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {lojas.map((l) => (
          <CasaCartao key={l.id} loja={l} />
        ))}
      </div>
    </div>
  );
}
