import { createContext, useContext } from "react";
import type { Papel } from "@/lib/acesso";

export type Acesso = {
  userId: string | null;
  email: string | null;
  papel: Papel | null;
  /** editor ou administrador: pode cadastrar, alterar e excluir */
  podeEditar: boolean;
  /** administrador: também libera o acesso de outras pessoas */
  ehAdmin: boolean;
};

export const AcessoContext = createContext<Acesso>({
  userId: null,
  email: null,
  papel: null,
  podeEditar: false,
  ehAdmin: false,
});

/** Diz quem está logado e o que essa pessoa pode fazer. */
export function useAcesso() {
  return useContext(AcessoContext);
}
