import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Conversa {
  id: string;
  agent_id: string;
  title: string;
  messages: any[];
  created_at: string;
  updated_at: string;
}

export function useConversas(agentId: string) {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConversas = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("conversas")
      .select("*")
      .eq("agent_id", agentId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setConversas((data as Conversa[]) || []);
    setLoading(false);
  }, [user, agentId]);

  useEffect(() => { fetchConversas(); }, [fetchConversas]);

  const createConversa = useCallback(async (firstMessage?: string) => {
    if (!user) return null;
    const title = firstMessage
      ? firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "..." : "")
      : "Nova conversa";
    const { data, error } = await supabase
      .from("conversas")
      .insert({ user_id: user.id, agent_id: agentId, title, messages: [] })
      .select()
      .single();
    if (error || !data) return null;
    const conversa = data as Conversa;
    setConversas((prev) => [conversa, ...prev]);
    setActiveId(conversa.id);
    return conversa;
  }, [user, agentId]);

  const saveMessages = useCallback(async (conversaId: string, messages: any[], title?: string) => {
    const updates: any = { messages, updated_at: new Date().toISOString() };
    if (title) updates.title = title;
    await supabase.from("conversas").update(updates).eq("id", conversaId);
    setConversas((prev) =>
      prev.map((c) => c.id === conversaId ? { ...c, ...updates } : c)
    );
  }, []);

  const deleteConversa = useCallback(async (conversaId: string) => {
    await supabase.from("conversas").delete().eq("id", conversaId);
    setConversas((prev) => prev.filter((c) => c.id !== conversaId));
    if (activeId === conversaId) setActiveId(null);
  }, [activeId]);

  return {
    conversas,
    activeId,
    setActiveId,
    loading,
    createConversa,
    saveMessages,
    deleteConversa,
    refetch: fetchConversas,
  };
}
