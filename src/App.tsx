import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Route, Routes, Outlet, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { hasProductFeature, productMode, type ProductFeature } from "@/config/products";
import Auth from "./pages/Auth";
import Criar from "./pages/Criar";
import Agentes from "./pages/Agentes";
import AgenteChat from "./pages/AgenteChat";
import Dashboard from "./pages/Dashboard";
import Moldes from "./pages/Moldes";
import MinhasArtes from "./pages/MinhasArtes";
import ModelosProntos from "./pages/ModelosProntos";
import Temas from "./pages/Temas";
import Editor from "./pages/Editor";
import Perfil from "./pages/Perfil";
import AdminMoldesUpload from "./pages/AdminMoldesUpload";
import AdminAssinaturas from "./pages/AdminAssinaturas";
import Trilhas from "./pages/Trilhas";
import NotFound from "./pages/NotFound";
import { RequireAssinatura } from "@/components/RequireAssinatura";

const queryClient = new QueryClient();
const routerBasename = import.meta.env.BASE_URL === "/"
  ? undefined
  : import.meta.env.BASE_URL.replace(/\/$/, "");

function LayoutWrapper() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return null;
}

function ProductRoute({ feature, children }: { feature: ProductFeature; children: ReactNode }) {
  if (!hasProductFeature(feature)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Sonner />
        <BrowserRouter basename={routerBasename}>
          <ScrollToTop />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              element={
                <ProtectedRoute>
                  <LayoutWrapper />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={productMode === "escola-agentes" ? <Navigate to="/agentes" replace /> : <Dashboard />} />
              <Route path="/criar" element={<ProductRoute feature="generator"><RequireAssinatura><Criar /></RequireAssinatura></ProductRoute>} />
              <Route path="/moldes" element={<ProductRoute feature="generator"><Moldes /></ProductRoute>} />
              <Route path="/minhas-artes" element={<ProductRoute feature="generator"><RequireAssinatura><MinhasArtes /></RequireAssinatura></ProductRoute>} />
              <Route path="/modelos-prontos" element={<ProductRoute feature="generator"><RequireAssinatura><ModelosProntos /></RequireAssinatura></ProductRoute>} />
              <Route path="/temas" element={<ProductRoute feature="generator"><Temas /></ProductRoute>} />
              <Route path="/editor" element={<ProductRoute feature="generator"><RequireAssinatura><Editor /></RequireAssinatura></ProductRoute>} />
              <Route path="/trilhas" element={<ProductRoute feature="agent-school"><RequireAssinatura><Trilhas /></RequireAssinatura></ProductRoute>} />
              <Route path="/agentes" element={<ProductRoute feature="agent-school"><RequireAssinatura><Agentes /></RequireAssinatura></ProductRoute>} />
              <Route path="/agentes/:agentId" element={<ProductRoute feature="agent-school"><RequireAssinatura><AgenteChat /></RequireAssinatura></ProductRoute>} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/admin/moldes" element={<ProductRoute feature="admin-moldes"><AdminMoldesUpload /></ProductRoute>} />
              <Route path="/admin/assinaturas" element={<ProductRoute feature="admin-assinaturas"><AdminAssinaturas /></ProductRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
