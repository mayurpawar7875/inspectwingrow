import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Users, Upload, ArrowLeft, IndianRupee, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { format } from 'date-fns';
import EmployeeLocationMiniMap from '@/components/admin/EmployeeLocationMiniMap';

interface EmployeeInfo {
  id: string;
  name: string;
  initials: string;
  status: 'active' | 'completed' | 'half_day';
  punch_in_time: string | null;
  punch_out_time: string | null;
  punch_in_lat: number | null;
  punch_in_lng: number | null;
  duration: number | null;
  completed_tasks: number;
  total_tasks: number;
}

interface CollectionAmounts {
  expected: number;
  received: number;
  pending: number;
}

interface LiveMarket {
  market_id: string;
  market_name: string;
  city: string | null;
  active_sessions: number;
  active_employees: number;
  employee_names: string[];
  employees: EmployeeInfo[];
  stall_confirmations_count: number;
  media_uploads_count: number;
  last_upload_time: string | null;
  last_punch_in: string | null;
  collection_amounts: CollectionAmounts;
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

    const collectionsChannel = supabase
      .channel('live-markets-collections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, fetchLiveMarkets)
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
      supabase.removeChannel(collectionsChannel);
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

  const fetchEmployeeDetails = async (marketId: string, todayDate: string): Promise<EmployeeInfo[]> => {
    try {
      // Fetch sessions with attendance for this market today
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id, user_id, punch_in_time, punch_out_time, status')
        .eq('market_id', marketId)
        .eq('session_date', todayDate)
        .not('punch_in_time', 'is', null);

      if (!sessionsData || sessionsData.length === 0) return [];

      const userIds = [...new Set(sessionsData.map(s => s.user_id))];
      
      // Fetch employee names
      const { data: employeesData } = await supabase
        .from('employees')
        .select('id, full_name')
        .in('id', userIds);

      const employeeMap = new Map(employeesData?.map(e => [e.id, e.full_name]) || []);

      // Fetch attendance records with GPS data
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('user_id, punch_in_lat, punch_in_lng, completed_tasks, total_tasks')
        .eq('attendance_date', todayDate)
        .in('user_id', userIds);

      const attendanceMap = new Map(attendanceData?.map(a => [a.user_id, a]) || []);

      // Build employee info array
      const employees: EmployeeInfo[] = sessionsData.map(session => {
        const name = employeeMap.get(session.user_id) || 'Unknown';
        const attendance = attendanceMap.get(session.user_id);
        
        let duration: number | null = null;
        if (session.punch_in_time && session.punch_out_time) {
          const start = new Date(session.punch_in_time);
          const end = new Date(session.punch_out_time);
          duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // in minutes
        }

        let status: 'active' | 'completed' | 'half_day' = 'active';
        if (session.status === 'finalized' || session.status === 'completed') {
          status = 'completed';
        } else if (session.punch_out_time && !session.punch_in_time) {
          status = 'half_day';
        }

        const initials = name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return {
          id: session.user_id,
          name,
          initials,
          status,
          punch_in_time: session.punch_in_time,
          punch_out_time: session.punch_out_time,
          punch_in_lat: attendance?.punch_in_lat || null,
          punch_in_lng: attendance?.punch_in_lng || null,
          duration,
          completed_tasks: attendance?.completed_tasks || 0,
          total_tasks: attendance?.total_tasks || 13,
        };
      });

      // Remove duplicates (same user can have multiple sessions)
      const uniqueEmployees = Array.from(
        new Map(employees.map(e => [e.id, e])).values()
      );

      return uniqueEmployees;
    } catch (error) {
      console.error('Error fetching employee details:', error);
      return [];
    }
  };

  const fetchCollectionAmounts = async (marketId: string, todayDate: string): Promise<CollectionAmounts> => {
    try {
      // Expected from stall confirmations
      const { data: confirmations } = await supabase
        .from('stall_confirmations')
        .select('rent_amount')
        .eq('market_id', marketId)
        .eq('market_date', todayDate);

      const expected = confirmations?.reduce((sum, c) => sum + (c.rent_amount || 0), 0) || 0;

      // Received from collections
      const { data: collections } = await supabase
        .from('collections')
        .select('amount')
        .eq('market_id', marketId)
        .eq('collection_date', todayDate);

      const received = collections?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      return {
        expected,
        received,
        pending: expected - received,
      };
    } catch (error) {
      console.error('Error fetching collection amounts:', error);
      return { expected: 0, received: 0, pending: 0 };
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
            const [taskStats, employees, collectionAmounts] = await Promise.all([
              fetchTaskStats(market.market_id, todayDate),
              fetchEmployeeDetails(market.market_id, todayDate),
              fetchCollectionAmounts(market.market_id, todayDate),
            ]);
            
            const employeeNames = employees.map(e => e.name);
            
            return { 
              ...market, 
              task_stats: taskStats, 
              employee_names: employeeNames,
              employees,
              collection_amounts: collectionAmounts,
            };
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
            employees: [],
            stall_confirmations_count: 0,
            media_uploads_count: 0,
            last_upload_time: null,
            last_punch_in: null,
            collection_amounts: { expected: 0, received: 0, pending: 0 },
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
                employees: [],
                stall_confirmations_count: 0,
                media_uploads_count: 0,
                last_upload_time: null,
                last_punch_in: null,
                collection_amounts: { expected: 0, received: 0, pending: 0 },
              });
            }
          });
        }

        const fallbackMarkets = Array.from(map.values());
        const marketsWithStats = await Promise.all(
          fallbackMarkets.map(async (market) => {
            const [taskStats, employees, collectionAmounts] = await Promise.all([
              fetchTaskStats(market.market_id, todayDate),
              fetchEmployeeDetails(market.market_id, todayDate),
              fetchCollectionAmounts(market.market_id, todayDate),
            ]);
            
            const employeeNames = employees.map(e => e.name);
            
            return { 
              ...market, 
              task_stats: taskStats, 
              employee_names: employeeNames,
              employees,
              collection_amounts: collectionAmounts,
            };
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
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Live Markets Today</h1>
            <p className="text-muted-foreground mt-1 text-sm">Real-time view of active markets</p>
          </div>
          <Badge variant="outline" className="text-xs px-2 py-0.5">{markets.length} Active</Badge>
        </div>
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
            <Card key={market.market_id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="grid md:grid-cols-[40%_60%] gap-2 md:gap-3 p-3">
                {/* Left Column: Market Info + Employee Locations */}
                <div className="space-y-3">
                  {/* Mobile: Side-by-side layout for Market Info and Map */}
                  <div className="grid grid-cols-[55%_45%] gap-2 md:grid-cols-1 md:gap-0">
                    {/* Market Info */}
                    <div className="space-y-2">
                      <div>
                        <div 
                          className="flex items-center justify-between cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/admin/market/${market.market_id}`)}
                        >
                          <h3 className="text-base font-semibold leading-tight">{market.market_name}</h3>
                          <Badge variant="default" className="ml-2 text-[10px] px-1.5 py-0 h-5 hidden md:flex">{market.active_sessions} active</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {market.city || 'N/A'}
                        </p>
                        <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0 h-5 md:hidden">{market.active_sessions} active</Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>Employees ({market.employees.length})</span>
                        </div>
                        {market.employees.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground italic">No active employees</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {market.employees.map((employee) => (
                              <HoverCard key={employee.id}>
                                <HoverCardTrigger asChild>
                                  <div 
                                    className="flex items-center gap-1.5 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md bg-muted hover:bg-muted/80 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/admin/employee/${employee.id}/markets`)}
                                  >
                                    <span className={`h-1.5 w-1.5 md:h-2 md:w-2 rounded-full shrink-0 ${
                                      employee.status === 'active' ? 'bg-green-500' :
                                      employee.status === 'half_day' ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`} />
                                    <span className="text-[10px] md:text-xs font-medium truncate max-w-[60px] md:max-w-[120px] underline">{employee.name}</span>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold">{employee.name}</h4>
                                      <Badge variant={
                                        employee.status === 'completed' ? 'default' :
                                        employee.status === 'half_day' ? 'secondary' :
                                        'outline'
                                      }>
                                        {employee.status === 'completed' ? '🟢 Completed' :
                                         employee.status === 'half_day' ? '🟡 Incomplete' :
                                         '🔴 Active'}
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-1.5 text-sm">
                                      {employee.punch_in_time && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">Punch In:</span>
                                          <span className="font-medium">
                                            {format(new Date(employee.punch_in_time), 'hh:mm a')}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {employee.punch_out_time && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span className="text-muted-foreground">Punch Out:</span>
                                          <span className="font-medium">
                                            {format(new Date(employee.punch_out_time), 'hh:mm a')}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {employee.duration && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Duration:</span>
                                          <span className="font-medium">
                                            {Math.floor(employee.duration / 60)}h {employee.duration % 60}m
                                          </span>
                                        </div>
                                      )}
                                      
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Task Progress:</span>
                                        <span className="font-medium">
                                          {employee.completed_tasks}/{employee.total_tasks}
                                        </span>
                                        {employee.total_tasks > 0 && (
                                          <span className="text-xs text-muted-foreground">
                                            ({Math.round((employee.completed_tasks / employee.total_tasks) * 100)}%)
                                          </span>
                                        )}
                                      </div>

                                      {employee.punch_in_lat && employee.punch_in_lng && (
                                        <a
                                          href={`https://www.google.com/maps/dir/?api=1&destination=${employee.punch_in_lat},${employee.punch_in_lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-primary hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Navigation className="h-3 w-3" />
                                          <span>Navigate to Location</span>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-1 border-t">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Last upload: {formatTime(market.last_upload_time)}</span>
                        </div>
                      </div>

                      {/* Collection Amounts */}
                      <div className="pt-2 border-t space-y-2">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <IndianRupee className="h-3 w-3" />
                          <span>Collections</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="rounded-md bg-muted px-2 py-1">
                            <div className="text-[9px] text-muted-foreground leading-tight">Expected</div>
                            <div className="text-[11px] font-semibold leading-tight">
                              ₹{(market.collection_amounts?.expected ?? 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="rounded-md bg-green-500/10 px-2 py-1">
                            <div className="text-[9px] text-green-600 leading-tight">Received</div>
                            <div className="text-[11px] font-semibold text-green-600 leading-tight">
                              ₹{(market.collection_amounts?.received ?? 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="rounded-md bg-orange-500/10 px-2 py-1">
                            <div className="text-[9px] text-orange-600 leading-tight">Pending</div>
                            <div className="text-[11px] font-semibold text-orange-600 leading-tight">
                              ₹{(market.collection_amounts?.pending ?? 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employee Locations Map - Beside on mobile, below on desktop */}
                    <div className="md:hidden">
                      <h4 className="text-[10px] font-semibold mb-1 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        Locations
                      </h4>
                      <EmployeeLocationMiniMap 
                        employees={market.employees
                          .filter(e => e.punch_in_lat && e.punch_in_lng)
                          .map(e => ({
                            id: e.id,
                            name: e.name,
                            initials: e.initials,
                            lat: e.punch_in_lat!,
                            lng: e.punch_in_lng!,
                          }))}
                        className="h-[120px]"
                      />
                    </div>
                  </div>

                  {/* Desktop: Map below market info */}
                  <div className="pt-2 border-t hidden md:block">
                    <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Employee Locations
                    </h4>
                    <EmployeeLocationMiniMap 
                      employees={market.employees
                        .filter(e => e.punch_in_lat && e.punch_in_lng)
                        .map(e => ({
                          id: e.id,
                          name: e.name,
                          initials: e.initials,
                          lat: e.punch_in_lat!,
                          lng: e.punch_in_lng!,
                        }))}
                      className="h-[140px]"
                    />
                  </div>
                </div>

                {/* Right Column: Task Status */}
                <div className="md:border-l md:pl-3 space-y-1.5 border-t pt-2 md:border-t-0 md:pt-0">
                  <h4 className="text-xs font-semibold">Task Status</h4>
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
