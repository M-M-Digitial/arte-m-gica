import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Criar from "./pages/Criar";
import Agentes from "./pages/Agentes";
import AgenteChat from "./pages/AgenteChat";
import Dashboard from "./pages/Dashboard";
import Moldes from "./pages/Moldes";
import Temas from "./pages/Temas";
import Editor from "./pages/Editor";
import Mockups from "./pages/Mockups";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LayoutWrapper() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<LayoutWrapper />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/criar" element={<Criar />} />
            <Route path="/moldes" element={<Moldes />} />
            <Route path="/temas" element={<Temas />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/mockups" element={<Mockups />} />
            <Route path="/agentes" element={<Agentes />} />
            <Route path="/agentes/:agentId" element={<AgenteChat />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
