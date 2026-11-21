import { supabase } from "./supabase";

/** Papéis de quem usa o sistema da fábrica. */
export type Papel = "leitor" | "editor" | "admin";
export type PapelOuNenhum = Papel | "nenhum";

export type Conta = {
  id: string;
  email: string | null;
  criado_em: string;
  papel: Papel | null; // null = conta nova, aguardando liberação
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  leitor: "Leitor",
  editor: "Editor",
  admin: "Administrador",
};

export const OPCOES_PAPEL: { valor: PapelOuNenhum; rotulo: string }[] = [
  { valor: "nenhum", rotulo: "Sem acesso" },
  { valor: "leitor", rotulo: ROTULO_PAPEL.leitor },
  { valor: "editor", rotulo: ROTULO_PAPEL.editor },
  { valor: "admin", rotulo: ROTULO_PAPEL.admin },
];

/** Papel da conta logada. Retorna null se a conta ainda não foi liberada. */
export async function buscarMeuPapel(usuarioId: string) {
  const { data, error } = await supabase
    .from("membros")
    .select("papel")
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (error) throw error;
  return (data?.papel as Papel | undefined) ?? null;
}

/** Todas as contas cadastradas (só administradores conseguem). */
export async function listarContas() {
  const { data, error } = await supabase.rpc("listar_contas");
  if (error) throw error;
  return (data ?? []) as Conta[];
}

/** Muda o acesso de uma conta (só administradores conseguem). */
export async function definirPapel(alvo: string, novo: PapelOuNenhum) {
  const { error } = await supabase.rpc("definir_papel", { alvo, novo });
  if (error) throw error;
}
