'use client';

import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/SimulatorMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#030811]/90 animate-pulse flex flex-col items-center justify-center border border-white/5 rounded-2xl relative overflow-hidden">
      <div className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-2 animate-pulse">Initializing Command Map Overlay...</div>
      <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">establishing grid telemetries</div>
      <div className="absolute inset-0 z-10 pointer-events-none opacity-5 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]" />
      {/* HUD border elements */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-cyan-500/30" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-cyan-500/30" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-cyan-500/30" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30" />
    </div>
  )
});

export default function SimulatorMapContainer(props: any) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
      <DynamicMap {...props} />
    </div>
  );
}
