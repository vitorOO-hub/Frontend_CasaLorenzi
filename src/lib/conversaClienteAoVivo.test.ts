import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { manterConversaEmDia } from "./conversaClienteAoVivo";

describe("conversa do cliente ao vivo", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function montar(extra: { visivel?: () => boolean } = {}) {
    let aviso: () => void = () => undefined;
    const recarregar = vi.fn(() => Promise.resolve());
    const cancelar = vi.fn();
    const parar = manterConversaEmDia({
      recarregar,
      ouvirNovas: (cb) => {
        aviso = cb;
        return cancelar;
      },
      intervaloMs: 1000,
      ...extra,
    });
    return { recarregar, cancelar, parar, avisar: () => aviso() };
  }

  it("relê a conversa quando chega mensagem nova", () => {
    const { recarregar, avisar } = montar();
    avisar();
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it("confere de tempos em tempos só com a aba à vista", () => {
    let aberta = true;
    const { recarregar } = montar({ visivel: () => aberta });
    vi.advanceTimersByTime(1000);
    expect(recarregar).toHaveBeenCalledTimes(1);
    aberta = false;
    vi.advanceTimersByTime(3000);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it("uma leitura por vez: rajada de eventos não empilha chamadas", () => {
    const { recarregar, avisar } = montar();
    avisar();
    avisar();
    avisar();
    expect(recarregar).toHaveBeenCalledTimes(1);
  });

  it("ao sair da tela cancela o aviso e o relógio", () => {
    const { recarregar, cancelar, parar, avisar } = montar();
    parar();
    expect(cancelar).toHaveBeenCalledTimes(1);
    avisar();
    vi.advanceTimersByTime(5000);
    expect(recarregar).not.toHaveBeenCalled();
  });

  it("sem Realtime a conferência periódica continua", () => {
    const recarregar = vi.fn(() => Promise.resolve());
    manterConversaEmDia({
      recarregar,
      ouvirNovas: () => {
        throw new Error("sem realtime");
      },
      intervaloMs: 1000,
    });
    vi.advanceTimersByTime(1000);
    expect(recarregar).toHaveBeenCalledTimes(1);
  });
});
