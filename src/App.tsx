import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
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
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/moldes" element={<AppLayout><Moldes /></AppLayout>} />
          <Route path="/temas" element={<AppLayout><Temas /></AppLayout>} />
          <Route path="/editor" element={<AppLayout><Editor /></AppLayout>} />
          <Route path="/mockups" element={<AppLayout><Mockups /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
