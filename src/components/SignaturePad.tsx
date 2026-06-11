'use client';

import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser } from 'lucide-react';

/**
 * Touch/mouse signature capture. Calls onChange with a PNG data URL whenever
 * the stroke ends, or null when cleared.
 */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<SignatureCanvas>(null);

  function handleEnd() {
    const pad = ref.current;
    if (pad && !pad.isEmpty()) {
      onChange(pad.getCanvas().toDataURL('image/png'));
    }
  }

  function clear() {
    ref.current?.clear();
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white dark:border-slate-700">
        <SignatureCanvas
          ref={ref}
          penColor="#0f172a"
          onEnd={handleEnd}
          canvasProps={{ className: 'w-full', height: 180 }}
        />
      </div>
      <button type="button" onClick={clear} className="btn-ghost text-xs">
        <Eraser className="h-4 w-4" /> Clear
      </button>
    </div>
  );
}
