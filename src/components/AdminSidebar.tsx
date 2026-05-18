import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, FileText, Settings, Package, ClipboardList, Users, MapPin, Building2, UserCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";

const menuItems = [
  { titleKey: "admin.dashboard", url: "/admin", icon: LayoutDashboard },
  
  { titleKey: "admin.mmReporting", url: "/admin/market-reporting", icon: Building2 },
  { titleKey: "admin.bmsMonitoring", url: "/admin/bms-monitoring", icon: Users },
  { titleKey: "admin.requests", url: "/admin/requests", icon: ClipboardList },
  { titleKey: "admin.sessions", url: "/admin/sessions", icon: FileText },
  { titleKey: "admin.assets", url: "/admin/asset-management", icon: Package },
  { titleKey: "My Profile", url: "/my-profile", icon: UserCircle },
  { titleKey: "admin.settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const isCollapsed = state === "collapsed";
  const { t } = useLanguage();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex w-full items-center gap-2 rounded-md px-2 py-2 transition",
      isActive
        ? "bg-accent text-accent-foreground font-medium"
        : "!text-neutral-900 dark:!text-neutral-100 hover:bg-accent/50",
    ].join(" ");

  return (
    <Sidebar 
      className={isCollapsed ? "w-16" : "w-64"} 
      collapsible={isMobile ? "icon" : "none"}
    >
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="!text-neutral-900 dark:!text-neutral-100">
              {t('admin.panel')}
            </SidebarGroupLabel>
          )}

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton asChild className="flex items-center gap-2">
                    <NavLink to={item.url} end className={linkClass} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4 flex-shrink-0 !text-neutral-900 dark:!text-neutral-100" />
                      {!isCollapsed && (
                        <span className="ml-1 !text-neutral-900 dark:!text-neutral-100">
                          {t(item.titleKey)}
                        </span>
                      )}
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
