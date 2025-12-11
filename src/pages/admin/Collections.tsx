import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X } from 'lucide-react';

interface StallRow {
  id: string;
  farmer_name: string;
  stall_name: string;
  expected_rent: number;
  actual_rent: string; // keep as string for input control
  payment_mode: 'cash' | 'online';
  screenshot_file: File | null;
  screenshot_url?: string;
}

interface ManualEntry {
  id: string; // temporary ID for UI
  stall_name: string;
  farmer_name: string;
  amount: string;
  payment_mode: 'cash' | 'online';
  screenshot_file: File | null;
}

interface Market {
  id: string;
  name: string;
}

export default function Collections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionMarketId, setSessionMarketId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [rows, setRows] = useState<StallRow[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Admin filter states
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Get IST date string for today
  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Fetch collections data for admin based on filters
  const fetchAdminCollections = async (dateStr: string, marketId: string | null) => {
    setLoading(true);
    try {
      // Build query for stall confirmations
      let query = supabase
        .from('stall_confirmations')
        .select('id, farmer_name, stall_name, market_id, rent_amount')
        .eq('market_date', dateStr)
        .order('created_at', { ascending: true });

      if (marketId && marketId !== 'all') {
        query = query.eq('market_id', marketId);
      }

      const { data: stalls, error: stErr } = await query;
      if (stErr) throw stErr;

      // Fetch collections for these stalls
      const stallIds = (stalls || []).map(s => s.id);
      const { data: existingCollections } = stallIds.length > 0 
        ? await supabase
            .from('collections')
            .select('stall_confirmation_id, amount, mode, screenshot_url')
            .in('stall_confirmation_id', stallIds)
        : { data: [] };

      // Create a map
      const collectionsMap = new Map(
        (existingCollections || []).map(c => [c.stall_confirmation_id, c])
      );

      setRows(
        (stalls || []).map((s) => {
          const collection = collectionsMap.get(s.id);
          return {
            id: s.id,
            farmer_name: s.farmer_name,
            stall_name: s.stall_name,
            expected_rent: s.rent_amount || 0,
            actual_rent: collection?.amount?.toString() || '',
            payment_mode: (collection?.mode as 'cash' | 'online') || 'cash',
            screenshot_file: null,
            screenshot_url: collection?.screenshot_url || undefined,
          };
        })
      );
    } catch (e) {
      console.error(e);
      toast.error('Failed to load collections data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const todayIST = getISTDateString(new Date());
        
        // Check if user is admin
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        const adminUser = userRole?.role === 'admin';
        setIsAdmin(adminUser);

        if (adminUser) {
          // Fetch all markets for dropdown
          const { data: marketsData } = await supabase
            .from('markets')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
          
          setMarkets(marketsData || []);
          setSelectedDate(todayIST);
          setSessionDate(todayIST);
          
          // Fetch collections for today (all markets)
          await fetchAdminCollections(todayIST, 'all');
        } else {
          // For employees, find their session
          const { data: session, error: sErr } = await supabase
            .from('sessions')
            .select('id, market_id, session_date, status')
            .eq('user_id', user.id)
            .eq('session_date', todayIST)
            .maybeSingle();

          if (sErr) throw sErr;
          if (!session) {
            toast.error('No active session for today');
            setLoading(false);
            return;
          }

          const marketId = session.market_id;
          const dateStr = getISTDateString(new Date());
          setSessionMarketId(marketId);
          setSessionDate(dateStr);

          // Fetch today's confirmed stalls for this employee
          const { data: stalls, error: stErr } = await supabase
            .from('stall_confirmations')
            .select('id, farmer_name, stall_name, rent_amount')
            .eq('market_id', marketId)
            .eq('market_date', dateStr)
            .eq('created_by', user.id)
            .order('created_at', { ascending: true });

          if (stErr) throw stErr;

          // Fetch existing collections for these stalls
          const stallIds = (stalls || []).map(s => s.id);
          const { data: existingCollections } = await supabase
            .from('collections')
            .select('stall_confirmation_id, amount')
            .in('stall_confirmation_id', stallIds)
            .eq('collected_by', user.id);

          // Create a map of stall_confirmation_id -> actual rent collected
          const collectionsMap = new Map(
            (existingCollections || []).map(c => [c.stall_confirmation_id, c.amount])
          );

          // Build rows with expected and actual rent
          setRows(
            (stalls || []).map((s) => ({
              id: s.id,
              farmer_name: s.farmer_name,
              stall_name: s.stall_name,
              expected_rent: s.rent_amount || 0,
              actual_rent: collectionsMap.get(s.id)?.toString() || '',
              payment_mode: 'cash' as const,
              screenshot_file: null,
            }))
          );
        }
      } catch (e) {
        console.error(e);
        toast.error('Failed to load collections data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  // Handle filter changes for admin
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSessionDate(date);
    if (isAdmin) {
      fetchAdminCollections(date, selectedMarket);
    }
  };

  const handleMarketChange = (marketId: string) => {
    setSelectedMarket(marketId);
    if (isAdmin && selectedDate) {
      fetchAdminCollections(selectedDate, marketId);
    }
  };

  const setRowValue = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, actual_rent: value } : r))
    );
  };

  const setRowPaymentMode = (id: string, mode: 'cash' | 'online') => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, payment_mode: mode, screenshot_file: mode === 'cash' ? null : r.screenshot_file } : r))
    );
  };

  const setRowScreenshot = (id: string, file: File | null) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, screenshot_file: file } : r))
    );
  };

  const addManualEntry = () => {
    const newEntry: ManualEntry = {
      id: `manual-${Date.now()}`,
      stall_name: '',
      farmer_name: '',
      amount: '',
      payment_mode: 'cash',
      screenshot_file: null,
    };
    setManualEntries((prev) => [...prev, newEntry]);
  };

  const updateManualEntry = (id: string, field: keyof Omit<ManualEntry, 'id'>, value: string | File | null) => {
    setManualEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          if (field === 'payment_mode' && value === 'cash') {
            return { ...e, [field]: value, screenshot_file: null };
          }
          return { ...e, [field]: value };
        }
        return e;
      })
    );
  };

  const removeManualEntry = (id: string) => {
    setManualEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = async () => {
    if (!user || !sessionMarketId || !sessionDate) return;

    // Filter rows with actual rent entered
    const confirmedEntries = rows
      .map((r) => ({
        stall_confirmation_id: r.id,
        amount: Number(r.actual_rent || 0),
        farmer_name: r.farmer_name,
        stall_name: r.stall_name,
        payment_mode: r.payment_mode,
        screenshot_file: r.screenshot_file,
      }))
      .filter((e) => !isNaN(e.amount) && e.amount > 0);

    // Process manual entries
    const validManualEntries = manualEntries
      .filter((e) => e.stall_name.trim() && e.farmer_name.trim() && e.amount.trim())
      .map((e) => ({
        stall_confirmation_id: null, // Manual entries don't link to confirmations
        amount: Number(e.amount || 0),
        farmer_name: e.farmer_name.trim(),
        stall_name: e.stall_name.trim(),
        payment_mode: e.payment_mode,
        screenshot_file: e.screenshot_file,
      }))
      .filter((e) => !isNaN(e.amount) && e.amount > 0);

    const totalEntries = confirmedEntries.length + validManualEntries.length;

    if (totalEntries === 0) {
      toast.error('Please enter at least one rent amount');
      return;
    }

    // Validate online payments have screenshots
    const onlineWithoutScreenshot = [...confirmedEntries, ...validManualEntries].filter(
      e => e.payment_mode === 'online' && !e.screenshot_file
    );
    if (onlineWithoutScreenshot.length > 0) {
      toast.error('Please upload payment screenshots for all online payments');
      return;
    }

    setSaving(true);
    try {
      // Upload screenshots for online payments
      const allEntries = [...confirmedEntries, ...validManualEntries];
      const screenshotUrls = await Promise.all(
        allEntries.map(async (entry) => {
          if (entry.payment_mode === 'online' && entry.screenshot_file) {
            const fileExt = entry.screenshot_file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { error: uploadError, data } = await supabase.storage
              .from('payment-screenshots')
              .upload(fileName, entry.screenshot_file);

            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
              .from('payment-screenshots')
              .getPublicUrl(fileName);
            
            return publicUrl;
          }
          return null;
        })
      );

      // Delete existing collections for confirmed stalls (to update)
      const stallIds = confirmedEntries.map(e => e.stall_confirmation_id);
      if (stallIds.length > 0) {
        await supabase
          .from('collections')
          .delete()
          .in('stall_confirmation_id', stallIds)
          .eq('collected_by', user.id);
      }

      // Delete existing manual collections for this date (to avoid duplicates)
      await supabase
        .from('collections')
        .delete()
        .is('stall_confirmation_id', null)
        .eq('collected_by', user.id)
        .eq('collection_date', sessionDate)
        .eq('market_id', sessionMarketId);

      // Prepare all collections with screenshot URLs
      const allPayload = allEntries.map((e, idx) => ({
        stall_confirmation_id: e.stall_confirmation_id || null,
        market_id: sessionMarketId,
        collection_date: sessionDate,
        amount: e.amount,
        mode: e.payment_mode,
        collected_by: user.id,
        farmer_name: e.farmer_name,
        stall_name: e.stall_name,
        screenshot_url: screenshotUrls[idx],
      }));

      const { error } = await supabase.from('collections').insert(allPayload);
      if (error) throw error;

      toast.success('Rent collections saved successfully!');
      // Clear manual entries after successful save
      setManualEntries([]);
      // Reset screenshot files for confirmed stalls
      setRows(prev => prev.map(r => ({ ...r, actual_rent: '', screenshot_file: null, payment_mode: 'cash' as const })));
    } catch (e) {
      console.error(e);
      toast.error('Failed to save collections');
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalExpected = rows.reduce((sum, r) => sum + r.expected_rent, 0);
  const totalActual = rows.reduce((sum, r) => {
    const val = Number(r.actual_rent || 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const totalManual = manualEntries.reduce((sum, e) => {
    const val = Number(e.amount || 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const grandTotalActual = totalActual + totalManual;


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading collections…</div>
      </div>
    );
  }

  if (!sessionDate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container-responsive py-2">
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(isAdmin ? '/admin' : '/dashboard')}
              className="h-7 w-7"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-bold">Rent Collections</h1>
          </div>
          {!isAdmin && (
            <p className="text-xs text-muted-foreground ml-9">Date: {sessionDate}</p>
          )}
        </div>
      </header>

      <main className="container-responsive py-3 space-y-4">
        {/* Admin Filters */}
        {isAdmin && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[150px]">
                  <Label className="text-xs mb-1.5 block">Select Market</Label>
                  <Select value={selectedMarket} onValueChange={handleMarketChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Markets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Markets</SelectItem>
                      {markets.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Label className="text-xs mb-1.5 block">Select Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stall Rent Collection</CardTitle>
          </CardHeader>
          <CardContent className="card-padding-responsive pt-0">
            {rows.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No stall confirmations found for {isAdmin ? 'selected filters' : 'today'}
              </div>
            ) : (
              <>
                <div className="scroll-x-touch">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-2">Stall Name</TableHead>
                        <TableHead className="text-xs py-2">Farmer Name</TableHead>
                        <TableHead className="text-xs py-2 text-right">Expected Rent (₹)</TableHead>
                        <TableHead className="w-[140px] text-xs py-2">Actual Rent (₹)</TableHead>
                        <TableHead className="w-[120px] text-xs py-2">Payment Mode</TableHead>
                        <TableHead className="w-[140px] text-xs py-2">Screenshot</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-xs py-2">{r.stall_name}</TableCell>
                          <TableCell className="text-xs py-2">{r.farmer_name}</TableCell>
                          <TableCell className="text-xs py-2 text-right">
                            ₹{r.expected_rent.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="py-2">
                            {isAdmin ? (
                              <span className="text-xs font-medium">
                                {r.actual_rent ? `₹${Number(r.actual_rent).toLocaleString('en-IN')}` : '-'}
                              </span>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={r.actual_rent}
                                onChange={(e) => setRowValue(r.id, e.target.value)}
                                placeholder="0"
                                className="h-7 text-xs"
                              />
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            {isAdmin ? (
                              <span className={`text-xs px-2 py-1 rounded ${r.payment_mode === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {r.actual_rent ? (r.payment_mode === 'online' ? 'Online' : 'Cash') : '-'}
                              </span>
                            ) : (
                              <Select
                                value={r.payment_mode}
                                onValueChange={(value: 'cash' | 'online') => setRowPaymentMode(r.id, value)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="online">Online</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            {isAdmin ? (
                              r.screenshot_url ? (
                                <a href={r.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                                  View
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )
                            ) : (
                              r.payment_mode === 'online' && (
                                <div className="flex items-center gap-1">
                                  <Label htmlFor={`screenshot-${r.id}`} className="cursor-pointer">
                                    <div className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                                      <Upload className="h-3 w-3" />
                                      {r.screenshot_file ? r.screenshot_file.name.slice(0, 10) + '...' : 'Upload'}
                                    </div>
                                  </Label>
                                  <Input
                                    id={`screenshot-${r.id}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => setRowScreenshot(r.id, e.target.files?.[0] || null)}
                                  />
                                  {r.screenshot_file && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setRowScreenshot(r.id, null)}
                                      className="h-5 w-5 p-0"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Manual Entry Section - Only show for non-admin users */}
                {!isAdmin && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Manual Rent Collection</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addManualEntry}
                        className="h-7 text-xs"
                      >
                        + Add Entry
                      </Button>
                    </div>
                  
                  {manualEntries.length > 0 && (
                    <div className="scroll-x-touch">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs py-2">Stall Name</TableHead>
                            <TableHead className="text-xs py-2">Farmer Name</TableHead>
                            <TableHead className="w-[140px] text-xs py-2">Rent Amount (₹)</TableHead>
                            <TableHead className="w-[120px] text-xs py-2">Payment Mode</TableHead>
                            <TableHead className="w-[140px] text-xs py-2">Screenshot</TableHead>
                            <TableHead className="w-[60px] text-xs py-2"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {manualEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="py-2">
                                <Input
                                  type="text"
                                  value={entry.stall_name}
                                  onChange={(e) => updateManualEntry(entry.id, 'stall_name', e.target.value)}
                                  placeholder="Stall name"
                                  className="h-7 text-xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  type="text"
                                  value={entry.farmer_name}
                                  onChange={(e) => updateManualEntry(entry.id, 'farmer_name', e.target.value)}
                                  placeholder="Farmer name"
                                  className="h-7 text-xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Input
                                  type="number"
                                  min="0"
                                  inputMode="decimal"
                                  value={entry.amount}
                                  onChange={(e) => updateManualEntry(entry.id, 'amount', e.target.value)}
                                  placeholder="0"
                                  className="h-7 text-xs"
                                />
                              </TableCell>
                              <TableCell className="py-2">
                                <Select
                                  value={entry.payment_mode}
                                  onValueChange={(value: 'cash' | 'online') => updateManualEntry(entry.id, 'payment_mode', value)}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="online">Online</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="py-2">
                                {entry.payment_mode === 'online' && (
                                  <div className="flex items-center gap-1">
                                    <Label htmlFor={`manual-screenshot-${entry.id}`} className="cursor-pointer">
                                      <div className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                                        <Upload className="h-3 w-3" />
                                        {entry.screenshot_file ? entry.screenshot_file.name.slice(0, 10) + '...' : 'Upload'}
                                      </div>
                                    </Label>
                                    <Input
                                      id={`manual-screenshot-${entry.id}`}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => updateManualEntry(entry.id, 'screenshot_file', e.target.files?.[0] || null)}
                                    />
                                    {entry.screenshot_file && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => updateManualEntry(entry.id, 'screenshot_file', null)}
                                        className="h-5 w-5 p-0"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeManualEntry(entry.id)}
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  ×
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
                )}

                {/* Totals Summary */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Total Expected Rent:</span>
                    <span className="font-semibold">₹{totalExpected.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Total Actual Rent Collected:</span>
                    <span className="font-semibold text-primary">₹{grandTotalActual.toLocaleString('en-IN')}</span>
                  </div>
                  {manualEntries.length > 0 && totalManual > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground pl-4">
                      <span>From confirmed stalls: ₹{totalActual.toLocaleString('en-IN')}</span>
                      <span>Manual entries: ₹{totalManual.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {totalExpected !== grandTotalActual && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Difference:</span>
                      <span className={`font-semibold ${grandTotalActual > totalExpected ? 'text-green-600' : 'text-amber-600'}`}>
                        ₹{Math.abs(totalExpected - grandTotalActual).toLocaleString('en-IN')}
                        {grandTotalActual > totalExpected ? ' (Over)' : ' (Under)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Save Button - Only show for non-admin users */}
                {!isAdmin && (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="h-8 text-xs px-4">
                      {saving ? 'Saving…' : 'Save Collections'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}