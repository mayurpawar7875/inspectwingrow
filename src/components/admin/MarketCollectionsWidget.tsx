import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IndianRupee, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export function MarketCollectionsWidget() {
  const [totals, setTotals] = useState({ expected: 0, received: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCollections = async () => {
    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    try {
      const [stallsRes, collectionsRes] = await Promise.all([
        supabase.from('stall_confirmations').select('rent_amount').eq('market_date', todayDate),
        supabase.from('collections').select('amount').eq('collection_date', todayDate)
      ]);

      const totalExpected = stallsRes.data?.reduce((sum, s) => sum + (Number(s.rent_amount) || 0), 0) || 0;
      const totalReceived = collectionsRes.data?.reduce((sum, c) => sum + (Number(c.amount) || 0), 0) || 0;

      setTotals({ expected: totalExpected, received: totalReceived });
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();

    const channel = supabase
      .channel('collections-tiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stall_confirmations' }, fetchCollections)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collections' }, fetchCollections)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const pending = totals.expected - totals.received;
  const percentage = totals.expected > 0 ? Math.round((totals.received / totals.expected) * 100) : 0;

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200/50 p-4 flex flex-col items-center justify-center text-center">
        <div className="p-2 rounded-full bg-blue-500/10 mb-2">
          <IndianRupee className="h-5 w-5 text-blue-600" />
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expected</p>
        <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.expected)}</p>
      </div>
      
      <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-200/50 p-4 flex flex-col items-center justify-center text-center">
        <div className="p-2 rounded-full bg-green-500/10 mb-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Received</p>
        <p className="text-lg font-bold text-green-600">{formatCurrency(totals.received)}</p>
        <p className="text-[10px] text-green-500">{percentage}%</p>
      </div>
      
      <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-200/50 p-4 flex flex-col items-center justify-center text-center">
        <div className="p-2 rounded-full bg-orange-500/10 mb-2">
          <Wallet className="h-5 w-5 text-orange-600" />
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
        <p className="text-lg font-bold text-orange-600">{formatCurrency(pending)}</p>
      </div>
    </div>
  );
}