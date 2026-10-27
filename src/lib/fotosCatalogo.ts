import { config } from "@/api/config";
import { supabase } from "@/api/supabase";

export const BUCKET_FOTOS_CATALOGO = "catalogo-produtos";
const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const EXTENSAO_POR_TIPO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validarFotoCatalogo(arquivo: File) {
  if (!(arquivo.type in EXTENSAO_POR_TIPO)) {
    throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new Error("A imagem deve ter no máximo 5 MB.");
  }
}

export async function enviarFotoCatalogo(idProduto: string, arquivo: File) {
  validarFotoCatalogo(arquivo);
  const extensao = EXTENSAO_POR_TIPO[arquivo.type];
  const caminho = `${idProduto}/${crypto.randomUUID()}.${extensao}`;
  const armazenamento = supabase().storage.from(BUCKET_FOTOS_CATALOGO);
  const { error } = await armazenamento.upload(caminho, arquivo, {
    cacheControl: "31536000",
    contentType: arquivo.type,
    upsert: false,
  });
  if (error) throw new Error("Não foi possível enviar a foto. Tente novamente.");
  return { caminho, url: armazenamento.getPublicUrl(caminho).data.publicUrl };
}

export async function removerFotoCatalogo(url: string | null | undefined) {
  if (!url || !config.supabaseUrl) return;
  const prefixo = `${config.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET_FOTOS_CATALOGO}/`;
  const urlSemConsulta = url.split("?")[0];
  if (!urlSemConsulta.startsWith(prefixo)) return;
  const caminho = decodeURIComponent(urlSemConsulta.slice(prefixo.length));
  if (!caminho) return;
  await supabase().storage.from(BUCKET_FOTOS_CATALOGO).remove([caminho]);
}
