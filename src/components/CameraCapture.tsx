'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';

/**
 * Camera capture widget. Streams the device camera and lets the user snap a
 * still, returned as a JPEG data URL via onCapture. Falls back to a file input
 * if camera access is denied (common on desktop).
 */
export function CameraCapture({
  onCapture,
  facing = 'user',
}: {
  onCapture: (dataUrl: string) => void;
  facing?: 'user' | 'environment';
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreaming(true);
        }
      } catch {
        setError('Camera unavailable — use file upload below.');
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [facing]);

  function snap() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setShot(dataUrl);
    onCapture(dataUrl);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setShot(url);
      onCapture(url);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg bg-black">
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot} alt="capture" className="w-full" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        )}
      </div>

      {error && <p className="text-xs text-amber-600">{error}</p>}

      <div className="flex gap-2">
        {shot ? (
          <button type="button" onClick={() => setShot(null)} className="btn-ghost flex-1">
            <RefreshCw className="h-4 w-4" /> Retake
          </button>
        ) : (
          streaming && (
            <button type="button" onClick={snap} className="btn-primary flex-1">
              <Camera className="h-4 w-4" /> Capture
            </button>
          )
        )}
      </div>

      <label className="block text-center text-xs text-slate-500">
        or{' '}
        <span className="cursor-pointer text-brand-600 underline">
          upload a photo
          <input type="file" accept="image/*" capture={facing === 'user' ? 'user' : 'environment'} onChange={onFile} className="hidden" />
        </span>
      </label>
    </div>
  );
}
