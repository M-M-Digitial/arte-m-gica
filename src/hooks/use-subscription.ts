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
  const localDevelopmentAccess = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_SUBSCRIPTION === "true";

  const { data, isLoading } = useQuery({
    queryKey: ["assinatura", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [subscriptionResult, rolesResult] = await Promise.all([
        supabase
          .from("assinaturas")
          .select("email,status,plano,valid_until,origem")
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      if (subscriptionResult.error) throw subscriptionResult.error;
      if (rolesResult.error) throw rolesResult.error;

      const isAdmin = (rolesResult.data ?? []).some((role) => role.role === "admin");
      const a: Assinatura | null = subscriptionResult.data;
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
    liberado: localDevelopmentAccess || ((data?.active || data?.isAdmin) ?? false),
  };
}
