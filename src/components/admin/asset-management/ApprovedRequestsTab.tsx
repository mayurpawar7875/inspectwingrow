import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';

export function ApprovedRequestsTab() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('approved-requests-changes')
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
      .eq('status', 'approved')
      .order('approval_date', { ascending: false });
    setRequests(data || []);
  };

  const handleMarkReturned = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('asset_requests')
        .update({
          status: 'returned',
          actual_return_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Asset marked as returned');
      fetchRequests();
    } catch (error) {
      toast.error('Failed to mark as returned');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-3 md:p-6">
        <CardTitle className="text-sm md:text-lg">Approved Asset Requests</CardTitle>
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
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Approval Date</TableHead>
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Expected Return</TableHead>
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
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4 hidden md:table-cell">
                  {request.approval_date ? format(new Date(request.approval_date), 'MMM dd, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4 hidden md:table-cell">
                  {format(new Date(request.expected_return_date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="py-2 md:py-4">
                  <Button
                    size="sm"
                    onClick={() => handleMarkReturned(request.id)}
                    disabled={loading}
                    className="text-[9px] md:text-sm h-6 md:h-8 px-1.5 md:px-3"
                  >
                    Return
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground text-[10px] md:text-sm">
                  No approved requests
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}