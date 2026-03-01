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
import { Plus, Download, Pencil, Trash2, Users } from 'lucide-react';
import { exportCSV } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

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
  const [editingItem, setEditingItem] = useState<AssetInventoryItem | null>(null);
  const [issuedDialogOpen, setIssuedDialogOpen] = useState(false);
  const [issuedDetails, setIssuedDetails] = useState<any[]>([]);
  const [issuedAssetName, setIssuedAssetName] = useState('');
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

  const openEditDialog = (item: AssetInventoryItem) => {
    setEditingItem(item);
    setFormData({
      assetName: item.asset_name,
      totalQuantity: String(item.total_quantity),
      unitPrice: item.unit_price ? String(item.unit_price) : '',
      description: item.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingItem(null);
      setFormData({ assetName: '', totalQuantity: '', unitPrice: '', description: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalQty = parseInt(formData.totalQuantity);

      if (editingItem) {
        const diff = totalQty - editingItem.total_quantity;
        const { error } = await supabase.from('asset_inventory').update({
          asset_name: formData.assetName,
          total_quantity: totalQty,
          available_quantity: editingItem.available_quantity + diff,
          unit_price: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          description: formData.description || null,
        }).eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Asset updated successfully');
      } else {
        const { error } = await supabase.from('asset_inventory').insert({
          asset_name: formData.assetName,
          total_quantity: totalQty,
          available_quantity: totalQty,
          unit_price: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          description: formData.description || null,
        });
        if (error) throw error;
        toast.success('Asset added to inventory');
      }

      handleDialogClose(false);
      fetchInventory();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update asset' : 'Failed to add asset');
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

  const handleDelete = async (item: AssetInventoryItem) => {
    try {
      const { error } = await supabase.from('asset_inventory').delete().eq('id', item.id);
      if (error) throw error;
      toast.success('Asset deleted successfully');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to delete asset. It may have active requests.');
    }
  };

  const handleViewIssued = async (item: AssetInventoryItem) => {
    setIssuedAssetName(item.asset_name);
    const { data } = await supabase
      .from('asset_requests')
      .select('*, employees(full_name, email), markets(name)')
      .eq('asset_id', item.id)
      .eq('status', 'approved')
      .order('approval_date', { ascending: false });
    setIssuedDetails(data || []);
    setIssuedDialogOpen(true);
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
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button size="sm" className="text-[10px] md:text-sm h-7 md:h-9 px-2 md:px-3">
              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-sm md:text-lg">{editingItem ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
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
                {loading ? 'Saving...' : editingItem ? 'Update Asset' : 'Add Asset'}
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
              <TableHead className="text-[10px] md:text-sm w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-[10px] md:text-sm py-2 md:py-4">{item.asset_name}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">{item.total_quantity}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">{item.available_quantity}</TableCell>
                <TableCell className="text-[10px] md:text-sm py-2 md:py-4">
                  {item.issued_quantity > 0 ? (
                    <Button variant="link" size="sm" className="p-0 h-auto text-[10px] md:text-sm text-primary underline" onClick={() => handleViewIssued(item)}>
                      {item.issued_quantity}
                    </Button>
                  ) : (
                    item.issued_quantity
                  )}
                </TableCell>
                <TableCell className="py-2 md:py-4">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{item.asset_name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone. Assets with active requests cannot be deleted.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {inventory.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground text-[10px] md:text-sm">
                  No assets in inventory
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Issued Assets Dialog */}
      <Dialog open={issuedDialogOpen} onOpenChange={setIssuedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm md:text-lg flex items-center gap-2">
              <Users className="h-4 w-4" /> Issued: {issuedAssetName}
            </DialogTitle>
          </DialogHeader>
          {issuedDetails.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">No active issued records</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] md:text-sm">Employee</TableHead>
                  <TableHead className="text-[10px] md:text-sm">Qty</TableHead>
                  <TableHead className="text-[10px] md:text-sm">Market</TableHead>
                  <TableHead className="text-[10px] md:text-sm">Since</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issuedDetails.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-[10px] md:text-sm py-2">{r.employees?.full_name || r.employees?.email || 'N/A'}</TableCell>
                    <TableCell className="text-[10px] md:text-sm py-2">{r.quantity}</TableCell>
                    <TableCell className="text-[10px] md:text-sm py-2">{r.markets?.name || '-'}</TableCell>
                    <TableCell className="text-[10px] md:text-sm py-2">{r.approval_date ? format(new Date(r.approval_date), 'dd MMM yyyy') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
