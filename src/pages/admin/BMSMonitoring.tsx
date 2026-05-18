import { BMSMonitoringWidget } from '@/components/admin/BMSMonitoringWidget';

export default function BMSMonitoring() {
  return (
    <div className="space-y-3 w-full max-w-full overflow-x-hidden">
      <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Market Service Executive Monitoring</h1>
      <BMSMonitoringWidget />
    </div>
  );
}
