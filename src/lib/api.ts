import { supabase } from "./supabase";

export async function criarCostureira(nome: string) {
  const { data, error } = await supabase
    .from("costureiras")
    .insert({ nome })
    .select()
    .single();

  if (error) throw error;
  return data;
}