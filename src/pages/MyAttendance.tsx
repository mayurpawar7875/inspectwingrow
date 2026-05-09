import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowLeft, CheckCircle, AlertCircle, XCircle, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: 'full_day' | 'half_day' | 'absent' | 'weekly_off' | 'active';
  punch_in_time: string | null;
  punch_out_time: string | null;
  session_id: string | null;
  completed_tasks: number | null;
  total_tasks: number | null;
  market_name?: string;
  market_id?: string | null;
  session_date?: string | null;
  role?: string | null;
}

export default function MyAttendance() {
  const { user, currentRole } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const EMPLOYEE_TOTAL_TASKS = 13 as const;

  type TaskProgress = {
    completed: number;
    total: number;
    loading: boolean;
    tasks?: Array<{ key: string; label: string; done: boolean }>;
  };

  const TASK_LABELS: Record<string, string> = {
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

  const [taskProgressBySession, setTaskProgressBySession] = useState<Record<string, TaskProgress>>({});

  const loadTaskProgressForSession = useCallback(
    async (sessionId: string, marketId?: string | null, sessionDate?: string | null) => {
      if (!sessionId) return;

      // Prevent duplicate in-flight fetches.
      if (taskProgressBySession[sessionId]?.loading) return;

      setTaskProgressBySession((prev) => ({
        ...prev,
        [sessionId]: {
          completed: prev[sessionId]?.completed ?? 0,
          total: EMPLOYEE_TOTAL_TASKS,
          loading: true,
        },
      }));

      try {
        // Resolve from session to ensure we have punch times + market/date.
        const { data: sessionMeta } = await supabase
          .from('sessions')
          .select('market_id, session_date, punch_in_time, punch_out_time')
          .eq('id', sessionId)
          .maybeSingle();

        const resolvedMarketId = marketId ?? sessionMeta?.market_id ?? null;
        const resolvedSessionDate = sessionDate ?? sessionMeta?.session_date ?? null;
        const dateStr = (resolvedSessionDate || '').slice(0, 10) || undefined;

        let completed = 0;

        // Task 1: Punch In
        if (sessionMeta?.punch_in_time) completed++;

        // Task 2: Stall Confirmations (>= 1)
        const stallsPromise =
          resolvedMarketId && dateStr
            ? supabase
                .from('stall_confirmations')
                .select('*', { count: 'exact', head: true })
                .eq('market_id', resolvedMarketId)
                .eq('market_date', dateStr)
            : Promise.resolve({ count: 0 } as any);

        // Task 3-8: Media uploads (6 types)
        const { data: mediaData } = await supabase
          .from('media')
          .select('media_type')
          .eq('session_id', sessionId);

        const uploadedTypes = new Set(mediaData?.map((m: any) => m.media_type) || []);
        const requiredMediaTypes: Array<
          'outside_rates' | 'rate_board' | 'market_video' | 'cleaning_video' | 'customer_feedback' | 'selfie_gps'
        > = ['outside_rates', 'rate_board', 'market_video', 'cleaning_video', 'customer_feedback', 'selfie_gps'];

        completed += requiredMediaTypes.filter((t) => uploadedTypes.has(t)).length;

        const [stallsRes, offersRes, commoditiesRes, inspectionsRes, feedbackRes, planningRes, collectionsRes] = await Promise.all([
          stallsPromise,
          resolvedMarketId && dateStr
            ? supabase
                .from('offers')
                .select('*', { count: 'exact', head: true })
                .eq('market_id', resolvedMarketId)
                .eq('market_date', dateStr)
                .eq('session_id', sessionId)
            : supabase.from('offers').select('*', { count: 'exact', head: true }).eq('session_id', sessionId),
          resolvedMarketId && dateStr
            ? supabase
                .from('non_available_commodities')
                .select('*', { count: 'exact', head: true })
                .eq('market_id', resolvedMarketId)
                .eq('market_date', dateStr)
                .eq('session_id', sessionId)
            : supabase
                .from('non_available_commodities')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', sessionId),
          supabase
            .from('stall_inspections')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', sessionId),
          resolvedMarketId && dateStr
            ? supabase
                .from('organiser_feedback')
                .select('*', { count: 'exact', head: true })
                .eq('market_id', resolvedMarketId)
                .eq('market_date', dateStr)
                .eq('session_id', sessionId)
            : supabase
                .from('organiser_feedback')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', sessionId),
          resolvedMarketId && dateStr
            ? supabase
                .from('next_day_planning')
                .select('*', { count: 'exact', head: true })
                .eq('market_id', resolvedMarketId)
                .eq('market_date', dateStr)
                .eq('session_id', sessionId)
            : supabase
                .from('next_day_planning')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', sessionId),
          // Collections query
          resolvedMarketId && dateStr
            ? supabase
                .from('collections')
                .select('*', { count: 'exact', head: true })
                .eq('market_id', resolvedMarketId)
                .eq('collection_date', dateStr)
            : Promise.resolve({ count: 0 } as any),
        ]);

        // Task 2: stalls
        if ((stallsRes as any)?.count > 0) completed++;

        // Task 9: Today's Offers
        if ((offersRes as any)?.count > 0) completed++;

        // Task 10: Non-Available Commodities
        if ((commoditiesRes as any)?.count > 0) completed++;

        // Task 11: Stall Inspections
        if ((inspectionsRes as any)?.count > 0) completed++;

        // Task 12: Organiser Feedback
        if ((feedbackRes as any)?.count > 0) completed++;

        // Task 13: Next Day Planning
        if ((planningRes as any)?.count > 0) completed++;

        // Note: Collections is NOT counted as a separate task per current 13-task definition
        // The 13 tasks are: Punch In, 6 Media types, Stall Confirmations, Offers, Commodities, 
        // Inspections, Feedback, Next Day Planning
        // Collections and Punch Out are NOT part of the 13 tasks for organisers

        const taskList = [
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
        ].map(t => ({ ...t, label: TASK_LABELS[t.key] || t.key }));

        setTaskProgressBySession((prev) => ({
          ...prev,
          [sessionId]: { completed, total: EMPLOYEE_TOTAL_TASKS, loading: false, tasks: taskList },
        }));

        // Persist computed tasks + derived attendance status. PROMOTE-ONLY:
        // once a record has been credited as full_day or half_day, never demote it
        // back to a lower status — only upgrade when more tasks have been completed.
        if (user?.id) {
          const completionPercentage = (completed / EMPLOYEE_TOTAL_TASKS) * 100;
          const computedStatus =
            completionPercentage >= 95 ? 'full_day' : completionPercentage >= 55 ? 'half_day' : 'absent';

          const RANK: Record<string, number> = { absent: 0, present: 1, half_day: 2, full_day: 3 };

          const { data: existing } = await supabase
            .from('attendance_records')
            .select('status, completed_tasks')
            .eq('user_id', user.id)
            .eq('session_id', sessionId)
            .maybeSingle();

          const currentStatus = (existing?.status as string) || 'present';
          const currentRank = RANK[currentStatus] ?? 1;
          const newRank = RANK[computedStatus] ?? 0;
          const currentCompleted = existing?.completed_tasks ?? 0;

          // Update only if new status is a promotion, OR same status with more tasks.
          if (currentStatus !== 'weekly_off' && (newRank > currentRank || (newRank === currentRank && completed > currentCompleted))) {
            await supabase
              .from('attendance_records')
              .update({
                completed_tasks: completed,
                total_tasks: EMPLOYEE_TOTAL_TASKS,
                status: computedStatus,
              })
              .eq('user_id', user.id)
              .eq('session_id', sessionId);
          }
        }
      } catch {
        // If anything fails, keep UI stable with a safe default.
        setTaskProgressBySession((prev) => ({
          ...prev,
          [sessionId]: { completed: prev[sessionId]?.completed ?? 0, total: EMPLOYEE_TOTAL_TASKS, loading: false },
        }));
      }
    },
    [EMPLOYEE_TOTAL_TASKS, taskProgressBySession, user?.id]
  );


  useEffect(() => {
    if (user) {
      fetchMyAttendance();
      subscribeToUpdates();
    }
  }, [user]);

  // Different attendance logic per role:
  // - Organiser (employee): Based on TASK COMPLETION (≥95% = Full Day, ≥55% = Half Day, <55% = Absent)
  // - Market Manager & BDO: Based on WORKING HOURS (≥8 hrs = Full Day, ≥4 hrs = Half Day)
  const calculateStatus = (
    completedTasks: number | null, 
    totalTasks: number | null, 
    dbStatus: string | null,
    attendanceDate: string,
    punchInTime: string | null,
    punchOutTime: string | null,
    recordRole?: string | null
  ): 'full_day' | 'half_day' | 'absent' | 'weekly_off' | 'active' => {
    // Check if it's Monday (weekly off) - Monday = 1 in getDay()
    const date = parseISO(attendanceDate);
    if (date.getDay() === 1) {
      return 'weekly_off';
    }
    
    // Check if session is ongoing (punched in but not punched out today)
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday && punchInTime && !punchOutTime) {
      return 'active';
    }
    
    // If marked as weekly off in DB, respect that
    if (dbStatus === 'weekly_off') {
      return 'weekly_off';
    }
    
    // If DB has a valid calculated status (full_day, half_day, absent), use it directly
    // NOTE: 'present' means "punched-in" and still needs calculation (tasks/hours).
    if (dbStatus === 'full_day') {
      return 'full_day';
    }
    if (dbStatus === 'half_day') {
      return 'half_day';
    }
    if (dbStatus === 'absent') {
      return 'absent';
    }
    
    // Use role from record, or fall back to current user role
    const roleToUse = recordRole || currentRole || 'employee';
    
    // For records without a final status, calculate based on role logic
    if (roleToUse === 'market_manager' || roleToUse === 'bdo') {
      if (punchInTime && punchOutTime) {
        const punchIn = new Date(punchInTime);
        const punchOut = new Date(punchOutTime);
        const workingHours = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60);
        
        if (workingHours >= 8) {
          return 'full_day';
        } else if (workingHours >= 4) {
          return 'half_day';
        }
        return 'absent';
      }
    } else {
      // Organiser (employee): Based on TASK COMPLETION
      // ≥95% = Full Day, ≥55% = Half Day, <55% = Absent
      const completed = completedTasks ?? 0;
      const total = totalTasks ?? 0;

      // If tasks are persisted in DB, use them
      if (total > 0) {
        const completionPercentage = (completed / total) * 100;

        if (completionPercentage >= 95) {
          return 'full_day';
        } else if (completionPercentage >= 55) {
          return 'half_day';
        } else {
          return 'absent';
        }
      }
      
      // Tasks not yet calculated - don't assume full_day, return absent 
      // (will be updated when task progress is loaded)
      // Exception: if DB explicitly has a calculated status, it would have been caught earlier
      return 'absent';
    }
    
    if (punchInTime && !punchOutTime) {
      return 'full_day';
    }
    
    return 'absent';
  };

  const fetchMyAttendance = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const thirtyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Extended to 90 days for calendar view
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('attendance_date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
      .order('attendance_date', { ascending: false });
    
    if (error) {
      toast.error('Failed to fetch attendance records');
      setLoading(false);
      return;
    }
    
    if (data && data.length > 0) {
      const sessionIds = [...new Set(data.map(r => r.session_id).filter(Boolean))];

      let sessionMetaMap = new Map<string, { marketName: string; marketId: string | null; sessionDate: string | null }>();
      if (sessionIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id, market_id, session_date, markets(name)')
          .in('id', sessionIds);

        sessionMetaMap = new Map(
          sessionsData?.map((s: any) => [
            s.id,
            {
              marketName: s.markets?.name || 'N/A',
              marketId: s.market_id ?? null,
              sessionDate: s.session_date ?? null,
            },
          ]) || []
        );
      }

      const enrichedData = data.map((record: any) => {
        const meta = record.session_id ? sessionMetaMap.get(record.session_id) : null;
        return {
          ...record,
          market_name: meta?.marketName ?? 'N/A',
          market_id: meta?.marketId ?? record.market_id ?? null,
          session_date: meta?.sessionDate ?? null,
          status: calculateStatus(
            record.completed_tasks,
            record.total_tasks,
            record.status,
            record.attendance_date,
            record.punch_in_time,
            record.punch_out_time,
            record.role
          ),
        };
      });

      setRecords(enrichedData);

      // Preload task progress for any organiser-style sessions (works for employees AND
      // market managers operating in Organiser Mode), so dual-mode best-status works.
      enrichedData.forEach((record: any) => {
        const roleToUse = record.role || currentRole || 'employee';
        if (roleToUse === 'employee' && record.session_id) {
          loadTaskProgressForSession(record.session_id, record.market_id, record.session_date);
        }
      });
    } else {
      setRecords([]);
    }

    setLoading(false);
  };

  // Rank statuses so we can pick the BEST one when a Market Manager has both an
  // MM session and an Organiser session on the same day.
  const STATUS_RANK: Record<string, number> = {
    full_day: 4,
    active: 3,
    half_day: 2,
    weekly_off: 1,
    absent: 0,
  };

  const getRecordsForDate = (date: Date): AttendanceRecord[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return records.filter(r => r.attendance_date === dateStr);
  };

  const computeRecordStatus = (
    record: AttendanceRecord
  ): 'full_day' | 'half_day' | 'absent' | 'weekly_off' | 'active' => {
    // If session is ongoing today, mark active
    const date = parseISO(record.attendance_date);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday && record.punch_in_time && !record.punch_out_time) {
      return 'active';
    }

    const roleToUse = record.role || currentRole || 'employee';

    // For organiser-mode rows, prefer live task progress when available
    if (roleToUse === 'employee' && record.session_id) {
      const progress = taskProgressBySession[record.session_id];
      if (progress && !progress.loading && progress.total > 0) {
        const pct = (progress.completed / progress.total) * 100;
        if (pct >= 95) return 'full_day';
        if (pct >= 55) return 'half_day';
        return 'absent';
      }
    }

    return record.status;
  };

  const subscribeToUpdates = () => {
    if (!user) return;
    
    const channel = supabase
      .channel('my-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchMyAttendance();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getRecordForDate = (date: Date): AttendanceRecord | undefined => {
    // Returns the BEST record for that day. When a Market Manager has both an
    // MM session and an Organiser session for the same date, the higher-status
    // record wins (so dual-mode work gets fair credit).
    const dayRecords = getRecordsForDate(date);
    if (dayRecords.length === 0) return undefined;
    if (dayRecords.length === 1) return dayRecords[0];

    return [...dayRecords].sort((a, b) => {
      const sa = STATUS_RANK[computeRecordStatus(a)] ?? 0;
      const sb = STATUS_RANK[computeRecordStatus(b)] ?? 0;
      return sb - sa;
    })[0];
  };

  useEffect(() => {
    if (!selectedDate) return;

    // Load task progress for ALL organiser-mode sessions on the selected date
    // (a Market Manager may have one MM record + one Organiser record).
    const dayRecords = getRecordsForDate(selectedDate);
    dayRecords.forEach((record) => {
      const roleToUse = record.role || currentRole || 'employee';
      if (roleToUse !== 'employee' || !record.session_id) return;
      if (taskProgressBySession[record.session_id]) return;
      void loadTaskProgressForSession(
        record.session_id,
        record.market_id ?? null,
        record.session_date ?? record.attendance_date
      );
    });
  }, [selectedDate, records, currentRole, taskProgressBySession, loadTaskProgressForSession]);


  const getDayStatus = (
    date: Date
  ): 'full_day' | 'half_day' | 'absent' | 'weekly_off' | 'future' | 'active' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Monday is weekly off for all employees (even if it's in the future)
    if (date.getDay() === 1) {
      return 'weekly_off';
    }

    if (date > today) {
      return 'future';
    }

    // Pick the BEST status across all records for the day (MM + Organiser dual mode).
    const dayRecords = getRecordsForDate(date);
    if (dayRecords.length === 0) {
      return 'absent';
    }

    let best: 'full_day' | 'half_day' | 'absent' | 'weekly_off' | 'active' = 'absent';
    let bestRank = -1;
    for (const record of dayRecords) {
      const s = computeRecordStatus(record);
      const rank = STATUS_RANK[s] ?? 0;
      if (rank > bestRank) {
        bestRank = rank;
        best = s;
      }
    }
    return best;
  };

  const getDayClasses = (date: Date, isCurrentMonth: boolean): string => {
    const status = getDayStatus(date);
    const isToday = isSameDay(date, new Date());
    const isSelected = selectedDate && isSameDay(date, selectedDate);
    
    let baseClasses = 'h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center text-[11px] md:text-sm font-medium transition-all cursor-pointer';
    
    if (!isCurrentMonth) {
      baseClasses += ' opacity-30';
    }
    
    if (isSelected) {
      baseClasses += ' ring-2 ring-primary ring-offset-1 md:ring-offset-2';
    }
    
    if (isToday) {
      baseClasses += ' border-2 border-primary';
    }
    
    switch (status) {
      case 'full_day':
        return cn(baseClasses, 'bg-green-500 text-white hover:bg-green-600');
      case 'half_day':
        return cn(baseClasses, 'bg-amber-500 text-white hover:bg-amber-600');
      case 'absent':
        return cn(baseClasses, 'bg-red-500 text-white hover:bg-red-600');
      case 'weekly_off':
        return cn(baseClasses, 'bg-blue-100 text-blue-700 hover:bg-blue-200');
      case 'active':
        return cn(baseClasses, 'bg-purple-500 text-white hover:bg-purple-600 animate-pulse');
      case 'future':
        return cn(baseClasses, 'bg-muted text-muted-foreground');
      default:
        return cn(baseClasses, 'bg-muted/50 text-muted-foreground hover:bg-muted');
    }
  };

  const getStatusSummary = () => {
    // Summary counts days up to today (no future days), treating missing records as Absent.
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const todayEod = new Date();
    todayEod.setHours(23, 59, 59, 999);

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let fullDays = 0;
    let halfDays = 0;
    let absent = 0;
    let weeklyOffs = 0;

    days.forEach((day) => {
      if (day > todayEod) return;

      const status = getDayStatus(day);
      if (status === 'full_day') fullDays++;
      else if (status === 'half_day') halfDays++;
      else if (status === 'absent') absent++;
      else if (status === 'weekly_off') weeklyOffs++;
    });

    return { fullDays, halfDays, absent, weeklyOffs };
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Get day of week for first day (0 = Sunday)
    const startDay = monthStart.getDay();
    
    // Add empty cells for days before month starts
    const emptyCells = Array(startDay).fill(null);
    
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="space-y-2 md:space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <h3 className="text-sm md:text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
        
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-0.5 md:gap-1">
          {weekDays.map(day => (
            <div key={day} className="h-7 md:h-10 flex items-center justify-center text-[10px] md:text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-0.5 md:gap-1">
          {emptyCells.map((_, i) => (
            <div key={`empty-${i}`} className="h-8 md:h-10" />
          ))}
          {days.map(day => (
            <div
              key={day.toISOString()}
              className="flex items-center justify-center"
              onClick={() => setSelectedDate(day)}
            >
              <div className={getDayClasses(day, isSameMonth(day, currentMonth))}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 md:gap-3 pt-2 md:pt-4 border-t">
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 md:h-4 md:w-4 rounded-full bg-green-500" />
            <span className="text-[9px] md:text-xs text-muted-foreground">Full Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 md:h-4 md:w-4 rounded-full bg-amber-500" />
            <span className="text-[9px] md:text-xs text-muted-foreground">Half Day</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 md:h-4 md:w-4 rounded-full bg-red-500" />
            <span className="text-[9px] md:text-xs text-muted-foreground">Absent</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 md:h-4 md:w-4 rounded-full bg-purple-500" />
            <span className="text-[9px] md:text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 md:h-4 md:w-4 rounded-full bg-blue-100 border border-blue-300" />
            <span className="text-[9px] md:text-xs text-muted-foreground">Weekly Off</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate) return null;
    
    const record = getRecordForDate(selectedDate);
    const status = getDayStatus(selectedDate);

    const roleToUse = record?.role || currentRole || 'employee';

    const showTasks = Boolean(record) && roleToUse === 'employee' && Boolean(record?.session_id);
    const progress = record?.session_id ? taskProgressBySession[record.session_id] : undefined;

    const completedTasks = progress?.completed ?? record?.completed_tasks ?? 0;
    const totalTasks = showTasks ? (progress?.total ?? EMPLOYEE_TOTAL_TASKS) : (record?.total_tasks ?? 0);

    const taskPercent = showTasks && totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const tasksLabel = !showTasks
      ? null
      : progress?.loading
        ? `${completedTasks}/${totalTasks} (calculating...)`
        : `${completedTasks}/${totalTasks} (${taskPercent}%)`;

    return (
      <Card className="mt-3 md:mt-4">
        <CardHeader className="pb-2 pt-3 px-3 md:px-6">
          <CardTitle className="text-xs md:text-base">{format(selectedDate, 'EEE, MMM d, yyyy')}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 md:px-6 md:pb-6 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] md:text-sm text-muted-foreground">Status:</span>
            {status === 'full_day' && <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-5">Full Day</Badge>}
            {status === 'half_day' && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5">Half Day</Badge>}
            {status === 'absent' && <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] h-5">Absent</Badge>}
            {status === 'weekly_off' && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] h-5">Weekly Off</Badge>}
            {status === 'active' && <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] h-5">Active</Badge>}
            {status === 'future' && <Badge variant="outline" className="text-[10px] h-5">Future</Badge>}
            {(() => {
              const dayRecs = getRecordsForDate(selectedDate);
              const hasMM = dayRecs.some(r => (r.role || '') === 'market_manager');
              const hasOrg = dayRecs.some(r => (r.role || 'employee') === 'employee');
              if (hasMM && hasOrg) {
                return <Badge variant="outline" className="text-[10px] h-5">MM + Organiser</Badge>;
              }
              return null;
            })()}
          </div>
          
          {record && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] md:text-sm text-muted-foreground">Market:</span>
                <span className="text-[11px] md:text-sm font-medium">{record.market_name || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 md:gap-4">
                <div>
                  <span className="text-[11px] md:text-sm text-muted-foreground">Punch In:</span>
                  <p className="text-[11px] md:text-sm font-medium">
                    {record.punch_in_time ? format(new Date(record.punch_in_time), 'hh:mm a') : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] md:text-sm text-muted-foreground">Punch Out:</span>
                  <p className="text-[11px] md:text-sm font-medium">
                    {record.punch_out_time ? format(new Date(record.punch_out_time), 'hh:mm a') : '-'}
                  </p>
                </div>
              </div>
              {showTasks && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] md:text-sm text-muted-foreground">Tasks:</span>
                    <span className="text-[11px] md:text-sm font-medium">{tasksLabel}</span>
                  </div>
                  {progress?.tasks && progress.tasks.length > 0 && (
                    <div className="mt-1 border-t pt-2">
                      <div className="text-[11px] md:text-sm text-muted-foreground mb-1.5">Task breakdown:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {progress.tasks.map((t) => (
                          <div key={t.key} className="flex items-center gap-1.5 text-[11px] md:text-sm">
                            {t.done ? (
                              <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            )}
                            <span className={cn('truncate', t.done ? 'text-foreground' : 'text-muted-foreground')}>
                              {t.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const summary = getStatusSummary();

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="max-w-4xl mx-auto space-y-3 md:space-y-6">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <div>
            <h1 className="text-lg md:text-3xl font-bold">My Attendance</h1>
            <p className="text-[10px] md:text-sm text-muted-foreground">View your attendance calendar</p>
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5 md:gap-3">
          <Card className="bg-green-50/50 border-green-100">
            <CardContent className="py-1.5 px-1 md:pt-4 md:pb-4 md:px-4">
              <div className="text-center">
                <CheckCircle className="w-3.5 h-3.5 md:w-6 md:h-6 mx-auto text-green-600" />
                <div className="text-base md:text-2xl font-bold text-green-600 leading-tight">{summary.fullDays}</div>
                <div className="text-[8px] md:text-xs text-green-700/70">Full Days</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/50 border-amber-100">
            <CardContent className="py-1.5 px-1 md:pt-4 md:pb-4 md:px-4">
              <div className="text-center">
                <AlertCircle className="w-3.5 h-3.5 md:w-6 md:h-6 mx-auto text-amber-600" />
                <div className="text-base md:text-2xl font-bold text-amber-600 leading-tight">{summary.halfDays}</div>
                <div className="text-[8px] md:text-xs text-amber-700/70">Half Days</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50/50 border-red-100">
            <CardContent className="py-1.5 px-1 md:pt-4 md:pb-4 md:px-4">
              <div className="text-center">
                <XCircle className="w-3.5 h-3.5 md:w-6 md:h-6 mx-auto text-red-600" />
                <div className="text-base md:text-2xl font-bold text-red-600 leading-tight">{summary.absent}</div>
                <div className="text-[8px] md:text-xs text-red-700/70">Absences</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 border-blue-100">
            <CardContent className="py-1.5 px-1 md:pt-4 md:pb-4 md:px-4">
              <div className="text-center">
                <Calendar className="w-3.5 h-3.5 md:w-6 md:h-6 mx-auto text-blue-600" />
                <div className="text-base md:text-2xl font-bold text-blue-600 leading-tight">{summary.weeklyOffs}</div>
                <div className="text-[8px] md:text-xs text-blue-700/70">Weekly Offs</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50/50 border-slate-100 col-span-2 md:col-span-1">
            <CardContent className="py-1.5 px-1 md:pt-4 md:pb-4 md:px-4">
              <div className="text-center">
                <CalendarCheck className="w-3.5 h-3.5 md:w-6 md:h-6 mx-auto text-slate-600" />
                <div className="text-base md:text-2xl font-bold text-slate-600 leading-tight">{summary.fullDays + summary.halfDays + summary.weeklyOffs}</div>
                <div className="text-[8px] md:text-xs text-slate-700/70">Total Days</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2 pt-3 px-3 md:px-6 md:pt-6">
            <CardTitle className="flex items-center gap-1.5 text-sm md:text-2xl">
              <Calendar className="h-4 w-4 md:h-5 md:w-5" />
              Attendance Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
            {loading ? (
              <div className="text-center py-6 text-muted-foreground text-xs">Loading...</div>
            ) : (
              <>
                {renderCalendar()}
                {renderSelectedDateDetails()}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
