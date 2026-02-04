import React, { useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation } from 'lucide-react';

interface EmployeeLocation {
  id: string;
  name: string;
  initials: string;
  lat: number;
  lng: number;
}

interface EmployeeLocationMiniMapProps {
  employees: EmployeeLocation[];
  className?: string;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoidnJpbmRhYm9ya2FyIiwiYSI6ImNtand4eXoyYzNjZ3YzZnNlcnh6d203OWEifQ.4dElP4Ezda0GYOS_nZ9tMw';

// Default center (India) as fallback
const DEFAULT_CENTER: [number, number] = [78.9629, 20.5937];
const DEFAULT_ZOOM = 4;

const EmployeeLocationMiniMap: React.FC<EmployeeLocationMiniMapProps> = ({ employees, className = '' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Memoize valid employees to prevent unnecessary re-renders
  const validEmployees = useMemo(() => 
    employees.filter(emp => 
      typeof emp.lat === 'number' && 
      typeof emp.lng === 'number' && 
      !isNaN(emp.lat) && 
      !isNaN(emp.lng) &&
      isFinite(emp.lat) &&
      isFinite(emp.lng) &&
      emp.lat >= -90 && emp.lat <= 90 &&
      emp.lng >= -180 && emp.lng <= 180
    ), [employees]
  );

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Clean up previous map instance
    if (map.current) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current.remove();
      map.current = null;
    }

    // Don't initialize map if no valid employees
    if (validEmployees.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Calculate initial center and zoom
    let center: [number, number] = DEFAULT_CENTER;
    let zoom = DEFAULT_ZOOM;

    if (validEmployees.length === 1) {
      center = [validEmployees[0].lng, validEmployees[0].lat];
      zoom = 14;
    } else if (validEmployees.length > 1) {
      // Calculate center from all valid employees
      const avgLng = validEmployees.reduce((sum, emp) => sum + emp.lng, 0) / validEmployees.length;
      const avgLat = validEmployees.reduce((sum, emp) => sum + emp.lat, 0) / validEmployees.length;
      center = [avgLng, avgLat];
      zoom = 10;
    }

    // Initialize map with safe defaults
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
      interactive: false,
    });

    // Fit bounds after map loads if multiple employees
    map.current.on('load', () => {
      if (validEmployees.length > 1 && map.current) {
        const bounds = new mapboxgl.LngLatBounds();
        validEmployees.forEach(emp => {
          bounds.extend([emp.lng, emp.lat]);
        });
        map.current.fitBounds(bounds, { padding: 40 });
      }

      // Add markers for each employee
      validEmployees.forEach(emp => {
        if (!map.current) return;
        
        const el = document.createElement('div');
        el.className = 'employee-marker';
        el.innerHTML = `
          <div style="
            background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 600;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            ${emp.initials}
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(`https://www.google.com/maps/dir/?api=1&destination=${emp.lat},${emp.lng}`, '_blank');
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([emp.lng, emp.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false })
              .setHTML(`
                <div style="padding: 4px 8px;">
                  <div style="font-weight: 600; font-size: 12px;">${emp.name}</div>
                  <a 
                    href="https://www.google.com/maps/dir/?api=1&destination=${emp.lat},${emp.lng}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style="color: hsl(var(--primary)); font-size: 11px; display: flex; align-items: center; gap: 4px; margin-top: 4px; text-decoration: none;"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                    </svg>
                    Navigate
                  </a>
                </div>
              `)
          )
          .addTo(map.current);

        markersRef.current.push(marker);
      });
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [validEmployees]);

  if (validEmployees.length === 0) {
    return (
      <div className={`bg-muted/50 rounded-lg flex items-center justify-center ${className}`}>
        <p className="text-xs text-muted-foreground">No GPS data available</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute bottom-1 right-1 bg-background/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] text-muted-foreground flex items-center gap-1">
        <Navigation className="h-2.5 w-2.5" />
        Click pin to navigate
      </div>
    </div>
  );
};

export default EmployeeLocationMiniMap;
