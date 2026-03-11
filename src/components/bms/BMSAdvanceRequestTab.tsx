import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Wallet, Plus, Loader2, CheckCircle2, Clock, XCircle, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AdvanceRequest {
  id: string;
  amount: number;
  reason: string;
  required_date: string;
  status: string;
  review_notes: string | null;
  created_at: string;
}

export function BMSAdvanceRequestTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [requiredDate, setRequiredDate] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('advance_requests')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !amount || !reason || !requiredDate) {
      toast.error('Please fill all fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('advance_requests')
        .insert({
          requester_id: user.id,
          amount: numAmount,
          reason,
          required_date: requiredDate,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Request submitted successfully!');
      setDialogOpen(false);
      setAmount('');
      setReason('');
      setRequiredDate('');
      fetchRequests();
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit request');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm md:text-lg font-semibold flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 md:h-5 md:w-5" />
          Advance Requests
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs px-2">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] md:w-auto max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm md:text-lg">New Advance Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 pt-2">
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-[11px] md:text-sm">Amount (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="reason" className="text-[11px] md:text-sm">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Explain why you need this advance"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="text-xs min-h-[48px]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="required-date" className="text-[11px] md:text-sm">Required By</Label>
                <Input
                  id="required-date"
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!amount || !reason || !requiredDate || submitting}
                className="w-full h-8 text-xs"
              >
                {submitting ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Submitting...</>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <Card className="shadow-none border">
          <CardContent className="py-6 text-center">
            <Wallet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No advance requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map((request) => (
            <Card key={request.id} className="shadow-none border">
              <CardContent className="p-2.5 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm md:text-lg">₹{request.amount.toLocaleString('en-IN')}</span>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{request.reason}</p>
                    <p className="text-[10px] text-muted-foreground">
                      By: {format(new Date(request.required_date), 'MMM d')} • {format(new Date(request.created_at), 'MMM d')}
                    </p>
                  </div>
                </div>
                {request.review_notes && (
                  <div className="mt-1.5 p-1.5 bg-muted rounded text-[11px]">
                    <span className="font-medium">Note: </span>{request.review_notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
