import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LogOut, CheckCircle2, History, CalendarCheck, MapPin, Umbrella, Wallet, Package, Trash2, UserCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { SessionSelector } from '@/components/market-manager/SessionSelector';
import { EmployeeAllocationForm } from '@/components/market-manager/EmployeeAllocationForm';
import { PunchInForm } from '@/components/market-manager/PunchInForm';
import { LandSearchForm } from '@/components/market-manager/LandSearchForm';
import { StallSearchForm } from '@/components/market-manager/StallSearchForm';
import { MoneyRecoveryForm } from '@/components/market-manager/MoneyRecoveryForm';
import { AssetsUsageForm } from '@/components/market-manager/AssetsUsageForm';
import { StallFeedbackForm } from '@/components/market-manager/StallFeedbackForm';
import { InspectionUpdateForm } from '@/components/market-manager/InspectionUpdateForm';
import { PunchOutForm } from '@/components/market-manager/PunchOutForm';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import LiveMarketsSection from '@/components/LiveMarketsSection';

const MarketLocationVisitForm = lazy(() => import('@/components/MarketLocationVisitForm'));
import { BMSAdvanceRequestTab } from '@/components/bms/BMSAdvanceRequestTab';
import { BMSAssetRequestTab } from '@/components/bms/BMSAssetRequestTab';

const TASK_KEYS = [
  { id: 1, key: 'mm.employeeAllocation', completed: false },
  { id: 2, key: 'mm.punchIn', completed: false },
  { id: 3, key: 'mm.landSearch', completed: false },
  { id: 4, key: 'mm.stallSearch', completed: false },
  { id: 5, key: 'mm.moneyRecovery', completed: false },
  { id: 6, key: 'mm.assetsUsage', completed: false },
  { id: 7, key: 'mm.stallFeedbacks', completed: false },
  { id: 8, key: 'mm.inspectionUpdate', completed: false },
  { id: 9, key: 'mm.punchOut', completed: false },
];

