import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Loader2, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Asset {
  id: string;
  asset_name: string;
  available_quantity: number;
}

interface AssetRequest {
  id: string;
  asset_id: string;
  quantity: number;
  purpose: string;
  status: string;
  request_date: string;
  created_at: string;
  rejection_reason: string | null;
  asset_inventory?: {
    asset_name: string;
  };
}

export function BMSAssetRequestTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  
  // Form state
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [purpose, setPurpose] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch available assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('asset_inventory')
        .select('id, asset_name, available_quantity')
        .gt('available_quantity', 0)
        .order('asset_name');

      if (assetsError) throw assetsError;
      setAssets(assetsData || []);

      // Fetch user's requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('asset_requests')
        .select(`
          *,
          asset_inventory (asset_name)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (requestsError) throw requestsError;
      setRequests(requestsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const selectedAsset = assets.find(a => a.id === selectedAssetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedAssetId || !quantity || !purpose.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (selectedAsset && qty > selectedAsset.available_quantity) {
      toast.error(`Only ${selectedAsset.available_quantity} available`);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('asset_requests')
        .insert({
          requester_id: user.id,
          requester_role: 'bms_executive',
          asset_id: selectedAssetId,
          quantity: qty,
          purpose: purpose.trim(),
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Asset request submitted successfully');
      
      // Reset form
      setSelectedAssetId('');
      setQuantity('1');
      setPurpose('');
      
      await fetchData();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'returned':
        return <Badge variant="secondary">Returned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    <div className="space-y-4">
      {/* Request Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Package className="h-4 w-4 md:h-5 md:w-5" />
            Request Asset
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Submit a request for assets you need
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Select Asset *</Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an asset" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.asset_name} ({asset.available_quantity} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Quantity *</Label>
              <Input
                type="number"
                min="1"
                max={selectedAsset?.available_quantity || 100}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={submitting}
                className="h-9"
              />
              {selectedAsset && (
                <p className="text-xs text-muted-foreground">
                  Max available: {selectedAsset.available_quantity}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs md:text-sm">Purpose *</Label>
              <Textarea
                placeholder="Describe why you need this asset..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={submitting}
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              disabled={submitting || !selectedAssetId || !purpose.trim()} 
              className="w-full"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Submit Request</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Request History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">
                        {request.asset_inventory?.asset_name || 'Unknown Asset'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {request.quantity} • {format(new Date(request.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{request.purpose}</p>
                  {request.rejection_reason && (
                    <p className="text-xs text-destructive">
                      Reason: {request.rejection_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
