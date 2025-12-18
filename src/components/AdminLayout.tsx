import React, { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { Button } from '@/components/ui/button';
import { LogOut, ArrowLeft } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileBottomNav } from './MobileBottomNav';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({
  children
}: AdminLayoutProps) {
  const {
    signOut,
    user
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Check if we're on a sub-page (not the main admin dashboard)
  const isSubPage = location.pathname !== '/admin' && location.pathname.startsWith('/admin');
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleBack = () => {
    // Navigate back to admin dashboard
    navigate('/admin');
  };

  return <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 md:h-14 border-b bg-card flex items-center px-2 sm:px-4 gap-1.5 sm:gap-3">
            {isSubPage && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleBack}
                className="h-7 w-7 md:h-8 md:w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <SidebarTrigger className="btn-touch" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm md:text-lg font-semibold truncate">Admin Panel</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate hidden sm:block">{user?.email}</p>
            </div>
            <div className="flex gap-1.5 md:gap-2">
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={handleSignOut} className="btn-touch h-7 md:h-8 text-xs">
                <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-2 sm:p-3 md:p-6 overflow-auto pb-20 md:pb-6">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </SidebarProvider>;
}