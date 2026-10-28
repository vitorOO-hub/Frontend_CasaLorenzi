import { describe, expect, it } from "vitest";
import { validarPerfilCliente } from "./perfilClienteApi";

const perfil = (extra = {}) => ({
  id_cliente: "c1",
  nome: "Ana",
  email: "ana@exemplo.com",
  telefone: null,
  documento: null,
  cliente_desde: "2026-01-02T10:00:00Z",
  total_pedidos: 2,
  valor_total_pedidos: "300.00",
  total_chamados: 0,
  id_loja_preferida: null,
  loja_preferida: null,
  cep: null,
  rua: null,
  bairro: null,
  numero_endereco: null,
  complemento: null,
  ...extra,
});

describe("perfil do cliente", () => {
  it("lê se o cliente aceita receber avisos", () => {
    expect(validarPerfilCliente(perfil({ aceita_mensagens: false })).aceita_mensagens).toBe(false);
  });

  it("sem o campo (API anterior), vale o padrão: aceita", () => {
    expect(validarPerfilCliente(perfil()).aceita_mensagens).toBe(true);
  });

  it("recusa valor fora do formato", () => {
    expect(() => validarPerfilCliente(perfil({ aceita_mensagens: "sim" }))).toThrow();
  });
});
