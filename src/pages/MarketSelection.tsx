import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, MapPin } from 'lucide-react';

interface Market {
  id: string;
  name: string;
  location: string;
}

export default function MarketSelection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOrganiserMode = searchParams.get('as') === 'organiser';
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [existingSessionMarkets, setExistingSessionMarkets] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchMarketsAndSessions();
    }
  }, [user]);

  const getISTDateString = (date: Date) => {
    const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchMarketsAndSessions = async () => {
    if (!user) return;

    try {
      const istNow = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      );
      const dow = istNow.getDay(); // 0=Sun..6=Sat
      const today = getISTDateString(new Date());

      // Fetch markets and existing sessions in parallel
      const [byWeekday, scheduleRows, existingSessions, allTodaySessions] = await Promise.all([
        supabase
          .from('markets')
          .select('id, name, location')
          .eq('is_active', true)
          .eq('day_of_week', dow)
          .order('name'),
        supabase
          .from('market_schedule')
          .select('market_id')
          .eq('day_of_week', dow)
          .eq('is_active', true),
        supabase
          .from('sessions')
          .select('market_id')
          .eq('user_id', user.id)
          .eq('session_date', today),
        supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('session_date', today),
      ]);

      // Track markets that already have sessions today
      const existingMarketIds = (existingSessions.data || []).map((s: any) => s.market_id);
      setExistingSessionMarkets(existingMarketIds);

      // Check if max sessions (2) reached
      const totalSessionsToday = (allTodaySessions.data || []).length;
      if (totalSessionsToday >= 2) {
        setMarkets([]);
        setExistingSessionMarkets(existingMarketIds);
        return;
      }

      const scheduleIds = (scheduleRows.data || []).map((r: any) => r.market_id).filter(Boolean);

      let scheduledMarkets: any[] = [];
      if (scheduleIds.length > 0) {
        const res = await supabase
          .from('markets')
          .select('id, name, location')
          .in('id', scheduleIds)
          .order('name');
        scheduledMarkets = res.data || [];
      }

      const map = new Map<string, Market>();
      (byWeekday.data || []).forEach((m: any) => map.set(m.id, m));
      scheduledMarkets.forEach((m: any) => map.set(m.id, m));

      // Filter out markets that already have sessions
      const availableMarkets = Array.from(map.values()).filter(
        (m) => !existingMarketIds.includes(m.id)
      );
      
      setMarkets(availableMarkets);
      if (availableMarkets.length > 0) setSelectedMarket(availableMarkets[0].id);
    } catch (error: any) {
      toast.error('Failed to load markets');
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMarket) {
      toast.error('Please select a market');
      return;
    }

    setLoading(true);
    try {
      const today = getISTDateString(new Date());

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user!.id,
          market_id: selectedMarket,
          session_date: today,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Session created successfully!');
      navigate(isOrganiserMode ? '/dashboard?as=organiser' : '/dashboard');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('You already have a session for today');
      } else {
        toast.error('Failed to create session');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(isOrganiserMode ? '/manager-dashboard' : '/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isOrganiserMode ? 'Back to Manager Dashboard' : 'Back to Dashboard'}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <MapPin className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle>Select Market</CardTitle>
                <CardDescription>Choose the market you'll be reporting from today</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="market">Market</Label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                <SelectTrigger id="market">
                  <SelectValue placeholder="Select a market" />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((market) => (
                    <SelectItem key={market.id} value={market.id}>
                      {market.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {markets.length === 0 && existingSessionMarkets.length >= 2 ? (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> You have reached the maximum of 2 sessions per day.
                </p>
              </div>
            ) : markets.length === 0 && existingSessionMarkets.length > 0 ? (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> You have already created sessions for all available markets today.
                </p>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> You can create up to 2 sessions for different markets on the same day 
                  (e.g., morning and evening markets).
                </p>
              </div>
            )}

            <Button onClick={handleSubmit} disabled={loading || !selectedMarket} className="w-full" size="lg">
              {loading ? 'Creating Session...' : 'Start Session'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
