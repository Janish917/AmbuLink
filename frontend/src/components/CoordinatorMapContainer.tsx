'use client';

import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/CoordinatorMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#02050b]/90 animate-pulse flex flex-col items-center justify-center border border-white/5 rounded-2xl relative overflow-hidden">
      <div className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-2 animate-pulse">Establishing Central Fleet coordinates...</div>
      <div className="text-[10px] text-white/40 uppercase tracking-widest font-mono">syncing traffic preemptions</div>
      {/* HUD border elements */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-cyan-500/30" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-cyan-500/30" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-cyan-500/30" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-cyan-500/30" />
    </div>
  )
});

export default function CoordinatorMapContainer(props: any) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
      <DynamicMap {...props} />
    </div>
  );
}
