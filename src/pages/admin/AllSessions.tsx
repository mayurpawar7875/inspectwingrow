import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SessionComments } from '@/components/SessionComments';
import { toast } from 'sonner';
import { Download, Eye, Filter, MapPin, Calendar, Clock, Check, X, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { getSignedUrl } from '@/lib/storageHelpers';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type TaskKey = 'attendance' | 'stalls' | 'assetInspection' | 'locationVisit' | 'marketVideo' | 'cleaningVideo' | 'advanceRequest' | 'leaveApplication';
type TaskState = 'completed' | 'pending' | 'not_required';

interface SessionTasks {
  attendance: TaskState;
  stalls: TaskState;
  assetInspection: TaskState;
  locationVisit: TaskState;
  marketVideo: TaskState;
  cleaningVideo: TaskState;
  advanceRequest: TaskState;
  leaveApplication: TaskState;
}

interface Session {
  id: string;
  user_id: string;
  market_id: string;
  session_date: string;
  market_date: string | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
  status: string;
  statuses?: string[];
  finalized_at: string | null;
  employees: { full_name: string; phone: string | null } | null;
  markets: { name: string; location: string } | null;
  role?: string | null;
  stalls?: any[];
  media?: any[];
  tasks?: SessionTasks;
  taskDetails?: Record<string, any>;
}

const TASK_LABELS: Record<TaskKey, string> = {
  attendance: 'Attendance',
  stalls: 'Stall Confirmation',
  assetInspection: 'Asset Inspection',
  locationVisit: 'Location Visit',
  marketVideo: 'Market Video',
  cleaningVideo: 'Cleaning Video',
  advanceRequest: 'Advance Request',
  leaveApplication: 'Leave Application',
};

const REQUIRED_TASKS: TaskKey[] = ['attendance', 'stalls', 'assetInspection', 'locationVisit', 'marketVideo', 'cleaningVideo'];

export default function AllSessions() {
  const location = useLocation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    marketId: '',
    employeeId: '',
    taskStatus: '', // e.g. "pending:assetInspection"
  });
  const [markets, setMarkets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const resolveStorageRef = (input: string): { bucket: string; path: string } | null => {
    if (!input) return null;
    if (input.startsWith('http://') || input.startsWith('https://')) {
      try {
        const u = new URL(input);
        const p = u.pathname;
        const publicPrefix = '/storage/v1/object/public/';
        const signPrefix = '/storage/v1/object/sign/';
        const stripPrefix = (prefix: string) => {
          const rest = p.slice(prefix.length);
          const [bucket, ...pathParts] = rest.split('/').filter(Boolean);
          const path = pathParts.join('/');
          if (!bucket || !path) return null;
          return { bucket, path };
        };
        if (p.startsWith(publicPrefix)) return stripPrefix(publicPrefix);
        if (p.startsWith(signPrefix)) return stripPrefix(signPrefix);
      } catch {
        // fallthrough
      }
      return null;
    }
    return { bucket: 'employee-media', path: input.replace(/^\/+/, '') };
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const state = location.state as any;
    const today = new Date().toISOString().split('T')[0];
    if (state?.filterToday) {
      setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today, status: '' }));
    } else if (state?.filterCompleted) {
      setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today, status: 'completed' }));
    }
  }, [location.state]);

  const toIST = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d2 = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d2}`;
  };

  const fetchAll = async () => {
    try {
      setLoading(true);

      const [{ data: marketsData }, { data: employeesData }] = await Promise.all([
        supabase.from('markets').select('*').order('name'),
        supabase.from('employees').select('id, full_name, phone').order('full_name'),
      ]);
      setMarkets(marketsData || []);
      setEmployees(employeesData || []);

      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('session_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      const rawSessions = sessionsData || [];

      if (rawSessions.length === 0) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(rawSessions.map((s: any) => s.user_id).filter(Boolean))];
      const marketIds = [...new Set(rawSessions.map((s: any) => s.market_id).filter(Boolean))];
      const sessionIds = rawSessions.map((s: any) => s.id);

      const allDates = rawSessions
        .map((s: any) => (s.market_date || s.session_date))
        .filter(Boolean) as string[];
      const istDates = allDates.map((d: string) => toIST(d));
      const minDate = istDates.length ? istDates.reduce((a: string, b: string) => (a < b ? a : b)) : undefined;
      const maxDate = istDates.length ? istDates.reduce((a: string, b: string) => (a > b ? a : b)) : undefined;

      const stallConfsPromise = (marketIds.length > 0 && minDate && maxDate)
        ? supabase
            .from('stall_confirmations')
            .select('id, market_id, market_date, farmer_name, stall_name, stall_no, created_by, created_at')
            .in('market_id', marketIds)
            .gte('market_date', minDate)
            .lte('market_date', maxDate)
            .then(r => r.data || [])
        : Promise.resolve([] as any[]);

      // Parallel fetch all data
      const [
        stallConfs,
        { data: empExtra },
        { data: rolesData },
        { data: mktsExtra },
        { data: stallsData },
        { data: mediaData },
        { data: assetInspections },
        { data: locationVisits },
        { data: advanceRequests },
        { data: leaveApps },
      ] = await Promise.all([
        stallConfsPromise,
        supabase.from('employees').select('id, full_name, phone').in('id', userIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
        supabase.from('markets').select('id, name, location').in('id', marketIds),
        supabase.from('stalls').select('*').in('session_id', sessionIds),
        supabase.from('media').select('*').in('session_id', sessionIds),
        minDate && maxDate
          ? supabase.from('bms_asset_inspections').select('user_id, inspection_date, inspection_week').in('user_id', userIds).gte('inspection_week', minDate).lte('inspection_week', maxDate)
          : Promise.resolve({ data: [] as any[] }),
        minDate && maxDate
          ? supabase.from('market_location_visits').select('id, employee_id, created_at, location_name').in('employee_id', userIds).gte('created_at', minDate)
          : Promise.resolve({ data: [] as any[] }),
        minDate && maxDate
          ? supabase.from('advance_requests').select('id, requester_id, required_date, status, amount').in('requester_id', userIds).gte('required_date', minDate).lte('required_date', maxDate)
          : Promise.resolve({ data: [] as any[] }),
        minDate && maxDate
          ? supabase.from('employee_leaves').select('id, user_id, leave_date, status, reason').in('user_id', userIds).gte('leave_date', minDate).lte('leave_date', maxDate)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const empById = Object.fromEntries((empExtra || []).map((e: any) => [e.id, e]));
      const mktById = Object.fromEntries((mktsExtra || []).map((m: any) => [m.id, m]));
      const roleByUser: Record<string, string> = {};
      (rolesData || []).forEach((r: any) => { roleByUser[r.user_id] = r.role; });

      const stallsBySession: Record<string, any[]> = {};
      const stallConfsByKey: Record<string, any[]> = {};
      const mediaBySession: Record<string, any[]> = {};

      (stallsData || []).forEach((stall: any) => {
        (stallsBySession[stall.session_id] ||= []).push(stall);
      });
      (stallConfs || []).forEach((sc: any) => {
        const key = `${sc.market_id}|${sc.market_date}|${sc.created_by || ''}`;
        (stallConfsByKey[key] ||= []).push(sc);
      });
      (mediaData || []).forEach((media: any) => {
        (mediaBySession[media.session_id] ||= []).push(media);
      });

      // Build per-user/per-date lookups for cross-session tasks
      const inspByUserDate: Record<string, any[]> = {};
      (assetInspections || []).forEach((i: any) => {
        const k = `${i.user_id}|${toIST(i.inspection_week || i.inspection_date)}`;
        (inspByUserDate[k] ||= []).push(i);
      });
      const visitsByUserDate: Record<string, any[]> = {};
      (locationVisits || []).forEach((v: any) => {
        const k = `${v.employee_id}|${toIST(v.created_at)}`;
        (visitsByUserDate[k] ||= []).push(v);
      });
      const advByUserDate: Record<string, any[]> = {};
      (advanceRequests || []).forEach((a: any) => {
        const k = `${a.requester_id}|${a.required_date}`;
        (advByUserDate[k] ||= []).push(a);
      });
      const leaveByUserDate: Record<string, any[]> = {};
      (leaveApps || []).forEach((l: any) => {
        const k = `${l.user_id}|${l.leave_date}`;
        (leaveByUserDate[k] ||= []).push(l);
      });

      const calculateStatus = (session: any, hasAttendance: boolean, hasStalls: boolean, hasMarketVid: boolean, hasCleanVid: boolean): string[] => {
        if (session.status === 'finalized' || session.status === 'locked') {
          return [session.status];
        }
        const allCore = hasAttendance && hasStalls && hasMarketVid && hasCleanVid;
        if (allCore && session.punch_out_time) {
          return ['completed'];
        }
        const nowUTC = new Date();
        const istTimeString = nowUTC.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const istDate = new Date(istTimeString);
        const todayIST = `${istDate.getFullYear()}-${String(istDate.getMonth() + 1).padStart(2, '0')}-${String(istDate.getDate()).padStart(2, '0')}`;
        if (session.session_date < todayIST) {
          return ['expired', 'incomplete'];
        }
        return session.punch_in_time ? ['active'] : ['incomplete'];
      };

      const sessionsWithData: Session[] = rawSessions.map((session: any) => {
        const sessionStalls = (() => {
          const dateStr = toIST(session.market_date || session.session_date);
          const key = `${session.market_id}|${dateStr}|${session.user_id}`;
          if (stallConfsByKey[key] && stallConfsByKey[key].length) return stallConfsByKey[key];
          return stallsBySession[session.id] || [];
        })();
        const sessionMedia = mediaBySession[session.id] || [];
        const userDateKey = `${session.user_id}|${toIST(session.market_date || session.session_date)}`;
        const userDateKeyExact = `${session.user_id}|${session.session_date}`;

        const hasAttendance = !!session.punch_in_time || sessionMedia.some((m: any) => m.media_type === 'photo' || m.media_type === 'attendance');
        const hasStalls = sessionStalls.length > 0;
        const hasMarketVid = sessionMedia.some((m: any) => m.media_type === 'market_video');
        const hasCleanVid = sessionMedia.some((m: any) => m.media_type === 'cleaning_video');
        const inspections = inspByUserDate[userDateKey] || [];
        const visits = visitsByUserDate[userDateKey] || [];
        const advances = advByUserDate[userDateKeyExact] || [];
        const leaves = leaveByUserDate[userDateKeyExact] || [];

        const tasks: SessionTasks = {
          attendance: hasAttendance ? 'completed' : 'pending',
          stalls: hasStalls ? 'completed' : 'pending',
          assetInspection: inspections.length > 0 ? 'completed' : 'pending',
          locationVisit: visits.length > 0 ? 'completed' : 'pending',
          marketVideo: hasMarketVid ? 'completed' : 'pending',
          cleaningVideo: hasCleanVid ? 'completed' : 'pending',
          advanceRequest: advances.length > 0 ? 'completed' : 'not_required',
          leaveApplication: leaves.length > 0 ? 'completed' : 'not_required',
        };

        const statuses = calculateStatus(session, hasAttendance, hasStalls, hasMarketVid, hasCleanVid);

        return {
          ...session,
          status: statuses[0],
          statuses,
          employees: empById[session.user_id] || null,
          markets: mktById[session.market_id] || null,
          role: roleByUser[session.user_id] || null,
          stalls: sessionStalls,
          media: sessionMedia,
          tasks,
          taskDetails: {
            inspections,
            visits,
            advances,
            leaves,
          },
        };
      });

      setSessions(sessionsWithData);
    } catch (error: any) {
      toast.error('Failed to load sessions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];
    if (filters.dateFrom) filtered = filtered.filter(s => s.session_date >= filters.dateFrom);
    if (filters.dateTo) filtered = filtered.filter(s => s.session_date <= filters.dateTo);
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(s => (s.statuses || [s.status]).includes(filters.status));
    }
    if (filters.marketId && filters.marketId !== 'all') {
      filtered = filtered.filter(s => s.market_id === filters.marketId);
    }
    if (filters.employeeId && filters.employeeId !== 'all') {
      filtered = filtered.filter(s => s.user_id === filters.employeeId);
    }
    if (filters.taskStatus && filters.taskStatus !== 'all') {
      const [state, taskKey] = filters.taskStatus.split(':') as [TaskState, TaskKey];
      filtered = filtered.filter(s => s.tasks && s.tasks[taskKey] === state);
    }
    return filtered;
  }, [sessions, filters]);

  const insights = useMemo(() => {
    const total = filteredSessions.length;
    const completed = filteredSessions.filter(s => (s.statuses || []).includes('completed') || s.status === 'finalized').length;
    const incomplete = total - completed;
    let totalRequired = 0;
    let totalDone = 0;
    filteredSessions.forEach(s => {
      if (!s.tasks) return;
      REQUIRED_TASKS.forEach(t => {
        totalRequired++;
        if (s.tasks![t] === 'completed') totalDone++;
      });
    });
    const pct = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0;
    return { total, completed, incomplete, pct };
  }, [filteredSessions]);

  const exportToCSV = () => {
    const headers = [
      'Date', 'Employee', 'Role', 'Market', 'Status', 'Punch In', 'Punch Out',
      ...REQUIRED_TASKS.map(t => TASK_LABELS[t]),
      'Advance Request', 'Leave Application',
    ];
    const rows = filteredSessions.map(s => [
      s.session_date,
      s.employees?.full_name || 'N/A',
      s.role || 'N/A',
      s.markets?.name || 'N/A',
      (s.statuses || [s.status]).join('|'),
      s.punch_in_time ? new Date(s.punch_in_time).toLocaleString() : 'N/A',
      s.punch_out_time ? new Date(s.punch_out_time).toLocaleString() : 'N/A',
      ...REQUIRED_TASKS.map(t => s.tasks?.[t] || 'pending'),
      s.tasks?.advanceRequest || 'not_required',
      s.tasks?.leaveApplication || 'not_required',
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-info text-info-foreground',
      completed: 'bg-success text-success-foreground',
      incomplete: 'bg-warning text-warning-foreground',
      expired: 'bg-destructive text-destructive-foreground',
      finalized: 'bg-success text-success-foreground',
      locked: 'bg-muted text-muted-foreground',
    };
    return <Badge className={`${colors[status] || 'bg-muted text-muted-foreground'} text-xs`}>{status.replace('_', ' ')}</Badge>;
  };

  const TaskIcon = ({ state }: { state: TaskState }) => {
    if (state === 'completed') return <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />;
    if (state === 'pending') return <X className="h-3.5 w-3.5 text-destructive" strokeWidth={3} />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const TaskPills = ({ tasks }: { tasks?: SessionTasks }) => {
    if (!tasks) return null;
    const items: TaskKey[] = [...REQUIRED_TASKS, 'advanceRequest', 'leaveApplication'];
    return (
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-wrap gap-1 sm:gap-1.5">
          {items.map(key => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center justify-center gap-1 rounded-md border h-6 w-6 sm:w-auto sm:px-1.5 sm:py-0.5 text-[10px] sm:text-xs ${
                    tasks[key] === 'completed'
                      ? 'border-success/30 bg-success/10 text-success'
                      : tasks[key] === 'pending'
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-muted bg-muted/40 text-muted-foreground'
                  }`}
                  aria-label={`${TASK_LABELS[key]}: ${tasks[key]}`}
                >
                  <TaskIcon state={tasks[key]} />
                  <span className="hidden sm:inline">{TASK_LABELS[key]}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {TASK_LABELS[key]}: {tasks[key].replace('_', ' ')}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">All Sessions</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Detailed task completion across all employee sessions</p>
        </div>
        <Button onClick={exportToCSV} disabled={filteredSessions.length === 0} size="sm" className="btn-touch">
          <Download className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Export CSV</span>
        </Button>
      </div>

      {/* Summary Insights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Total Sessions</p>
            <p className="text-xl sm:text-2xl font-bold">{insights.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl sm:text-2xl font-bold text-success">{insights.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Incomplete</p>
            <p className="text-xl sm:text-2xl font-bold text-warning">{insights.incomplete}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">Task Completion</p>
            <p className="text-xl sm:text-2xl font-bold text-primary">{insights.pct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader
          className="p-3 sm:p-6 cursor-pointer sm:cursor-default select-none"
          onClick={() => setFiltersOpen(o => !o)}
        >
          <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </span>
            <span className="sm:hidden text-muted-foreground">
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`p-3 sm:p-6 pt-0 ${filtersOpen ? 'block' : 'hidden sm:block'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date From</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date To</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Session Status</Label>
              <Select value={filters.status} onValueChange={(val) => setFilters({ ...filters, status: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Market</Label>
              <Select value={filters.marketId} onValueChange={(val) => setFilters({ ...filters, marketId: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {markets.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee</Label>
              <Select value={filters.employeeId} onValueChange={(val) => setFilters({ ...filters, employeeId: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name || e.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Task Status</Label>
              <Select value={filters.taskStatus} onValueChange={(val) => setFilters({ ...filters, taskStatus: val })}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {REQUIRED_TASKS.map(t => (
                    <React.Fragment key={t}>
                      <SelectItem value={`pending:${t}`}>Pending: {TASK_LABELS[t]}</SelectItem>
                      <SelectItem value={`completed:${t}`}>Completed: {TASK_LABELS[t]}</SelectItem>
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </p>
            {(filters.dateFrom || filters.dateTo || filters.status || filters.marketId || filters.employeeId || filters.taskStatus) && (
              <Button variant="outline" size="sm" onClick={() => setFilters({ dateFrom: '', dateTo: '', status: '', marketId: '', employeeId: '', taskStatus: '' })} className="text-xs">
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-xs sm:text-sm">
              No sessions found matching the filters
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <Card key={session.id}>
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm sm:text-base">{session.employees?.full_name || 'Unknown'}</h3>
                      {session.role && (
                        <Badge variant="outline" className="text-[10px] uppercase">{session.role.replace('_', ' ')}</Badge>
                      )}
                      <div className="flex gap-1 flex-wrap">
                        {(session.statuses || [session.status]).map((status: string, idx: number) => (
                          <span key={idx}>{getStatusBadge(status)}</span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(session.session_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{session.markets?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>In: {session.punch_in_time ? new Date(session.punch_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Out: {session.punch_out_time ? new Date(session.punch_out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Task Completion</p>
                      <TaskPills tasks={session.tasks} />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)} className="btn-touch w-full sm:w-auto">
                    <Eye className="mr-1 h-4 w-4" />
                    <span className="text-xs sm:text-sm">View Details</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Session Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedSession?.employees?.full_name} —{' '}
              {selectedSession && new Date(selectedSession.session_date).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Employee</h4>
                  <p className="text-xs sm:text-sm"><strong>Name:</strong> {selectedSession.employees?.full_name}</p>
                  <p className="text-xs sm:text-sm"><strong>Role:</strong> {selectedSession.role || 'N/A'}</p>
                  <p className="text-xs sm:text-sm"><strong>Phone:</strong> {selectedSession.employees?.phone || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Market</h4>
                  <p className="text-xs sm:text-sm"><strong>Name:</strong> {selectedSession.markets?.name}</p>
                  <p className="text-xs sm:text-sm"><strong>Location:</strong> {selectedSession.markets?.location}</p>
                </div>
              </div>

              {/* Task Breakdown */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">Task Breakdown</h4>
                <div className="space-y-2">
                  {([...REQUIRED_TASKS, 'advanceRequest', 'leaveApplication'] as TaskKey[]).map(key => {
                    const state = selectedSession.tasks?.[key] || 'pending';
                    const isOptional = key === 'advanceRequest' || key === 'leaveApplication';
                    let timestamp: string | null = null;
                    let preview: string | null = null;

                    if (key === 'attendance' && selectedSession.punch_in_time) {
                      timestamp = new Date(selectedSession.punch_in_time).toLocaleString('en-IN');
                      preview = `Punch In recorded`;
                    } else if (key === 'stalls' && selectedSession.stalls?.length) {
                      timestamp = selectedSession.stalls[0]?.created_at ? new Date(selectedSession.stalls[0].created_at).toLocaleString('en-IN') : null;
                      preview = `${selectedSession.stalls.length} stall(s) confirmed`;
                    } else if (key === 'marketVideo') {
                      const m = selectedSession.media?.find((mm: any) => mm.media_type === 'market_video');
                      if (m) { timestamp = new Date(m.captured_at).toLocaleString('en-IN'); preview = m.file_name; }
                    } else if (key === 'cleaningVideo') {
                      const m = selectedSession.media?.find((mm: any) => mm.media_type === 'cleaning_video');
                      if (m) { timestamp = new Date(m.captured_at).toLocaleString('en-IN'); preview = m.file_name; }
                    } else if (key === 'assetInspection') {
                      const i = selectedSession.taskDetails?.inspections?.[0];
                      if (i) { timestamp = new Date(i.inspection_date).toLocaleString('en-IN'); preview = `Week of ${i.inspection_week}`; }
                    } else if (key === 'locationVisit') {
                      const v = selectedSession.taskDetails?.visits?.[0];
                      if (v) { timestamp = new Date(v.created_at).toLocaleString('en-IN'); preview = v.location_name; }
                    } else if (key === 'advanceRequest') {
                      const a = selectedSession.taskDetails?.advances?.[0];
                      if (a) { preview = `₹${a.amount} (${a.status})`; }
                    } else if (key === 'leaveApplication') {
                      const l = selectedSession.taskDetails?.leaves?.[0];
                      if (l) { preview = `${l.status} — ${l.reason || 'No reason'}`; }
                    }

                    return (
                      <div
                        key={key}
                        className={`flex items-start justify-between gap-3 rounded-md border p-2.5 ${
                          state === 'completed' ? 'border-success/30 bg-success/5'
                          : state === 'pending' && !isOptional ? 'border-destructive/30 bg-destructive/5'
                          : 'border-muted bg-muted/20'
                        }`}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <TaskIcon state={state} />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-medium">{TASK_LABELS[key]} {isOptional && <span className="text-[10px] text-muted-foreground">(optional)</span>}</p>
                            {preview && <p className="text-xs text-muted-foreground truncate">{preview}</p>}
                            {timestamp && <p className="text-[10px] text-muted-foreground">{timestamp}</p>}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{state.replace('_', ' ')}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stalls */}
              {selectedSession.stalls && selectedSession.stalls.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Stalls ({selectedSession.stalls.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedSession.stalls.map((stall: any) => (
                      <Card key={stall.id}>
                        <CardContent className="p-2 sm:p-3">
                          <p className="text-xs sm:text-sm"><strong>{stall.stall_name}</strong></p>
                          <p className="text-xs text-muted-foreground">Farmer: {stall.farmer_name}</p>
                          <p className="text-xs text-muted-foreground">Stall No: {stall.stall_no}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Media */}
              {selectedSession.media && selectedSession.media.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Media Files ({selectedSession.media.length})</h4>
                  <div className="space-y-2">
                    {selectedSession.media.map((media: any) => (
                      <Card key={media.id}>
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-medium truncate">{media.file_name}</p>
                              <p className="text-xs text-muted-foreground">Type: {media.media_type}</p>
                              <p className="text-xs text-muted-foreground">
                                Captured: {new Date(media.captured_at).toLocaleString('en-IN')}
                              </p>
                              {media.gps_lat && media.gps_lng && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {media.gps_lat.toFixed(4)}, {media.gps_lng.toFixed(4)}
                                  <a href={`https://www.google.com/maps?q=${media.gps_lat},${media.gps_lng}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-1">
                                    Map
                                  </a>
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={async () => {
                                const raw = String(media.file_url || '');
                                const ref = resolveStorageRef(raw);
                                if (!ref) {
                                  if (raw) window.open(raw, '_blank');
                                  else toast.error('File URL missing');
                                  return;
                                }
                                const signedUrl = await getSignedUrl(ref.bucket, ref.path);
                                if (signedUrl) window.open(signedUrl, '_blank');
                                else toast.error('Failed to load file. Please try again.');
                              }}
                            >
                              View File
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <SessionComments sessionId={selectedSession.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
