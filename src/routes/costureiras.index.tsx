import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { criarCostureira, excluirCostureira } from "@/lib/api";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader,CardTitle,} from "@/components/ui/card";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/costureiras/")({
  component: ListaCostureiras,
});

type LinhaCostureira = {
  id: string;
  nome: string;
  ativa: boolean;
};

function ListaCostureiras() {
  const [linhas, setLinhas] = useState<LinhaCostureira[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  const [costureiraParaExcluir, setCostureiraParaExcluir] =
    useState<LinhaCostureira | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  function abrirModal() {
    setNome("");
    setErroForm(null);
    setModalAberto(true);
  }

  async function handleSalvarCostureira(e: FormEvent) {
    e.preventDefault();

    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      setErroForm("Informe o nome completo da costureira.");
      return;
    }

    setSalvando(true);
    setErroForm(null);

    try {
      await criarCostureira(nomeLimpo);
      setModalAberto(false);
      await carregarDados();
    } catch (e: any) {
      console.error(e);
      const mensagem =
        e?.message || e?.error_description || "Erro desconhecido ao salvar.";
      setErroForm(`Não foi possível salvar: ${mensagem}`);
    } finally {
      setSalvando(false);
    }
  }

  function pedirExclusao(linha: LinhaCostureira) {
    setErroExclusao(null);
    setCostureiraParaExcluir(linha);
  }

  async function confirmarExclusao() {
    if (!costureiraParaExcluir) return;

    setExcluindo(true);
    setErroExclusao(null);

    try {
      await excluirCostureira(costureiraParaExcluir.id);
      setCostureiraParaExcluir(null);
      await carregarDados();
    } catch (e: any) {
      console.error(e);
      const mensagem =
        e?.message || e?.error_description || "Erro desconhecido ao excluir.";
      setErroExclusao(`Não foi possível excluir: ${mensagem}`);
    } finally {
      setExcluindo(false);
    }
  }

  async function carregarDados() {
    setLoading(true);
    setErro(null);

    try {
      const { data: costureiras, error: erroCostureiras } = await supabase
        .from("costureiras")
        .select("id, nome, ativa")
        .order("nome");

      if (erroCostureiras) throw erroCostureiras;

      const resultado: LinhaCostureira[] = (costureiras ?? []).map((c) => ({
        id: c.id,
        nome: c.nome,
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

        <Button onClick={abrirModal}>Nova costureira</Button>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((linha) => (
                  <TableRow key={linha.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/costureiras/$id"
                        params={{ id: linha.id }}
                        className="hover:underline"
                      >
                        {linha.nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={linha.ativa ? "default" : "secondary"}>
                        {linha.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => pedirExclusao(linha)}
                        aria-label={`Excluir ${linha.nome}`}
                      >
                        <Trash2 className="text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <form onSubmit={handleSalvarCostureira}>
            <DialogHeader>
              <DialogTitle>Cadastrar costureira</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Ana Souza"
                  autoFocus
                />
              </div>

              {erroForm && (
                <p className="text-sm text-red-600">{erroForm}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!costureiraParaExcluir}
        onOpenChange={(open) => {
          if (!open) setCostureiraParaExcluir(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir costureira</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <strong>{costureiraParaExcluir?.nome}</strong>? Essa ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          {erroExclusao && (
            <p className="text-sm text-red-600">{erroExclusao}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCostureiraParaExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmarExclusao}
              disabled={excluindo}
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}