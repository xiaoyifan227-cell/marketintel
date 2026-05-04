'use client';
import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Competitor {
  name: string;
  valuation?: string;
  revenue?: string;
  marketShare?: number;
  growth?: string;
  strength?: string;
  threat: string;
  isTop?: boolean;
  website?: string;
}

interface Trend {
  title: string;
  description: string;
  impact: string;
}

interface Source {
  name: string;
  url: string;
  desc: string;
}

interface Report {
  product: string;
  industry: string;
  market: string;
  generatedAt: string;
  language: string;
  marketSize: string;
  marketSizeProjected: string;
  concentration: string;
  summary: string;
  strategy: string;
  competitors?: Competitor[];
  marketShareData?: { labels: string[]; values: number[] };
  swot?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  trends?: Trend[];
  sources?: Source[];
}

export default function ReportView({ report }: { report: unknown }) {
  const { t } = useLanguage();
  const r = report as Report;
  const reportRef = useRef<HTMLDivElement>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackUseCase, setFeedbackUseCase] = useState('');
  const [feedbackImprove, setFeedbackImprove] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const clean = (text: string) => text?.replace(/<[^>]*>/g, '') || '';

  const marketShareData = (r.marketShareData?.labels || []).map((label: string, i: number) => ({
    name: label,
    value: r.marketShareData!.values[i]
  }));

  async function downloadWord() {
    const res = await fetch('/api/export/word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'report.docx'; a.click();
    URL.revokeObjectURL(url);
  }

  async function submitFeedback() {
    setFeedbackStatus('submitting');
    try {
      const res = await fetch('https://formspree.io/f/xnjowknk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          useCase: feedbackUseCase,
          improve: feedbackImprove,
          email: feedbackEmail,
          product: r.product,
          industry: r.industry,
        }),
      });
      if (res.ok) {
        setFeedbackStatus('done');
      } else {
        setFeedbackStatus('error');
      }
    } catch {
      setFeedbackStatus('error');
    }
  }


  const threatColors: Record<string, string> = {
    high: 'bg-blue-50 text-blue-700',
    medium: 'bg-amber-50 text-amber-700',
    low: 'bg-green-50 text-green-700'
  };
  const impactDots: Record<string, string> = { high: '#1A5FA8', medium: '#BA7517', low: '#1D9E75' };
  const swotStyles = {
    strengths: { bg: 'bg-green-50', label: 'text-green-700', text: 'text-green-800' },
    weaknesses: { bg: 'bg-amber-50', label: 'text-amber-700', text: 'text-amber-800' },
    opportunities: { bg: 'bg-blue-50', label: 'text-blue-700', text: 'text-blue-800' },
    threats: { bg: 'bg-red-50', label: 'text-red-700', text: 'text-red-800' }
  };

  return (
    <div ref={reportRef} className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <a
          href="/"
          className="export-bar inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-4"
        >
          ← {t('nav.newReport')}
        </a>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">{r.product} — {r.industry}</h1>
        <p className="text-xs text-gray-400">{t('report.generatedAt')}: {r.generatedAt} · {t('report.market')}: {r.market}</p>
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
          <p className="text-xs text-amber-700 leading-relaxed">
            {r.language === 'zh'
              ? '本报告数据由 AI 联网搜索生成，建议核实关键数据后使用。'
              : 'This report is AI-generated from web search results. Please verify key data before use.'}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: t('report.metrics.marketSize'), value: clean(r.marketSize) },
          { label: t('report.metrics.competitors'), value: r.competitors?.length },
          { label: t('report.metrics.concentration'), value: clean(r.concentration) },
          { label: t('report.metrics.projected'), value: clean(r.marketSizeProjected) }
        ].map((m, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">{m.label}</div>
            <div className="text-lg font-semibold text-gray-900">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Competitors */}
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{t('report.sections.competitors')}</div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(r.competitors || []).map((c, i) => (
          <div key={i} className={`bg-white rounded-xl p-4 border ${c.isTop ? 'border-[#1A5FA8] border-l-4' : 'border-gray-200'}`}>
            <div className="font-medium text-gray-900 text-sm mb-1">{c.name}</div>
            <span className={`text-xs px-2 py-0.5 rounded-full inline-block mb-3 ${threatColors[c.threat] || threatColors.medium}`}>
              {t(`report.threat.${c.threat}`)}
            </span>
            <div className="space-y-1">
              {[
                [t('report.competitorFields.valuation'), clean(c.valuation || '')],
                [t('report.competitorFields.revenue'), clean(c.revenue || '')],
                [t('report.competitorFields.share'), c.marketShare != null ? `${c.marketShare}%` : '—'],
                [t('report.competitorFields.growth'), clean(c.growth || '')],
                [t('report.competitorFields.strength'), clean(c.strength || '')]
              ].map(([label, val], j) => (
                <div key={j} className="text-xs text-gray-400">{label}: <span className="text-gray-700 font-medium">{val}</span></div>
              ))}
            </div>
            {c.website?.trim() && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <a
                  href={c.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1A5FA8] transition-colors"
                >
                  官网
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts + Trends */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('report.sections.marketShare')}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={marketShareData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="value" fill="#1A5FA8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">{t('report.sections.trends')}</div>
          <div className="space-y-4">
            {(r.trends || []).map((tr, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: impactDots[tr.impact] || '#888' }} />
                <div>
                  <div className="text-sm text-gray-800 leading-snug">{clean(tr.title)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{clean(tr.description)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SWOT */}
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{t('report.sections.swot')}</div>
      <div className="grid grid-cols-2 gap-px bg-gray-200 rounded-xl overflow-hidden mb-6">
        {(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).map(key => {
          const s = swotStyles[key];
          return (
            <div key={key} className={`${s.bg} p-4`}>
              <div className={`text-xs font-semibold uppercase tracking-wider ${s.label} mb-3`}>{t(`report.swotLabels.${key}`)}</div>
              {(r.swot?.[key] || []).map((item: string, i: number) => (
                <div key={i} className={`text-xs ${s.text} leading-relaxed`}>· {clean(item)}</div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Summary + Strategy */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{t('report.sections.summary')}</div>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">{clean(r.summary)}</p>
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{t('report.sections.strategy')}</div>
        <p className="text-sm text-gray-700 leading-relaxed">{clean(r.strategy)}</p>
      </div>

      {/* Sources */}
      {(r.sources || []).length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            {r.language === 'zh' ? '数据来源' : 'Data Sources'}
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {(r.sources || []).map((s, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <span className="text-gray-300 mt-0.5 flex-shrink-0">↗</span>
                <div>
                  {s.url?.startsWith('http') ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#1A5FA8] hover:underline font-medium"
                    >
                      {s.name}
                    </a>
                  ) : (
                    <span className="text-gray-700 font-medium">{s.name}</span>
                  )}
                  {s.desc && <span className="text-gray-400 ml-1.5">— {s.desc}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export */}
      <div className="export-bar pt-4 border-t border-gray-100">
        <div className="flex gap-3">
        <button
          onClick={() => window.print()}
          className="flex-1 py-2.5 bg-[#1A5FA8] text-white text-sm rounded-lg hover:bg-[#154d8a] transition-colors"
        >
          {r.language === 'zh' ? '按 Command+P / Ctrl+P 下载 PDF' : 'Press Cmd+P / Ctrl+P to Save PDF'}
        </button>
        <button onClick={downloadWord} className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">{t('report.export.word')}</button>
        <button
          onClick={() => { setShowFeedback(true); setFeedbackStatus('idle'); }}
          className="px-4 py-2.5 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          💬 {t('feedback.button')}
        </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {r.language === 'zh' ? '打印时选择"保存为 PDF"' : 'In the print dialog, choose "Save as PDF"'}
        </p>
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            {feedbackStatus === 'done' ? (
              <div className="text-center py-6">
                <div className="text-3xl mb-3">🎉</div>
                <div className="text-gray-800 font-medium mb-1">{t('feedback.doneTitle')}</div>
                <div className="text-xs text-gray-400 mb-5">{t('feedback.doneDesc')}</div>
                <button onClick={() => setShowFeedback(false)} className="px-5 py-2 bg-[#1A5FA8] text-white text-sm rounded-lg hover:bg-[#154d8a]">{t('feedback.close')}</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-gray-900">{t('feedback.title')}</h3>
                  <button onClick={() => setShowFeedback(false)} className="text-gray-300 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('feedback.useCaseLabel')}</label>
                    <select
                      value={feedbackUseCase}
                      onChange={e => setFeedbackUseCase(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#1A5FA8]/30 focus:border-[#1A5FA8]"
                    >
                      <option value="">{t('feedback.useCasePlaceholder')}</option>
                      <option value="job">{t('feedback.useCases.job')}</option>
                      <option value="startup">{t('feedback.useCases.startup')}</option>
                      <option value="school">{t('feedback.useCases.school')}</option>
                      <option value="work">{t('feedback.useCases.work')}</option>
                      <option value="other">{t('feedback.useCases.other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('feedback.improveLabel')} <span className="text-gray-300 font-normal">{t('feedback.improveOptional')}</span></label>
                    <textarea
                      value={feedbackImprove}
                      onChange={e => setFeedbackImprove(e.target.value)}
                      placeholder={t('feedback.improvePlaceholder')}
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#1A5FA8]/30 focus:border-[#1A5FA8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('feedback.emailLabel')} <span className="text-gray-300 font-normal">{t('feedback.emailOptional')}</span></label>
                    <input
                      type="email"
                      value={feedbackEmail}
                      onChange={e => setFeedbackEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A5FA8]/30 focus:border-[#1A5FA8]"
                    />
                  </div>
                </div>

                {feedbackStatus === 'error' && (
                  <p className="text-xs text-red-500 mt-3">{t('feedback.error')}</p>
                )}

                <button
                  onClick={submitFeedback}
                  disabled={feedbackStatus === 'submitting' || !feedbackUseCase}
                  className="mt-5 w-full py-2.5 bg-[#1A5FA8] text-white text-sm rounded-lg hover:bg-[#154d8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {feedbackStatus === 'submitting' ? t('feedback.submitting') : t('feedback.submit')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
