'use client';
import { useState, useEffect } from 'react';
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

// Infer a friendly progress step from the accumulated JSON text
function inferStep(text: string, isZh: boolean): string {
  if (text.includes('"sources"'))      return isZh ? '即将完成，整理数据来源…' : 'Almost done, compiling sources…';
  if (text.includes('"strategy"'))     return isZh ? '正在撰写差异化策略建议…' : 'Writing differentiation strategy…';
  if (text.includes('"trends"'))       return isZh ? '正在分析行业趋势…' : 'Analysing industry trends…';
  if (text.includes('"swot"'))         return isZh ? '正在生成 SWOT 分析…' : 'Generating SWOT analysis…';
  if (text.includes('"revenueHistory"')) return isZh ? '正在整理营收历史数据…' : 'Compiling revenue history…';
  if (text.includes('"marketShareData"')) return isZh ? '正在计算市场份额分布…' : 'Calculating market share…';
  if (text.includes('"competitors"'))  return isZh ? '正在分析各竞品详情…' : 'Analysing competitor details…';
  if (text.includes('"marketSize"'))   return isZh ? '正在获取市场规模数据…' : 'Fetching market size data…';
  if (text.includes('"summary"'))      return isZh ? '正在撰写执行摘要…' : 'Writing executive summary…';
  if (text.includes('"product"'))      return isZh ? '正在整理报告结构…' : 'Structuring the report…';
  return isZh ? '正在生成报告内容…' : 'Generating report content…';
}

function LoadingDisplay({ lines, streamingText }: { lines: string[]; streamingText: string }) {
  const { t, locale } = useLanguage();
  const isZh = locale === 'zh';

  // Build the full list of steps shown to the user
  const streamStep = streamingText.length > 0 ? inferStep(streamingText, isZh) : null;
  const allSteps = streamStep ? [...lines, streamStep] : lines;

  const progress = Math.min(10 + lines.length * 18 + (streamingText.length > 0 ? Math.min(streamingText.length / 60, 32) : 0), 95);

  return (
    <div className="max-w-xl mx-auto px-4 pt-20 pb-16">
      <h2 className="text-lg font-medium text-gray-800 mb-1">{t('loading.title')}</h2>
      <p className="text-xs text-gray-400 mb-5">{t('loading.found')}</p>

      {/* progress bar */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[#1A5FA8] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* step log */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2.5 min-h-[160px]">
        {allSteps.length === 0 && (
          <div className="text-xs text-gray-300 animate-pulse">initializing…</div>
        )}
        {allSteps.map((line, i) => {
          const isLast = i === allSteps.length - 1;
          const isStreaming = isLast && streamingText.length > 0;
          return (
            <div key={i} className="flex items-start gap-2">
              <span className={`mt-px text-xs ${isLast ? 'text-[#1A5FA8]' : 'text-green-500'}`}>
                {isLast ? '›' : '✓'}
              </span>
              <span className={`text-xs leading-relaxed ${isLast ? 'text-gray-800' : 'text-gray-400'}`}>
                {line}
              </span>
              {isStreaming && (
                <span className="inline-block w-1.5 h-3.5 bg-[#1A5FA8] animate-pulse rounded-sm ml-0.5 mt-px" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
