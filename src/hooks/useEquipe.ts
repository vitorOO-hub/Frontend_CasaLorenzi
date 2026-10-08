import { buscarEquipe, type Equipe } from "@/lib/gestaoApi";
import { useConsulta } from "./useChamados";

/** Time interno (gestão do admin). Reconsulta a cada 2 minutos e depois de cada mudança. */
export const useEquipe = () =>
  useConsulta<Equipe>((sinal) => buscarEquipe({ sinal }), "gestao-equipe", { intervaloMs: 120_000 });
