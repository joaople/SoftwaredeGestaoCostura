import { supabase } from "./supabase";

export const COSTUREIRAS_ATUALIZADAS = "costureiras:atualizadas";

function avisarAtualizacao() {
  window.dispatchEvent(new Event(COSTUREIRAS_ATUALIZADAS));
}

export async function criarCostureira(nome: string) {
  const { data, error } = await supabase
    .from("costureiras")
    .insert({ nome, meta_mensal: 0, ativa: true })
    .select()
    .single();

  if (error) throw error;
  avisarAtualizacao();
  return data;
}

export async function excluirCostureira(id: string) {
  const { error } = await supabase.from("costureiras").delete().eq("id", id);
  if (error) throw error;
  avisarAtualizacao();
}