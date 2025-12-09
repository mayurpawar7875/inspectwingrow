import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Eye, MapPin, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TaskRecordPreviewProps {
  record: Record<string, any>;
  taskType: string;
  markets?: { id: string; name: string }[];
}

export function TaskRecordPreview({ record, taskType, markets = [] }: TaskRecordPreviewProps) {
  const [open, setOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const getMarketName = (marketId: string) => {
    return markets.find(m => m.id === marketId)?.name || marketId;
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('employee-media')
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  const handleOpen = async () => {
    setOpen(true);
    
    // Generate signed URLs for media files
    if (record.selfie_url) {
      const url = await getSignedUrl(record.selfie_url);
      setSignedUrl(url);
    } else if (record.video_url) {
      const url = await getSignedUrl(record.video_url);
      setSignedUrl(url);
    }
  };

  const formatValue = (key: string, value: any): React.ReactNode => {
    if (value === null || value === undefined || value === '') return '-';
    
    if (key === 'market_id') {
      return getMarketName(value);
    }
    
    if (key.includes('date') || key === 'punched_at' || key === 'created_at') {
      return format(new Date(value), 'dd/MM/yyyy HH:mm');
    }
    
    if (key.includes('lat') || key.includes('lng')) {
      return value.toFixed(6);
    }
    
    if (key === 'selfie_url' && signedUrl) {
      return (
        <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1">
          View Photo <ExternalLink className="h-3 w-3" />
        </a>
      );
    }
    
    if (key === 'video_url' && signedUrl) {
      return (
        <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1">
          View Video <ExternalLink className="h-3 w-3" />
        </a>
      );
    }
    
    if (typeof value === 'boolean') {
      return value ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>;
    }
    
    if (typeof value === 'number') {
      if (key.includes('amount')) return `₹${value}`;
      if (key === 'rating') return `${value}/5`;
      return value.toString();
    }
    
    return value.toString();
  };

  const formatLabel = (key: string): string => {
    const labelMap: Record<string, string> = {
      employee_name: 'Employee',
      market_id: 'Market',
      farmer_name: 'Farmer',
      stall_name: 'Stall',
      place_name: 'Place',
      contact_name: 'Contact Name',
      contact_phone: 'Contact Phone',
      is_finalized: 'Finalized',
      opening_date: 'Opening Date',
      is_interested: 'Interested',
      joining_date: 'Joining Date',
      item_name: 'Item',
      received_amount: 'Received Amount',
      pending_amount: 'Pending Amount',
      asset_name: 'Asset',
      quantity: 'Quantity',
      return_date: 'Return Date',
      customer_name: 'Customer',
      feedback_text: 'Feedback',
      video_url: 'Video',
      update_notes: 'Notes',
      selfie_url: 'Selfie',
      gps_lat: 'Latitude',
      gps_lng: 'Longitude',
      punched_at: 'Punched At',
      created_at: 'Created At',
      rating: 'Rating',
    };
    
    return labelMap[key] || key
      .split(/(?=[A-Z])|_/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Filter out internal fields
  const displayFields = Object.entries(record).filter(([key]) => 
    !['id', 'session_id', 'updated_at'].includes(key)
  );

  const getTaskTitle = () => {
    const titles: Record<string, string> = {
      employee_allocations: 'Employee Allocation',
      market_manager_punchin: 'Punch-In Record',
      market_land_search: 'Land Search',
      stall_searching_updates: 'Stall Search',
      assets_money_recovery: 'Money Recovery',
      assets_usage: 'Asset Usage',
      bms_stall_feedbacks: 'Stall Feedback',
      market_inspection_updates: 'Inspection Update',
      market_manager_punchout: 'Punch-Out Record',
    };
    return titles[taskType] || 'Record Details';
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={handleOpen} className="h-7 px-2">
        <Eye className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getTaskTitle()}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            {displayFields.map(([key, value]) => (
              <div key={key} className="flex justify-between items-start gap-4 pb-2 border-b border-border/50">
                <span className="text-sm font-medium text-muted-foreground">
                  {formatLabel(key)}:
                </span>
                <span className="text-sm text-right flex-1">
                  {formatValue(key, value)}
                </span>
              </div>
            ))}
            
            {(record.gps_lat && record.gps_lng) && (
              <div className="pt-2">
                <a 
                  href={`https://www.google.com/maps?q=${record.gps_lat},${record.gps_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-1"
                >
                  <MapPin className="h-4 w-4" />
                  View on Google Maps
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
