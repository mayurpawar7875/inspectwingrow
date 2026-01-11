import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LiveMarket {
  market_id: string;
  market_name: string;
  city: string | null;
  active_sessions: number;
  last_upload_time: string | null;
}

interface MarketCollection {
  market_id: string;
  expected: number;
  received: number;
}

export default function LiveMarketsWidget() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<LiveMarket[]>([]);
  const [collections, setCollections] = useState<Map<string, MarketCollection>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveMarkets();
    fetchCollections();
    
    const channel = supabase
      .channel('live-markets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, fetchLiveMarkets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media' }, fetchLiveMarkets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_schedule' }, fetchLiveMarkets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchCollections)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, fetchCollections)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('live_markets_today')
        .select('*');

      if (error) throw error;
      setMarkets((data || []) as unknown as LiveMarket[]);
    } catch (error) {
      console.error('Error fetching live markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch expected amounts from stall_confirmations
      const { data: confirmations, error: confError } = await supabase
        .from('stall_confirmations')
        .select('market_id, rent_amount')
        .eq('market_date', today);

      if (confError) throw confError;

      // Fetch received amounts from collections
      const { data: collectionData, error: collError } = await supabase
        .from('collections')
        .select('market_id, amount')
        .eq('collection_date', today);

      if (collError) throw collError;

      // Aggregate by market
      const collectionMap = new Map<string, MarketCollection>();

      confirmations?.forEach((conf) => {
        const existing = collectionMap.get(conf.market_id) || { market_id: conf.market_id, expected: 0, received: 0 };
        existing.expected += conf.rent_amount || 0;
        collectionMap.set(conf.market_id, existing);
      });

      collectionData?.forEach((col) => {
        const existing = collectionMap.get(col.market_id) || { market_id: col.market_id, expected: 0, received: 0 };
        existing.received += col.amount || 0;
        collectionMap.set(col.market_id, existing);
      });

      setCollections(collectionMap);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return 'No uploads yet';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    }) + ' IST';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Markets Today</CardTitle>
        <CardDescription>Markets with active sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {markets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active markets today
            </div>
          ) : (
            markets.map((market) => {
              const marketCollection = collections.get(market.market_id);
              const expected = marketCollection?.expected || 0;
              const received = marketCollection?.received || 0;
              const pending = expected - received;

              return (
                <div
                  key={market.market_id}
                  className="flex flex-col p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/market/${market.market_id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{market.market_name}</h4>
                        <Badge variant="default">{market.active_sessions} active</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{market.city ?? 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Last upload: {formatTime(market.last_upload_time)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Collection Stats */}
                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <IndianRupee className="h-3 w-3" />
                        <span>Expected</span>
                      </div>
                      <p className="font-semibold text-sm">₹{formatCurrency(expected)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <IndianRupee className="h-3 w-3" />
                        <span>Received</span>
                      </div>
                      <p className="font-semibold text-sm text-green-600">₹{formatCurrency(received)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        <IndianRupee className="h-3 w-3" />
                        <span>Pending</span>
                      </div>
                      <p className="font-semibold text-sm text-orange-600">₹{formatCurrency(pending)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
