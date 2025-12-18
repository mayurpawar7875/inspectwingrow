import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeStatus {
  id: string;
  name: string;
  initials: string;
  status: 'active' | 'half_day' | 'completed';
  punch_in_time: string | null;
  punch_out_time: string | null;
  duration: number | null;
  completed_tasks: number;
  total_tasks: number;
}

interface LiveMarket {
  market_id: string;
  market_name: string;
  city: string | null;
  active_sessions: number;
  active_employees: number;
  employee_names: string[];
  employees: EmployeeStatus[];
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

interface MarketManagerSession {
  id: string;
  user_id: string;
  manager_name: string;
  session_date: string;
  status: string;
  attendance_status: string | null;
  working_hours: number | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
}

const getISTDate = () => {
  const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return {
    date: istNow.toISOString().split('T')[0],
    dayOfWeek: istNow.getDay()
  };
};

// Batch fetch all task counts for multiple markets at once
const fetchBatchedTaskStats = async (marketIds: string[], todayDate: string) => {
  // Single query to get all sessions for all markets today
  const { data: allSessions } = await supabase
    .from('sessions')
    .select('id, market_id, user_id, punch_in_time, punch_out_time, status')
    .in('market_id', marketIds)
    .eq('session_date', todayDate);

  const sessionsByMarket = new Map<string, any[]>();
  const allSessionIds: string[] = [];
  const allUserIds: string[] = [];

  allSessions?.forEach(s => {
    if (!sessionsByMarket.has(s.market_id)) {
      sessionsByMarket.set(s.market_id, []);
    }
    sessionsByMarket.get(s.market_id)!.push(s);
    allSessionIds.push(s.id);
    if (s.user_id) allUserIds.push(s.user_id);
  });

  const safeSessionIds = allSessionIds.length > 0 ? allSessionIds : ['00000000-0000-0000-0000-000000000000'];

  // Batch all count queries together
  const [
    employeesRes,
    stallsRes,
    mediaRes,
    offersRes,
    commoditiesRes,
    feedbackRes,
    inspectionsRes,
    planningRes,
    collectionsRes
  ] = await Promise.all([
    // Employees lookup
    allUserIds.length > 0 
      ? supabase.from('employees').select('id, full_name').in('id', [...new Set(allUserIds)])
      : Promise.resolve({ data: [] }),
    // Stall confirmations - fetch all at once
    supabase.from('stall_confirmations')
      .select('market_id, created_by')
      .in('market_id', marketIds)
      .eq('market_date', todayDate),
    // Media - fetch all types at once
    supabase.from('media')
      .select('session_id, media_type')
      .in('session_id', safeSessionIds),
    // Offers
    supabase.from('offers')
      .select('market_id, user_id')
      .in('market_id', marketIds)
      .eq('market_date', todayDate),
    // Commodities
    supabase.from('non_available_commodities')
      .select('market_id, user_id')
      .in('market_id', marketIds)
      .eq('market_date', todayDate),
    // Feedback
    supabase.from('organiser_feedback')
      .select('market_id, user_id')
      .in('market_id', marketIds)
      .eq('market_date', todayDate),
    // Inspections
    supabase.from('stall_inspections')
      .select('session_id, market_id')
      .in('market_id', marketIds)
      .in('session_id', safeSessionIds),
    // Planning
    supabase.from('next_day_planning')
      .select('market_id, user_id')
      .in('market_id', marketIds)
      .eq('market_date', todayDate),
    // Collections
    supabase.from('collections')
      .select('market_id, collected_by')
      .in('market_id', marketIds)
      .eq('collection_date', todayDate)
  ]);

  const employeeMap = new Map<string, string>(
    (employeesRes.data || []).map(e => [e.id, e.full_name] as [string, string])
  );
  
  // Group data by market_id
  const stallsByMarket = new Map<string, any[]>();
  stallsRes.data?.forEach(s => {
    if (!stallsByMarket.has(s.market_id)) stallsByMarket.set(s.market_id, []);
    stallsByMarket.get(s.market_id)!.push(s);
  });

  // Group media by session then by market
  const mediaBySession = new Map<string, any[]>();
  mediaRes.data?.forEach(m => {
    if (!mediaBySession.has(m.session_id)) mediaBySession.set(m.session_id, []);
    mediaBySession.get(m.session_id)!.push(m);
  });

  const offersByMarket = new Map<string, any[]>();
  offersRes.data?.forEach(o => {
    if (!offersByMarket.has(o.market_id)) offersByMarket.set(o.market_id, []);
    offersByMarket.get(o.market_id)!.push(o);
  });

  const commoditiesByMarket = new Map<string, any[]>();
  commoditiesRes.data?.forEach(c => {
    if (!commoditiesByMarket.has(c.market_id)) commoditiesByMarket.set(c.market_id, []);
    commoditiesByMarket.get(c.market_id)!.push(c);
  });

  const feedbackByMarket = new Map<string, any[]>();
  feedbackRes.data?.forEach(f => {
    if (!feedbackByMarket.has(f.market_id)) feedbackByMarket.set(f.market_id, []);
    feedbackByMarket.get(f.market_id)!.push(f);
  });

  const inspectionsBySession = new Map<string, any[]>();
  inspectionsRes.data?.forEach(i => {
    if (!inspectionsBySession.has(i.session_id)) inspectionsBySession.set(i.session_id, []);
    inspectionsBySession.get(i.session_id)!.push(i);
  });

  const planningByMarket = new Map<string, any[]>();
  planningRes.data?.forEach(p => {
    if (!planningByMarket.has(p.market_id)) planningByMarket.set(p.market_id, []);
    planningByMarket.get(p.market_id)!.push(p);
  });

  const collectionsByMarket = new Map<string, any[]>();
  collectionsRes.data?.forEach(c => {
    if (!collectionsByMarket.has(c.market_id)) collectionsByMarket.set(c.market_id, []);
    collectionsByMarket.get(c.market_id)!.push(c);
  });

  return {
    sessionsByMarket,
    employeeMap,
    stallsByMarket,
    mediaBySession,
    offersByMarket,
    commoditiesByMarket,
    feedbackByMarket,
    inspectionsBySession,
    planningByMarket,
    collectionsByMarket
  };
};

const fetchLiveMarketsData = async () => {
  const { date: todayDate, dayOfWeek } = getISTDate();

  // Get markets scheduled for today
  const { data: todaysMarkets, error: marketsError } = await supabase
    .from('markets')
    .select('id, name, city, location')
    .eq('is_active', true)
    .eq('day_of_week', dayOfWeek);

  if (marketsError) throw marketsError;
  if (!todaysMarkets || todaysMarkets.length === 0) return [];

  const marketIds = todaysMarkets.map(m => m.id);

  // Batch fetch activity times and task data
  const [mediaActivity, stallActivity, batchedData] = await Promise.all([
    supabase.from('media')
      .select('market_id, captured_at')
      .in('market_id', marketIds)
      .gte('captured_at', `${todayDate}T00:00:00`)
      .order('captured_at', { ascending: false }),
    supabase.from('stall_confirmations')
      .select('market_id, created_at')
      .in('market_id', marketIds)
      .gte('market_date', todayDate)
      .order('created_at', { ascending: false }),
    fetchBatchedTaskStats(marketIds, todayDate)
  ]);

  // Find the latest activity time for each market
  const lastTaskByMarket: Record<string, string> = {};
  mediaActivity.data?.forEach(item => {
    if (!lastTaskByMarket[item.market_id] || item.captured_at > lastTaskByMarket[item.market_id]) {
      lastTaskByMarket[item.market_id] = item.captured_at;
    }
  });
  stallActivity.data?.forEach(item => {
    if (!lastTaskByMarket[item.market_id] || item.created_at > lastTaskByMarket[item.market_id]) {
      lastTaskByMarket[item.market_id] = item.created_at;
    }
  });

  const totalTasksCount = 13;

  // Process each market using batched data
  const marketsWithStats: LiveMarket[] = todaysMarkets.map((market: any) => {
    const sessionsData = batchedData.sessionsByMarket.get(market.id) || [];
    const sessionIds = sessionsData.map(s => s.id);
    const stallsData = batchedData.stallsByMarket.get(market.id) || [];
    const offersData = batchedData.offersByMarket.get(market.id) || [];
    const commoditiesData = batchedData.commoditiesByMarket.get(market.id) || [];
    const feedbackData = batchedData.feedbackByMarket.get(market.id) || [];
    const planningData = batchedData.planningByMarket.get(market.id) || [];
    const collectionsData = batchedData.collectionsByMarket.get(market.id) || [];

    // Get media for this market's sessions
    const marketMedia: any[] = [];
    sessionIds.forEach(sid => {
      const media = batchedData.mediaBySession.get(sid) || [];
      marketMedia.push(...media);
    });

    // Get inspections for this market's sessions
    const marketInspections: any[] = [];
    sessionIds.forEach(sid => {
      const inspections = batchedData.inspectionsBySession.get(sid) || [];
      marketInspections.push(...inspections);
    });

    // Calculate task stats
    const taskStats = {
      attendance: sessionsData.filter(s => s.punch_in_time).length,
      stall_confirmations: stallsData.length,
      outside_rates: marketMedia.filter(m => m.media_type === 'outside_rates').length,
      rate_board: marketMedia.filter(m => m.media_type === 'rate_board').length,
      market_video: marketMedia.filter(m => m.media_type === 'market_video').length,
      cleaning_video: marketMedia.filter(m => m.media_type === 'cleaning_video').length,
      customer_feedback: marketMedia.filter(m => m.media_type === 'customer_feedback').length,
      offers: offersData.length,
      commodities: commoditiesData.length,
      feedback: feedbackData.length,
      inspections: marketInspections.length,
      planning: planningData.length,
      collections: collectionsData.length,
    };

    // Process employees
    const employees: EmployeeStatus[] = sessionsData.map((session: any) => {
      const fullName = (batchedData.employeeMap.get(session.user_id) || 'Unknown') as string;
      const nameParts = fullName.split(' ');
      const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

      // Count completed tasks for this user/session
      let completedTasks = 0;
      if (session.punch_in_time) completedTasks++;
      if (stallsData.some(s => s.created_by === session.user_id)) completedTasks++;
      
      const sessionMedia = batchedData.mediaBySession.get(session.id) || [];
      if (sessionMedia.some(m => m.media_type === 'outside_rates')) completedTasks++;
      if (sessionMedia.some(m => m.media_type === 'rate_board')) completedTasks++;
      if (sessionMedia.some(m => m.media_type === 'market_video')) completedTasks++;
      if (sessionMedia.some(m => m.media_type === 'cleaning_video')) completedTasks++;
      if (sessionMedia.some(m => m.media_type === 'customer_feedback')) completedTasks++;
      if (offersData.some(o => o.user_id === session.user_id)) completedTasks++;
      if (commoditiesData.some(c => c.user_id === session.user_id)) completedTasks++;
      if (feedbackData.some(f => f.user_id === session.user_id)) completedTasks++;
      if ((batchedData.inspectionsBySession.get(session.id) || []).length > 0) completedTasks++;
      if (planningData.some(p => p.user_id === session.user_id)) completedTasks++;
      if (collectionsData.some(c => c.collected_by === session.user_id)) completedTasks++;

      let status: 'active' | 'half_day' | 'completed' = 'active';
      if (completedTasks === totalTasksCount) {
        status = 'completed';
      } else if (completedTasks > 0) {
        status = 'half_day';
      }

      const duration = session.punch_in_time && session.punch_out_time
        ? Math.floor((new Date(session.punch_out_time).getTime() - new Date(session.punch_in_time).getTime()) / (1000 * 60))
        : null;

      return {
        id: session.user_id,
        name: fullName,
        initials,
        status,
        punch_in_time: session.punch_in_time,
        punch_out_time: session.punch_out_time,
        duration,
        completed_tasks: completedTasks,
        total_tasks: totalTasksCount,
      };
    });

    return {
      market_id: market.id,
      market_name: market.name,
      city: market.city,
      active_sessions: sessionsData.length,
      active_employees: employees.filter(e => e.status === 'active').length,
      stall_confirmations_count: stallsData.length,
      media_uploads_count: marketMedia.length,
      last_upload_time: lastTaskByMarket[market.id] || null,
      last_punch_in: null,
      task_stats: taskStats,
      employee_names: employees.map(e => e.name),
      employees: employees
    };
  });

  return marketsWithStats;
};

const fetchBdoStats = async () => {
  const [bdoMarketsRes, bdoStallsRes] = await Promise.all([
    supabase.from('bdo_market_submissions').select('status, updated_at').eq('status', 'pending'),
    supabase.from('bdo_stall_submissions').select('status, updated_at').eq('status', 'pending'),
  ]);

  const bdoPending = (bdoMarketsRes.data?.length || 0) + (bdoStallsRes.data?.length || 0);
  const bdoLatest = [...(bdoMarketsRes.data || []), ...(bdoStallsRes.data || [])]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  return {
    pending: bdoPending,
    lastUpdate: bdoLatest?.updated_at || '',
  };
};

const fetchMMSessions = async (): Promise<MarketManagerSession[]> => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const { data: sessions, error: sessionsError } = await supabase
    .from('market_manager_sessions')
    .select('*')
    .eq('session_date', today)
    .order('created_at', { ascending: false });

  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return [];

