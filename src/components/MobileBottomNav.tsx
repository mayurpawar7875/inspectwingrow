import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Home,
  CalendarCheck,
  History,
  Settings,
  MapPin,
  FileText,
  Users,
  ClipboardList,
  Package,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: any;
  label: string;
  path: string;
}

const employeeNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: CalendarCheck, label: 'Attendance', path: '/my-attendance' },
  { icon: History, label: 'Sessions', path: '/my-sessions' },
  { icon: Package, label: 'Assets', path: '/asset-requests' },
];

const adminNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: MapPin, label: 'Markets', path: '/admin/live-markets' },
  { icon: ClipboardList, label: 'Requests', path: '/admin/requests' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

const bdoNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/bdo-dashboard' },
  { icon: MapPin, label: 'Markets', path: '/admin/live-markets' },
  { icon: CalendarCheck, label: 'Attendance', path: '/my-attendance' },
  { icon: FileText, label: 'Documents', path: '/bdo-dashboard' },
];

const marketManagerNavItems: NavItem[] = [
  { icon: Home, label: 'Home', path: '/manager-dashboard' },
  { icon: CalendarCheck, label: 'Attendance', path: '/my-attendance' },
  { icon: History, label: 'Sessions', path: '/my-manager-sessions' },
];

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const { currentRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isMobile) return null;

  const getNavItems = (): NavItem[] => {
    switch (currentRole) {
      case 'admin':
        return adminNavItems;
      case 'bdo':
        return bdoNavItems;
      case 'market_manager':
        return marketManagerNavItems;
      default:
        return employeeNavItems;
    }
  };

  const navItems = getNavItems();

  const isActive = (path: string) => {
    if (path === '/dashboard' || path === '/admin' || path === '/bdo-dashboard' || path === '/manager-dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className={cn(
                'text-[10px] mt-1 font-medium truncate max-w-full',
                active ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
