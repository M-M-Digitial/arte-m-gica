import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import type { ChatMessage } from "@/types/chat";

export interface Conversa {
  id: string;
  agent_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

function toConversa(row: Record<string, unknown>): Conversa {
  return {
    id: String(row.id),
    agent_id: String(row.agent_id),
    title: String(row.title),
    messages: Array.isArray(row.messages) ? (row.messages as unknown as ChatMessage[]) : [],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function useConversas(agentId: string) {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConversas = useCallback(async () => {
    if (!user || !agentId) {
      setConversas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("conversas")
      .select("*")
      .eq("agent_id", agentId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    setConversas((data ?? []).map((row) => toConversa(row as unknown as Record<string, unknown>)));
    setLoading(false);
  }, [user, agentId]);

  useEffect(() => {
    fetchConversas().catch((error) => {
      console.error("Erro ao carregar conversas", error);
      setLoading(false);
    });
  }, [fetchConversas]);

  const createConversa = useCallback(async (firstMessage?: string) => {
    if (!user || !agentId) return null;
    const cleanTitle = firstMessage?.trim() || "Nova conversa";
    const title = cleanTitle.slice(0, 60) + (cleanTitle.length > 60 ? "..." : "");
    const { data, error } = await supabase
      .from("conversas")
      .insert({ user_id: user.id, agent_id: agentId, title, messages: [] })
      .select()
      .single();
    if (error) throw error;
    const conversa = toConversa(data as unknown as Record<string, unknown>);
    setConversas((previous) => [conversa, ...previous]);
    return conversa;
  }, [user, agentId]);

  const saveMessages = useCallback(async (conversaId: string, messages: ChatMessage[], title?: string) => {
    if (!user) return;
    const updatedAt = new Date().toISOString();
    const updates = {
      messages: messages as unknown as Json,
      updated_at: updatedAt,
      ...(title ? { title } : {}),
    };
    const { error } = await supabase
      .from("conversas")
      .update(updates)
      .eq("id", conversaId)
      .eq("user_id", user.id);
    if (error) throw error;
    setConversas((previous) =>
      previous.map((conversa) =>
        conversa.id === conversaId ? { ...conversa, messages, updated_at: updatedAt, ...(title ? { title } : {}) } : conversa,
      ),
    );
  }, [user]);

  const deleteConversa = useCallback(async (conversaId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("conversas")
      .delete()
      .eq("id", conversaId)
      .eq("user_id", user.id);
    if (error) throw error;
    setConversas((previous) => previous.filter((conversa) => conversa.id !== conversaId));
    if (activeId === conversaId) setActiveId(null);
  }, [activeId, user]);

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