  const userIds = sessions.map(s => s.user_id);
  const sessionIds = sessions.map(s => s.id);

  const [employeesRes, punchInRes, punchOutRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', userIds),
    supabase.from('market_manager_punchin').select('session_id, punched_at').in('session_id', sessionIds),
    supabase.from('market_manager_punchout').select('session_id, punched_at').in('session_id', sessionIds),
  ]);

  const employeeMap = new Map(employeesRes.data?.map(e => [e.id, e.full_name]) || []);
  const punchInMap = new Map(punchInRes.data?.map(p => [p.session_id, p.punched_at]) || []);
  const punchOutMap = new Map(punchOutRes.data?.map(p => [p.session_id, p.punched_at]) || []);

  return sessions.map(session => ({
    id: session.id,
    user_id: session.user_id,
    manager_name: employeeMap.get(session.user_id) || 'Unknown',
    session_date: session.session_date,
    status: session.status,
    attendance_status: session.attendance_status,
    working_hours: session.working_hours,
    punch_in_time: punchInMap.get(session.id) || null,
    punch_out_time: punchOutMap.get(session.id) || null,
  }));
};

export function useAdminDashboardData() {
  const liveMarketsQuery = useQuery({
    queryKey: ['admin-dashboard-live-markets'],
    queryFn: fetchLiveMarketsData,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const bdoStatsQuery = useQuery({
    queryKey: ['admin-dashboard-bdo-stats'],
    queryFn: fetchBdoStats,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const mmSessionsQuery = useQuery({
    queryKey: ['admin-dashboard-mm-sessions'],
    queryFn: fetchMMSessions,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const refetchAll = () => {
    liveMarketsQuery.refetch();
    bdoStatsQuery.refetch();
    mmSessionsQuery.refetch();
  };

  return {
    liveMarkets: liveMarketsQuery.data || [],
    bdoStats: bdoStatsQuery.data || { pending: 0, lastUpdate: '' },
    mmSessions: mmSessionsQuery.data || [],
    isLoading: liveMarketsQuery.isLoading || bdoStatsQuery.isLoading || mmSessionsQuery.isLoading,
    refetchAll,
  };
}
