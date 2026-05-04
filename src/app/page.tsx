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
      <div className="min-h-screen bg-[#F7F7F5]">
        <Navbar />
        <LoadingDisplay lines={progressLines} />
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
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleSubmit}
              className="bg-[#1A5FA8] text-white text-sm px-5 py-2 rounded-lg hover:bg-[#154d8a] transition-colors"
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

function LoadingDisplay({ lines }: { lines: string[] }) {
  const { t } = useLanguage();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const progress = Math.min(10 + lines.length * 22, 90);

  return (
    <div className="max-w-xl mx-auto px-4 pt-24">
      <h2 className="text-lg font-medium text-gray-800 mb-2">{t('loading.title')}</h2>
      <p className="text-xs text-gray-400 mb-5">{t('loading.found')}</p>

      {/* progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[#1A5FA8] rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* live log */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 font-mono text-xs space-y-2 min-h-[140px]">
        {lines.length === 0 && (
          <div className="text-gray-300 animate-pulse">initializing…</div>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className="flex items-start gap-2 animate-fade-in"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span className={i === lines.length - 1 ? 'text-[#1A5FA8]' : 'text-green-500'}>
              {i === lines.length - 1 ? '›' : '✓'}
            </span>
            <span className={i === lines.length - 1 ? 'text-gray-700' : 'text-gray-400'}>
              {line}
            </span>
          </div>
        ))}
        {lines.length > 0 && (
          <div className="flex items-center gap-1 text-gray-300">
            <span className="inline-block w-1.5 h-3 bg-gray-300 animate-pulse rounded-sm" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
