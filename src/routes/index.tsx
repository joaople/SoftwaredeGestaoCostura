import { createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowUpRight, CheckCircle2, Package, Users,} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { hojeISO, listarApontamentos } from "@/lib/production";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type RankingPerson = {
  name: string;
  pieces: number;
  efficiency: number;
};

type DashboardData = {
  costureirasAtivas: number;
  pecasProduzidasMes: number;
  eficienciaMedia: number;
  ranking: RankingPerson[];
  metaHojePercentual: number;
  pecasHoje: number;
  metaHojeTotal: number;
};

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    setErro(null);

    try {
      // Data local (não UTC), no formato YYYY-MM-DD
      const dataHoje = hojeISO();
      const inicioDoMes = `${dataHoje.slice(0, 8)}01`;

      // As três consultas independentes rodam ao mesmo tempo
      const [resCostureiras, resSessoes, resMetaHoje] = await Promise.all([
        supabase.from("costureiras").select("id, nome").eq("ativa", true),
        supabase
          .from("sessoes_producao")
          .select("id, costureira_id, data, tempo_padrao")
          .gte("data", inicioDoMes),
        supabase
          .from("metas_diarias")
          .select("meta_pecas")
          .eq("data", dataHoje)
          .maybeSingle(),
      ]);

      if (resCostureiras.error) throw resCostureiras.error;
      if (resSessoes.error) throw resSessoes.error;
      if (resMetaHoje.error) throw resMetaHoje.error;

      const costureiras = resCostureiras.data ?? [];
      const sessoes = resSessoes.data ?? [];

      // Depende das sessões, por isso vem depois
      const apontamentos = await listarApontamentos(sessoes.map((s) => s.id));

      const sessaoPorId = new Map(sessoes.map((s) => [s.id, s]));

      type Acumulado = { pecas: number; padrao: number; gasto: number };
      const porCostureira = new Map<string, Acumulado>();
      let pecasProduzidasMes = 0;
      let pecasHoje = 0;
      let totalPadrao = 0;
      let totalGasto = 0;

      for (const ap of apontamentos) {
        const sessao = sessaoPorId.get(ap.sessao_id);
        if (!sessao) continue;

        // minutos que as peças deveriam levar (quantidade x TP)
        const padrao = ap.quantidade * sessao.tempo_padrao;

        const atual = porCostureira.get(sessao.costureira_id) ?? {
          pecas: 0,
          padrao: 0,
          gasto: 0,
        };
        atual.pecas += ap.quantidade;
        atual.padrao += padrao;
        atual.gasto += ap.minutos_gastos;
        porCostureira.set(sessao.costureira_id, atual);

        pecasProduzidasMes += ap.quantidade;
        totalPadrao += padrao;
        totalGasto += ap.minutos_gastos;
        if (sessao.data === dataHoje) pecasHoje += ap.quantidade;
      }

      // Eficiência = minutos padrão / minutos gastos (mesma regra da página da costureira)
      const ranking: RankingPerson[] = costureiras
        .map((c) => {
          const acc = porCostureira.get(c.id);
          const eficiencia =
            acc && acc.gasto > 0 ? Math.round((acc.padrao / acc.gasto) * 100) : 0;
          return { name: c.nome, pieces: acc?.pecas ?? 0, efficiency: eficiencia };
        })
        .sort((a, b) => b.pieces - a.pieces)
        .slice(0, 4);

      const eficienciaMedia =
        totalGasto > 0 ? Math.round((totalPadrao / totalGasto) * 1000) / 10 : 0;

      const metaHojeTotal = resMetaHoje.data?.meta_pecas ?? 0;
      const metaHojePercentual =
        metaHojeTotal > 0 ? Math.round((pecasHoje / metaHojeTotal) * 100) : 0;

      setData({
        costureirasAtivas: costureiras.length,
        pecasProduzidasMes,
        eficienciaMedia,
        ranking,
        metaHojePercentual,
        pecasHoje,
        metaHojeTotal,
      });
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar os dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
        <p className="text-[var(--sea-ink-soft)]">Carregando painel...</p>
      </main>
    );
  }

  if (erro || !data) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
        <p className="text-red-600">{erro ?? "Erro desconhecido."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[var(--bg-base)] px-5 py-10 text-[var(--foreground)]">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[var(--lagoon-deep)]">
          CosturaFlow
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Painel das costureiras
        </h1>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Acompanhe a produção e o desempenho da equipe.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Users className="size-5" />}
          label="Costureiras ativas"
          value={String(data.costureirasAtivas)}
          description="Equipe cadastrada"
        />
        <StatCard
          icon={<Package className="size-5" />}
          label="Peças produzidas"
          value={data.pecasProduzidasMes.toLocaleString("pt-BR")}
          description="Produção do mês"
        />
        <StatCard
          icon={<Activity className="size-5" />}
          label="Eficiência média"
          value={`${data.eficienciaMedia.toLocaleString("pt-BR")}%`}
          description="Tempo padrão em relação ao tempo gasto"
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Ranking de desempenho</CardTitle>
            <CardDescription>
              Produção acumulada da equipe neste mês.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {data.ranking.length === 0 && (
              <p className="text-sm text-[var(--sea-ink-soft)]">
                Nenhuma produção registrada este mês ainda.
              </p>
            )}

            {data.ranking.map((person, index) => (
              <div key={person.name}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-[var(--hero-a)] text-sm font-bold text-[var(--lagoon-deep)]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{person.name}</p>
                      <p className="text-sm text-[var(--sea-ink-soft)]">
                        {person.pieces} peças produzidas
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={person.efficiency >= 100 ? "default" : "secondary"}
                  >
                    {person.efficiency}% eficiente
                  </Badge>
                </div>

                <Progress value={Math.min(person.efficiency, 100)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resumo de hoje</CardTitle>
            <CardDescription>Atualizado agora</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-xl bg-[var(--chip-bg)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">
                  Meta do dia
                </p>
                <CheckCircle2 className="size-5 text-[var(--lagoon-deep)]" />
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {data.metaHojePercentual}%
              </p>
              <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                {data.pecasHoje} de {data.metaHojeTotal} peças
              </p>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-semibold">Ver costureiras</p>
                <p className="text-sm text-[var(--sea-ink-soft)]">
                  Gerencie a equipe e a produção.
                </p>
              </div>
              <ArrowUpRight className="size-5 text-[var(--sea-ink-soft)]" />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-[var(--sea-ink-soft)]">
          {icon}
          {label}
        </div>
        <p className="mt-3 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">{description}</p>
      </CardContent>
    </Card>
  );
}