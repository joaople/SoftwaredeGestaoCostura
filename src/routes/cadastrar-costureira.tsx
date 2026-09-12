import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { criarCostureira } from "@/lib/api";

export const Route = createFileRoute("/cadastrar-costureira")({
  component: CadastrarCostureira,
});

function CadastrarCostureira() {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      await criarCostureira(nome);
      navigate({ to: "/" }); // volta pro painel principal já com o dado salvo
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-xl font-bold mb-6">Cadastrar Costureira</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>
        {erro && <p className="text-red-500 text-sm">{erro}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Cadastrar"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/" })}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}