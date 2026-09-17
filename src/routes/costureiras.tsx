import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader,CardTitle,} from "@/components/ui/card";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/components/ui/table";

export const Route = createFileRoute("/costureiras")({
  component: ListaCostureiras,
});

type LinhaCostureira = {
  id: string;
  nome: string;
  metaMensal: number;
  pecasProduzidas: number;
  ativa: boolean;
};

function ListaCostureiras() {
  const [linhas, setLinhas] = useState<LinhaCostureira[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    setErro(null);

    try {
      const hoje = new Date();
      const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        .toISOString()
        .slice(0, 10);

      const { data: costureiras, error: erroCostureiras } = await supabase
        .from("costureiras")
        .select("id, nome, meta_mensal, ativa")
        .order("nome");

      if (erroCostureiras) throw erroCostureiras;

      const { data: producaoMes, error: erroProducao } = await supabase
        .from("producao_diaria")
        .select("costureira_id, quantidade")
        .gte("data", inicioDoMes);

      if (erroProducao) throw erroProducao;

      const totalPorCostureira = new Map<string, number>();
      for (const linha of producaoMes ?? []) {
        const atual = totalPorCostureira.get(linha.costureira_id) ?? 0;
        totalPorCostureira.set(linha.costureira_id, atual + linha.quantidade);
      }

      const resultado: LinhaCostureira[] = (costureiras ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
        metaMensal: c.meta_mensal,
        pecasProduzidas: totalPorCostureira.get(c.id) ?? 0,
        ativa: c.ativa,
      }));

      setLinhas(resultado);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar as costureiras. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 text-slate-900">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-600">
            CosturaFlow
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Costureiras</h1>
          <p className="mt-2 text-slate-500">
            Gerencie a equipe cadastrada e acompanhe a produção do mês.
          </p>
        </div>

        <Link to="/costureiras">
          <Button>Nova costureira</Button>
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>
            {linhas.length} costureira{linhas.length !== 1 ? "s" : ""} cadastrada
            {linhas.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading && <p className="text-sm text-slate-500">Carregando...</p>}
          {erro && <p className="text-sm text-red-600">{erro}</p>}

          {!loading && !erro && linhas.length === 0 && (
            <p className="text-sm text-slate-500">
              Nenhuma costureira cadastrada ainda.
            </p>
          )}

          {!loading && !erro && linhas.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Meta mensal</TableHead>
                  <TableHead>Produção do mês</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((linha) => (
                  <TableRow key={linha.id}>
                    <TableCell className="font-medium">{linha.nome}</TableCell>
                    <TableCell>{linha.metaMensal}</TableCell>
                    <TableCell>{linha.pecasProduzidas}</TableCell>
                    <TableCell>
                      <Badge variant={linha.ativa ? "default" : "secondary"}>
                        {linha.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}