import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLocation } from "react-router-dom";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isAgentChat = /^\/agentes\/[^/]+$/.test(pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center px-6 sticky top-0 z-10 bg-background/80 glass border-b border-border/40">
            <SidebarTrigger className="mr-4 text-muted-foreground hover:text-foreground transition-colors" />
          </header>
          <main className={isAgentChat ? "flex-1 overflow-hidden" : "flex-1 p-6 lg:p-8"}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
