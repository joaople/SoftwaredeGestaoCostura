import { supabase } from "./supabase";

// ---------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------

export type CostureiraAtiva = {
  id: string;
  nome: string;
  meta_mensal: number;
};

type CostureiraCompleta = CostureiraAtiva & { ativa: boolean };

export type LinhaCostureira = {
  id: string;
  nome: string;
  metaMensal: number;
  pecasProduzidas: number;
  ativa: boolean;
};

export type RankingPerson = {
  name: string;
  pieces: number;
  efficiency: number;
};

export type DashboardData = {
  costureirasAtivas: number;
  pecasProduzidasMes: number;
  eficienciaMedia: number;
  ranking: RankingPerson[];
  metaHojePercentual: number;
  pecasHoje: number;
  metaHojeTotal: number;
};

// ---------------------------------------------------------------
// Datas
// ---------------------------------------------------------------

// "AAAA-MM-DD" no fuso horario do navegador.
// (toISOString() usa UTC: no Brasil, depois das 21h ele ja devolve o dia seguinte)
export function dataLocal(d: Date = new Date()): string {
  return d.toLocaleDateString("sv-SE");
}

// ---------------------------------------------------------------
// Cache curto em memoria
//
// - Se duas telas pedem a mesma coisa ao mesmo tempo (ex.: Sidebar e Painel
//   pedindo as costureiras ativas), so UMA requisicao e feita.
// - Ao navegar entre paginas, os dados recentes sao reaproveitados.
// - Recarregar a pagina (F5) limpa tudo.
// ---------------------------------------------------------------

type EntradaCache = { expira: number; promessa: Promise<unknown> };
const cache = new Map<string, EntradaCache>();

function comCache<T>(
  chave: string,
  ttlMs: number,
  buscar: () => Promise<T>,
): Promise<T> {
  const agora = Date.now();
  const existente = cache.get(chave);
  if (existente && existente.expira > agora) {
    return existente.promessa as Promise<T>;
  }

  const promessa = buscar().catch((erro) => {
    cache.delete(chave); // nunca guarda erro no cache
    throw erro;
  });
  cache.set(chave, { expira: agora + ttlMs, promessa });
  return promessa;
}

export function limparCache() {
  cache.clear();
}

// ---------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------

export function listarCostureirasAtivas(): Promise<CostureiraAtiva[]> {
  return comCache("costureiras:ativas", 60_000, async () => {
    const { data, error } = await supabase
      .from("costureiras")
      .select("id, nome, meta_mensal")
      .eq("ativa", true)
      .order("nome");

    if (error) throw error;
    return (data ?? []) as CostureiraAtiva[];
  });
}

function listarTodasCostureiras(): Promise<CostureiraCompleta[]> {
  return comCache("costureiras:todas", 60_000, async () => {
    const { data, error } = await supabase
      .from("costureiras")
      .select("id, nome, meta_mensal, ativa")
      .order("nome");

    if (error) throw error;
    return (data ?? []) as CostureiraCompleta[];
  });
}

// Total do mes por costureira, calculado no banco (view producao_mes).
// Veja otimizacao.sql: a view precisa existir no Supabase.
function totaisDoMes(): Promise<Map<string, number>> {
  return comCache("producao:mes", 30_000, async () => {
    const { data, error } = await supabase
      .from("producao_mes")
      .select("costureira_id, total");

    if (error) throw error;

    const linhas = (data ?? []) as { costureira_id: string; total: number }[];
    return new Map(linhas.map((l) => [l.costureira_id, l.total]));
  });
}

function pecasProduzidasEm(dia: string): Promise<number> {
  return comCache(`producao:dia:${dia}`, 30_000, async () => {
    const { data, error } = await supabase
      .from("producao_diaria")
      .select("quantidade")
      .eq("data", dia);

    if (error) throw error;

    const linhas = (data ?? []) as { quantidade: number }[];
    return linhas.reduce((soma, linha) => soma + linha.quantidade, 0);
  });
}

function metaDoDia(dia: string): Promise<number> {
  return comCache(`meta:${dia}`, 60_000, async () => {
    const { data, error } = await supabase
      .from("metas_diarias")
      .select("meta_pecas")
      .eq("data", dia)
      .maybeSingle();

    if (error) throw error;
    return (data?.meta_pecas as number | undefined) ?? 0;
  });
}

// Tela "Costureiras": lista + producao do mes (2 consultas em paralelo)
export async function listarCostureirasComProducao(): Promise<LinhaCostureira[]> {
  const [costureiras, totais] = await Promise.all([
    listarTodasCostureiras(),
    totaisDoMes(),
  ]);

  return costureiras.map((c) => ({
    id: c.id,
    nome: c.nome,
    metaMensal: c.meta_mensal,
    pecasProduzidas: totais.get(c.id) ?? 0,
    ativa: c.ativa,
  }));
}

// Painel: 4 consultas em paralelo, em vez de uma depois da outra
export async function obterPainel(): Promise<DashboardData> {
  const hoje = dataLocal();

  const [costureiras, totais, pecasHoje, metaHojeTotal] = await Promise.all([
    listarCostureirasAtivas(),
    totaisDoMes(),
    pecasProduzidasEm(hoje),
    metaDoDia(hoje),
  ]);

  const ranking: RankingPerson[] = costureiras
    .map((c) => {
      const pecas = totais.get(c.id) ?? 0;
      const eficiencia =
        c.meta_mensal > 0 ? Math.round((pecas / c.meta_mensal) * 100) : 0;
      return { name: c.nome, pieces: pecas, efficiency: eficiencia };
    })
    .sort((a, b) => b.pieces - a.pieces)
    .slice(0, 4);

  const pecasProduzidasMes = Array.from(totais.values()).reduce(
    (soma, valor) => soma + valor,
    0,
  );

  const metaTotalMensal = costureiras.reduce(
    (soma, c) => soma + c.meta_mensal,
    0,
  );

  const eficienciaMedia =
    metaTotalMensal > 0
      ? Math.round((pecasProduzidasMes / metaTotalMensal) * 1000) / 10
      : 0;

  const metaHojePercentual =
    metaHojeTotal > 0 ? Math.round((pecasHoje / metaHojeTotal) * 100) : 0;

  return {
    costureirasAtivas: costureiras.length,
    pecasProduzidasMes,
    eficienciaMedia,
    ranking,
    metaHojePercentual,
    pecasHoje,
    metaHojeTotal,
  };
}

// ---------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------

export async function criarCostureira(nome: string) {
  const { data, error } = await supabase
    .from("costureiras")
    .insert({ nome })
    .select()
    .single();

  if (error) throw error;

  limparCache(); // a lista mudou: forca recarregar na proxima leitura
  return data;
}
