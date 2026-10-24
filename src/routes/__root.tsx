import {
  HeadContent,
  Scripts,
  createRootRoute,
  useLocation,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Sidebar } from "@/components/Sidebar";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CosturaFlow" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
});

const PUBLIC_ROUTES = ["/login", "/cadastro"];

function RootDocument({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[var(--bg-base)] font-sans antialiased text-[var(--foreground)]">
        {isPublic ? (
          children
        ) : (
          <div className="flex min-h-screen bg-[var(--bg-base)]">
            <Sidebar />
            <div className="flex-1 bg-[var(--bg-base)] text-[var(--foreground)]">
              {children}
            </div>
          </div>
        )}
        <Scripts />
      </body>
    </html>
  );
}