import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { IndianRupee, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarketCollection {
  market_id: string;
  market_name: string;
  city: string | null;
  expected_amount: number;
  received_amount: number;
  stall_count: number;
  collection_count: number;
}

export function MarketCollectionsWidget() {
  const [collections, setCollections] = useState<MarketCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ expected: 0, received: 0 });

  const fetchCollections = async () => {
    setLoading(true);
    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    try {
      // Fetch stall confirmations with rent_amount (expected)
      const { data: stallsData, error: stallsError } = await supabase
        .from('stall_confirmations')
        .select('market_id, rent_amount')
        .eq('market_date', todayDate);

      if (stallsError) throw stallsError;

      // Fetch collections (received)
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('market_id, amount')
        .eq('collection_date', todayDate);

      if (collectionsError) throw collectionsError;

      // Get unique market IDs
      const marketIds = [...new Set([
        ...(stallsData?.map(s => s.market_id) || []),
        ...(collectionsData?.map(c => c.market_id) || [])
      ])].filter(Boolean);

      if (marketIds.length === 0) {
        setCollections([]);
        setTotals({ expected: 0, received: 0 });
        setLoading(false);
        return;
      }

      // Fetch market names
      const { data: marketsData } = await supabase
        .from('markets')
        .select('id, name, city')
        .in('id', marketIds);

      const marketMap = new Map(marketsData?.map(m => [m.id, { name: m.name, city: m.city }]) || []);

      // Aggregate data by market
      const marketAggregates: Record<string, MarketCollection> = {};

      stallsData?.forEach(stall => {
        if (!stall.market_id) return;
        if (!marketAggregates[stall.market_id]) {
          const marketInfo = marketMap.get(stall.market_id);
          marketAggregates[stall.market_id] = {
            market_id: stall.market_id,
            market_name: marketInfo?.name || 'Unknown Market',
            city: marketInfo?.city || null,
            expected_amount: 0,
            received_amount: 0,
            stall_count: 0,
            collection_count: 0,
          };
        }
        marketAggregates[stall.market_id].expected_amount += Number(stall.rent_amount) || 0;
        marketAggregates[stall.market_id].stall_count += 1;
      });

      collectionsData?.forEach(collection => {
        if (!collection.market_id) return;
        if (!marketAggregates[collection.market_id]) {
          const marketInfo = marketMap.get(collection.market_id);
          marketAggregates[collection.market_id] = {
            market_id: collection.market_id,
            market_name: marketInfo?.name || 'Unknown Market',
            city: marketInfo?.city || null,
            expected_amount: 0,
            received_amount: 0,
            stall_count: 0,
            collection_count: 0,
          };
        }
        marketAggregates[collection.market_id].received_amount += Number(collection.amount) || 0;
        marketAggregates[collection.market_id].collection_count += 1;
      });

      const aggregatedList = Object.values(marketAggregates).sort((a, b) => 
        b.expected_amount - a.expected_amount
      );

      const totalExpected = aggregatedList.reduce((sum, m) => sum + m.expected_amount, 0);
      const totalReceived = aggregatedList.reduce((sum, m) => sum + m.received_amount, 0);

      setCollections(aggregatedList);
      setTotals({ expected: totalExpected, received: totalReceived });
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();

    // Real-time subscriptions
    const channel = supabase
      .channel('market-collections-widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchCollections)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, fetchCollections)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (expected: number, received: number) => {
    if (expected === 0 && received === 0) return null;
    
    const percentage = expected > 0 ? (received / expected) * 100 : 0;
    
    if (percentage >= 100) {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-200">
          <TrendingUp className="h-3 w-3 mr-1" />
          {percentage.toFixed(0)}%
        </Badge>
      );
    } else if (percentage >= 50) {
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
          <Minus className="h-3 w-3 mr-1" />
          {percentage.toFixed(0)}%
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-200">
          <TrendingDown className="h-3 w-3 mr-1" />
          {percentage.toFixed(0)}%
        </Badge>
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Market Collections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Market Collections Today
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchCollections}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expected</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.expected)}</p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Received</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.received)}</p>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.expected - totals.received)}</p>
          </div>
        </div>

        {/* Market-wise Table */}
        {collections.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No collection data for today
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Market</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Expected</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Received</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((market) => (
                  <TableRow key={market.market_id} className="hover:bg-muted/30">
                    <TableCell className="py-2">
                      <div>
                        <p className="font-medium text-sm">{market.market_name}</p>
                        <p className="text-[10px] text-muted-foreground">{market.city || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <div>
                        <p className="font-medium text-sm">{formatCurrency(market.expected_amount)}</p>
                        <p className="text-[10px] text-muted-foreground">{market.stall_count} stalls</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <div>
                        <p className="font-medium text-sm text-green-600">{formatCurrency(market.received_amount)}</p>
                        <p className="text-[10px] text-muted-foreground">{market.collection_count} entries</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-2">
                      {getStatusBadge(market.expected_amount, market.received_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
