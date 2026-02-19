import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Clock,
  Camera,
  FileText,
  MessageSquare,
  ClipboardCheck,
  AlertCircle,
  Upload,
  Video,
  ImageIcon,
  Sparkles,
  LogOut,
  Calendar,
} from 'lucide-react';

interface TaskStatus {
  name: string;
  completed: boolean;
  icon: any;
}

interface Session {
  id: string;
  session_date: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: 'active' | 'completed' | 'finalized' | 'locked';
  market_id: string;
  market: { name: string; location: string };
  media: any[];
  total_tasks?: number;
  completed_tasks?: number;
  computed_status?: string;
  task_details?: TaskStatus[];
}

const getISTDateString = (date: Date): string => {
  const istDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return istDate.toISOString().split('T')[0];
};

async function fetchDashboardData(userId: string) {
  const today = getISTDateString(new Date());
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startDate = getISTDateString(startOfMonth);

  // Batch all initial queries
  const [sessionsResult, attendanceResult, settingsResult] = await Promise.all([
    supabase
      .from('sessions')
      .select(`*, market:markets(*), media(*)`)
      .eq('user_id', userId)
      .eq('session_date', today)
      .order('created_at', { ascending: true }),
    supabase
      .from('attendance_records')
      .select('status')
      .eq('user_id', userId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', today),
    supabase
      .from('app_settings')
      .select('collection_sheet_url')
      .single(),
  ]);

  if (sessionsResult.error) throw sessionsResult.error;

  const sessionsData = sessionsResult.data || [];
  const attendanceData = attendanceResult.data || [];
  const collectionSheetUrl = settingsResult.data?.collection_sheet_url || null;

  // Calculate attendance stats
  const attendanceStats = attendanceData.reduce(
    (acc, record) => {
      if (record.status === 'full_day') acc.fullDays++;
      else if (record.status === 'half_day') acc.halfDays++;
      else if (record.status === 'absent') acc.absences++;
      else if (record.status === 'weekly_off') acc.weeklyOffs++;
      return acc;
    },
    { fullDays: 0, halfDays: 0, absences: 0, weeklyOffs: 0, totalDays: attendanceData.length }
  );

  if (sessionsData.length === 0) {
    return {
      sessions: [] as Session[],
      attendanceStats,
      collectionSheetUrl,
      stallsCount: 0,
    };
  }

  // Collect all unique market IDs and session IDs for batched queries
  const allSessionIds = sessionsData.map(s => s.id);
  const allMarketIds = [...new Set(sessionsData.map(s => s.market_id))];

  // Batch ALL task-related queries across ALL sessions at once
  const [
    stallCountResults,
    allMediaResults,
    allOffersResults,
    allCommoditiesResults,
    allInspectionsResults,
    allFeedbackResults,
    allPlanningResults,
  ] = await Promise.all([
    supabase
      .from('stall_confirmations')
      .select('market_id')
      .in('market_id', allMarketIds)
      .eq('market_date', today),
    supabase
      .from('media')
      .select('session_id, media_type')
      .in('session_id', allSessionIds),
    supabase
      .from('offers')
      .select('session_id')
      .in('session_id', allSessionIds)
      .eq('market_date', today),
    supabase
      .from('non_available_commodities')
      .select('session_id')
      .in('session_id', allSessionIds)
      .eq('market_date', today),
    supabase
      .from('stall_inspections')
      .select('session_id')
      .in('session_id', allSessionIds),
    supabase
      .from('organiser_feedback')
      .select('session_id')
      .in('session_id', allSessionIds)
      .eq('market_date', today),
    supabase
      .from('next_day_planning')
      .select('session_id')
      .in('session_id', allSessionIds)
      .eq('market_date', today),
  ]);

  // Index results by market/session for O(1) lookups
  const stallsByMarket = new Map<string, number>();
  (stallCountResults.data || []).forEach(s => {
    stallsByMarket.set(s.market_id, (stallsByMarket.get(s.market_id) || 0) + 1);
  });

  const mediaBySession = new Map<string, Record<string, number>>();
  (allMediaResults.data || []).forEach(m => {
    if (!mediaBySession.has(m.session_id)) mediaBySession.set(m.session_id, {});
    const counts = mediaBySession.get(m.session_id)!;
    counts[m.media_type] = (counts[m.media_type] || 0) + 1;
  });

  const offersBySession = new Set((allOffersResults.data || []).map(o => o.session_id));
  const commoditiesBySession = new Set((allCommoditiesResults.data || []).map(c => c.session_id));
  const inspectionsBySession = new Set((allInspectionsResults.data || []).map(i => i.session_id));
  const feedbackBySession = new Set((allFeedbackResults.data || []).map(f => f.session_id));
  const planningBySession = new Set((allPlanningResults.data || []).map(p => p.session_id));

  // Process all sessions using indexed data (no more DB calls)
  const processedSessions: Session[] = [];
  let totalStallsCount = 0;

  for (const data of sessionsData) {
    const sessionId = data.id;
    const marketId = data.market_id;
    const mediaCounts = mediaBySession.get(sessionId) || {};
    const stallCount = stallsByMarket.get(marketId) || 0;

    if (processedSessions.length === 0) {
      totalStallsCount = stallCount;
    }

    let totalTasks = 13;
    let completedTasks = 0;
    const taskDetails: TaskStatus[] = [];

    const punchInCompleted = !!data.punch_in_time;
    if (punchInCompleted) completedTasks++;
    taskDetails.push({ name: 'Punch In', completed: punchInCompleted, icon: Clock });

    const stallsCompleted = stallCount > 0;
    if (stallsCompleted) completedTasks++;
    taskDetails.push({ name: 'Stall Confirmations', completed: stallsCompleted, icon: FileText });

    const mediaTypes = [
      { type: 'outside_rates', label: 'Outside Rates', icon: Upload },
      { type: 'rate_board', label: 'Rate Board Photo', icon: ImageIcon },
      { type: 'market_video', label: 'Market Video', icon: Video },
      { type: 'cleaning_video', label: 'Cleaning Video', icon: Sparkles },
      { type: 'customer_feedback', label: 'Customer Feedback', icon: MessageSquare },
      { type: 'selfie_gps', label: 'Selfie with GPS', icon: Camera },
    ];

    mediaTypes.forEach((mt) => {
      const mediaCompleted = (mediaCounts[mt.type] || 0) > 0;
      if (mediaCompleted) completedTasks++;
      taskDetails.push({ name: mt.label, completed: mediaCompleted, icon: mt.icon });
    });

    const offersCompleted = offersBySession.has(sessionId);
    if (offersCompleted) completedTasks++;
    taskDetails.push({ name: "Today's Offers", completed: offersCompleted, icon: FileText });

    const commoditiesCompleted = commoditiesBySession.has(sessionId);
    if (commoditiesCompleted) completedTasks++;
    taskDetails.push({ name: 'Non-Available Commodities', completed: commoditiesCompleted, icon: AlertCircle });

    const inspectionsCompleted = inspectionsBySession.has(sessionId);
    if (inspectionsCompleted) completedTasks++;
    taskDetails.push({ name: 'Stall Inspections', completed: inspectionsCompleted, icon: ClipboardCheck });

    const punchOutCompleted = !!data.punch_out_time;
    if (punchOutCompleted) completedTasks++;
    taskDetails.push({ name: 'Punch Out', completed: punchOutCompleted, icon: LogOut });

    const feedbackCompleted = feedbackBySession.has(sessionId) || planningBySession.has(sessionId);
    if (feedbackCompleted) completedTasks++;
    taskDetails.push({ name: 'Feedback / Next Day Plan', completed: feedbackCompleted, icon: Calendar });

    const sessionDate = data.session_date;
    const currentDateTime = new Date();
    const sessionDateTime = new Date(sessionDate + 'T23:59:59');

    let computedStatus = 'incomplete';
    if (completedTasks === totalTasks) {
      computedStatus = 'completed';
    } else if (currentDateTime > sessionDateTime && data.status !== 'locked') {
      computedStatus = 'expired';
    } else if (data.status === 'locked') {
      computedStatus = 'locked';
    }

    processedSessions.push({
      ...data,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      computed_status: computedStatus,
      task_details: taskDetails,
    });
  }

  return {
    sessions: processedSessions,
    attendanceStats,
    collectionSheetUrl,
    stallsCount: totalStallsCount,
  };
}

export function useDashboardData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-data', user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
