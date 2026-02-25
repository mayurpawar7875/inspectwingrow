import { useEffect, useState, lazy, Suspense, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { NotificationBell } from '@/components/NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  LogOut,
  Clock,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Users,
  Camera,
  FileText,
  MessageSquare,
  ClipboardCheck,
  ExternalLink,
  Umbrella,
  History,
  Upload,
  Video,
  ImageIcon,
  Sparkles,
  Package,
  CalendarCheck,
  DollarSign,
} from 'lucide-react';

const TodaysOffersForm = lazy(() => import('@/components/TodaysOffersForm'));
const NonAvailableCommoditiesForm = lazy(() => import('@/components/NonAvailableCommoditiesForm'));
const OrganiserFeedbackForm = lazy(() => import('@/components/OrganiserFeedbackForm'));
const StallInspectionForm = lazy(() => import('@/components/StallInspectionForm'));
const NextDayPlanningForm = lazy(() => import('@/components/NextDayPlanningForm'));
const MarketLocationVisitForm = lazy(() => import('@/components/MarketLocationVisitForm'));
const ReimbursementForm = lazy(() => import('@/components/ReimbursementForm'));
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

interface SessionSummary {
  stalls_count: number;
  media_count: number;
  late_uploads_count: number;
  first_activity_at: string | null;
  last_activity_at: string | null;
  finalized_at: string;
}

