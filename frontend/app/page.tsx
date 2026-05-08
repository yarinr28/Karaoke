'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="w-full max-w-sm px-6 text-center">
        <div className="text-7xl mb-6">🎤</div>
        <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-purple-300 to-indigo-400 bg-clip-text text-transparent">
          Karaoke
        </h1>
        <p className="text-text-dim text-sm mb-10">AI-powered party mode</p>

        <button
          onClick={() => router.push('/host')}
          className="w-full py-3.5 bg-accent hover:bg-accent-bright text-white font-semibold rounded-xl transition-colors text-base mb-4"
        >
          Host a Session
        </button>

        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-border" />
          <span className="text-text-dim text-xs">or join</span>
          <hr className="flex-1 border-border" />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Room code…"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && router.push(`/guest/${code}`)}
            maxLength={8}
            className="flex-1 px-3 py-3 bg-surface border border-border rounded-xl text-white placeholder:text-text-dim outline-none focus:border-accent font-mono text-center tracking-widest text-lg uppercase"
          />
          <button
            onClick={() => code.length >= 4 && router.push(`/guest/${code}`)}
            disabled={code.length < 4}
            className="px-5 py-3 bg-surface border border-border hover:border-accent rounded-xl text-white disabled:opacity-40 transition-colors font-semibold"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
