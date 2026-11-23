import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthGate } from "@/components/AuthGate";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Confectime" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    // Aplica o tema salvo antes da página aparecer, para não piscar
    scripts: [
      {
        children:
          "(function(){try{var m=localStorage.getItem('theme')||'light';var d=m==='dark'||(m==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.remove('light','dark');e.classList.add(d?'dark':'light');e.style.colorScheme=d?'dark':'light';}catch(_){}})();",
      },
    ],
  }),

  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <p>Página não encontrada.</p>
        <a href="/" className="text-blue-500 underline">
          Voltar para o início
        </a>
      </div>
    </div>
  ),

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-[var(--bg-base)] font-sans antialiased text-[var(--foreground)]">
        {/* Decide entre tela de login e sistema (com menu lateral) */}
        <AuthGate>{children}</AuthGate>
        <Scripts />
      </body>
    </html>
  );
}
