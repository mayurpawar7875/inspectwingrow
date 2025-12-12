import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function PendingRequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('pending-requests-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_requests' }, fetchRequests)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('asset_requests')
      .select('*, asset_inventory(asset_name), markets(name), employees(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
  };

  const handleApprove = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('asset_requests')
        .update({
          status: 'approved',
          approval_date: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Request approved successfully');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('asset_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: user?.id,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Request rejected');
      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-3 md:p-6">
        <CardTitle className="text-sm md:text-lg">Pending Asset Requests</CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] md:text-sm">Requester</TableHead>
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Role</TableHead>
              <TableHead className="text-[10px] md:text-sm">Asset</TableHead>
              <TableHead className="text-[10px] md:text-sm">Qty</TableHead>
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Market</TableHead>
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Purpose</TableHead>
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Return Date</TableHead>
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Request Date</TableHead>
              <TableHead className="text-[10px] md:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="py-2 md:py-4">
                  <div className="text-[10px] md:text-sm">{request.employees?.full_name || 'N/A'}</div>
                  <div className="text-[9px] md:text-xs text-muted-foreground hidden md:block">{request.employees?.email}</div>
                </TableCell>
                <TableCell className="capitalize text-[10px] md:text-sm py-2 md:py-4 hidden md:table-cell">{request.requester_role}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">{request.asset_inventory?.asset_name}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">{request.quantity}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4 hidden md:table-cell">{request.markets?.name || '-'}</TableCell>
                <TableCell className="max-w-xs truncate text-[10px] md:text-sm py-2 md:py-4 hidden md:table-cell">{request.purpose}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4 hidden md:table-cell">{format(new Date(request.expected_return_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4 hidden md:table-cell">{format(new Date(request.created_at), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="py-2 md:py-4">
                  <div className="flex gap-1 md:gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(request.id)}
                      disabled={loading}
                      className="h-6 md:h-8 w-6 md:w-8 p-0"
                    >
                      <Check className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedRequest(request)}
                          className="h-6 md:h-8 w-6 md:w-8 p-0"
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-sm md:text-lg">Reject Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs md:text-sm">Rejection Reason *</Label>
                            <Textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Provide a reason for rejection"
                              rows={4}
                              className="text-xs md:text-sm"
                            />
                          </div>
                          <Button onClick={handleReject} disabled={loading} variant="destructive" className="w-full text-xs md:text-sm h-8 md:h-10">
                            {loading ? 'Rejecting...' : 'Confirm Rejection'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground text-[10px] md:text-sm">
                  No pending requests
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}