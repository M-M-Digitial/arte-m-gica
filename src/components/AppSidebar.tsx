import {
  Bot,
  Box,
  CreditCard,
  GraduationCap,
  Globe,
  Images,
  LayoutDashboard,
  Library,
  Palette,
  Sparkles,
  UploadCloud,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { activeProduct, hasProductFeature, productMode, type ProductFeature } from "@/config/products";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { supabase } from "@/integrations/supabase/client";

type SidebarItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  feature?: ProductFeature;
};

const mainItems = [
  { title: "Inicio", url: "/", icon: LayoutDashboard },
  { title: "Gerador automatico", url: "/editor", icon: Wand2, feature: "generator" },
  { title: "Criar com IA", url: "/criar", icon: Sparkles, feature: "generator" },
  { title: "Minhas Artes", url: "/minhas-artes", icon: Images, feature: "generator" },
  { title: "Galeria", url: "/galeria", icon: Globe, feature: "generator" },
  { title: "Biblioteca de Moldes", url: "/moldes", icon: Box, feature: "generator" },
  { title: "Modelos Prontos", url: "/modelos-prontos", icon: Library, feature: "generator" },
  { title: "Temas", url: "/temas", icon: Palette, feature: "generator" },
  { title: "Rotinas práticas", url: "/trilhas", icon: GraduationCap, feature: "agent-school" },
  { title: "Minhas assistentes", url: "/agentes", icon: Bot, feature: "agent-school" },
] satisfies SidebarItem[];

const adminItems = [
  { title: "Assinaturas", url: "/admin/assinaturas", icon: CreditCard, feature: "admin-assinaturas" },
  { title: "Upload de Moldes", url: "/admin/moldes", icon: UploadCloud, feature: "admin-moldes" },
] satisfies SidebarItem[];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user } = useAuth();
  const { isAdmin } = useSubscription();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({
    display_name: null,
    avatar_url: null,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  const initials = profile.display_name
    ? profile.display_name
        .split(" ")
        .map((name) => name[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "?";
  const visibleMainItems = mainItems.filter(
    (item) => (!item.feature || hasProductFeature(item.feature)) && !(productMode === "escola-agentes" && item.url === "/"),
  );
  const visibleAdminItems = adminItems.filter((item) => !item.feature || hasProductFeature(item.feature));
  const BrandIcon = hasProductFeature("agent-school") && !hasProductFeature("generator") ? GraduationCap : Sparkles;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="p-5 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-hero shadow-soft">
            <BrandIcon className="h-3.5 w-3.5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight text-foreground">
              {activeProduct.wordmark.primary}
              <span className="text-gradient">{activeProduct.wordmark.accent}</span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {visibleMainItems.map((item) => (
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

        {isAdmin && visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {!collapsed && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Admin
                  </p>
                )}
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
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
        )}
      </SidebarContent>

      {user && (
        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/perfil"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
                  activeClassName="bg-primary/10 text-primary font-semibold"
                >
                  {collapsed ? (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{profile.display_name || "Meu Perfil"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
