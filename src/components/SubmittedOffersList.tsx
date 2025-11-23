import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';

interface Offer {
  id: string;
  commodity_name: string;
  category: string;
  price: number;
  created_at: string;
}

interface SubmittedOffersListProps {
  userId: string;
  marketDate: string;
  marketId: string;
}

export default function SubmittedOffersList({ userId, marketDate, marketId }: SubmittedOffersListProps) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffers();

    const channel = supabase
      .channel('offers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, marketDate, marketId]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('user_id', userId)
        .eq('market_date', marketDate)
        .eq('market_id', marketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            Submitted Offers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (offers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            Submitted Offers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No offers submitted yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          Submitted Offers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Commodity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Rate (₹/kg)</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium">{offer.commodity_name}</TableCell>
                  <TableCell className="capitalize">{offer.category.replace('_', ' ')}</TableCell>
                  <TableCell>₹{offer.price.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(offer.created_at), 'HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
