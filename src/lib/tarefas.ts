import { supabase } from "./supabase";

export type Operacao = {
  id: string;
  nome: string;
  created_at: string;
};

export type TempoOperacao = {
  id: string;
  operacao_id: string;
  costureira_id: string;
  minutos_por_peca: number;
};

export type CostureiraAtiva = {
  id: string;
  nome: string;
};

export async function listarCostureirasAtivas() {
  const { data, error } = await supabase
    .from("costureiras")
    .select("id, nome")
    .eq("ativa", true)
    .order("nome");
  if (error) throw error;
  return (data ?? []) as CostureiraAtiva[];
}

export async function listarOperacoes() {
  const { data, error } = await supabase
    .from("operacoes")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Operacao[];
}

export async function listarTemposOperacao(costureiraId?: string) {
  let consulta = supabase.from("tempos_operacao").select("*");
  if (costureiraId) consulta = consulta.eq("costureira_id", costureiraId);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as TempoOperacao[];
}

export async function criarOperacao(
  nome: string,
  tempos: { costureira_id: string; minutos: number }[],
) {
  const { data, error } = await supabase
    .from("operacoes")
    .insert({ nome })
    .select("id")
    .single();
  if (error) throw error;

  if (tempos.length > 0) {
    const operacaoId = (data as { id: string }).id;
    const linhas = tempos.map((t) => ({
      operacao_id: operacaoId,
      costureira_id: t.costureira_id,
      minutos_por_peca: t.minutos,
    }));
    const { error: erroTempos } = await supabase
      .from("tempos_operacao")
      .insert(linhas);
    if (erroTempos) throw erroTempos;
  }
}

export async function salvarTempoOperacao(payload: {
  operacao_id: string;
  costureira_id: string;
  minutos: number;
}) {
  const { error } = await supabase.from("tempos_operacao").upsert(
    {
      operacao_id: payload.operacao_id,
      costureira_id: payload.costureira_id,
      minutos_por_peca: payload.minutos,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "operacao_id,costureira_id" },
  );
  if (error) throw error;
}

export async function excluirOperacao(id: string) {
  const { error } = await supabase.from("operacoes").delete().eq("id", id);
  if (error) throw error;
}

/** Extrai a mensagem de um erro do Supabase ou do JavaScript. */
export function mensagemDeErro(erro: unknown, padrao: string) {
  if (typeof erro === "object" && erro !== null && "message" in erro) {
    const texto = String((erro as { message: unknown }).message);
    if (texto) return texto;
  }
  return padrao;
}
