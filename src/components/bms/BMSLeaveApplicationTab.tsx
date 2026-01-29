import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Calendar, Plus, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format, isBefore, parseISO, isAfter, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LeaveRequest {
  id: string;
  leave_date: string;
  reason: string | null;
  status: string;
  created_at: string;
}

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Personal Leave',
  'Emergency Leave'
];

export function BMSLeaveApplicationTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, [user]);

  const fetchLeaves = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_leaves')
        .select('*')
        .eq('user_id', user.id)
        .order('leave_date', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (error: any) {
      console.error('Error fetching leaves:', error);
      toast.error('Failed to load leaves');
    } finally {
      setLoading(false);
    }
  };

  const checkOverlap = async (from: string, to: string): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase
      .from('employee_leaves')
      .select('leave_date')
      .eq('user_id', user.id)
      .neq('status', 'rejected')
      .gte('leave_date', from)
      .lte('leave_date', to);

    if (error) {
      console.error('Error checking overlap:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  };

  const handleSubmit = async () => {
    if (!user || !leaveType || !fromDate || !toDate || !reason) {
      toast.error('Please fill all fields');
      return;
    }

    const from = parseISO(fromDate);
    const to = parseISO(toDate);

    if (isBefore(to, from)) {
      toast.error('End date must be after start date');
      return;
    }

    setSubmitting(true);
    try {
      // Check for overlapping leaves
      const hasOverlap = await checkOverlap(fromDate, toDate);
      if (hasOverlap) {
        toast.error('You already have leave applied for some of these dates');
        setSubmitting(false);
        return;
      }

      // Create leave entries for each day
      const leaveEntries: { user_id: string; leave_date: string; reason: string; status: string }[] = [];
      let currentDate = from;
      
      while (!isAfter(currentDate, to)) {
        leaveEntries.push({
          user_id: user.id,
          leave_date: format(currentDate, 'yyyy-MM-dd'),
          reason: `${leaveType}: ${reason}`,
          status: 'pending'
        });
        currentDate = addDays(currentDate, 1);
      }

      const { error } = await supabase
        .from('employee_leaves')
        .insert(leaveEntries);

      if (error) throw error;

      toast.success('Leave application submitted successfully!');
      setDialogOpen(false);
      setLeaveType('');
      setFromDate('');
      setToDate('');
      setReason('');
      fetchLeaves();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit leave');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  // Group leaves by month
  const groupedLeaves = leaves.reduce((acc, leave) => {
    const month = format(new Date(leave.leave_date), 'MMMM yyyy');
    if (!acc[month]) acc[month] = [];
    acc[month].push(leave);
    return acc;
  }, {} as Record<string, LeaveRequest[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Leave Applications
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from-date">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to-date">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    min={fromDate || format(new Date(), 'yyyy-MM-dd')}
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain the reason for leave"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!leaveType || !fromDate || !toDate || !reason || submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leaves List */}
      {leaves.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No leave applications yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Apply Leave" to submit one</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLeaves).map(([month, monthLeaves]) => (
            <div key={month}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{month}</h3>
              <div className="space-y-2">
                {monthLeaves.map((leave) => (
                  <Card key={leave.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {format(new Date(leave.leave_date), 'EEEE, MMMM d')}
                            </span>
                            {getStatusBadge(leave.status)}
                          </div>
                          {leave.reason && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{leave.reason}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
