import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmployeeStatus {
  id: string;
  name: string;
  initials: string;
  status: 'active' | 'half_day' | 'completed';
  punch_in_time: string | null;
  punch_out_time: string | null;
  duration: number | null;
  completed_tasks: number;
  total_tasks: number;
  punch_in_lat: number | null;
  punch_in_lng: number | null;
}

export interface LiveMarket {
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
  collection_amounts?: {
    expected: number;
    received: number;
    pending: number;
  };
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

const getISTDate = () => {
  const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return {
    date: istNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    dayOfWeek: istNow.getDay(),
  };
};

const fetchBatchedTaskStats = async (marketIds: string[], todayDate: string) => {
  const { data: allSessions } = await supabase
    .from('sessions')
    .select('id, market_id, user_id, punch_in_time, punch_out_time, status, created_at')
    .in('market_id', marketIds)
    .eq('session_date', todayDate);

  const sessionsByMarket = new Map<string, any[]>();
  const allSessionIds: string[] = [];
  const allUserIds: string[] = [];

  allSessions?.forEach(s => {
    if (!sessionsByMarket.has(s.market_id)) sessionsByMarket.set(s.market_id, []);
    sessionsByMarket.get(s.market_id)!.push(s);
    allSessionIds.push(s.id);
    if (s.user_id) allUserIds.push(s.user_id);
  });

  const safeSessionIds = allSessionIds.length > 0 ? allSessionIds : ['00000000-0000-0000-0000-000000000000'];

  const [
    employeesRes, stallsRes, mediaRes, offersRes, commoditiesRes,
    feedbackRes, inspectionsRes, planningRes, collectionsRes, attendanceRes
  ] = await Promise.all([
    allUserIds.length > 0
      ? supabase.from('employees').select('id, full_name, status').in('id', [...new Set(allUserIds)])
      : Promise.resolve({ data: [] }),
    supabase.from('stall_confirmations').select('market_id, created_by, rent_amount').in('market_id', marketIds).eq('market_date', todayDate),
    supabase.from('media').select('session_id, media_type').in('session_id', safeSessionIds),
    supabase.from('offers').select('market_id, user_id').in('market_id', marketIds).eq('market_date', todayDate),
    supabase.from('non_available_commodities').select('market_id, user_id').in('market_id', marketIds).eq('market_date', todayDate),
    supabase.from('organiser_feedback').select('market_id, user_id').in('market_id', marketIds).eq('market_date', todayDate),
    supabase.from('stall_inspections').select('session_id, market_id').in('market_id', marketIds).in('session_id', safeSessionIds),
    supabase.from('next_day_planning').select('market_id, user_id').in('market_id', marketIds).eq('market_date', todayDate),
    supabase.from('collections').select('market_id, collected_by, amount').in('market_id', marketIds).eq('collection_date', todayDate),
    supabase.from('attendance_records').select('session_id, user_id, punch_in_lat, punch_in_lng').in('session_id', safeSessionIds),
  ]);

  const employeeMap = new Map<string, { name: string; status: string }>(
    (employeesRes.data || []).map((e: any) => [e.id, { name: e.full_name, status: e.status }])
  );

  const groupBy = (data: any[] | null, key: string) => {
    const map = new Map<string, any[]>();
    data?.forEach(item => {
      if (!map.has(item[key])) map.set(item[key], []);
      map.get(item[key])!.push(item);
    });
    return map;
  };

  const gpsByUser = new Map<string, { lat: number; lng: number }>();
  attendanceRes.data?.forEach(a => {
    if (a.user_id && a.punch_in_lat && a.punch_in_lng) {
      gpsByUser.set(a.user_id, { lat: a.punch_in_lat, lng: a.punch_in_lng });
    }
  });

  return {
    sessionsByMarket,
    employeeMap,
    stallsByMarket: groupBy(stallsRes.data, 'market_id'),
    mediaBySession: groupBy(mediaRes.data, 'session_id'),
    offersByMarket: groupBy(offersRes.data, 'market_id'),
    commoditiesByMarket: groupBy(commoditiesRes.data, 'market_id'),
    feedbackByMarket: groupBy(feedbackRes.data, 'market_id'),
    inspectionsBySession: groupBy(inspectionsRes.data, 'session_id'),
    planningByMarket: groupBy(planningRes.data, 'market_id'),
    collectionsByMarket: groupBy(collectionsRes.data, 'market_id'),
    gpsByUser,
  };
};

const fetchLiveMarketsData = async (): Promise<LiveMarket[]> => {
  const { date: todayDate, dayOfWeek } = getISTDate();

  const { data: todaysMarkets, error: marketsError } = await supabase
    .from('markets')
    .select('id, name, city, location')
    .eq('is_active', true)
    .eq('day_of_week', dayOfWeek);

  if (marketsError) throw marketsError;
  if (!todaysMarkets || todaysMarkets.length === 0) return [];

  const marketIds = todaysMarkets.map(m => m.id);

  const [mediaActivity, stallActivity, batchedData] = await Promise.all([
    supabase.from('media').select('market_id, captured_at').in('market_id', marketIds)
      .gte('captured_at', `${todayDate}T00:00:00`).order('captured_at', { ascending: false }),
    supabase.from('stall_confirmations').select('market_id, created_at').in('market_id', marketIds)
      .gte('market_date', todayDate).order('created_at', { ascending: false }),
    fetchBatchedTaskStats(marketIds, todayDate),
  ]);

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

  const marketsWithStats: LiveMarket[] = todaysMarkets.map((market: any) => {
    const sessionsData = (batchedData.sessionsByMarket.get(market.id) || []).filter((s: any) => (batchedData.employeeMap.get(s.user_id)?.status ?? 'active') !== 'inactive');
    const sessionIds = sessionsData.map(s => s.id);
    const stallsData = batchedData.stallsByMarket.get(market.id) || [];
    const offersData = batchedData.offersByMarket.get(market.id) || [];
    const commoditiesData = batchedData.commoditiesByMarket.get(market.id) || [];
    const feedbackData = batchedData.feedbackByMarket.get(market.id) || [];
    const planningData = batchedData.planningByMarket.get(market.id) || [];
    const collectionsData = batchedData.collectionsByMarket.get(market.id) || [];

    const expectedAmount = stallsData.reduce((sum: number, s: any) => sum + (s.rent_amount || 0), 0);
    const receivedAmount = collectionsData.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

    const marketMedia: any[] = [];
    sessionIds.forEach(sid => {
      const media = batchedData.mediaBySession.get(sid) || [];
      marketMedia.push(...media);
    });

    const marketInspections: any[] = [];
    sessionIds.forEach(sid => {
      const inspections = batchedData.inspectionsBySession.get(sid) || [];
      marketInspections.push(...inspections);
    });

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

    const sessionsByUser = new Map<string, any[]>();
    sessionsData.forEach((s: any) => {
      if (!s.user_id) return;
      if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, []);
      sessionsByUser.get(s.user_id)!.push(s);
    });

    const employees: EmployeeStatus[] = Array.from(sessionsByUser.entries()).map(([userId, userSessions]) => {
      const fullName = batchedData.employeeMap.get(userId)?.name || 'Unknown';
      const nameParts = fullName.split(' ').filter(Boolean);
      const initials = nameParts.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

      const primarySession = [...userSessions].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )[0];

      const userMedia = userSessions.flatMap((s: any) => batchedData.mediaBySession.get(s.id) || []);
      const userInspectionsCount = userSessions.reduce(
        (sum: number, s: any) => sum + ((batchedData.inspectionsBySession.get(s.id) || []).length || 0), 0
      );

      let completedTasks = 0;
      if (userSessions.some((s: any) => s.punch_in_time)) completedTasks++;
      if (stallsData.some(s => s.created_by === userId)) completedTasks++;
      if (userMedia.some(m => m.media_type === 'outside_rates')) completedTasks++;
      if (userMedia.some(m => m.media_type === 'rate_board')) completedTasks++;
      if (userMedia.some(m => m.media_type === 'market_video')) completedTasks++;
      if (userMedia.some(m => m.media_type === 'cleaning_video')) completedTasks++;
      if (userMedia.some(m => m.media_type === 'customer_feedback')) completedTasks++;
      if (offersData.some(o => o.user_id === userId)) completedTasks++;
      if (commoditiesData.some(c => c.user_id === userId)) completedTasks++;
      if (feedbackData.some(f => f.user_id === userId)) completedTasks++;
      if (userInspectionsCount > 0) completedTasks++;
      if (planningData.some(p => p.user_id === userId)) completedTasks++;
      if (collectionsData.some(c => c.collected_by === userId)) completedTasks++;

      let status: 'active' | 'half_day' | 'completed' = 'active';
      if (completedTasks === totalTasksCount) status = 'completed';
      else if (completedTasks > 0) status = 'half_day';

      const punchInTimes = userSessions.map((s: any) => s.punch_in_time).filter(Boolean).map((t: string) => new Date(t).getTime());
      const punchOutTimes = userSessions.map((s: any) => s.punch_out_time).filter(Boolean).map((t: string) => new Date(t).getTime());
      const earliestIn = punchInTimes.length ? new Date(Math.min(...punchInTimes)).toISOString() : null;
      const latestOut = punchOutTimes.length ? new Date(Math.max(...punchOutTimes)).toISOString() : null;
      const duration = earliestIn && latestOut
        ? Math.floor((new Date(latestOut).getTime() - new Date(earliestIn).getTime()) / (1000 * 60))
        : null;

      const userGps = batchedData.gpsByUser.get(userId);

      return {
        id: userId, name: fullName, initials, status,
        punch_in_time: primarySession?.punch_in_time || earliestIn,
        punch_out_time: primarySession?.punch_out_time || latestOut,
        duration, completed_tasks: completedTasks, total_tasks: totalTasksCount,
        punch_in_lat: userGps?.lat ?? null, punch_in_lng: userGps?.lng ?? null,
      };
    });

    return {
      market_id: market.id, market_name: market.name, city: market.city,
      active_sessions: sessionsData.length,
      active_employees: employees.filter(e => e.status === 'active').length,
      stall_confirmations_count: stallsData.length,
      media_uploads_count: marketMedia.length,
      last_upload_time: lastTaskByMarket[market.id] || null,
      last_punch_in: null,
      collection_amounts: { expected: expectedAmount, received: receivedAmount, pending: expectedAmount - receivedAmount },
      task_stats: taskStats,
      employee_names: employees.map(e => e.name),
      employees,
    };
  });

  return marketsWithStats;
};

const EMPTY: LiveMarket[] = [];

export function useLiveMarketsData() {
  const query = useQuery({
    queryKey: ['live-markets-data'],
    queryFn: fetchLiveMarketsData,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  return {
    liveMarkets: query.data ?? EMPTY,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
