import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Users, Eye, Pencil, Trash2, X, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EmployeeAllocationFormProps {
  sessionId: string;
  onComplete: () => void;
}

interface Allocation {
  id: string;
  employee_name: string;
  market_id: string;
  created_at: string;
}

export function EmployeeAllocationForm({ sessionId, onComplete }: EmployeeAllocationFormProps) {
  const [markets, setMarkets] = useState<any[]>([]);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMarket, setEditMarket] = useState('');
  const [editEmployee, setEditEmployee] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveMarkets();
    fetchEmployees();
    fetchAllocations();

    // Realtime subscription for allocations
    const channel = supabase
      .channel(`allocations-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_allocations', filter: `session_id=eq.${sessionId}` }, () => {
        fetchAllocations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchAllocations = async () => {
    const { data, error } = await supabase
      .from('employee_allocations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAllocations(data);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, email')
        .eq('status', 'active')
        .order('full_name');
      
      if (error) {
        console.error('Error fetching employees:', error);
        toast.error('Failed to load employees');
        return;
      }
      
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchLiveMarkets = async () => {
    try {
      const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const dayOfWeek = ist.getDay();
      
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('id, name')
        .eq('is_active', true)
        .eq('day_of_week', dayOfWeek)
        .order('name');
      
      if (marketsError) {
        console.error('Error fetching markets:', marketsError);
        toast.error('Failed to load markets');
        setMarkets([]);
        return;
      }
      
      setMarkets(marketsData || []);
    } catch (error) {
      console.error('Error fetching live markets:', error);
      toast.error('Failed to load markets');
      setMarkets([]);
    }
  };

  // Filter out already allocated employees
  const availableEmployees = employees.filter(emp => {
    const empName = emp.full_name || emp.email;
    return !allocations.some(alloc => alloc.employee_name === empName);
  });

  const handleSubmit = async () => {
    if (!selectedMarket || !employeeName.trim()) {
      toast.error('Please select both market and employee');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('employee_allocations').insert({
      session_id: sessionId,
      market_id: selectedMarket,
      employee_name: employeeName.trim(),
    });

    setLoading(false);
    if (error) {
      toast.error('Failed to save allocation');
      return;
    }

    toast.success('Employee allocated successfully');
    setEmployeeName('');
    setSelectedMarket('');
    fetchAllocations(); // Refresh list immediately
  };

  const handleEdit = (allocation: Allocation) => {
    setEditingId(allocation.id);
    setEditMarket(allocation.market_id);
    setEditEmployee(allocation.employee_name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editMarket || !editEmployee.trim()) return;

    const { error } = await supabase
      .from('employee_allocations')
      .update({ market_id: editMarket, employee_name: editEmployee.trim() })
      .eq('id', editingId);

    if (error) {
      toast.error('Failed to update allocation');
      return;
    }

    toast.success('Allocation updated');
    setEditingId(null);
    setEditMarket('');
    setEditEmployee('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditMarket('');
    setEditEmployee('');
  };

  const handleDelete = async () => {
    if (!deleteId) {
      console.log('No deleteId set');
      return;
    }

    console.log('Deleting allocation:', deleteId);
    
    const { error, data } = await supabase
      .from('employee_allocations')
      .delete()
      .eq('id', deleteId)
      .select();

    console.log('Delete result:', { error, data });

    if (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete allocation');
      setDeleteId(null);
      return;
    }

    toast.success('Allocation removed');
    setDeleteId(null);
    fetchAllocations(); // Force refresh
  };

  const getMarketName = (marketId: string) => {
    return markets.find(m => m.id === marketId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manpower Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Markets Today */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Live Markets Today ({markets.length})</Label>
            {markets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No markets scheduled for today</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {markets.map((market) => (
                  <div
                    key={market.id}
                    onClick={() => setSelectedMarket(market.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedMarket === market.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium">{market.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Available Employees List - filtered */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Available Employees ({availableEmployees.length})
              {allocations.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({allocations.length} already allocated)
                </span>
              )}
            </Label>
            {availableEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {employees.length === 0 ? 'No active employees found' : 'All employees have been allocated'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {availableEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    onClick={() => setEmployeeName(employee.full_name || employee.email)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      employeeName === (employee.full_name || employee.email)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-sm">{employee.full_name || employee.email}</p>
                    {employee.full_name && (
                      <p className="text-xs text-muted-foreground">{employee.email}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Selection Summary and Submit */}
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Current Selection:</p>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Market:</span>{' '}
                  <span className="font-medium">
                    {selectedMarket ? getMarketName(selectedMarket) : 'Not selected'}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Employee:</span>{' '}
                  <span className="font-medium">{employeeName || 'Not selected'}</span>
                </p>
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              disabled={loading || !selectedMarket || !employeeName} 
              className="w-full"
            >
              {loading ? 'Allocating...' : 'Allocate Employee to Market'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History with Edit/Delete */}
      <div>
        <h3 className="font-semibold mb-3">History ({allocations.length})</h3>
        {allocations.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">No allocations yet</p>
        ) : (
          <ScrollArea className="h-[300px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((allocation) => (
                  <TableRow key={allocation.id}>
                    {editingId === allocation.id ? (
                      <>
                        <TableCell>
                          <select
                            value={editEmployee}
                            onChange={(e) => setEditEmployee(e.target.value)}
                            className="w-full p-1 text-sm border rounded"
                          >
                            <option value={allocation.employee_name}>{allocation.employee_name}</option>
                            {employees
                              .filter(emp => (emp.full_name || emp.email) !== allocation.employee_name)
                              .map(emp => (
                                <option key={emp.id} value={emp.full_name || emp.email}>
                                  {emp.full_name || emp.email}
                                </option>
                              ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <select
                            value={editMarket}
                            onChange={(e) => setEditMarket(e.target.value)}
                            className="w-full p-1 text-sm border rounded"
                          >
                            {markets.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(allocation.created_at), 'HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveEdit}>
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{allocation.employee_name}</TableCell>
                        <TableCell>{getMarketName(allocation.market_id)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(allocation.created_at), 'HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(allocation)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteId(allocation.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Allocation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the employee allocation. The employee will become available for allocation again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
