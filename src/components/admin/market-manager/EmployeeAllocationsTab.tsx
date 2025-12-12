import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportCSV } from '@/lib/utils';

interface EmployeeAllocation {
  id: string;
  employee_name: string;
  created_at: string;
  markets?: { name: string };
}

export function EmployeeAllocationsTab() {
  const [allocations, setAllocations] = useState<EmployeeAllocation[]>([]);

  useEffect(() => {
    fetchAllocations();

    const channel = supabase
      .channel('employee-allocations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_allocations' }, fetchAllocations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAllocations = async () => {
    const { data } = await supabase
      .from('employee_allocations')
      .select('*, markets(name)')
      .order('created_at', { ascending: false });
    setAllocations((data ?? []) as EmployeeAllocation[]);
  };

  const handleExport = () => {
    const headers = ['Employee Name', 'Market', 'Created At'];
    const rows = allocations.map((a) => [
      a.employee_name,
      a.markets?.name ?? '',
      new Date(a.created_at).toLocaleString()
    ]);
    exportCSV('employee_allocations', headers, rows);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Employee Allocations</CardTitle>
        <Button onClick={handleExport} variant="outline" size="sm" disabled={allocations.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((allocation) => (
              <TableRow key={allocation.id}>
                <TableCell>{allocation.employee_name}</TableCell>
                <TableCell>{allocation.markets?.name}</TableCell>
                <TableCell>{new Date(allocation.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
