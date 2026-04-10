import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversa } from "@/hooks/use-conversas";
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
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ConversasList({ conversas, activeId, onSelect, onNew, onDelete, loading }: ConversasListProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={onNew}
        variant="outline"
        size="sm"
        className="w-full rounded-xl gap-2 border-dashed border-primary/30 text-primary hover:bg-primary/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Nova conversa
      </Button>

      {loading && (
        <div className="space-y-2 mt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && conversas.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Nenhuma conversa ainda
        </p>
      )}

      {conversas.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            "group flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm",
            activeId === c.id
              ? "bg-primary/10 border border-primary/20 text-foreground"
              : "hover:bg-secondary/70 text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium">{c.title}</p>
            <p className="text-[10px] opacity-50">{timeAgo(c.updated_at)}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </button>
      ))}
    </div>
  );
}
