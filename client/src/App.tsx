import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import HostView from './pages/HostView';
import GuestView from './pages/GuestView';

function HomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <div className="text-center max-w-sm w-full px-6">
        <div className="text-7xl mb-6">🎤</div>
        <h1
          className="text-4xl font-extrabold mb-2"
          style={{
            background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Karaoke
        </h1>
        <p className="text-text-dim text-sm mb-10">Party mode enabled</p>

        <button
          onClick={() => navigate('/host')}
          className="w-full py-3.5 bg-accent hover:bg-accent-bright text-white font-semibold rounded-xl transition-colors mb-4 text-base"
        >
          Host a Session
        </button>

        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-border" />
          <span className="text-text-dim text-xs">or</span>
          <hr className="flex-1 border-border" />
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter room code…"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && navigate(`/guest/${code}`)}
            maxLength={8}
            className="flex-1 px-3 py-3 bg-surface border border-border rounded-xl text-white placeholder:text-text-dim outline-none focus:border-accent font-mono text-center tracking-widest text-lg uppercase"
          />
          <button
            onClick={() => code.length >= 4 && navigate(`/guest/${code}`)}
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/host" element={<HostView />} />
      <Route path="/guest/:code" element={<GuestView />} />
    </Routes>
  );
}