export default function MarketManagerDashboard() {
  const { user, signOut, currentRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<number, number>>({});
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [locationVisitDialog, setLocationVisitDialog] = useState(false);
  const [advanceDialog, setAdvanceDialog] = useState(false);
  const [assetRequestDialog, setAssetRequestDialog] = useState(false);
  const [organiserSessions, setOrganiserSessions] = useState<Array<{ id: string; market_id: string; market: { id: string; name: string; location: string } | null }>>([]);

  const getISTDateString = () => {
    const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchOrganiserSessions = async () => {
    if (!user) return;
    const today = getISTDateString();
    const { data } = await supabase
      .from('sessions')
      .select('id, market_id, market:markets(id, name, location)')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .order('created_at', { ascending: true });
    setOrganiserSessions((data || []) as any);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchOrganiserSessions();
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading) return;

    if (currentRole !== 'market_manager') {
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'bdo') {
        navigate('/bdo-dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      // Check for active session when component mounts
      checkActiveSession();
    }
  }, [currentRole, navigate, authLoading, user]);

  const checkActiveSession = async () => {
    if (!user) return;

    // Get today's date in IST
    const getISTDateString = () => {
      const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const y = ist.getFullYear();
      const m = String(ist.getMonth() + 1).padStart(2, '0');
      const d = String(ist.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const todayIST = getISTDateString();

    // First, auto-complete any old active sessions from previous days
    await supabase
      .from('market_manager_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'active')
      .lt('session_date', todayIST);

    // Now check for today's active session only
    const { data } = await supabase
      .from('market_manager_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('session_date', todayIST)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setSessionId(data.id);
      await fetchTaskCounts(data.id);
    }
  };

  const fetchTaskCounts = async (sessionId: string) => {
    const counts: Record<number, number> = {};
    
    const queries = await Promise.all([
      supabase.from('employee_allocations').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('market_manager_punchin').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('market_land_search').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('stall_searching_updates').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('assets_money_recovery').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('assets_usage').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('bms_stall_feedbacks').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('market_inspection_updates').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
      supabase.from('market_manager_punchout').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
    ]);

    queries.forEach((result, index) => {
      counts[index + 1] = result.count || 0;
    });

    setTaskCounts(counts);
  };

  const handleSessionCreate = async (sessionDate: string, dayOfWeek: number) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('market_manager_sessions')
      .insert({
        user_id: user.id,
        session_date: sessionDate,
        day_of_week: dayOfWeek,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create session');
      return;
    }

    setSessionId(data.id);
    await fetchTaskCounts(data.id);
    toast.success('Session started');
  };

  useEffect(() => {
    if (sessionId) {
      fetchTaskCounts(sessionId);

      const channel = supabase
        .channel('task-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_allocations', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchin', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_land_search', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_searching_updates', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assets_money_recovery', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assets_usage', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bms_stall_feedbacks', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_inspection_updates', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchout', filter: `session_id=eq.${sessionId}` }, () => fetchTaskCounts(sessionId))
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sessionId]);


  const handleTaskComplete = (taskId: number) => {
    if (!completedTasks.includes(taskId)) {
      setCompletedTasks([...completedTasks, taskId]);
    }
    setOpenDialog(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const renderTaskForm = (taskId: number) => {
    if (!sessionId) return null;

    switch (taskId) {
      case 1:
        return <EmployeeAllocationForm sessionId={sessionId} onComplete={() => handleTaskComplete(1)} />;
      case 2:
        return <PunchInForm sessionId={sessionId} onComplete={() => handleTaskComplete(2)} />;
      case 3:
        return <LandSearchForm sessionId={sessionId} onComplete={() => handleTaskComplete(3)} />;
      case 4:
        return <StallSearchForm sessionId={sessionId} onComplete={() => handleTaskComplete(4)} />;
      case 5:
        return <MoneyRecoveryForm sessionId={sessionId} onComplete={() => handleTaskComplete(5)} />;
      case 6:
        return <AssetsUsageForm sessionId={sessionId} onComplete={() => handleTaskComplete(6)} />;
      case 7:
        return <StallFeedbackForm sessionId={sessionId} onComplete={() => handleTaskComplete(7)} />;
      case 8:
        return <InspectionUpdateForm sessionId={sessionId} onComplete={() => handleTaskComplete(8)} />;
      case 9:
        return <PunchOutForm sessionId={sessionId} onComplete={() => handleTaskComplete(9)} />;
      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 py-3 md:px-4 md:py-4">
          <div className="flex justify-between items-center">
            <div className="min-w-0">
              <h1 className="text-base md:text-2xl font-bold truncate">Market Manager</h1>
              <p className="text-[10px] md:text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={async () => {
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
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <LanguageSwitcher variant="ghost" />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/my-profile')} aria-label="My Profile">
                <UserCircle className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 md:hidden" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('common.signOut')}
              </Button>
            </div>
          </div>
          {/* Action buttons - desktop only in header */}
          <div className="hidden md:flex gap-2 mt-2">
            <Button variant="outline" size="sm" className="text-sm h-9 px-3" onClick={() => setLeaveDialog(true)}>
              <Umbrella className="h-4 w-4 mr-2" />
              {t('dashboard.requestLeave')}
            </Button>
            <Button variant="outline" size="sm" className="text-sm h-9 px-3" onClick={() => setAssetRequestDialog(true)}>
              <Package className="h-4 w-4 mr-2" />
              Assets
            </Button>
            <Button variant="outline" size="sm" className="text-sm h-9 px-3" onClick={() => setAdvanceDialog(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              Advance
            </Button>
            <Button variant="outline" size="sm" className="text-sm h-9 px-3" onClick={() => setLocationVisitDialog(true)}>
              <MapPin className="h-4 w-4 mr-2" />
              {t('dashboard.locationVisit')}
            </Button>
            <Button variant="outline" size="sm" className="text-sm h-9 px-3" onClick={() => navigate('/my-attendance')}>
              <CalendarCheck className="h-4 w-4 mr-2" />
              {t('dashboard.attendance')}
            </Button>
            <Button variant="outline" size="sm" className="text-sm h-9 px-3" onClick={() => navigate('/my-manager-sessions')}>
              <History className="h-4 w-4 mr-2" />
              {t('dashboard.mySessions')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-4 md:px-4 md:py-8">
        <Tabs defaultValue="my-tasks">
          <TabsList className="mb-3 md:mb-4 w-full grid grid-cols-3">
            <TabsTrigger value="my-tasks" className="text-xs md:text-sm">{t('mm.tasks')}</TabsTrigger>
            <TabsTrigger value="organiser" className="text-xs md:text-sm">Organiser</TabsTrigger>
            <TabsTrigger value="live-markets" className="text-xs md:text-sm">Live Markets</TabsTrigger>
          </TabsList>

          <TabsContent value="my-tasks">
            {!sessionId ? (
              <SessionSelector onSessionCreate={handleSessionCreate} />
            ) : (
              <div className="space-y-1.5 md:space-y-2">
                <h2 className="text-sm md:text-lg font-semibold mb-2 md:mb-4">{t('mm.tasks')}</h2>
                {TASK_KEYS.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setOpenDialog(task.id)}
                    className={`w-full text-left p-2.5 md:p-3 rounded-lg border transition-colors ${
                      completedTasks.includes(task.id)
                        ? 'bg-muted border-muted'
                        : 'bg-card border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="text-xs md:text-sm font-medium">{t(task.key)}</span>
                        {taskCounts[task.id] > 0 && (
                          <span className="text-[10px] md:text-xs bg-primary text-primary-foreground px-1.5 md:px-2 py-0.5 rounded-full">
                            {taskCounts[task.id]}
                          </span>
                        )}
                      </div>
                      {completedTasks.includes(task.id) && (
                        <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-500" />
                      )}
                    </div>
                  </button>
                ))}

                <Dialog open={openDialog !== null} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-auto">
                    <DialogHeader>
                      <DialogTitle className="text-sm md:text-lg">{TASK_KEYS.find(tk => tk.id === openDialog) ? t(TASK_KEYS.find(tk => tk.id === openDialog)!.key) : ''}</DialogTitle>
                    </DialogHeader>
                    {openDialog !== null && renderTaskForm(openDialog)}
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </TabsContent>

          <TabsContent value="organiser">
            <Card>
              <CardContent className="pt-4 md:pt-6 space-y-4">
                {organiserSessions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs md:text-sm font-semibold">Active Organiser Sessions</h4>
                    {organiserSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-xs md:text-sm font-medium">{session.market?.name || 'Market'}</p>
                          {session.market?.location && (
                            <p className="text-[10px] md:text-xs text-muted-foreground break-all">{session.market.location}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 text-xs"
                          onClick={() => navigate('/dashboard?as=organiser')}
                        >
                          Continue Session
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {organiserSessions.length === 0 && (
                  <div className="text-center space-y-3 md:space-y-4">
                    <div className="p-2.5 md:p-3 bg-accent/10 rounded-full w-fit mx-auto">
                      <MapPin className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-lg font-semibold">
                        Start Organiser Session
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        Select a market and complete organiser tasks like stall confirmations, media uploads, and more.
                      </p>
                    </div>
                    <Button onClick={() => navigate('/market-selection?as=organiser')} className="w-full max-w-xs text-xs md:text-sm">
                      Select Market & Start
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="live-markets">
            <LiveMarketsSection />
          </TabsContent>
        </Tabs>
      </main>

      <MobileBottomNav onAction={(action) => {
        if (action === 'leave') setLeaveDialog(true);
        else if (action === 'assets') setAssetRequestDialog(true);
        else if (action === 'advance') setAdvanceDialog(true);
        else if (action === 'location') setLocationVisitDialog(true);
      }} />
      <div className="h-20 md:hidden" />

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="w-[95vw] md:w-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm md:text-lg">{t('dashboard.requestLeave')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[11px] md:text-sm font-medium" htmlFor="mm-leave-date">{t('dashboard.leaveDate')}</label>
              <input
                id="mm-leave-date"
                type="date"
                className="border rounded-md px-2 py-1.5 w-full bg-background text-xs md:text-sm h-8"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] md:text-sm font-medium" htmlFor="mm-leave-reason">{t('dashboard.reason')}</label>
              <textarea
                id="mm-leave-reason"
                className="border rounded-md px-2 py-1.5 w-full bg-background min-h-[60px] text-xs md:text-sm"
                placeholder={t('dashboard.describeReason')}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">{t('dashboard.leaveApprovalNote')}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setLeaveDialog(false)} disabled={submittingLeave}>{t('common.cancel')}</Button>
            <Button
              size="sm"
              className="h-8 text-xs"
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

      {/* Location Visit Dialog */}
      <Dialog open={locationVisitDialog} onOpenChange={setLocationVisitDialog}>
        <DialogContent className="w-[95vw] md:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm md:text-lg">{t('dashboard.locationVisit')}</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-4 text-center text-muted-foreground text-xs">Loading...</div>}>
            <MarketLocationVisitForm />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Advance Request Dialog */}
      <Dialog open={advanceDialog} onOpenChange={setAdvanceDialog}>
        <DialogContent className="w-[95vw] md:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm md:text-lg">Advance Requests</DialogTitle>
          </DialogHeader>
          <BMSAdvanceRequestTab />
        </DialogContent>
      </Dialog>

      {/* Asset Request Dialog */}
      <Dialog open={assetRequestDialog} onOpenChange={setAssetRequestDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-auto">
          <DialogHeader>
            <DialogTitle className="text-sm md:text-lg">Asset Requests</DialogTitle>
          </DialogHeader>
          <BMSAssetRequestTab />
        </DialogContent>
      </Dialog>
    </div>
  );
}
