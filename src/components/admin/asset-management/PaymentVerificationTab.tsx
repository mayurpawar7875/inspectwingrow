import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function PaymentVerificationTab() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPayments();

    const channel = supabase
      .channel('payments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_payments' }, fetchPayments)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('asset_payments')
      .select(`
        *,
        asset_requests(*, employees(full_name, email)),
        asset_inventory(asset_name)
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false });
    setPayments(data || []);
  };

  const handleVerify = async (paymentId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('asset_payments')
        .update({
          verification_status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          verification_notes: verificationNotes || null,
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment verified successfully');
      setSelectedPayment(null);
      setVerificationNotes('');
      fetchPayments();
    } catch (error) {
      toast.error('Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-3 md:p-6">
        <CardTitle className="text-sm md:text-lg">Payment Verification</CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] md:text-sm">Requester</TableHead>
              <TableHead className="text-[10px] md:text-sm">Asset</TableHead>
              <TableHead className="text-[10px] md:text-sm">Payment Mode</TableHead>
              <TableHead className="text-[10px] md:text-sm">Amount</TableHead>
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Payment Date</TableHead>
              <TableHead className="text-[10px] md:text-sm hidden md:table-cell">Proof</TableHead>
              <TableHead className="text-[10px] md:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="py-2 md:py-4">
                  <div className="text-[10px] md:text-sm">{payment.asset_requests?.employees?.full_name || 'N/A'}</div>
                  <div className="text-[9px] md:text-xs text-muted-foreground hidden md:block">
                    {payment.asset_requests?.employees?.email}
                  </div>
                </TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">{payment.asset_inventory?.asset_name}</TableCell>
                <TableCell className="capitalize text-[10px] md:text-sm py-2 md:py-4">{payment.payment_mode}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">₹{payment.amount_received}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4 hidden md:table-cell">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</TableCell>
                <TableCell className="hidden md:table-cell py-2 md:py-4">
                  {payment.payment_proof_url ? (
                    <a
                      href={payment.payment_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline text-[10px] md:text-sm"
                    >
                      View <ExternalLink className="h-2.5 w-2.5 md:h-3 md:w-3" />
                    </a>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="py-2 md:py-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setSelectedPayment(payment)} className="text-[10px] md:text-sm h-6 md:h-8 px-2 md:px-3">
                        Verify
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="text-sm md:text-lg">Verify Payment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="bg-muted p-3 md:p-4 rounded-md space-y-2 text-xs md:text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">Asset:</span>
                            <span>{payment.asset_inventory?.asset_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Amount:</span>
                            <span>₹{payment.amount_received}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Mode:</span>
                            <span className="capitalize">{payment.payment_mode}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs md:text-sm">Verification Notes (Optional)</Label>
                          <Textarea
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            placeholder="Add any notes about the verification"
                            rows={3}
                            className="text-xs md:text-sm"
                          />
                        </div>

                        <Button
                          onClick={() => handleVerify(payment.id)}
                          disabled={loading}
                          className="w-full text-xs md:text-sm h-8 md:h-10"
                        >
                          {loading ? 'Verifying...' : 'Confirm Verification'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground text-[10px] md:text-sm">
                  No pending payment verifications
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}