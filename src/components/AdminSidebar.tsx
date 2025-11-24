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
import { LayoutDashboard, Users, FileText, Settings, Package, ClipboardList } from "lucide-react";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Requests Management", url: "/admin/requests", icon: ClipboardList },
  { title: "All Sessions", url: "/admin/sessions", icon: FileText },
  { title: "Asset Management", url: "/admin/asset-management", icon: Package },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      "flex w-full items-center gap-2 rounded-md px-2 py-2 transition",
      isActive
        ? "bg-accent text-accent-foreground font-medium"
        : "!text-neutral-900 dark:!text-neutral-100 hover:bg-accent/50",
    ].join(" ");

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="!text-neutral-900 dark:!text-neutral-100">
              Admin Panel
            </SidebarGroupLabel>
          )}

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="flex items-center gap-2">
                    <NavLink to={item.url} end className={linkClass}>
                      <item.icon className="h-4 w-4 flex-shrink-0 !text-neutral-900 dark:!text-neutral-100" />
                      {!isCollapsed && (
                        <span className="ml-1 !text-neutral-900 dark:!text-neutral-100">
                          {item.title}
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
