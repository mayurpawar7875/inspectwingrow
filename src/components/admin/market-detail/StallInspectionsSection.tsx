import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface StallInspection {
  id: string;
  farmer_name: string;
  stall_name: string;
  stall_no: string | null;
  rating: number | null;
  feedback: string | null;
  session_id: string;
  market_id: string;
  created_at: string;
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
        const sessionIds = [...new Set(data.map(i => i.session_id))];
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id, user_id, session_date')
          .in('id', sessionIds);

        // Filter sessions by date
        const validSessions = sessions?.filter(s => s.session_date === marketDate) || [];
        const userIds = [...new Set(validSessions.map(s => s.user_id))];
        
        const { data: employees } = await supabase
          .from('employees')
          .select('id, full_name')
          .in('id', userIds);

        const sessionUserMap = new Map(validSessions?.map(s => [s.id, s.user_id]) || []);
        const employeeMap = new Map(employees?.map(e => [e.id, e.full_name]) || []);

        const formattedInspections = data
          .filter(i => validSessions.find(s => s.id === i.session_id))
          .map(i => {
            const userId = sessionUserMap.get(i.session_id);
            return {
              ...i,
              employee_name: userId ? (employeeMap.get(userId) || 'Unknown') : 'Unknown',
            };
          });

        setInspections(formattedInspections);
      }
    } catch (error) {
      console.error('Error fetching stall inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center text-xs sm:text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 sm:py-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Stall Inspections</CardTitle>
          <Badge variant="secondary" className="text-xs">{inspections.length} Inspections</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {inspections.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
            No stall inspections submitted yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Time</TableHead>
                  <TableHead className="text-xs sm:text-sm">Employee</TableHead>
                  <TableHead className="text-xs sm:text-sm">Farmer</TableHead>
                  <TableHead className="text-xs sm:text-sm">Stall</TableHead>
                  <TableHead className="text-xs sm:text-sm">No</TableHead>
                  <TableHead className="text-xs sm:text-sm">Rating</TableHead>
                  <TableHead className="text-xs sm:text-sm">Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="text-xs sm:text-sm">{format(new Date(inspection.created_at), 'hh:mm a')}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{inspection.employee_name}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{inspection.farmer_name}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{inspection.stall_name}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{inspection.stall_no || '-'}</TableCell>
                    <TableCell className="text-xs sm:text-sm">
                      {inspection.rating ? (
                        <span>{'⭐'.repeat(inspection.rating)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-xs sm:text-sm max-w-xs truncate">
                      {inspection.feedback || '-'}
                    </TableCell>
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
