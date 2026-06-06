import { supabase } from '@/integrations/supabase/client';

export type AttendanceRole = 'employee' | 'admin' | 'market_manager' | 'bms_executive' | 'bdo' | string | null | undefined;
export type AttendanceStatus = 'full_day' | 'half_day' | 'absent' | 'weekly_off' | 'active' | 'leave' | 'no_record';

export const ORGANISER_TOTAL_TASKS = 13;
export const ATTENDANCE_STATUS_RANK: Record<string, number> = {
  full_day: 5,
  active: 4,
  half_day: 3,
  leave: 2,
  weekly_off: 1,
  no_record: 0,
  absent: 0,
  present: 0,
  pending: 0,
};

export const ORGANISER_TASK_LABELS: Record<string, string> = {
  punch_in: 'Punch In',
  selfie_gps: 'Selfie with GPS',
  outside_rates: 'Outside Rates',
  rate_board: 'Rate Board',
  market_video: 'Market Video',
  cleaning_video: 'Cleaning Video',
  customer_feedback: 'Customer Feedback',
  stall_confirmations: 'Stall Confirmations',
  offers: "Today's Offers",
  non_available_commodities: 'Non-Available Commodities',
  stall_inspections: 'Stall Inspections',
  organiser_feedback: 'Organiser Feedback',
  next_day_planning: 'Next Day Planning',
};

export type OrganiserTaskProgress = {
  completed: number;
  total: number;
  tasks: Array<{ key: string; label: string; done: boolean }>;
};

export const getISTDateString = (date = new Date()): string => {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const isWeeklyOffDate = (dateStr: string): boolean => {
  return new Date(`${dateStr}T00:00:00`).getDay() === 1;
};

export const isTodayIST = (dateStr: string): boolean => dateStr === getISTDateString();

export const finalStatusFromCompletion = (completed: number, total = ORGANISER_TOTAL_TASKS): 'full_day' | 'half_day' | 'absent' => {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  if (pct >= 95) return 'full_day';
  if (pct >= 55) return 'half_day';
  return 'absent';
};

const isFinalAttendanceStatus = (status?: string | null): status is 'full_day' | 'half_day' | 'absent' =>
  status === 'full_day' || status === 'half_day' || status === 'absent';

export const resolveAttendanceStatus = ({
  role,
  dbStatus,
  attendanceDate,
  punchInTime,
  punchOutTime,
  completedTasks,
  totalTasks,
  approvedLeave,
  workingHours,
}: {
  role?: AttendanceRole;
  dbStatus?: string | null;
  attendanceDate: string;
  punchInTime?: string | null;
  punchOutTime?: string | null;
  completedTasks?: number | null;
  totalTasks?: number | null;
  approvedLeave?: boolean;
  workingHours?: number | null;
}): AttendanceStatus => {
  if (isWeeklyOffDate(attendanceDate) || dbStatus === 'weekly_off') return 'weekly_off';
  if (approvedLeave || dbStatus === 'leave') return 'leave';

  const today = isTodayIST(attendanceDate);
  if (today && punchInTime && !punchOutTime) return 'active';

  const normalizedRole = role || 'employee';

  if (normalizedRole === 'market_manager' || normalizedRole === 'bdo') {
    let hours = workingHours ?? null;
    if (hours == null && punchInTime && punchOutTime) {
      hours = (new Date(punchOutTime).getTime() - new Date(punchInTime).getTime()) / (1000 * 60 * 60);
    }
    if (hours != null) {
      if (hours >= 8) return 'full_day';
      if (hours >= 4) return 'half_day';
      return 'absent';
    }
    if (isFinalAttendanceStatus(dbStatus)) return dbStatus;
    return punchInTime ? (today ? 'active' : 'absent') : 'no_record';
  }

  if (normalizedRole === 'bms_executive') {
    if (isFinalAttendanceStatus(dbStatus)) return dbStatus;
    if (punchInTime) return today && !punchOutTime ? 'active' : 'full_day';
    return today ? 'no_record' : 'absent';
  }

  const completed = completedTasks ?? 0;
  const total = totalTasks ?? 0;
  if (total > 0) return finalStatusFromCompletion(completed, total);
  if (isFinalAttendanceStatus(dbStatus)) return dbStatus;
  if (punchInTime && today && !punchOutTime) return 'active';
  return today ? 'no_record' : 'absent';
};

export const fetchOrganiserTaskProgress = async (
  sessionId: string,
  marketId?: string | null,
  sessionDate?: string | null
): Promise<OrganiserTaskProgress> => {
  const { data: sessionMeta } = await supabase
    .from('sessions')
    .select('id, user_id, market_id, session_date, punch_in_time, punch_out_time')
    .eq('id', sessionId)
    .maybeSingle();

  const resolvedMarketId = marketId ?? sessionMeta?.market_id ?? null;
  const resolvedSessionDate = (sessionDate ?? sessionMeta?.session_date ?? '').slice(0, 10) || null;
  const sessionUserId = sessionMeta?.user_id ?? null;

  const mediaPromise = supabase.from('media').select('media_type').eq('session_id', sessionId);
  const stallsPromise = resolvedMarketId && resolvedSessionDate
    ? supabase
        .from('stall_confirmations')
        .select('id', { count: 'exact', head: true })
        .eq('market_id', resolvedMarketId)
        .eq('market_date', resolvedSessionDate)
        .or(sessionUserId ? `created_by.eq.${sessionUserId},created_by.is.null` : 'created_by.is.null')
    : Promise.resolve({ count: 0 } as any);

  const [mediaRes, stallsRes, offersRes, commoditiesRes, inspectionsRes, feedbackRes, planningRes] = await Promise.all([
    mediaPromise,
    stallsPromise,
    supabase.from('offers').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
    supabase.from('non_available_commodities').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
    supabase.from('stall_inspections').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
    supabase.from('organiser_feedback').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
    supabase.from('next_day_planning').select('id', { count: 'exact', head: true }).eq('session_id', sessionId),
  ]);

  const uploadedTypes = new Set((mediaRes.data || []).map((m: any) => m.media_type));
  const tasks = [
    { key: 'punch_in', done: !!sessionMeta?.punch_in_time },
    { key: 'selfie_gps', done: uploadedTypes.has('selfie_gps') },
    { key: 'outside_rates', done: uploadedTypes.has('outside_rates') },
    { key: 'rate_board', done: uploadedTypes.has('rate_board') },
    { key: 'market_video', done: uploadedTypes.has('market_video') },
    { key: 'cleaning_video', done: uploadedTypes.has('cleaning_video') },
    { key: 'customer_feedback', done: uploadedTypes.has('customer_feedback') },
    { key: 'stall_confirmations', done: ((stallsRes as any)?.count ?? 0) > 0 },
    { key: 'offers', done: ((offersRes as any)?.count ?? 0) > 0 },
    { key: 'non_available_commodities', done: ((commoditiesRes as any)?.count ?? 0) > 0 },
    { key: 'stall_inspections', done: ((inspectionsRes as any)?.count ?? 0) > 0 },
    { key: 'organiser_feedback', done: ((feedbackRes as any)?.count ?? 0) > 0 },
    { key: 'next_day_planning', done: ((planningRes as any)?.count ?? 0) > 0 },
  ].map((task) => ({ ...task, label: ORGANISER_TASK_LABELS[task.key] || task.key }));

  return {
    completed: tasks.filter((task) => task.done).length,
    total: ORGANISER_TOTAL_TASKS,
    tasks,
  };
};
