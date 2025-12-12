import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Download } from 'lucide-react';
import { exportCSV } from '@/lib/utils';

interface AssetInventoryItem {
  id: string;
  asset_name: string;
  total_quantity: number;
  available_quantity: number;
  issued_quantity: number;
  unit_price: number | null;
  description: string | null;
}

export function AssetInventoryTab() {
  const [inventory, setInventory] = useState<AssetInventoryItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assetName: '',
    totalQuantity: '',
    unitPrice: '',
    description: '',
  });

  useEffect(() => {
    fetchInventory();

    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asset_inventory' }, fetchInventory)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase
      .from('asset_inventory')
      .select('*')
      .order('asset_name');
    setInventory((data ?? []) as AssetInventoryItem[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalQty = parseInt(formData.totalQuantity);
      const { error } = await supabase.from('asset_inventory').insert({
        asset_name: formData.assetName,
        total_quantity: totalQty,
        available_quantity: totalQty,
        unit_price: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
        description: formData.description || null,
      });

      if (error) throw error;

      toast.success('Asset added to inventory');
      setIsDialogOpen(false);
      setFormData({ assetName: '', totalQuantity: '', unitPrice: '', description: '' });
      fetchInventory();
    } catch (error) {
      toast.error('Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ['Asset Name', 'Total Quantity', 'Available', 'Issued', 'Unit Price', 'Description'];
    const rows = inventory.map((item) => [
      item.asset_name,
      item.total_quantity,
      item.available_quantity,
      item.issued_quantity,
      item.unit_price ?? '',
      item.description ?? ''
    ]);
    exportCSV('asset_inventory', headers, rows);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-3 md:p-6">
        <CardTitle className="text-sm md:text-lg">Asset Inventory</CardTitle>
        <div className="flex items-center gap-1 md:gap-2">
          <Button onClick={handleExport} variant="outline" size="sm" disabled={inventory.length === 0} className="text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3">
            <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3">
              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm md:text-lg">Add New Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="assetName" className="text-xs md:text-sm">Asset Name *</Label>
                <Input
                  id="assetName"
                  value={formData.assetName}
                  onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
                  required
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div>
                <Label htmlFor="totalQuantity" className="text-xs md:text-sm">Total Quantity *</Label>
                <Input
                  id="totalQuantity"
                  type="number"
                  min="1"
                  value={formData.totalQuantity}
                  onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                  required
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div>
                <Label htmlFor="unitPrice" className="text-xs md:text-sm">Unit Price (Optional)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-xs md:text-sm">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="text-xs md:text-sm"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full text-xs md:text-sm h-8 md:h-10">
                {loading ? 'Adding...' : 'Add Asset'}
              </Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] md:text-sm">Asset Name</TableHead>
              <TableHead className="text-[10px] md:text-sm">Total Qty</TableHead>
              <TableHead className="text-[10px] md:text-sm">Available</TableHead>
              <TableHead className="text-[10px] md:text-sm">Issued</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-[10px] md:text-sm py-2 md:py-4">{item.asset_name}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">{item.total_quantity}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">{item.available_quantity}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">{item.issued_quantity}</TableCell>
              </TableRow>
            ))}
            {inventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground text-[10px] md:text-sm">
                  No assets in inventory
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
