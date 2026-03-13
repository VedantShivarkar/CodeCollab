'use client';

// 1. TURBOPACK POLYFILL: Inject Node globals before y-webrtc loads
if (typeof window !== 'undefined') {
  if (!(window as any).global) (window as any).global = window;
  if (!(window as any).process) (window as any).process = { env: {} };
}

import dynamic from 'next/dynamic';

const CollaborativeEditor = dynamic(() => import('./Editor'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-5xl h-[600px] border border-gray-700 rounded-lg flex items-center justify-center bg-gray-900 shadow-2xl">
      <p className="text-gray-400 font-mono animate-pulse">Booting WebRTC & Wasm Environment...</p>
    </div>
  )
});

export default function EditorWrapper() {
  return <CollaborativeEditor />;
}