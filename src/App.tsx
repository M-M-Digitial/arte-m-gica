import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Criar from "./pages/Criar";
import Agentes from "./pages/Agentes";
import AgenteChat from "./pages/AgenteChat";
import Dashboard from "./pages/Dashboard";
import Moldes from "./pages/Moldes";
import ModelosProntos from "./pages/ModelosProntos";
import Temas from "./pages/Temas";
import Editor from "./pages/Editor";
import Mockups from "./pages/Mockups";
import Perfil from "./pages/Perfil";
import AdminMoldesUpload from "./pages/AdminMoldesUpload";
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
      <AuthProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              element={
                <ProtectedRoute>
                  <LayoutWrapper />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/criar" element={<Criar />} />
              <Route path="/moldes" element={<Moldes />} />
              <Route path="/modelos-prontos" element={<ModelosProntos />} />
              <Route path="/temas" element={<Temas />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/mockups" element={<Mockups />} />
              <Route path="/agentes" element={<Agentes />} />
              <Route path="/agentes/:agentId" element={<AgenteChat />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/admin/moldes" element={<AdminMoldesUpload />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