export default function Dashboard() {
  const { user, signOut, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const isOrganiserMode = searchParams.get('as') === 'organiser';
  const { t } = useLanguage();
  
  // Use centralized data hook with caching
  const { data: dashboardData, isLoading: dataLoading, refetch, isError, error: dataError } = useDashboardData();
  
  // Derive sessions from hook data
  const todaySessions = useMemo(() => dashboardData?.sessions || [], [dashboardData?.sessions]);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);
  const todaySession = todaySessions[selectedSessionIndex] || null;
  
  // Derived values from hook
  const stallsCount = dashboardData?.stallsCount || 0;
  const collectionSheetUrl = dashboardData?.collectionSheetUrl || null;
  const attendanceStats = dashboardData?.attendanceStats || null;
  
  // Local UI state only
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [viewDialog, setViewDialog] = useState<'stalls' | 'media' | 'late' | null>(null);
  const [dialogData, setDialogData] = useState<any[]>([]);
  const [offersDialog, setOffersDialog] = useState(false);
  const [commoditiesDialog, setCommoditiesDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [inspectionDialog, setInspectionDialog] = useState(false);
  const [planningDialog, setPlanningDialog] = useState(false);
  const [locationVisitDialog, setLocationVisitDialog] = useState(false);
  const [reimbursementDialog, setReimbursementDialog] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveDate, setLeaveDate] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('');

  // Combined loading state
  const loading = authLoading || dataLoading;

  // Debounced refetch to avoid excessive re-renders from realtime events
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefetch = useCallback(() => {
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(() => {
      refetch();
    }, 1000);
  }, [refetch]);

  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, []);

  // Handle redirects and real-time subscriptions
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    // Redirect based on role
    if (currentRole === 'admin') {
      navigate('/admin');
      return;
    }
    if (currentRole === 'market_manager' && !isOrganiserMode) {
      navigate('/manager-dashboard');
      return;
    }
    if (currentRole === 'bdo') {
      navigate('/bdo-dashboard');
      return;
    }

    // Subscribe to notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `target_user_id=eq.${user.id}`,
      }, (payload: any) => {
        const n = payload.new as { title: string; body: string };
        toast(n.title, { description: n.body });
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'target_user_id=is.null',
      }, (payload: any) => {
        const n = payload.new as { title: string; body: string };
        toast(n.title, { description: n.body });
      })
      .subscribe();

    // Subscribe to session-related changes with debounced refetch
    const sessionChannel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => debouncedRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, () => debouncedRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, () => debouncedRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, () => debouncedRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_inspections' }, () => debouncedRefetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sessionChannel);
    };
  }, [user, authLoading, currentRole, navigate, debouncedRefetch]);

  // Countdown timer to midnight for active sessions
  useEffect(() => {
    const session = todaySessions[selectedSessionIndex];
    const isActive = session?.punch_in_time && !session?.punch_out_time;
    
    if (!isActive) {
      setElapsedTime('');
      return;
    }

    const calculateCountdown = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      
      const diffMs = midnight.getTime() - now.getTime();
      
      if (diffMs <= 0) {
        setElapsedTime('00:00:00');
        return;
      }
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [todaySessions, selectedSessionIndex]);

  const handleOpenCollectionSheet = () => {
    navigate('/collections');
  };

  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleViewDetails = async (type: 'stalls' | 'media' | 'late') => {
    if (!todaySession) return;
    
    try {
      if (type === 'stalls') {
        const dateStr = getISTDateString(new Date());
        const { data, error } = await supabase
          .from('stall_confirmations')
          .select('id, stall_no, stall_name, farmer_name, created_at')
          .eq('market_id', todaySession.market_id)
          .eq('market_date', dateStr)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setDialogData(data || []);
      } else if (type === 'media' || type === 'late') {
        const query = supabase
          .from('media')
          .select('*')
          .eq('session_id', todaySession.id)
          .order('captured_at', { ascending: false });
        
        if (type === 'late') {
          query.eq('is_late', true);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        setDialogData(data || []);
      }
      
      setViewDialog(type);
    } catch (error) {
      console.error('Error fetching details:', error);
      toast.error(t('dashboard.failedLoadDetails'));
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-info text-info-foreground',
      completed: 'bg-success text-success-foreground',
      finalized: 'bg-success text-success-foreground',
      locked: 'bg-muted text-muted-foreground',
      incomplete: 'bg-warning text-warning-foreground',
      incomplete_expired: 'bg-destructive text-destructive-foreground',
    };

    const labels: Record<string, string> = {
      active: 'Active',
      completed: 'Completed',
      finalized: 'Finalized',
      locked: 'Locked',
      incomplete: 'Incomplete',
      incomplete_expired: 'Incomplete & Expired',
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-muted'}>
        {labels[status as keyof typeof labels] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-4xl space-y-4">
          <div className="h-16 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-muted rounded animate-pulse" />
            <div className="h-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-48 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {(dataError as Error)?.message || 'Something went wrong. Please try again.'}
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Don't render if we're redirecting to another dashboard
  if (currentRole === 'admin' || (currentRole === 'market_manager' && !isOrganiserMode) || currentRole === 'bdo') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.redirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          <div className="flex justify-between items-center gap-2 mb-1.5 sm:mb-0">
            <div className="flex-1 min-w-0">
              {isOrganiserMode && (
                <Button variant="ghost" size="sm" className="h-6 px-1 sm:h-8 sm:px-2 mb-1 -ml-1 text-xs" onClick={() => navigate('/manager-dashboard')}>
                  ← Back to Manager Dashboard
                </Button>
              )}
              <h1 className="text-xs sm:text-2xl font-bold text-foreground">
                {isOrganiserMode ? 'Organiser Dashboard' : t('dashboard.title')}
              </h1>
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
              <LanguageSwitcher variant="ghost" />
              <NotificationBell />
              <Button variant="outline" size="sm" className="h-7 px-2 sm:h-9 sm:px-3" onClick={handleSignOut}>
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.signOut')}</span>
              </Button>
            </div>
          </div>
          <TooltipProvider>
            <div className="flex gap-0.5 sm:gap-2 mt-1.5 sm:mt-0 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 sm:h-9 sm:px-3 flex-shrink-0" onClick={() => navigate('/my-sessions')}>
                    <History className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('dashboard.mySessions')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard.mySessions')}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 sm:h-9 sm:px-3 flex-shrink-0" onClick={() => setLeaveDialog(true)}>
                    <Umbrella className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('dashboard.requestLeave')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard.requestLeave')}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 sm:h-9 sm:px-3 flex-shrink-0" onClick={() => navigate('/asset-requests')}>
                    <Package className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('dashboard.assets')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard.assetRequests')}</p>
                </TooltipContent>
              </Tooltip>
              
                <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 sm:h-9 sm:px-3 flex-shrink-0" onClick={() => navigate('/my-attendance')}>
                    <CalendarCheck className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('dashboard.attendance')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard.myAttendance')}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 sm:h-9 sm:px-3 flex-shrink-0" onClick={() => setLocationVisitDialog(true)}>
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('dashboard.locationVisit')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard.locationVisit')}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 sm:h-9 sm:px-3 flex-shrink-0" onClick={() => setReimbursementDialog(true)}>
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('dashboard.reimbursement')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard.reimbursement')}</p>
                </TooltipContent>
              </Tooltip>
              
              <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-sm flex-shrink-0" onClick={() => navigate('/install')}>
                {t('common.installApp')}
              </Button>
            </div>
          </TooltipProvider>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-2 sm:py-6 md:py-8">
        {/* Check if today is Monday (no markets - planning only day) */}
        {(() => {
          const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          const isMonday = ist.getDay() === 1;
          return isMonday;
        })() ? (
          <div className="space-y-4">
            {/* Monday - Planning Only Day */}
            <Card className="bg-info/10 border-info/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-info" />
                   <CardTitle className="text-info">{t('dashboard.planningDay')}</CardTitle>
                </div>
                <CardDescription className="text-info-foreground">
                  {t('dashboard.planningDayDesc')}
                </CardDescription>
              </CardHeader>
            </Card>
            
            {/* Next Day Planning Card - Only available task on Monday */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-primary/30" onClick={() => setPlanningDialog(true)}>
              <CardHeader className="p-4 sm:p-6">
                <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-primary mb-2" />
                <CardTitle className="text-base sm:text-lg">{t('dashboard.nextDayPlanning')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t('dashboard.nextDayPlanningDesc')}
                </CardDescription>
              </CardHeader>
            </Card>
            
            {/* Session History - Always available */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <History className="h-4 w-4 sm:h-5 sm:w-5" />
                  {t('dashboard.viewSessionHistory')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t('dashboard.viewSessionHistoryDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/my-sessions')} variant="outline" size="sm">
                  <History className="mr-2 h-4 w-4" />
                  {t('dashboard.viewHistory')}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : !todaySession ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.startDailyReport')}</CardTitle>
                <CardDescription>
                  {t('dashboard.noSessionStarted')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/market-selection')} size="lg">
                  <MapPin className="mr-2 h-5 w-5" />
                  {t('dashboard.startNewSession')}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t('dashboard.viewSessionHistory')}
                </CardTitle>
                <CardDescription>
                  {t('dashboard.viewSessionHistoryDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/my-sessions')} variant="outline" size="lg">
                  <History className="mr-2 h-5 w-5" />
                  {t('dashboard.viewHistory')}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-6">
            {/* Session Selector - shown when sessions exist */}
            {todaySessions.length >= 1 && (
              <Card className="bg-info/10 border-info/20">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    {todaySessions.length > 1 && (
                      <span className="text-sm font-medium text-info">{t('dashboard.multipleSessions')}</span>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {todaySessions.map((session, index) => (
                        <Button
                          key={session.id}
                          variant={selectedSessionIndex === index ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSessionIndex(index)}
                          className="text-xs"
                        >
                          {session.market.name}
                          {session.computed_status === 'completed' && (
                            <CheckCircle className="ml-1 h-3 w-3 text-success" />
                          )}
                        </Button>
                      ))}
                    </div>
                    {todaySessions.length < 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/market-selection')}
                        className="text-xs ml-auto"
                      >
                        <MapPin className="mr-1 h-3 w-3" />
                        {t('dashboard.addSession')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Session Info */}
            <Card>
              <CardHeader className="p-3 sm:pb-6 sm:px-6 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5 sm:gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm sm:text-xl">{t('dashboard.todaysSession')}</CardTitle>
                    <CardDescription className="mt-1 sm:mt-2 text-[10px] sm:text-sm break-words">
                      <span className="font-medium">{todaySession.market.name}</span>
                      <span className="mx-0.5 sm:mx-1">-</span>
                      <a 
                        href={todaySession.market.location} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5 sm:gap-1"
                      >
                        <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 inline" />
                        <span className="break-all">{t('dashboard.viewLocation')}</span>
                      </a>
                    </CardDescription>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(todaySession.computed_status || todaySession.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:px-6 sm:pb-6">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-sm text-muted-foreground">{t('dashboard.punchIn')}</p>
                      <p className="font-medium text-xs sm:text-base break-words">
                        {todaySession.punch_in_time
                          ? new Date(todaySession.punch_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : t('common.notRecorded')}
                      </p>
                      {/* Elapsed time for active session */}
                      {elapsedTime && (
                        <p className="text-[10px] sm:text-xs text-destructive font-mono mt-0.5 animate-pulse">
                          ⏳ {elapsedTime} {t('dashboard.left')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-sm text-muted-foreground">{t('dashboard.punchOut')}</p>
                      <p className="font-medium text-xs sm:text-base break-words">
                        {todaySession.punch_out_time
                          ? new Date(todaySession.punch_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                          : t('common.notRecorded')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-sm text-muted-foreground">{t('common.date')}</p>
                      <p className="font-medium text-xs sm:text-base break-words">
                        {new Date(todaySession.session_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Task Progress Section */}
                {todaySession.total_tasks !== undefined && todaySession.completed_tasks !== undefined && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="space-y-3">
                      {/* Circular Progress */}
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Circular Progress Indicator */}
                        <div className="relative flex items-center justify-center">
                          <svg className="transform -rotate-90" width="120" height="120">
                            {/* Background circle */}
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              stroke="hsl(var(--muted))"
                              strokeWidth="10"
                              fill="none"
                            />
                            {/* Progress circle */}
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              stroke="hsl(var(--primary))"
                              strokeWidth="10"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 50}`}
                              strokeDashoffset={`${2 * Math.PI * 50 * (1 - todaySession.completed_tasks / todaySession.total_tasks)}`}
                              strokeLinecap="round"
                              className="transition-all duration-500 ease-out"
                            />
                          </svg>
                          {/* Center text */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl sm:text-3xl font-bold text-foreground">
                              {todaySession.completed_tasks}
                            </span>
                            <span className="text-xs text-muted-foreground">{t('common.of')} {todaySession.total_tasks}</span>
                            <span className="text-xs font-medium text-primary mt-0.5">
                              {Math.round((todaySession.completed_tasks / todaySession.total_tasks) * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Task Status Summary */}
                        <div className="flex-1 text-center sm:text-left">
                          <h4 className="text-sm sm:text-base font-semibold text-foreground mb-1">
                            {t('dashboard.taskCompletion')}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {todaySession.completed_tasks === todaySession.total_tasks 
                              ? t('dashboard.allTasksCompleted')
                              : `${todaySession.total_tasks - todaySession.completed_tasks} ${t('dashboard.tasksRemaining')}`
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Task Details - Collapsible */}
                      <details className="group">
                        <summary className="cursor-pointer text-xs sm:text-sm text-primary hover:underline flex items-center gap-1">
                          {t('dashboard.viewTaskDetails')}
                          <span className="transition-transform group-open:rotate-180">▼</span>
                        </summary>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {todaySession.task_details?.map((task, index) => {
                            const IconComponent = task.icon;
                            return (
                              <div 
                                key={index}
                                className={`flex items-center gap-2 p-2 rounded-lg border ${
                                  task.completed 
                                    ? 'bg-success/10 border-success/20' 
                                    : 'bg-muted/50 border-border'
                                }`}
                              >
                                <div className="flex-shrink-0">
                                  {task.completed ? (
                                    <CheckCircle className="h-4 w-4 text-success" />
                                  ) : (
                                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span className={`text-xs flex-1 ${
                                  task.completed ? 'text-foreground font-medium' : 'text-muted-foreground'
                                }`}>
                                  {task.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Cards - Show until midnight */}
            {(() => {
              const sessionDate = todaySession.session_date;
              const currentDateTime = new Date();
              const sessionDateTime = new Date(sessionDate + 'T23:59:59');
              const canUploadTasks = currentDateTime <= sessionDateTime;
              
              return canUploadTasks && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3">
                  {!todaySession.punch_out_time && (
                    <Card className="col-span-full bg-info/10 border-info/20">
                      <CardHeader className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-info" />
                          <CardDescription className="text-xs sm:text-sm text-info-foreground">
                            {t('dashboard.canCompleteTasks')}
                          </CardDescription>
                        </div>
                      </CardHeader>
                    </Card>
                  )}
                {/* Punch In */}
                {!todaySession.punch_in_time && (
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/punch')}>
                    <CardHeader className="p-2 sm:p-4">
                      <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                      <CardTitle className="text-xs sm:text-base">{t('dashboard.punchIn')}</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.recordArrival')}</CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {/* Stall Confirmations */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/stalls')}>
                  <CardHeader className="p-2 sm:p-4">
                    <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.stalls')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">
                      {stallsCount} {t('dashboard.added')}
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Outside Market Rates */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=outside_rates')}>
                  <CardHeader className="p-2 sm:p-4">
                    <Upload className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.outsideRates')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.uploadMedia')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Rate Board Photo */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=rate_board')}>
                  <CardHeader className="p-2 sm:p-4">
                    <ImageIcon className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.rateBoard')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.photoUpload')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Market Video */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=market_video')}>
                  <CardHeader className="p-2 sm:p-4">
                    <Video className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.marketVideo')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.panVideo')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Cleaning Video */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=cleaning_video')}>
                  <CardHeader className="p-2 sm:p-4">
                    <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.cleaning')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.videoUpload')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Customer Feedback */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/media-upload?type=customer_feedback')}>
                  <CardHeader className="p-2 sm:p-4">
                    <MessageSquare className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.feedback')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.customerVideo')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Today's Offers */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setOffersDialog(true)}>
                  <CardHeader className="p-2 sm:p-4">
                    <FileText className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.todaysOffers')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.addPricing')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Non-Available Commodities */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCommoditiesDialog(true)}>
                  <CardHeader className="p-2 sm:p-4">
                    <AlertCircle className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.nonAvailableShort')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.reportItems')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Organiser Feedback */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFeedbackDialog(true)}>
                  <CardHeader className="p-2 sm:p-4">
                    <MessageSquare className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.myFeedback')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.shareThoughts')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Stall Inspection */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setInspectionDialog(true)}>
                  <CardHeader className="p-2 sm:p-4">
                    <ClipboardCheck className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.inspection')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.stallCheck')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Next Day Planning */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setPlanningDialog(true)}>
                  <CardHeader className="p-2 sm:p-4">
                    <Calendar className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.planning')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.nextDay')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Collection Sheet */}
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleOpenCollectionSheet}>
                  <CardHeader className="p-2 sm:p-4">
                    <ExternalLink className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                    <CardTitle className="text-xs sm:text-base">{t('dashboard.collections')}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.recordDaily')}</CardDescription>
                  </CardHeader>
                </Card>

                {/* Punch Out - Show at bottom after punch in */}
                {todaySession.punch_in_time && !todaySession.punch_out_time && (
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={async () => {
                      if (!todaySession) return;
                      
                      // Get GPS location
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const { latitude, longitude } = position.coords;
                          
                          try {
                            // Update session with punch out time only
                            const { error: sessionError } = await supabase
                              .from('sessions')
                              .update({ 
                                punch_out_time: new Date().toISOString()
                              })
                              .eq('id', todaySession.id);

                            if (sessionError) throw sessionError;

                            toast.success(t('dashboard.punchedOutSuccess'));
                            
                            // Refresh the session data
                            refetch();
                          } catch (error: any) {
                            console.error('Punch out error:', error);
                            toast.error(t('dashboard.failedPunchOut') + ': ' + error.message);
                          }
                        },
                        (error) => {
                          toast.error(t('dashboard.failedGPS'));
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                  >
                    <CardHeader className="p-2 sm:p-4">
                      <LogOut className="h-5 w-5 sm:h-7 sm:w-7 text-accent mb-0.5 sm:mb-1" />
                      <CardTitle className="text-xs sm:text-base">{t('dashboard.punchOut')}</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs">{t('dashboard.recordDeparture')}</CardDescription>
                    </CardHeader>
                  </Card>
                )}
                </div>
              );
            })()}
            
            {/* Message when tasks are locked after midnight */}
            {(() => {
              const sessionDate = todaySession.session_date;
              const currentDateTime = new Date();
              const sessionDateTime = new Date(sessionDate + 'T23:59:59');
              const isExpired = currentDateTime > sessionDateTime;
              
              return isExpired && todaySession.computed_status === 'incomplete_expired' && (
                <Card className="bg-destructive/10 border-destructive/20">
                  <CardHeader className="p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <div>
                        <CardTitle className="text-sm sm:text-base text-destructive">{t('dashboard.sessionExpired')}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm text-destructive/80 mt-1">
                          {t('dashboard.sessionExpiredDesc')}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })()}

            {/* Session Summary - Show after completion */}
            {(todaySession.status === 'completed' || todaySession.status === 'finalized') && sessionSummary && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <CardTitle>{t('dashboard.sessionSummary')}</CardTitle>
                  </div>
                  <CardDescription>{t('dashboard.sessionCompletedFinalized')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div 
                      className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleViewDetails('stalls')}
                    >
                      <p className="text-sm text-muted-foreground">{t('dashboard.stallsConfirmed')}</p>
                      <p className="text-2xl font-bold">{sessionSummary.stalls_count}</p>
                    </div>
                    <div 
                      className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleViewDetails('media')}
                    >
                      <p className="text-sm text-muted-foreground">{t('dashboard.mediaUploaded')}</p>
                      <p className="text-2xl font-bold">{sessionSummary.media_count}</p>
                    </div>
                    <div 
                      className="p-4 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => handleViewDetails('late')}
                    >
                      <p className="text-sm text-muted-foreground">{t('dashboard.lateUploads')}</p>
                      <p className="text-2xl font-bold text-warning">{sessionSummary.late_uploads_count}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">{t('dashboard.finalizedAt')}</p>
                      <p className="text-sm font-semibold">
                        {new Date(sessionSummary.finalized_at).toLocaleTimeString('en-IN', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata'
                        })} IST
                      </p>
                    </div>
                  </div>
                  {sessionSummary.first_activity_at && sessionSummary.last_activity_at && (
                    <div className="mt-4 p-3 bg-info/10 rounded-lg">
                      <p className="text-sm">
                        <strong>{t('dashboard.activityPeriod')}:</strong> {new Date(sessionSummary.first_activity_at).toLocaleTimeString('en-IN')} - {new Date(sessionSummary.last_activity_at).toLocaleTimeString('en-IN')} IST
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {todaySession.status === 'active' && (
              <Card className="border-info">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-info" />
                    <CardTitle>{t('dashboard.instructions')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{t('dashboard.instruction1')}</p>
                  <p>{t('dashboard.instruction2')}</p>
                  <p>{t('dashboard.instruction3')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Today's Offers Dialog */}
      <Dialog open={offersDialog} onOpenChange={setOffersDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.todaysOffers')}</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <TodaysOffersForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  refetch();
                  setOffersDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Non-Available Commodities Dialog */}
      <Dialog open={commoditiesDialog} onOpenChange={setCommoditiesDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.nonAvailable')}</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <NonAvailableCommoditiesForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  refetch();
                  setCommoditiesDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Organiser Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.organiserFeedbackDifficulties')}</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <OrganiserFeedbackForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  refetch();
                  setFeedbackDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Stall Inspection Dialog */}
      <Dialog open={inspectionDialog} onOpenChange={setInspectionDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.stallInspection')}</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <StallInspectionForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  refetch();
                  setInspectionDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Next Day Planning Dialog */}
      <Dialog open={planningDialog} onOpenChange={setPlanningDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.nextDayMarketPlanning')}</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {/* Render form when session exists OR on Monday (no session) */}
            {(todaySession || (() => {
              const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
              return ist.getDay() === 1;
            })()) && (
              <NextDayPlanningForm
                sessionId={todaySession?.id || null}
                marketDate={todaySession?.session_date || getISTDateString(new Date())}
                userId={user!.id}
                onSuccess={() => {
                  if (todaySession) refetch();
                  setPlanningDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.requestLeave')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="leave-date">{t('dashboard.leaveDate')}</label>
              <input
                id="leave-date"
                type="date"
                className="border rounded-md px-3 py-2 w-full bg-background"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="leave-reason">{t('dashboard.reason')}</label>
              <textarea
                id="leave-reason"
                className="border rounded-md px-3 py-2 w-full bg-background min-h-[100px]"
                placeholder={t('dashboard.describeReason')}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('dashboard.leaveApprovalNote')}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLeaveDialog(false)} disabled={submittingLeave}>{t('common.cancel')}</Button>
            <Button
              onClick={async () => {
                if (!leaveDate || !leaveReason.trim() || !user) {
                  toast.error(t('dashboard.selectDateAndReason'));
                  return;
                }
                setSubmittingLeave(true);
                try {
                  const { error } = await (supabase as any)
                    .from('employee_leaves')
                    .insert({ user_id: user.id, leave_date: leaveDate, reason: leaveReason.trim(), status: 'pending' });
                  if (error) throw error;
                  toast.success(t('dashboard.leaveRequestSubmitted'));
                  setLeaveDialog(false);
                  setLeaveDate('');
                  setLeaveReason('');
                } catch (err) {
                  console.error('Error submitting leave:', err);
                  toast.error(t('dashboard.failedSubmitLeave'));
                } finally {
                  setSubmittingLeave(false);
                }
              }}
              disabled={submittingLeave}
            >
              {submittingLeave ? t('common.submitting') : t('dashboard.applyForApproval')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stall Inspection Dialog */}
      <Dialog open={inspectionDialog} onOpenChange={setInspectionDialog}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t('dashboard.stallInspection')}</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            {todaySession && (
              <StallInspectionForm
                sessionId={todaySession.id}
                marketId={todaySession.market_id}
                marketDate={todaySession.session_date}
                userId={user!.id}
                onSuccess={() => {
                  refetch();
                  setInspectionDialog(false);
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Market Location Visit Dialog */}
      <Dialog open={locationVisitDialog} onOpenChange={setLocationVisitDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('dashboard.marketLocationVisit')}</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
            <MarketLocationVisitForm />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Reimbursement Request Dialog/Sheet */}
      {isMobile ? (
        <Sheet open={reimbursementDialog} onOpenChange={setReimbursementDialog}>
          <SheetContent side="bottom" className="h-[100vh] overflow-y-auto p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-base">{t('dashboard.reimbursementRequest')}</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <Suspense fallback={<div className="py-8 text-center text-sm text-muted-foreground">Loading form...</div>}>
                <ReimbursementForm />
              </Suspense>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={reimbursementDialog} onOpenChange={setReimbursementDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('dashboard.reimbursementRequest')}</DialogTitle>
            </DialogHeader>
            <Suspense fallback={<div className="p-6 text-center text-muted-foreground">Loading form...</div>}>
              <ReimbursementForm />
            </Suspense>
          </DialogContent>
        </Dialog>
      )}

      {/* View Details Dialog */}
      <Dialog open={viewDialog !== null} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewDialog === 'stalls' && t('dashboard.stallConfirmations')}
              {viewDialog === 'media' && t('dashboard.mediaUploads')}
              {viewDialog === 'late' && t('dashboard.lateUploads')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {viewDialog === 'stalls' && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold">{t('dashboard.stallNo')}</th>
                      <th className="text-left p-3 text-sm font-semibold">{t('dashboard.stallName')}</th>
                      <th className="text-left p-3 text-sm font-semibold">{t('dashboard.farmerName')}</th>
                      <th className="text-left p-3 text-sm font-semibold">{t('dashboard.time')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dialogData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center p-6 text-muted-foreground">
                          {t('dashboard.noStallConfirmations')}
                        </td>
                      </tr>
                    ) : (
                      dialogData.map((stall: any) => (
                        <tr key={stall.id} className="border-t">
                          <td className="p-3">{stall.stall_no}</td>
                          <td className="p-3">{stall.stall_name}</td>
                          <td className="p-3">{stall.farmer_name}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {new Date(stall.created_at).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {(viewDialog === 'media' || viewDialog === 'late') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dialogData.length === 0 ? (
                  <div className="col-span-full text-center p-6 text-muted-foreground">
                    {t('dashboard.noMediaUploads')}
                  </div>
                ) : (
                  dialogData.map((media: any) => (
                    <Card key={media.id}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          {media.media_type === 'image' ? (
                            <img 
                              src={media.file_url} 
                              alt={media.file_name}
                              className="w-full h-40 object-cover rounded"
                            />
                          ) : (
                            <video 
                              src={media.file_url}
                              className="w-full h-40 object-cover rounded"
                              controls
                            />
                          )}
                          <div className="text-sm">
                            <p className="font-medium truncate">{media.file_name}</p>
                            <p className="text-muted-foreground">
                              {new Date(media.captured_at).toLocaleString('en-IN')}
                            </p>
                            {media.is_late && (
                              <Badge className="mt-1 bg-warning text-warning-foreground">Late Upload</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <MobileBottomNav />
      <div className="h-16 md:hidden" /> {/* Spacer for bottom nav */}
    </div>
  );
}
