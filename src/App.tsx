import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Criar from "./pages/Criar";
import Agentes from "./pages/Agentes";
import Dashboard from "./pages/Dashboard";
import Moldes from "./pages/Moldes";
import Temas from "./pages/Temas";
import Editor from "./pages/Editor";
import Mockups from "./pages/Mockups";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout><Routes><Route path="/" element={<Dashboard />} /><Route path="/criar" element={<Criar />} /><Route path="/moldes" element={<Moldes />} /><Route path="/temas" element={<Temas />} /><Route path="/editor" element={<Editor />} /><Route path="/mockups" element={<Mockups />} /><Route path="/agentes" element={<Agentes />} /><Route path="*" element={<NotFound />} /></Routes></AppLayout>}>
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
