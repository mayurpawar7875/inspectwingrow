import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  user_id: string;
  punch_in_time: string | null;
  punch_out_time: string | null;
  attendance_date: string;
  status: string;
  employee_name: string;
  market_name: string | null;
}

export default function AttendanceWidget() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
    
    const channel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, fetchAttendance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchin' }, fetchAttendance)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_manager_punchout' }, fetchAttendance)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAttendance = async () => {
    try {
      // Fetch from attendance_records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', new Date().toISOString().split('T')[0])
        .order('punch_in_time', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Get employee and market details
      const recordsWithDetails = await Promise.all(
        (attendanceData || []).map(async (record) => {
          const { data: employee } = await supabase
            .from('employees')
            .select('full_name')
            .eq('id', record.user_id)
            .single();

          let marketName = null;
          if (record.session_id) {
            const { data: session } = await supabase
              .from('sessions')
              .select('market_id')
              .eq('id', record.session_id)
              .single();

            if (session?.market_id) {
              const { data: market } = await supabase
                .from('markets')
                .select('name')
                .eq('id', session.market_id)
                .single();
              marketName = market?.name || null;
            }
          }

          return {
            ...record,
            employee_name: employee?.full_name || 'Unknown',
            market_name: marketName,
          };
        })
      );

      setAttendance(recordsWithDetails as AttendanceRecord[]);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Attendance</CardTitle>
        <CardDescription>Employee punch in/out records</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records today
            </div>
          ) : (
            attendance.map((record) => (
              <div
                key={record.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{record.employee_name}</h4>
                    <Badge variant={record.punch_out_time ? "secondary" : "default"}>
                      {record.punch_out_time ? 'Punched Out' : 'Present'}
                    </Badge>
                  </div>
                  {record.market_name && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{record.market_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {record.punch_in_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>In: {format(new Date(record.punch_in_time), 'HH:mm')}</span>
                      </div>
                    )}
                    {record.punch_out_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Out: {format(new Date(record.punch_out_time), 'HH:mm')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
