import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMoldes() {
  return useQuery({
    queryKey: ["moldes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moldes")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useTemas() {
  return useQuery({
    queryKey: ["temas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("temas")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
