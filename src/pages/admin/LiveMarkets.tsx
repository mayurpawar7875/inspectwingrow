import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Users, Upload, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';

interface LiveMarket {
  market_id: string;
  market_name: string;
  city: string | null;
  active_sessions: number;
  active_employees: number;
  employee_names: string[];
  stall_confirmations_count: number;
  media_uploads_count: number;
  last_upload_time: string | null;
  last_punch_in: string | null;
  task_stats?: {
    attendance: number;
    stall_confirmations: number;
    outside_rates: number;
    rate_board: number;
    market_video: number;
    cleaning_video: number;
    customer_feedback: number;
    offers: number;
    commodities: number;
    feedback: number;
    inspections: number;
    planning: number;
    collections: number;
  };
}

export default function LiveMarkets() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<LiveMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveMarkets();
    
    // Subscribe to real-time updates for all task-related tables
    const sessionsChannel = supabase
      .channel('live-markets-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchLiveMarkets)
      .subscribe();

    const stallsChannel = supabase
      .channel('live-markets-stalls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchLiveMarkets)
      .subscribe();

    const mediaChannel = supabase
      .channel('live-markets-media')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchLiveMarkets)
      .subscribe();

    const offersChannel = supabase
      .channel('live-markets-offers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, fetchLiveMarkets)
      .subscribe();

    const commoditiesChannel = supabase
      .channel('live-markets-commodities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'non_available_commodities' }, fetchLiveMarkets)
      .subscribe();

    const feedbackChannel = supabase
      .channel('live-markets-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organiser_feedback' }, fetchLiveMarkets)
      .subscribe();

    const inspectionsChannel = supabase
      .channel('live-markets-inspections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_inspections' }, fetchLiveMarkets)
      .subscribe();

    const planningChannel = supabase
      .channel('live-markets-planning')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'next_day_planning' }, fetchLiveMarkets)
      .subscribe();

    return () => {
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(stallsChannel);
      supabase.removeChannel(mediaChannel);
      supabase.removeChannel(offersChannel);
      supabase.removeChannel(commoditiesChannel);
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(inspectionsChannel);
      supabase.removeChannel(planningChannel);
    };
  }, []);

  const fetchTaskStats = async (marketId: string, todayDate: string) => {
    try {
      // Get session IDs for this market today first
      const { data: marketSessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('market_id', marketId)
        .eq('session_date', todayDate);
      
      const sessionIds = (marketSessions || []).map(s => s.id);
      const safeSessionIds = sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000'];

      // Fetch all counts in parallel for better performance - matching 13 tasks from Employee Dashboard
      const [
        attendanceResult,
        stallsResult,
        outsideRatesResult,
        rateBoardResult,
        marketVideoResult,
        cleaningVideoResult,
        customerFeedbackResult,
        offersResult,
        commoditiesResult,
        feedbackResult,
        inspectionsResult,
        planningResult,
        collectionsResult
      ] = await Promise.all([
        supabase.from('sessions').select('*', { count: 'exact', head: true })
          .eq('market_id', marketId).eq('session_date', todayDate).not('punch_in_time', 'is', null),
        supabase.from('stall_confirmations').select('*', { count: 'exact', head: true })
          .eq('market_id', marketId).eq('market_date', todayDate),
        supabase.from('media').select('*', { count: 'exact', head: true })
          .in('session_id', safeSessionIds).eq('media_type', 'outside_rates' as any),
        supabase.from('media').select('*', { count: 'exact', head: true })
          .in('session_id', safeSessionIds).eq('media_type', 'rate_board' as any),
        supabase.from('media').select('*', { count: 'exact', head: true })
          .in('session_id', safeSessionIds).eq('media_type', 'market_video' as any),
        supabase.from('media').select('*', { count: 'exact', head: true })
          .in('session_id', safeSessionIds).eq('media_type', 'cleaning_video' as any),
        supabase.from('media').select('*', { count: 'exact', head: true })
          .in('session_id', safeSessionIds).eq('media_type', 'customer_feedback' as any),
        supabase.from('offers').select('*', { count: 'exact', head: true })
          .eq('market_id', marketId).eq('market_date', todayDate),
        supabase.from('non_available_commodities').select('*', { count: 'exact', head: true })
          .eq('market_id', marketId).eq('market_date', todayDate),
        supabase.from('organiser_feedback').select('*', { count: 'exact', head: true })
          .eq('market_id', marketId).eq('market_date', todayDate),
        supabase.from('stall_inspections').select('*', { count: 'exact', head: true })
          .eq('market_id', marketId).in('session_id', safeSessionIds),
        supabase.from('next_day_planning').select('*', { count: 'exact', head: true })
          .eq('market_id', marketId).eq('market_date', todayDate),
        supabase.from('collections').select('*', { count: 'exact', head: true })
          .eq('market_id', marketId).eq('collection_date', todayDate)
      ]);

      return {
        attendance: attendanceResult.count || 0,
        stall_confirmations: stallsResult.count || 0,
        outside_rates: outsideRatesResult.count || 0,
        rate_board: rateBoardResult.count || 0,
        market_video: marketVideoResult.count || 0,
        cleaning_video: cleaningVideoResult.count || 0,
        customer_feedback: customerFeedbackResult.count || 0,
        offers: offersResult.count || 0,
        commodities: commoditiesResult.count || 0,
        feedback: feedbackResult.count || 0,
        inspections: inspectionsResult.count || 0,
        planning: planningResult.count || 0,
        collections: collectionsResult.count || 0,
      };
    } catch (error) {
      console.error('Error fetching task stats:', error);
      return {
        attendance: 0,
        stall_confirmations: 0,
        outside_rates: 0,
        rate_board: 0,
        market_video: 0,
        cleaning_video: 0,
        customer_feedback: 0,
        offers: 0,
        commodities: 0,
        feedback: 0,
        inspections: 0,
        planning: 0,
        collections: 0,
      };
    }
  };

  const fetchLiveMarkets = async () => {
    try {
      const istNow = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      const todayDate = istNow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('live_markets_today')
        .select('*');

      if (error) throw error;
      if (data && data.length > 0) {
        const marketsWithStats = await Promise.all(
          (data as any[]).map(async (market) => {
            const taskStats = await fetchTaskStats(market.market_id, todayDate);
            
            // Fetch employee names for this market
            const { data: sessionsData } = await supabase
              .from('sessions')
              .select('user_id')
              .eq('market_id', market.market_id)
              .eq('session_date', todayDate)
              .not('punch_in_time', 'is', null);
            
            const userIds = sessionsData?.map((s: any) => s.user_id).filter(Boolean) || [];
            let employeeNames: string[] = [];
            
            if (userIds.length > 0) {
              const { data: employeesData } = await supabase
                .from('employees')
                .select('full_name')
                .in('id', userIds);
              
              employeeNames = employeesData?.map((e: any) => e.full_name).filter(Boolean) || [];
              console.log('Employee names fetched:', employeeNames);
            }
            
            console.log('Market with names:', { ...market, task_stats: taskStats, employee_names: employeeNames });
            
            return { ...market, task_stats: taskStats, employee_names: employeeNames };
          })
        );
        setMarkets(marketsWithStats);
      } else {
        // Fallback: derive live markets from weekday and schedule if view is empty/unavailable
        const istDateStr = todayDate;
        const dow = istNow.getDay(); // 0=Sun..1=Mon..6=Sat

        // Auto by weekday (excluding Monday handled by DB, but we won't exclude here)
        const byWeekdayPromise: any = (supabase as any)
          .from('markets')
          .select('id, name, city')
          .eq('is_active', true)
          .eq('day_of_week', dow);
        
        const scheduleRowsPromise: any = (supabase as any)
          .from('market_schedule')
          .select('market_id')
          .eq('schedule_date', istDateStr);
        
        const [byWeekday, scheduleRows] = await Promise.all([
          byWeekdayPromise,
          scheduleRowsPromise,
        ]);

        const map = new Map<string, LiveMarket>();

        (byWeekday.data || []).forEach((m: any) => {
          map.set(m.id, {
            market_id: m.id,
            market_name: m.name,
            city: m.city ?? null,
            active_sessions: 0,
            active_employees: 0,
            employee_names: [],
            stall_confirmations_count: 0,
            media_uploads_count: 0,
            last_upload_time: null,
            last_punch_in: null,
          });
        });

        const scheduleIds = (scheduleRows.data || [])
          .map((r: any) => r.market_id)
          .filter(Boolean);

        if (scheduleIds.length > 0) {
          const scheduledMarkets = await supabase
            .from('markets')
            .select('id, name, city')
            .in('id', scheduleIds);

          (scheduledMarkets.data || []).forEach((m: any) => {
            if (!map.has(m.id)) {
              map.set(m.id, {
                market_id: m.id,
                market_name: m.name,
                city: m.city ?? null,
                active_sessions: 0,
                active_employees: 0,
                employee_names: [],
                stall_confirmations_count: 0,
                media_uploads_count: 0,
                last_upload_time: null,
                last_punch_in: null,
              });
            }
          });
        }

        const fallbackMarkets = Array.from(map.values());
        const marketsWithStats = await Promise.all(
          fallbackMarkets.map(async (market) => {
            const taskStats = await fetchTaskStats(market.market_id, todayDate);
            
            // Fetch employee names for this market
            const { data: sessionsData } = await supabase
              .from('sessions')
              .select('user_id')
              .eq('market_id', market.market_id)
              .eq('session_date', todayDate)
              .not('punch_in_time', 'is', null);
            
            const userIds = sessionsData?.map((s: any) => s.user_id).filter(Boolean) || [];
            let employeeNames: string[] = [];
            
            if (userIds.length > 0) {
              const { data: employeesData } = await supabase
                .from('employees')
                .select('full_name')
                .in('id', userIds);
              
              employeeNames = employeesData?.map((e: any) => e.full_name).filter(Boolean) || [];
            }
            
            return { ...market, task_stats: taskStats, employee_names: employeeNames };
          })
        );
        setMarkets(marketsWithStats);
      }
    } catch (error) {
      console.error('Error fetching live markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }) + ' IST';
  };

  const isISTMonday = () => {
    const istNow = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    // getDay(): 0=Sun ... 1=Mon ... 6=Sat
    return istNow.getDay() === 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderTaskChecklist = (market: LiveMarket) => {
    // 13 tasks matching Employee Dashboard exactly
    const tasks = [
      { 
        label: 'Punch In', 
        completed: market.task_stats ? market.task_stats.attendance > 0 : false,
        value: market.task_stats && market.task_stats.attendance > 0 ? `${market.task_stats.attendance} checked in` : null
      },
      { 
        label: 'Stall Confirmations', 
        completed: market.task_stats ? market.task_stats.stall_confirmations > 0 : false,
        value: market.task_stats && market.task_stats.stall_confirmations > 0 ? `${market.task_stats.stall_confirmations} confirmed` : null
      },
      { 
        label: 'Outside Rates', 
        completed: market.task_stats ? market.task_stats.outside_rates > 0 : false,
        value: market.task_stats && market.task_stats.outside_rates > 0 ? `${market.task_stats.outside_rates} uploaded` : null
      },
      { 
        label: 'Rate Board Photo', 
        completed: market.task_stats ? market.task_stats.rate_board > 0 : false,
        value: market.task_stats && market.task_stats.rate_board > 0 ? `${market.task_stats.rate_board} uploaded` : null
      },
      { 
        label: 'Market Video', 
        completed: market.task_stats ? market.task_stats.market_video > 0 : false
      },
      { 
        label: 'Cleaning Video', 
        completed: market.task_stats ? market.task_stats.cleaning_video > 0 : false
      },
      { 
        label: 'Customer Feedback', 
        completed: market.task_stats ? market.task_stats.customer_feedback > 0 : false
      },
      { 
        label: "Today's Offers", 
        completed: market.task_stats ? market.task_stats.offers > 0 : false,
        value: market.task_stats && market.task_stats.offers > 0 ? `${market.task_stats.offers} items` : null
      },
      { 
        label: 'Non-Available Commodities', 
        completed: market.task_stats ? market.task_stats.commodities > 0 : false,
        value: market.task_stats && market.task_stats.commodities > 0 ? `${market.task_stats.commodities} items` : null
      },
      { 
        label: 'Organiser Feedback', 
        completed: market.task_stats ? market.task_stats.feedback > 0 : false
      },
      { 
        label: 'Stall Inspections', 
        completed: market.task_stats ? market.task_stats.inspections > 0 : false,
        value: market.task_stats && market.task_stats.inspections > 0 ? `${market.task_stats.inspections} stalls` : null
      },
      { 
        label: 'Next Day Planning', 
        completed: market.task_stats ? market.task_stats.planning > 0 : false
      },
      { 
        label: 'Collections', 
        completed: market.task_stats ? market.task_stats.collections > 0 : false,
        value: market.task_stats && market.task_stats.collections > 0 ? `${market.task_stats.collections} entries` : null
      },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3">
        {tasks.map((task, index) => (
          <div key={index} className="flex items-center gap-1.5 md:gap-3">
            <Checkbox checked={task.completed} disabled className="pointer-events-none h-3.5 w-3.5 md:h-4 md:w-4" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] md:text-sm font-medium truncate">{task.label}</div>
              {task.value && (
                <div className="text-[8px] md:text-xs text-muted-foreground truncate">{task.value}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/bdo-dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Live Markets Today</h1>
        <p className="text-muted-foreground mt-2">Real-time view of active markets</p>
      </div>

      <div className="space-y-4">
        {markets.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">
                {isISTMonday() ? 'Markets are closed on Mondays' : 'No active markets today'}
              </p>
            </CardContent>
          </Card>
        ) : (
          markets.map((market) => (
            <Card key={market.market_id} className="overflow-hidden">
              <div className="grid md:grid-cols-[1fr,auto] gap-6 p-6">
                {/* Left: Market Info */}
                <div 
                  className="space-y-4 cursor-pointer"
                  onClick={() => navigate(`/admin/market/${market.market_id}`)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-semibold">{market.market_name}</h3>
                      <Badge variant="default" className="ml-2">{market.active_sessions} active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {market.city || 'N/A'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Employees</span>
                      </div>
                      <p className="text-2xl font-bold">{market.active_employees}</p>
                      {market.employee_names && market.employee_names.length > 0 ? (
                        <p className="text-sm text-foreground font-medium mt-1">{market.employee_names.join(', ')}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">No employee data</p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        <span>Uploads</span>
                      </div>
                      <p className="text-2xl font-bold">{market.media_uploads_count}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last upload: {formatTime(market.last_upload_time)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Task Checklist */}
                <div className="md:border-l md:pl-6 md:min-w-[280px]">
                  <h4 className="text-sm font-medium mb-4">Task Status</h4>
                  {renderTaskChecklist(market)}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
