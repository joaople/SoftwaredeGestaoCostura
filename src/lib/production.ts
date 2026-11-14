import { supabase } from "./supabase";

const TAMANHO_PAGINA = 1000;

export async function paginarConsulta<T>(
  consultar: (
    inicio: number,
    fim: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const resultados: T[] = [];

  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const { data, error } = await consultar(
      inicio,
      inicio + TAMANHO_PAGINA - 1,
    );
    if (error) throw error;

    const pagina = data ?? [];
    resultados.push(...pagina);
    if (pagina.length < TAMANHO_PAGINA) return resultados;
  }
}

export type SessaoProducao = {
  id: string;
  costureira_id: string;
  data: string | null; // YYYY-MM-DD
  sequencia: number;
  hora_inicio: string; // HH:MM:SS
  operacao: string;
  tempo_padrao: number; // TP (min/peça)
  created_at: string;
};

export type ApontamentoProducao = {
  id: string;
  sessao_id: string;
  quantidade: number;
  hora: string; // HH:MM:SS
  minutos_gastos: number;
  created_at: string;
};

export async function listarSessoes(costureiraId: string) {
  const { data, error } = await supabase
    .from("sessoes_producao")
    .select("*")
    .eq("costureira_id", costureiraId)
    .order("data", { ascending: false })
    .order("sequencia", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessaoProducao[];
}

export async function listarSessoesPorData(
  costureiraId: string,
  dataProducao: string | null,
) {
  let consulta = supabase
    .from("sessoes_producao")
    .select("*")
    .eq("costureira_id", costureiraId);

  consulta =
    dataProducao === null
      ? consulta.is("data", null)
      : consulta.eq("data", dataProducao);

  const { data, error } = await consulta
    .order("data", { ascending: false })
    .order("sequencia", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SessaoProducao[];
}

export async function listarApontamentos(sessaoIds: string[]) {
  if (sessaoIds.length === 0) return [] as ApontamentoProducao[];

  const blocos: string[][] = [];
  for (let inicio = 0; inicio < sessaoIds.length; inicio += 100) {
    blocos.push(sessaoIds.slice(inicio, inicio + 100));
  }

  const resultados = await Promise.all(
    blocos.map((bloco) =>
      paginarConsulta<ApontamentoProducao>((inicio, fim) =>
        supabase
          .from("apontamentos_producao")
          .select("*")
          .in("sessao_id", bloco)
          .order("hora", { ascending: true })
          .order("id", { ascending: true })
          .range(inicio, fim),
      ),
    ),
  );

  return resultados
    .flat()
    .sort(
      (a, b) =>
        a.hora.localeCompare(b.hora) || a.id.localeCompare(b.id),
    );
}

export async function criarSessao(payload: {
  costureira_id: string;
  data: string;
  sequencia: number;
  hora_inicio: string;
  operacao: string;
  tempo_padrao: number;
}) {
  const { error } = await supabase.from("sessoes_producao").insert(payload);
  if (error) throw error;
}

export async function excluirSessao(id: string) {
  const { error } = await supabase
    .from("sessoes_producao")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function criarApontamento(payload: {
  sessao_id: string;
  quantidade: number;
  hora: string;
  minutos_gastos: number;
}) {
  const { error } = await supabase.from("apontamentos_producao").insert(payload);
  if (error) throw error;
}

export async function excluirApontamento(id: string) {
  const { error } = await supabase
    .from("apontamentos_producao")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Meta de peças no período = minutos gastos / tempo padrão (TP) */
export function metaSessao(minutos: number, tempoPadrao: number) {
  if (tempoPadrao <= 0) return 0;
  return minutos / tempoPadrao;
}

/** Eficiência (%) = (quantidade x TP) / minutos gastos x 100 */
export function eficienciaSessao(
  quantidade: number,
  minutos: number,
  tempoPadrao: number,
) {
  if (minutos <= 0) return 0;
  return ((quantidade * tempoPadrao) / minutos) * 100;
}

export function tempoMedioHistorico(
  operacao: string,
  sessoes: SessaoProducao[],
  apontamentos: ApontamentoProducao[],
): number | null {
  const operacaoNormalizada = operacao.trim().toLowerCase();
  if (!operacaoNormalizada) return null;

  const sessoesDaOperacao = new Set(
    sessoes
      .filter(
        (sessao) =>
          sessao.operacao.trim().toLowerCase() === operacaoNormalizada,
      )
      .map((sessao) => sessao.id),
  );
  let quantidadeTotal = 0;
  let minutosTotais = 0;

  for (const apontamento of apontamentos) {
    if (!sessoesDaOperacao.has(apontamento.sessao_id)) continue;
    quantidadeTotal += Number(apontamento.quantidade);
    minutosTotais += Number(apontamento.minutos_gastos);
  }

  return quantidadeTotal > 0 ? minutosTotais / quantidadeTotal : null;
}

export function formatarMinutos(minutos: number) {
  const total = Math.round(minutos * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function formatarHora(value: string) {
  return value.slice(0, 8);
}

export function formatarData(value: string | null) {
  if (!value) return "Sem data";
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function hojeISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Diferença em minutos entre dois horários "HH:MM" / "HH:MM:SS" */
export function diferencaMinutos(de: string, para: string) {
  const paraMinutos = (v: string) => {
    const [h = 0, m = 0, s = 0] = v.split(":").map(Number);
    return h * 60 + m + s / 60;
  };
  return Math.round((paraMinutos(para) - paraMinutos(de)) * 100) / 100;
}