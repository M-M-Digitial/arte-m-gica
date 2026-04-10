import {
  LayoutDashboard,
  Sparkles,
  Bot,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Início", url: "/", icon: LayoutDashboard },
  { title: "Criar com IA", url: "/criar", icon: Sparkles },
  { title: "Agentes da Papelaria", url: "/agentes", icon: Bot },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="p-5 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-hero shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight text-foreground">
              Molde<span className="text-gradient">Pronto</span>
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
