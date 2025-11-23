import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';

interface StallInspection {
  id: string;
  farmer_name: string;
  stall_name: string;
  stall_no: string | null;
  rating: number | null;
  feedback: string | null;
  created_at: string;
  session_id: string;
  employee_name: string;
}

interface Props {
  marketId: string;
  marketDate: string;
  isToday: boolean;
}

export function StallInspectionsSection({ marketId, marketDate, isToday }: Props) {
  const [inspections, setInspections] = useState<StallInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspections();

    if (isToday) {
      const channel = supabase
        .channel('stall-inspections-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stall_inspections',
          },
          () => {
            fetchInspections();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [marketId, marketDate, isToday]);

  const fetchInspections = async () => {
    try {
      const { data, error } = await supabase
        .from('stall_inspections')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Get sessions to map session_id to user_id
        const sessionIds = [...new Set(data.map(i => i.session_id))];
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, user_id, session_date')
          .in('id', sessionIds)
          .eq('session_date', marketDate);

        const sessionUserMap = new Map((sessions || []).map((s: any) => [s.id, s.user_id]));
        const userIds = [...new Set(Array.from(sessionUserMap.values()))];
        
        const { data: employees } = await supabase
          .from('employees')
          .select('id, full_name')
          .in('id', userIds);

        const employeeMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);

        const formattedInspections = data.map(i => ({
          ...i,
          employee_name: employeeMap.get(sessionUserMap.get(i.session_id) || '') || 'Unknown',
        }));

        setInspections(formattedInspections as any);
      }
    } catch (error) {
      console.error('Error fetching stall inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const CheckIcon = ({ checked }: { checked: boolean }) => 
    checked ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Stall Inspections</CardTitle>
          <Badge variant="secondary">{inspections.length} Inspections</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {inspections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No stall inspections submitted yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Farmer Name</TableHead>
                  <TableHead>Stall Name</TableHead>
                  <TableHead>Stall No</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell>{format(new Date(inspection.created_at), 'hh:mm a')}</TableCell>
                    <TableCell>{inspection.employee_name}</TableCell>
                    <TableCell>{inspection.farmer_name}</TableCell>
                    <TableCell>{inspection.stall_name}</TableCell>
                    <TableCell>{inspection.stall_no || '—'}</TableCell>
                    <TableCell>{inspection.rating || '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{inspection.feedback || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
