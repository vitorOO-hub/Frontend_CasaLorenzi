import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/http";
import { sugerirAntesDoChamado, TEMPO_DA_RESPOSTA_DO_ASSISTENTE_MS, validarSugestaoChamado } from "./assistenteClienteApi";

afterEach(() => vi.restoreAllMocks());

describe("sugestão antes de abrir um chamado", () => {
  it("aceita uma resposta ou nenhuma", () => {
    expect(validarSugestaoChamado({ sugestao: "A troca é em até 30 dias." })).toBe("A troca é em até 30 dias.");
    expect(validarSugestaoChamado({ sugestao: null })).toBeNull();
    expect(() => validarSugestaoChamado({ sugestao: 3 })).toThrow();
    expect(() => validarSugestaoChamado(null)).toThrow();
  });

  it("manda assunto e descrição para a rota do assistente, com o tempo do modelo", async () => {
    const post = vi.spyOn(api, "post").mockResolvedValue({ sugestao: null });
    await expect(sugerirAntesDoChamado("Troca", "Qual o prazo?")).resolves.toBeNull();
    expect(post).toHaveBeenCalledWith(
      "/assistente/cliente/sugestao-chamado",
      { assunto: "Troca", descricao: "Qual o prazo?" },
      { timeoutMs: TEMPO_DA_RESPOSTA_DO_ASSISTENTE_MS },
    );
  });
});
