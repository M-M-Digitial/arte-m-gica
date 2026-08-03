import {
  BadgeCheck,
  Bot,
  Calculator,
  CalendarClock,
  ClipboardCheck,
  HeartHandshake,
  Instagram,
  LibraryBig,
  Megaphone,
  MessageCircle,
  Printer,
  type LucideIcon,
} from "lucide-react";
import type { AgentId } from "@/data/agents";
import { cn } from "@/lib/utils";

const icons: Record<AgentId, LucideIcon> = {
  nina: MessageCircle,
  iris: Megaphone,
  clara: Instagram,
  violeta: LibraryBig,
  sofia: HeartHandshake,
  bella: Printer,
  cora: BadgeCheck,
  elisa: ClipboardCheck,
  maia: CalendarClock,
};

const colors: Record<AgentId, string> = {
  nina: "bg-rose-50 text-rose-600",
  iris: "bg-amber-50 text-amber-700",
  clara: "bg-sky-50 text-sky-700",
  violeta: "bg-violet-50 text-violet-700",
  sofia: "bg-teal-50 text-teal-700",
  bella: "bg-orange-50 text-orange-700",
  cora: "bg-emerald-50 text-emerald-700",
  elisa: "bg-blue-50 text-blue-700",
  maia: "bg-red-50 text-red-700",
};

interface AgentIconProps {
  agentId: AgentId;
  className?: string;
  iconClassName?: string;
}

export function AgentIcon({ agentId, className, iconClassName }: AgentIconProps) {
  const Icon = icons[agentId] ?? Bot;

  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        colors[agentId],
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
    </span>
  );
}
