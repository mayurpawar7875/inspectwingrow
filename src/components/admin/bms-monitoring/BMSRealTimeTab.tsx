import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, ClipboardCheck, Package, Wallet, Calendar, RefreshCw, ExternalLink } from 'lucide-react';
import { format, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';

interface AttendanceRecord {
  id: string;
  user_id: string;
  punch_in_time: string;
  punch_in_lat: number;
  punch_in_lng: number;
  selfie_url: string | null;
  employee?: { full_name: string; username: string };
}

interface AssetInspection {
  id: string;
  user_id: string;
  inspection_date: string;
  inspection_status: string;
  selfie_url: string | null;
  gps_lat: number;
  gps_lng: number;
  employee?: { full_name: string; username: string };
}

interface AdvanceRequest {
  id: string;
  requester_id: string;
  amount: number;
  reason: string;
  required_date: string;
  status: string;
  created_at: string;
  employee?: { full_name: string; username: string };
}

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_date: string;
  reason: string;
  status: string;
  created_at: string;
  employee?: { full_name: string; username: string };
}

export function BMSRealTimeTab() {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('attendance');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [inspections, setInspections] = useState<AssetInspection[]>([]);
  const [advanceRequests, setAdvanceRequests] = useState<AdvanceRequest[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const extractEmployeeMediaPath = (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return null;

    // Already a storage path
    if (!urlOrPath.startsWith('http')) return urlOrPath.replace(/^\/+/, '');

    // Extract path from any /storage/v1/object/(public/)?employee-media/<path>
    const m = urlOrPath.match(/\/storage\/v1\/object\/(?:public\/)?employee-media\/([^?]+)/);
    if (!m?.[1]) return null;
    return decodeURIComponent(m[1]);
  };

  const signEmployeeMedia = async (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return null;

    const filePath = extractEmployeeMediaPath(urlOrPath);
    if (!filePath) return urlOrPath;

    const { data, error } = await supabase.storage
      .from('employee-media')
      .createSignedUrl(filePath, 60 * 60);

    if (error || !data?.signedUrl) return urlOrPath;
    return data.signedUrl;
  };

  const getISTDateString = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = getISTDateString();
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

      // Fetch today's BMS attendance
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', today)
        .eq('role', 'bms_executive')
        .order('punch_in_time', { ascending: false });

      // Fetch this week's inspections
      const { data: inspectionsData } = await supabase
        .from('bms_asset_inspections')
        .select('*')
        .eq('inspection_week', weekStart)
        .order('inspection_date', { ascending: false });

      // Fetch pending advance requests
      const { data: advanceData } = await supabase
        .from('advance_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Fetch pending leave requests from BMS executives
      const { data: leaveData } = await supabase
        .from('employee_leaves')
        .select('*')
        .eq('status', 'pending')
        .gte('leave_date', today)
        .order('leave_date', { ascending: true });

      // Fetch employee names for all records
      const userIds = new Set([
        ...(attendanceData || []).map(a => a.user_id),
        ...(inspectionsData || []).map(i => i.user_id),
        ...(advanceData || []).map(a => a.requester_id),
        ...(leaveData || []).map(l => l.user_id)
      ]);

      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, username')
        .in('id', Array.from(userIds));

      const employeeMap = new Map((employees || []).map(e => [e.id, e]));

      const [signedAttendanceSelfies, signedInspectionSelfies] = await Promise.all([
        Promise.all(
          (attendanceData || []).map(async (a) => ({
            id: a.id,
            url: await signEmployeeMedia(a.selfie_url),
          })),
        ),
        Promise.all(
          (inspectionsData || []).map(async (i) => ({
            id: i.id,
            url: await signEmployeeMedia(i.selfie_url),
          })),
        ),
      ]);

      const attendanceSelfieMap = new Map(signedAttendanceSelfies.map((x) => [x.id, x.url]));
      const inspectionSelfieMap = new Map(signedInspectionSelfies.map((x) => [x.id, x.url]));

      setAttendance(
        (attendanceData || []).map((a) => ({
          ...a,
          selfie_url: attendanceSelfieMap.get(a.id) ?? a.selfie_url,
          employee: employeeMap.get(a.user_id),
        })),
      );

      setInspections(
        (inspectionsData || []).map((i) => ({
          ...i,
          selfie_url: inspectionSelfieMap.get(i.id) ?? i.selfie_url,
          employee: employeeMap.get(i.user_id),
        })),
      );

      setAdvanceRequests((advanceData || []).map(a => ({
        ...a,
        employee: employeeMap.get(a.requester_id)
      })));

      setLeaveRequests((leaveData || []).map(l => ({
        ...l,
        employee: employeeMap.get(l.user_id)
      })));

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const attendanceChannel = supabase
      .channel('bms-attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, fetchData)
      .subscribe();

    const inspectionChannel = supabase
      .channel('bms-inspection-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bms_asset_inspections' }, fetchData)
      .subscribe();

    const advanceChannel = supabase
      .channel('advance-request-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advance_requests' }, fetchData)
      .subscribe();

    const leaveChannel = supabase
      .channel('bms-leave-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_leaves' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(inspectionChannel);
      supabase.removeChannel(advanceChannel);
      supabase.removeChannel(leaveChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Today: {format(new Date(), 'MMM d, yyyy')}
        </p>
        <Button variant="outline" size="sm" onClick={fetchData} className="h-8">
          <RefreshCw className="h-3 w-3 mr-1" />
          <span className="text-xs">Refresh</span>
        </Button>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="w-full h-auto p-1 flex flex-col gap-1 sm:grid sm:grid-cols-4 sm:gap-0">
          <TabsTrigger value="attendance" className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-1 text-xs px-3 py-2 sm:px-2 sm:py-1.5">
            <ClipboardCheck className="h-3 w-3 shrink-0" />
            <span className="truncate">Attendance ({attendance.length})</span>
          </TabsTrigger>
          <TabsTrigger value="inspections" className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-1 text-xs px-3 py-2 sm:px-2 sm:py-1.5">
            <Package className="h-3 w-3 shrink-0" />
            <span className="truncate">Inspections ({inspections.length})</span>
          </TabsTrigger>
          <TabsTrigger value="advance" className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-1 text-xs px-3 py-2 sm:px-2 sm:py-1.5">
            <Wallet className="h-3 w-3 shrink-0" />
            <span className="truncate">Advance ({advanceRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="leave" className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-1 text-xs px-3 py-2 sm:px-2 sm:py-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            <span className="truncate">Leave ({leaveRequests.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-3">
          {attendance.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                No BMS attendance records for today
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {attendance.map((record) => (
                <div key={record.id} className="border rounded-lg p-3 flex items-center gap-3">
                  {record.selfie_url && (
                    <img 
                      src={record.selfie_url} 
                      alt="Selfie" 
                      loading="lazy"
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{record.employee?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(record.punch_in_time), 'h:mm a')}</p>
                  </div>
                  {record.punch_in_lat && record.punch_in_lng && (
                    <a
                      href={`https://www.google.com/maps?q=${record.punch_in_lat},${record.punch_in_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs shrink-0"
                    >
                      <MapPin className="h-3 w-3" />
                      View
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inspections" className="mt-3">
          {inspections.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                No inspections this week
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {inspections.map((inspection) => (
                <div key={inspection.id} className="border rounded-lg p-3 flex items-center gap-3">
                  {inspection.selfie_url && (
                    <img 
                      src={inspection.selfie_url} 
                      alt="Selfie" 
                      loading="lazy"
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inspection.employee?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(inspection.inspection_date), 'MMM d, h:mm a')}</p>
                  </div>
                  <Badge variant={inspection.inspection_status === 'on_time' ? 'default' : 'destructive'} className="text-[10px] shrink-0">
                    {inspection.inspection_status === 'on_time' ? 'On Time' : 'Late'}
                  </Badge>
                  {inspection.gps_lat && inspection.gps_lng && (
                    <a
                      href={`https://www.google.com/maps?q=${inspection.gps_lat},${inspection.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1 text-xs shrink-0"
                    >
                      <MapPin className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="advance" className="mt-3">
          {advanceRequests.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                No pending advance requests
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {advanceRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{request.employee?.full_name || 'Unknown'}</p>
                    <p className="text-sm font-semibold text-primary">₹{request.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{request.reason}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Required: {format(new Date(request.required_date), 'MMM d')}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="default" className="h-7 px-2 text-[10px]" onClick={() => handleAdvanceAction(request.id, 'approved')}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]" onClick={() => handleAdvanceAction(request.id, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leave" className="mt-3">
          {leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                No pending leave requests
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {leaveRequests.map((leave) => (
                <div key={leave.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{leave.employee?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(leave.leave_date), 'MMM d, yyyy')}</p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{leave.reason}</p>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="default" className="h-7 px-2 text-[10px]" onClick={() => handleLeaveAction(leave.id, 'approved')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]" onClick={() => handleLeaveAction(leave.id, 'rejected')}>
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  async function handleAdvanceAction(id: string, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('advance_requests')
        .update({ 
          status, 
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating advance request:', error);
    }
  }

  async function handleLeaveAction(id: string, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('employee_leaves')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating leave request:', error);
    }
  }
}
