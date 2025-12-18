import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportCSV } from '@/lib/utils';

interface AssetUsage {
  id: string;
  asset_name: string;
  employee_name: string;
  quantity: number;
  return_date: string | null;
  created_at: string;
  markets?: { name: string };
}

interface MoneyRecovery {
  id: string;
  stall_name: string;
  farmer_name: string;
  item_name: string;
  pending_amount: number;
  received_amount: number;
  created_at: string;
}

export function AssetsTab() {
  const [usage, setUsage] = useState<AssetUsage[]>([]);
  const [recovery, setRecovery] = useState<MoneyRecovery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    const channelUsage = supabase
      .channel('assets-usage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets_usage' }, fetchData)
      .subscribe();

    const channelRecovery = supabase
      .channel('money-recovery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets_money_recovery' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channelUsage);
      supabase.removeChannel(channelRecovery);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [usageData, recoveryData] = await Promise.all([
      supabase.from('assets_usage').select('*, markets(name)').order('created_at', { ascending: false }),
      supabase.from('assets_money_recovery').select('*').order('created_at', { ascending: false }),
    ]);
    setUsage((usageData.data as AssetUsage[]) || []);
    setRecovery((recoveryData.data as MoneyRecovery[]) || []);
    setLoading(false);
  };

  const handleExportUsage = () => {
    const headers = ['Asset', 'Employee', 'Market', 'Quantity', 'Return Date', 'Created At'];
    const rows = usage.map((item) => [
      item.asset_name,
      item.employee_name,
      item.markets?.name || '-',
      String(item.quantity),
      item.return_date ? new Date(item.return_date).toLocaleDateString() : '-',
      new Date(item.created_at).toLocaleString()
    ]);
    exportCSV('assets_usage', headers, rows);
  };

  const handleExportRecovery = () => {
    const headers = ['Stall', 'Farmer', 'Item', 'Pending Amount', 'Received Amount', 'Created At'];
    const rows = recovery.map((item) => [
      item.stall_name,
      item.farmer_name,
      item.item_name,
      String(item.pending_amount),
      String(item.received_amount),
      new Date(item.created_at).toLocaleString()
    ]);
    exportCSV('money_recovery', headers, rows);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assets Usage</CardTitle>
          <Button onClick={handleExportUsage} variant="outline" size="sm" disabled={usage.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No asset usage records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Return Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.asset_name}</TableCell>
                    <TableCell>{item.employee_name}</TableCell>
                    <TableCell>{item.markets?.name || '-'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.return_date ? new Date(item.return_date).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Money Recovery</CardTitle>
          <Button onClick={handleExportRecovery} variant="outline" size="sm" disabled={recovery.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          {recovery.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No money recovery records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stall</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recovery.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.stall_name}</TableCell>
                    <TableCell>{item.farmer_name}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell className="text-destructive">₹{item.pending_amount}</TableCell>
                    <TableCell className="text-green-600">₹{item.received_amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
