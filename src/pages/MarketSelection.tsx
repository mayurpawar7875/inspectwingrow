import { useEffect, useRef, useState } from 'react';
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

interface ExistingSession {
  id: string;
  market_id: string;
  market: Market | null;
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
  const [existingSessions, setExistingSessions] = useState<ExistingSession[]>([]);

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
      const dow = istNow.getDay();
      const today = getISTDateString(new Date());

      const [byWeekday, scheduleRows, existingSessionsResult, allTodaySessions] = await Promise.all([
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
          .select('id, market_id, created_at, market:markets(id, name, location)')
          .eq('user_id', user.id)
          .eq('session_date', today)
          .order('created_at', { ascending: true }),
        supabase
          .from('sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('session_date', today),
      ]);

      const sessionRows = ((existingSessionsResult.data || []) as ExistingSession[]);
      const existingMarketIds = sessionRows.map((session) => session.market_id);

      setExistingSessions(sessionRows);
      setExistingSessionMarkets(existingMarketIds);

      const totalSessionsToday = (allTodaySessions.data || []).length;
      if (totalSessionsToday >= 2) {
        setMarkets([]);
        setSelectedMarket('');
        return;
      }

      const scheduleIds = (scheduleRows.data || []).map((row: any) => row.market_id).filter(Boolean);

      let scheduledMarkets: Market[] = [];
      if (scheduleIds.length > 0) {
        const res = await supabase
          .from('markets')
          .select('id, name, location')
          .in('id', scheduleIds)
          .order('name');
        scheduledMarkets = (res.data || []) as Market[];
      }

      const mergedMarkets = new Map<string, Market>();
      ((byWeekday.data || []) as Market[]).forEach((market) => mergedMarkets.set(market.id, market));
      scheduledMarkets.forEach((market) => mergedMarkets.set(market.id, market));

      const availableMarkets = Array.from(mergedMarkets.values()).filter(
        (market) => !existingMarketIds.includes(market.id)
      );

      setMarkets(availableMarkets);
      setSelectedMarket((current) =>
        availableMarkets.some((market) => market.id === current)
          ? current
          : availableMarkets[0]?.id || ''
      );
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

      const { error } = await supabase
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
                <CardDescription>
                  {existingSessions.length > 0 && isOrganiserMode
                    ? 'Resume your started market or choose another market for today'
                    : "Choose the market you'll be reporting from today"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isOrganiserMode && existingSessions.length > 0 && (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                <div>
                  <p className="text-sm font-medium">Started organiser sessions</p>
                  <p className="text-sm text-muted-foreground">
                    These markets were already started earlier and can be continued after login.
                  </p>
                </div>

                <div className="space-y-2">
                  {existingSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{session.market?.name || 'Started market'}</p>
                        {session.market?.location && (
                          <p className="text-xs text-muted-foreground break-all">{session.market.location}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => navigate('/dashboard?as=organiser')}
                      >
                        Continue Session
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {markets.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="market">{existingSessions.length > 0 ? 'Start Another Market' : 'Market'}</Label>
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
            )}

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

            {markets.length > 0 && (
              <Button onClick={handleSubmit} disabled={loading || !selectedMarket} className="w-full" size="lg">
                {loading ? 'Creating Session...' : 'Start Session'}
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
