'use client';

import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { apiGet } from '@/lib/client';
import { Card, Spinner } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

type Tech = {
  id: string; name: string; active: boolean;
  location: { lat: number; lng: number } | null;
  lastUpdated: string | null; distanceTravelled: number;
};

const containerStyle = { width: '100%', height: '70vh', borderRadius: '0.75rem' };
const defaultCenter = { lat: 12.9716, lng: 77.5946 }; // Bengaluru

export default function TrackingPage() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [techs, setTechs] = useState<Tech[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ technicians: Tech[] }>('/api/gps/live');
      setTechs(data.technicians);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, [load]);

  const located = techs.filter((t) => t.location);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Live Technician Tracking</h1>

      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <Card>Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your environment to enable the map.</Card>
      ) : !isLoaded ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <GoogleMap mapContainerStyle={containerStyle} center={located[0]?.location ?? defaultCenter} zoom={12}>
            {located.map((t) => (
              <MarkerF
                key={t.id}
                position={t.location!}
                onClick={() => setSelected(t.id)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 9,
                  fillColor: t.active ? '#10b981' : '#94a3b8',
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 2,
                }}
              >
                {selected === t.id && (
                  <InfoWindowF onCloseClick={() => setSelected(null)}>
                    <div className="text-slate-900">
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs">{t.active ? 'Active' : 'Offline'}</p>
                      <p className="text-xs">Travelled: {(t.distanceTravelled / 1000).toFixed(2)} km</p>
                      {t.lastUpdated && <p className="text-xs">Updated {formatDistanceToNow(new Date(t.lastUpdated), { addSuffix: true })}</p>}
                    </div>
                  </InfoWindowF>
                )}
              </MarkerF>
            ))}
          </GoogleMap>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {techs.map((t) => (
          <Card key={t.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-slate-400">
                {t.lastUpdated ? formatDistanceToNow(new Date(t.lastUpdated), { addSuffix: true }) : 'No location yet'}
              </p>
            </div>
            <span className={`badge ${t.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {t.active ? 'Active' : 'Offline'}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
