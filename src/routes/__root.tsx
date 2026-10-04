import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Sidebar } from "@/components/Sidebar";

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
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-[var(--bg-base)] font-sans antialiased text-[var(--foreground)]">
        <div className="flex min-h-screen bg-[var(--bg-base)]">
          <Sidebar />
          <div className="flex-1 bg-[var(--bg-base)] text-[var(--foreground)]">
            {children}
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}