import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: any;
  labelKey: string;
  path: string;
}

const employeeNavItems: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/dashboard' },
  { icon: CalendarCheck, labelKey: 'nav.attendance', path: '/my-attendance' },
  { icon: History, labelKey: 'nav.sessions', path: '/my-sessions' },
  { icon: Package, labelKey: 'nav.assets', path: '/asset-requests' },
];

const adminNavItems: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/admin' },
  { icon: Users, labelKey: 'nav.users', path: '/admin/users' },
  { icon: MapPin, labelKey: 'nav.markets', path: '/admin/live-markets' },
  { icon: ClipboardList, labelKey: 'nav.requests', path: '/admin/requests' },
  { icon: Settings, labelKey: 'nav.settings', path: '/admin/settings' },
];

const bdoNavItems: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/bdo-dashboard' },
  { icon: MapPin, labelKey: 'nav.markets', path: '/admin/live-markets' },
  { icon: CalendarCheck, labelKey: 'nav.attendance', path: '/my-attendance' },
  { icon: FileText, labelKey: 'nav.documents', path: '/bdo-dashboard' },
];

const marketManagerNavItems: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/manager-dashboard' },
  { icon: CalendarCheck, labelKey: 'nav.attendance', path: '/my-attendance' },
  { icon: History, labelKey: 'nav.sessions', path: '/my-manager-sessions' },
];

export function MobileBottomNav() {
  const isMobile = useIsMobile();
  const { currentRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
