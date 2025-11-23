import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface LeaveRequest {
  id: string;
  user_id: string;
  leave_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  employee_name: string;
}

export default function LeaveRequestsWidget() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
    
    const channel = supabase
      .channel('leave-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_leaves' }, fetchLeaves)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaves = async () => {
    try {
      const { data: leavesData, error } = await supabase
        .from('employee_leaves')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get employee names
      const leavesWithNames = await Promise.all(
        (leavesData || []).map(async (leave) => {
          const { data: employee } = await supabase
            .from('employees')
            .select('full_name')
            .eq('id', leave.user_id)
            .single();

          return {
            ...leave,
            employee_name: employee?.full_name || 'Unknown',
          };
        })
      );

      setLeaves(leavesWithNames as LeaveRequest[]);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('employee_leaves')
        .update({
          status: 'approved',
          approved_by: user.id,
        })
        .eq('id', leaveId);

      if (error) throw error;

      toast.success('Leave request approved');
      fetchLeaves();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave request');
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('employee_leaves')
        .update({
          status: 'rejected',
          approved_by: user.id,
        })
        .eq('id', leaveId);

      if (error) throw error;

      toast.success('Leave request rejected');
      fetchLeaves();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave request');
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
        <CardTitle>Leave Requests</CardTitle>
        <CardDescription>Employee leave applications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leave requests
            </div>
          ) : (
            leaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{leave.employee_name}</h4>
                    <Badge variant={
                      leave.status === 'approved' ? 'default' :
                      leave.status === 'rejected' ? 'destructive' :
                      'secondary'
                    }>
                      {leave.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(leave.leave_date), 'MMM dd, yyyy')}</span>
                  </div>
                  {leave.reason && (
                    <p className="text-sm text-muted-foreground">{leave.reason}</p>
                  )}
                </div>
                {leave.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(leave.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(leave.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
