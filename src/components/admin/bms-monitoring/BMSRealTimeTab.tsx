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
  selfie_url: string;
  employee?: { full_name: string; username: string };
}

interface AssetInspection {
  id: string;
  user_id: string;
  inspection_date: string;
  inspection_status: string;
  selfie_url: string;
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

      setAttendance((attendanceData || []).map(a => ({
        ...a,
        employee: employeeMap.get(a.user_id)
      })));

      setInspections((inspectionsData || []).map(i => ({
        ...i,
        employee: employeeMap.get(i.user_id)
      })));

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Today: {format(new Date(), 'MMM d, yyyy')}</span>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance" className="flex items-center gap-1 text-xs">
            <ClipboardCheck className="h-3 w-3" />
            Attendance ({attendance.length})
          </TabsTrigger>
          <TabsTrigger value="inspections" className="flex items-center gap-1 text-xs">
            <Package className="h-3 w-3" />
            Inspections ({inspections.length})
          </TabsTrigger>
          <TabsTrigger value="advance" className="flex items-center gap-1 text-xs">
            <Wallet className="h-3 w-3" />
            Advance ({advanceRequests.length})
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            Leave ({leaveRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          {attendance.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No BMS attendance records for today
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check-in Time</TableHead>
                    <TableHead>Selfie</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.employee?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.punch_in_time), 'h:mm a')}
                      </TableCell>
                      <TableCell>
                        {record.selfie_url && (
                          <img 
                            src={record.selfie_url} 
                            alt="Selfie" 
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {record.punch_in_lat && record.punch_in_lng && (
                          <a
                            href={`https://www.google.com/maps?q=${record.punch_in_lat},${record.punch_in_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <MapPin className="h-3 w-3" />
                            View
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inspections" className="mt-4">
          {inspections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No inspections this week
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Selfie</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((inspection) => (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">
                        {inspection.employee?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(inspection.inspection_date), 'MMM d, h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inspection.inspection_status === 'on_time' ? 'default' : 'destructive'}>
                          {inspection.inspection_status === 'on_time' ? 'On Time' : 'Late'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inspection.selfie_url && (
                          <img 
                            src={inspection.selfie_url} 
                            alt="Selfie" 
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {inspection.gps_lat && inspection.gps_lng && (
                          <a
                            href={`https://www.google.com/maps?q=${inspection.gps_lat},${inspection.gps_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <MapPin className="h-3 w-3" />
                            View
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advance" className="mt-4">
          {advanceRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending advance requests
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Required By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advanceRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.employee?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>₹{request.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                      <TableCell>{format(new Date(request.required_date), 'MMM d')}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" onClick={() => handleAdvanceAction(request.id, 'approved')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAdvanceAction(request.id, 'rejected')}>
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          {leaveRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending leave requests
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium">
                        {leave.employee?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{format(new Date(leave.leave_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{leave.reason}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" onClick={() => handleLeaveAction(leave.id, 'approved')}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleLeaveAction(leave.id, 'rejected')}>
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
