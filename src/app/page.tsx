'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [market, setMarket] = useState('global');
  const [style, setStyle] = useState('concise');
  const [loading, setLoading] = useState(false);
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState('');

  const markets = ['global', 'china', 'northAmerica', 'sea'] as const;
  const styles = ['concise', 'detailed', 'consulting'] as const;

  async function handleSubmit() {
    if (!query.trim()) { setError(t('errors.emptyInput')); return; }
    setError('');
    setLoading(true);
    setProgressLines([]);
    setStreamingText('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, market, style, language: locale })
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

          if (json.chunk) {
            setStreamingText(prev => prev + (json.chunk as string));
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
      <div className="min-h-screen bg-[#F7F7F5]">
        <Navbar />
        <LoadingDisplay lines={progressLines} streamingText={streamingText} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3 text-center">{t('home.title')}</h1>
        <p className="text-gray-500 text-center mb-10 text-sm">{t('home.subtitle')}</p>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <textarea
            className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed"
            rows={5}
            placeholder={t('home.placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">{t('home.marketLabel')}:</span>
            {markets.map(m => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  market === m
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t(`home.markets.${m}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">{t('home.styleLabel')}:</span>
              {styles.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    style === s
                      ? 'bg-violet-50 border-violet-300 text-violet-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t(`home.styles.${s}`)}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              className="bg-[#1A5FA8] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#154d8a] transition-colors whitespace-nowrap ml-4"
            >
              {t('home.submitBtn')}
            </button>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3 mt-8">
          {(['competitors', 'market', 'swot'] as const).map(f => (
            <div key={f} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-sm font-medium text-gray-800 mb-1">{t(`home.features.${f}.title`)}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{t(`home.features.${f}.desc`)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingDisplay({ lines, streamingText }: { lines: string[]; streamingText: string }) {
  const { t } = useLanguage();
  const streamRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamingText]);

  const progress = Math.min(10 + lines.length * 20 + (streamingText.length > 0 ? 20 : 0), 95);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-16 pb-16">
      <h2 className="text-lg font-medium text-gray-800 mb-1">{t('loading.title')}</h2>
      <p className="text-xs text-gray-400 mb-4">{t('loading.found')}</p>

      {/* progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-[#1A5FA8] rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* status steps */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-5">
        {lines.length === 0 && (
          <span className="text-xs text-gray-300 animate-pulse">initializing…</span>
        )}
        {lines.map((line, i) => (
          <span key={i} className="flex items-center gap-1 text-xs">
            <span className={i === lines.length - 1 && streamingText.length === 0 ? 'text-[#1A5FA8]' : 'text-green-500'}>
              {i === lines.length - 1 && streamingText.length === 0 ? '›' : '✓'}
            </span>
            <span className={i === lines.length - 1 && streamingText.length === 0 ? 'text-gray-700' : 'text-gray-400'}>
              {line}
            </span>
          </span>
        ))}
      </div>

      {/* streaming output */}
      <div className="bg-[#1C1C1E] rounded-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="ml-2 text-xs text-white/30 font-mono">AI output</span>
          {streamingText.length > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-400/70">
              <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse rounded-sm" />
              streaming
            </span>
          )}
        </div>
        <pre
          ref={streamRef}
          className="p-4 font-mono text-xs text-green-300/90 leading-relaxed h-72 overflow-y-auto whitespace-pre-wrap break-words"
        >
          {streamingText.length === 0 ? (
            <span className="text-white/20 animate-pulse">Waiting for model output…</span>
          ) : (
            streamingText
          )}
        </pre>
      </div>
    </div>
  );
}
