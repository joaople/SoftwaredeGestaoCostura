import { supabase } from "./supabase";

export async function criarCostureira(nome: string) {
  const { data, error } = await supabase
    .from("costureiras")
    .insert({ nome, meta_mensal: 0, ativa: true })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function excluirCostureira(id: string) {
  const { error } = await supabase.from("costureiras").delete().eq("id", id);
  if (error) throw error;
}
