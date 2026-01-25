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

  // Process all sessions with batched task queries
  const processedSessions: Session[] = [];
  let totalStallsCount = 0;

  for (const data of sessionsData) {
    const dateStr = today;
    const sessionId = data.id;
    const marketId = data.market_id;

    // Batch ALL task-related queries for this session
    const [
      stallCountResult,
      mediaResults,
      offersResult,
      commoditiesResult,
      inspectionsResult,
      feedbackResult,
      planningResult,
    ] = await Promise.all([
      supabase
        .from('stall_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', dateStr),
      // Get all media counts in one query grouped by type
      supabase
        .from('media')
        .select('media_type')
        .eq('session_id', sessionId),
      supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', dateStr)
        .eq('session_id', sessionId),
      supabase
        .from('non_available_commodities')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', dateStr)
        .eq('session_id', sessionId),
      supabase
        .from('stall_inspections')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId),
      supabase
        .from('organiser_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', dateStr)
        .eq('session_id', sessionId),
      supabase
        .from('next_day_planning')
        .select('*', { count: 'exact', head: true })
        .eq('market_id', marketId)
        .eq('market_date', dateStr)
        .eq('session_id', sessionId),
    ]);

    // Count media by type from single query result
    const mediaData = mediaResults.data || [];
    const mediaCounts: Record<string, number> = {};
    mediaData.forEach((m) => {
      mediaCounts[m.media_type] = (mediaCounts[m.media_type] || 0) + 1;
    });

    const stallCount = stallCountResult.count || 0;
    if (processedSessions.length === 0) {
      totalStallsCount = stallCount;
    }

    let totalTasks = 13;
    let completedTasks = 0;
    const taskDetails: TaskStatus[] = [];

    // Task 1: Punch In
    const punchInCompleted = !!data.punch_in_time;
    if (punchInCompleted) completedTasks++;
    taskDetails.push({ name: 'Punch In', completed: punchInCompleted, icon: Clock });

    // Task 2: Stall Confirmations
    const stallsCompleted = stallCount > 0;
    if (stallsCompleted) completedTasks++;
    taskDetails.push({ name: 'Stall Confirmations', completed: stallsCompleted, icon: FileText });

    // Task 3-8: Media uploads
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

    // Task 9: Today's Offers
    const offersCompleted = (offersResult.count || 0) > 0;
    if (offersCompleted) completedTasks++;
    taskDetails.push({ name: "Today's Offers", completed: offersCompleted, icon: FileText });

    // Task 10: Non-Available Commodities
    const commoditiesCompleted = (commoditiesResult.count || 0) > 0;
    if (commoditiesCompleted) completedTasks++;
    taskDetails.push({ name: 'Non-Available Commodities', completed: commoditiesCompleted, icon: AlertCircle });

    // Task 11: Stall Inspections
    const inspectionsCompleted = (inspectionsResult.count || 0) > 0;
    if (inspectionsCompleted) completedTasks++;
    taskDetails.push({ name: 'Stall Inspections', completed: inspectionsCompleted, icon: ClipboardCheck });

    // Task 12: Punch Out
    const punchOutCompleted = !!data.punch_out_time;
    if (punchOutCompleted) completedTasks++;
    taskDetails.push({ name: 'Punch Out', completed: punchOutCompleted, icon: LogOut });

    // Task 13: Feedback or Planning
    const feedbackCompleted = (feedbackResult.count || 0) > 0 || (planningResult.count || 0) > 0;
    if (feedbackCompleted) completedTasks++;
    taskDetails.push({ name: 'Feedback / Next Day Plan', completed: feedbackCompleted, icon: Calendar });

    // Determine status
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
  });
}
