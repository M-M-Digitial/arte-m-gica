import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Conversa } from "@/hooks/use-conversas";
import { cn } from "@/lib/utils";

interface ConversasListProps {
  conversas: Conversa[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ConversasList({ conversas, activeId, onSelect, onNew, onDelete, loading }: ConversasListProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={onNew}
        variant="outline"
        size="sm"
        className="w-full gap-2 rounded-lg border-dashed border-primary/30 text-primary hover:bg-primary/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Nova conversa
      </Button>

      {loading && (
        <div className="mt-1 space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      )}

      {!loading && conversas.length === 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma conversa ainda</p>
      )}

      {conversas.map((conversa) => (
        <div
          key={conversa.id}
          className={cn(
            "group flex w-full items-center rounded-lg border border-transparent transition-colors",
            activeId === conversa.id
              ? "border-primary/20 bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(conversa.id)}
            className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left"
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{conversa.title}</span>
              <span className="block text-[10px] opacity-50">{timeAgo(conversa.updated_at)}</span>
            </span>
          </button>
          <button
            type="button"
            aria-label={`Excluir conversa ${conversa.title}`}
            title="Excluir conversa"
            onClick={() => onDelete(conversa.id)}
            className="mr-1 rounded-md p-2 opacity-50 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
