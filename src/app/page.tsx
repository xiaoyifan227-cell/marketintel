'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!query.trim()) { setError(t('errors.emptyInput')); return; }
    setError('');
    setLoading(true);
    setProgressLines([]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, language: locale })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t('errors.apiError'));
      }
      if (!res.body) throw new Error(t('errors.apiError'));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let json: Record<string, unknown>;
          try { json = JSON.parse(line.slice(6)); } catch { continue; }

          if (json.error) throw new Error(json.error as string);

          if (json.text) {
            setProgressLines(prev => [...prev, json.text as string]);
          }

          if (json.done && json.report) {
            const report = json.report as Record<string, unknown>;
            localStorage.setItem(`report_${report.id}`, JSON.stringify(report));
            router.push(`/report/${report.id}`);
            return;
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('errors.apiError'));
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #020617 0%, #0B1F3A 100%)' }}>
        <Navbar />
        <LoadingDisplay lines={progressLines} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020617 0%, #0B1F3A 100%)' }}>
      {/* Ambient glow blobs */}
      <div
        className="absolute top-32 left-1/4 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)' }}
      />
      <div
        className="absolute top-64 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)' }}
      />

      <Navbar />

      {/* ── Hero ── */}
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy + input */}
          <div>
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-mono text-white/50 tracking-widest">LIVE SIGNAL ACTIVE</span>
            </div>

            {/* Headline */}
            <h1 className="text-6xl lg:text-7xl font-bold text-white leading-none tracking-tight mb-6">
              {locale === 'zh' ? (
                <>
                  竞品 & 行业<br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(90deg, #22d3ee, #3b82f6)' }}
                  >
                    深度情报
                  </span>
                </>
              ) : (
                <>
                  Market<br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(90deg, #22d3ee, #3b82f6)' }}
                  >
                    Intelligence
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-white/60 text-base leading-relaxed mb-10 max-w-md">
              {t('home.subtitle')}
            </p>

            {/* Input card */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
              <div className="text-xs font-mono text-white/25 tracking-widest mb-3">REAL-TIME ANALYTICS</div>
              <textarea
                className="w-full text-sm text-white/85 placeholder-white/20 resize-none outline-none leading-relaxed bg-transparent"
                rows={4}
                placeholder={t('home.placeholder')}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                {error
                  ? <p className="text-red-400 text-xs">{error}</p>
                  : <div />
                }
                <button
                  onClick={handleSubmit}
                  className="text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap shadow-lg hover:shadow-cyan-500/40"
                  style={{
                    background: 'linear-gradient(90deg, #22d3ee, #3b82f6)',
                    boxShadow: '0 4px 20px rgba(34,211,238,0.25)',
                  }}
                >
                  {t('home.submitBtn')}
                </button>
              </div>
            </div>
          </div>

          {/* Right: dashboard mock */}
          <div className="relative hidden lg:block">
            <DashboardMock />
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20">
          {(['competitors', 'market', 'swot'] as const).map(f => (
            <div
              key={f}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:bg-white/[0.08] transition-all duration-300"
            >
              <div className="text-sm font-medium text-white/80 mb-1">{t(`home.features.${f}.title`)}</div>
              <div className="text-xs text-white/40 leading-relaxed">{t(`home.features.${f}.desc`)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard Mock ─── */
function DashboardMock() {
  // Chart points: x 0–280, y 0–90 (lower = higher on screen)
  const pts: [number, number][] = [
    [0, 78], [40, 58], [70, 68], [110, 42], [150, 52], [190, 28], [230, 38], [280, 16],
  ];
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const areaPath =
    `M ${pts[0][0]},${pts[0][1]} ` +
    pts.slice(1).map(([x, y]) => `L ${x},${y}`).join(' ') +
    ` L 280,90 L 0,90 Z`;

  return (
    <div className="relative h-[420px]">

      {/* Floating badge — top right */}
      <div
        className="absolute -top-5 right-4 z-20 bg-white/5 backdrop-blur-xl border border-white/15 rounded-xl px-4 py-3 animate-pulse"
        style={{ animationDuration: '3s' }}
      >
        <div className="text-[10px] font-mono text-white/35 tracking-widest mb-1">SYSTEM INDEX</div>
        <div className="text-sm font-bold text-green-400">BULLISH ↑</div>
      </div>

      {/* Main card */}
      <div
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
        style={{ transform: 'rotate(1.5deg)' }}
      >
        {/* Card header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[10px] font-mono text-white/30 tracking-widest mb-1">MARKET INTELLIGENCE</div>
            <div className="text-white font-semibold text-sm">Global Signal Index</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-mono">LIVE</span>
          </div>
        </div>

        {/* Line chart */}
        <div className="h-32 mb-5">
          <svg viewBox="0 0 280 90" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="chartArea" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#chartArea)" />
            <polyline
              points={polyline}
              fill="none"
              stroke="url(#chartLine)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* End-point pulse */}
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill="#22d3ee" />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="8" fill="#22d3ee" fillOpacity="0.2" />
          </svg>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: '+12.48%', label: 'Global Signal', color: 'text-cyan-400' },
            { value: '247',     label: 'Competitors',   color: 'text-white' },
            { value: 'BULL',    label: 'Trend Signal',  color: 'text-green-400' },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3">
              <div className={`${color} text-sm font-bold`}>{value}</div>
              <div className="text-white/35 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating badge — bottom left */}
      <div
        className="absolute -bottom-5 left-4 z-20 bg-white/5 backdrop-blur-xl border border-white/15 rounded-xl px-4 py-3"
        style={{ animation: 'pulse 4s ease-in-out infinite' }}
      >
        <div className="text-[10px] font-mono text-white/35 tracking-widest mb-1">NEW SIGNALS</div>
        <div className="text-sm font-bold text-cyan-400">+47 Sources</div>
      </div>
    </div>
  );
}

/* ─── Loading Screen ─── */
function LoadingDisplay({ lines }: { lines: string[] }) {
  const { t } = useLanguage();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const progress = Math.min(10 + lines.length * 22, 90);

  return (
    <div className="max-w-xl mx-auto px-4 pt-24">
      <h2 className="text-lg font-medium text-white/80 mb-2">{t('loading.title')}</h2>
      <p className="text-xs text-white/30 mb-5">{t('loading.found')}</p>

      <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-6">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #22d3ee, #3b82f6)',
          }}
        />
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 font-mono text-xs space-y-2 min-h-[140px]">
        {lines.length === 0 && (
          <div className="text-white/20 animate-pulse">initializing…</div>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex items-start gap-2 animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className={i === lines.length - 1 ? 'text-cyan-400' : 'text-green-500'}>
              {i === lines.length - 1 ? '›' : '✓'}
            </span>
            <span className={i === lines.length - 1 ? 'text-white/70' : 'text-white/35'}>
              {line}
            </span>
          </div>
        ))}
        {lines.length > 0 && (
          <div className="flex items-center gap-1 text-white/20">
            <span className="inline-block w-1.5 h-3 bg-white/20 animate-pulse rounded-sm" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
