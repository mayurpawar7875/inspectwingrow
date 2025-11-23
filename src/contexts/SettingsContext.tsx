import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Settings {
  // General settings
  org_name?: string;
  org_email?: string;
  primary_color?: string;
  secondary_color?: string;
  collection_sheet_url?: string;

  // Time windows
  attendance_start?: string;
  attendance_end?: string;
  outside_rates_start?: string;
  outside_rates_end?: string;
  market_video_start?: string;
  market_video_end?: string;

  // Attendance settings
  gps_accuracy_meters?: number;
  geofence_radius_meters?: number;
  face_recognition_required?: boolean;
  grace_minutes?: number;

  // Data settings
  retention_days?: number;

  [key: string]: any;
}

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
  updateSetting: (key: string, value: any) => Promise<void>;
  updateSettings: (values: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings yet, create default
          const { data: newSettings, error: insertError } = await supabase
            .from('app_settings')
            .insert({
              org_name: 'My Organization',
              primary_color: '#000000',
              secondary_color: '#666666',
              gps_accuracy_meters: 50,
              geofence_radius_meters: 100,
              face_recognition_required: false,
              grace_minutes: 15,
              retention_days: 90,
              attendance_start: '06:00',
              attendance_end: '18:00',
              outside_rates_start: '06:00',
              outside_rates_end: '18:00',
              market_video_start: '06:00',
              market_video_end: '18:00',
            })
            .select()
            .single();

          if (insertError) throw insertError;
          setSettings(newSettings || {});
        } else {
          throw error;
        }
      } else {
        setSettings(data || {});
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ [key]: value })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings((prev) => ({ ...prev, [key]: value }));
      toast.success('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
      throw error;
    }
  };

  const updateSettings = async (values: Partial<Settings>) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update(values)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings((prev) => ({ ...prev, ...values }));
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
      throw error;
    }
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSetting, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
