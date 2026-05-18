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
  Umbrella,
  Wallet,
  Trash2,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: any;
  labelKey: string;
  path?: string;
  action?: string;
}

const employeeNavItems: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/dashboard' },
  { icon: CalendarCheck, labelKey: 'nav.attendance', path: '/my-attendance' },
  { icon: History, labelKey: 'nav.sessions', path: '/my-sessions' },
  { icon: Package, labelKey: 'nav.assets', path: '/asset-requests' },
  { icon: UserCircle, labelKey: 'Profile', path: '/my-profile' },
];

const adminNavItems: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/admin' },
  { icon: Users, labelKey: 'nav.users', path: '/admin/users' },
  { icon: MapPin, labelKey: 'nav.markets', path: '/admin/live-markets' },
  { icon: ClipboardList, labelKey: 'nav.requests', path: '/admin/requests' },
  { icon: UserCircle, labelKey: 'Profile', path: '/my-profile' },
];


const marketManagerNavItems: NavItem[] = [
  { icon: Home, labelKey: 'nav.home', path: '/manager-dashboard' },
  { icon: Package, labelKey: 'Assets', action: 'assets' },
  { icon: Wallet, labelKey: 'Advance', action: 'advance' },
  { icon: CalendarCheck, labelKey: 'nav.attendance', path: '/my-attendance' },
  { icon: UserCircle, labelKey: 'Profile', path: '/my-profile' },
];

interface MobileBottomNavProps {
  onAction?: (action: string) => void;
}

export function MobileBottomNav({ onAction }: MobileBottomNavProps) {
  const isMobile = useIsMobile();
  const { currentRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleClearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        toast.success('Cache cleared successfully');
      } else {
        toast.error('Cache API not supported');
      }
    } catch {
      toast.error('Failed to clear cache');
    }
  };

  if (!isMobile) return null;

  const getNavItems = (): NavItem[] => {
    switch (currentRole) {
      case 'admin':
        return adminNavItems;
      case 'market_manager':
        return marketManagerNavItems;
      default:
        return employeeNavItems;
    }
  };

  const navItems = getNavItems();

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === '/dashboard' || path === '/admin' || path === '/bdo-dashboard' || path === '/manager-dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const key = item.path || item.action || String(idx);
          return (
            <button
              key={key}
              onClick={() => {
                if (item.action === 'clear-cache') {
                  handleClearCache();
                } else if (item.action && onAction) {
                  onAction(item.action);
                } else if (item.path) {
                  navigate(item.path);
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 px-0.5 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className={cn(
                'text-[9px] mt-0.5 font-medium truncate max-w-full',
                active ? 'text-primary' : 'text-muted-foreground'
              )}>
                {item.action ? item.labelKey : t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
