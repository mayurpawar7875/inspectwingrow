import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, ClipboardCheck, Package, Wallet, Calendar, Download, Search, Eye } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Employee {
  id: string;
  full_name: string;
  username: string;
}

export function BMSHistoryTab() {
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('attendance');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [inspectionHistory, setInspectionHistory] = useState<any[]>([]);
  const [advanceHistory, setAdvanceHistory] = useState<any[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const extractEmployeeMediaPath = (urlOrPath: string | null | undefined) => {
    if (!urlOrPath) return null;
    if (!urlOrPath.startsWith('http')) return urlOrPath.replace(/^\/+/, '');
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

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fromDate, toDate, selectedEmployee, activeSection]);

  const fetchEmployees = async () => {
    try {
      // Fetch BMS executives from user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'bms_executive');

      if (roleData && roleData.length > 0) {
        const userIds = roleData.map(r => r.user_id);
        const { data: employeeData } = await supabase
          .from('employees')
          .select('id, full_name, username')
          .in('id', userIds);
        
        setEmployees(employeeData || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const employeeFilter = selectedEmployee !== 'all' ? selectedEmployee : null;

      switch (activeSection) {
        case 'attendance':
          await fetchAttendanceHistory(employeeFilter);
          break;
        case 'inspections':
          await fetchInspectionHistory(employeeFilter);
          break;
        case 'advance':
          await fetchAdvanceHistory(employeeFilter);
          break;
        case 'leave':
          await fetchLeaveHistory(employeeFilter);
          break;
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async (employeeId: string | null) => {
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('role', 'bms_executive')
      .gte('attendance_date', fromDate)
      .lte('attendance_date', toDate)
      .order('attendance_date', { ascending: false });

    if (employeeId) {
      query = query.eq('user_id', employeeId);
    }

    const { data } = await query;

    const signedSelfies = await Promise.all(
      (data || []).map(async (d) => ({
        id: d.id,
        url: await signEmployeeMedia(d.selfie_url),
      })),
    );
    const selfieMap = new Map(signedSelfies.map((x) => [x.id, x.url]));
    
    // Fetch employee names
    const userIds = [...new Set((data || []).map(d => d.user_id))];
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, username')
      .in('id', userIds);

    const empMap = new Map((empData || []).map(e => [e.id, e]));
    setAttendanceHistory(
      (data || []).map((d) => ({
        ...d,
        selfie_url: selfieMap.get(d.id) ?? d.selfie_url,
        employee: empMap.get(d.user_id),
      })),
    );
  };

  const fetchInspectionHistory = async (employeeId: string | null) => {
    let query = supabase
      .from('bms_asset_inspections')
      .select('*')
      .gte('inspection_week', fromDate)
      .lte('inspection_week', toDate)
      .order('inspection_date', { ascending: false });

    if (employeeId) {
      query = query.eq('user_id', employeeId);
    }

    const { data } = await query;

    const signedSelfies = await Promise.all(
      (data || []).map(async (d) => ({
        id: d.id,
        url: await signEmployeeMedia(d.selfie_url),
      })),
    );
    const selfieMap = new Map(signedSelfies.map((x) => [x.id, x.url]));
    
    const userIds = [...new Set((data || []).map(d => d.user_id))];
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, username')
      .in('id', userIds);

    const empMap = new Map((empData || []).map(e => [e.id, e]));
    setInspectionHistory(
      (data || []).map((d) => ({
        ...d,
        selfie_url: selfieMap.get(d.id) ?? d.selfie_url,
        employee: empMap.get(d.user_id),
      })),
    );
  };

  const fetchAdvanceHistory = async (employeeId: string | null) => {
    let query = supabase
      .from('advance_requests')
      .select('*')
      .gte('created_at', `${fromDate}T00:00:00`)
      .lte('created_at', `${toDate}T23:59:59`)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('requester_id', employeeId);
    }

    const { data } = await query;
    
    const userIds = [...new Set((data || []).map(d => d.requester_id))];
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, username')
      .in('id', userIds);

    const empMap = new Map((empData || []).map(e => [e.id, e]));
    setAdvanceHistory((data || []).map(d => ({
      ...d,
      employee: empMap.get(d.requester_id)
    })));
  };

  const fetchLeaveHistory = async (employeeId: string | null) => {
    let query = supabase
      .from('employee_leaves')
      .select('*')
      .gte('leave_date', fromDate)
      .lte('leave_date', toDate)
      .order('leave_date', { ascending: false });

    if (employeeId) {
      query = query.eq('user_id', employeeId);
    }

    const { data } = await query;
    
    const userIds = [...new Set((data || []).map(d => d.user_id))];
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, username')
      .in('id', userIds);

    const empMap = new Map((empData || []).map(e => [e.id, e]));
    setLeaveHistory((data || []).map(d => ({
      ...d,
      employee: empMap.get(d.user_id)
    })));
  };

  const exportToCSV = () => {
    let data: any[] = [];
    let filename = '';
    
    switch (activeSection) {
      case 'attendance':
        data = attendanceHistory.map(r => ({
          Employee: r.employee?.full_name || 'Unknown',
          Date: r.attendance_date,
          'Check-in Time': r.punch_in_time ? format(new Date(r.punch_in_time), 'HH:mm') : '',
          Latitude: r.punch_in_lat,
          Longitude: r.punch_in_lng
        }));
        filename = 'bms-attendance';
        break;
      case 'inspections':
        data = inspectionHistory.map(r => ({
          Employee: r.employee?.full_name || 'Unknown',
          'Week Of': r.inspection_week,
          'Inspection Date': format(new Date(r.inspection_date), 'yyyy-MM-dd HH:mm'),
          Status: r.inspection_status,
          Latitude: r.gps_lat,
          Longitude: r.gps_lng
        }));
        filename = 'bms-inspections';
        break;
      case 'advance':
        data = advanceHistory.map(r => ({
          Employee: r.employee?.full_name || 'Unknown',
          Amount: r.amount,
          Reason: r.reason,
          'Required Date': r.required_date,
          Status: r.status,
          'Submitted At': format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')
        }));
        filename = 'bms-advance-requests';
        break;
      case 'leave':
        data = leaveHistory.map(r => ({
          Employee: r.employee?.full_name || 'Unknown',
          'Leave Date': r.leave_date,
          Reason: r.reason,
          Status: r.status
        }));
        filename = 'bms-leave-requests';
        break;
    }

    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${fromDate}-to-${toDate}.csv`);
    link.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'on_time':
        return <Badge className="bg-green-500">On Time</Badge>;
      case 'late':
        return <Badge variant="destructive">Late</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="space-y-2">
          <Label>From Date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>To Date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>BMS Executive</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="All Executives" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Executives</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button onClick={exportToCSV} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="w-full h-auto p-1 flex flex-col gap-1 sm:grid sm:grid-cols-4 sm:gap-0">
          <TabsTrigger value="attendance" className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-1 text-xs px-3 py-2 sm:px-2 sm:py-1.5">
            <ClipboardCheck className="h-3 w-3" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="inspections" className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-1 text-xs px-3 py-2 sm:px-2 sm:py-1.5">
            <Package className="h-3 w-3" />
            Inspections
          </TabsTrigger>
          <TabsTrigger value="advance" className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-1 text-xs px-3 py-2 sm:px-2 sm:py-1.5">
            <Wallet className="h-3 w-3" />
            Advance
          </TabsTrigger>
          <TabsTrigger value="leave" className="w-full flex items-center justify-start sm:justify-center gap-2 sm:gap-1 text-xs px-3 py-2 sm:px-2 sm:py-1.5">
            <Calendar className="h-3 w-3" />
            Leave
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <TabsContent value="attendance" className="mt-4">
              {attendanceHistory.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No attendance records found
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Selfie</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.employee?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{format(new Date(record.attendance_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            {record.punch_in_time ? format(new Date(record.punch_in_time), 'h:mm a') : '-'}
                          </TableCell>
                          <TableCell>
                            {record.selfie_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Check-in Selfie</DialogTitle>
                                  </DialogHeader>
                                  <img src={record.selfie_url} alt="Selfie" loading="lazy" className="w-full rounded-lg" />
                                </DialogContent>
                              </Dialog>
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
              {inspectionHistory.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No inspection records found
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Week</TableHead>
                        <TableHead>Inspection Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Selfie</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspectionHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.employee?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{format(new Date(record.inspection_week), 'MMM d')}</TableCell>
                          <TableCell>{format(new Date(record.inspection_date), 'MMM d, h:mm a')}</TableCell>
                          <TableCell>{getStatusBadge(record.inspection_status)}</TableCell>
                          <TableCell>
                            {record.selfie_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Inspection Selfie</DialogTitle>
                                  </DialogHeader>
                                  <img src={record.selfie_url} alt="Selfie" loading="lazy" className="w-full rounded-lg" />
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.gps_lat && record.gps_lng && (
                              <a
                                href={`https://www.google.com/maps?q=${record.gps_lat},${record.gps_lng}`}
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
              {advanceHistory.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No advance requests found
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Required By</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advanceHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.employee?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>₹{record.amount.toLocaleString('en-IN')}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{record.reason}</TableCell>
                          <TableCell>{format(new Date(record.required_date), 'MMM d')}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>{format(new Date(record.created_at), 'MMM d')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="leave" className="mt-4">
              {leaveHistory.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No leave records found
                  </CardContent>
                </Card>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Leave Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveHistory.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {record.employee?.full_name || 'Unknown'}
                          </TableCell>
                          <TableCell>{format(new Date(record.leave_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{record.reason}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
