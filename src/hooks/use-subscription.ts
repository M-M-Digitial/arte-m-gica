import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Assinatura {
  email: string;
  status: string;
  plano: string | null;
  valid_until: string | null;
  origem: string;
}

// Estado de assinatura do usuário logado (match por e-mail) + papel admin.
// Admin sempre passa pelos gates.
export function useSubscription() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["assinatura", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: ass }, { data: roles }] = await Promise.all([
        (supabase as any)
          .from("assinaturas")
          .select("email,status,plano,valid_until,origem")
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      const a = ass as Assinatura | null;
      const active =
        !!a &&
        a.status === "active" &&
        (!a.valid_until || new Date(a.valid_until) > new Date());
      return { assinatura: a, active, isAdmin };
    },
  });

  return {
    loading: isLoading,
    assinatura: data?.assinatura ?? null,
    active: data?.active ?? false,
    isAdmin: data?.isAdmin ?? false,
    liberado: (data?.active || data?.isAdmin) ?? false,
  };
}
