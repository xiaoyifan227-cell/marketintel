import { NextRequest, NextResponse } from 'next/server';

interface Competitor {
  name: string;
  valuation?: string;
  revenue?: string;
  marketShare?: number;
  strength?: string;
}

interface Trend {
  title: string;
  description: string;
  impact: string;
}

export async function POST(req: NextRequest) {
  const report = await req.json();
  const isZh = report.language === 'zh';

  const competitorsHtml = (report.competitors || []).map((c: Competitor) => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.valuation || '—'}</td>
      <td>${c.revenue || '—'}</td>
      <td>${c.marketShare != null ? c.marketShare + '%' : '—'}</td>
      <td>${c.strength || '—'}</td>
    </tr>
  `).join('');

  const swotHtml = `
    <table class="swot">
      <tr>
        <td class="strengths"><strong>${isZh ? '优势' : 'Strengths'}</strong><br>${(report.swot?.strengths || []).map((s: string) => `• ${s}`).join('<br>')}</td>
        <td class="weaknesses"><strong>${isZh ? '劣势' : 'Weaknesses'}</strong><br>${(report.swot?.weaknesses || []).map((s: string) => `• ${s}`).join('<br>')}</td>
      </tr>
      <tr>
        <td class="opportunities"><strong>${isZh ? '机会' : 'Opportunities'}</strong><br>${(report.swot?.opportunities || []).map((s: string) => `• ${s}`).join('<br>')}</td>
        <td class="threats"><strong>${isZh ? '威胁' : 'Threats'}</strong><br>${(report.swot?.threats || []).map((s: string) => `• ${s}`).join('<br>')}</td>
      </tr>
    </table>
  `;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 48px; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  h2 { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin: 24px 0 10px; border-top: 1px solid #eee; padding-top: 16px; }
  .meta { font-size: 11px; color: #999; margin-bottom: 24px; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .metric { background: #f5f5f3; border-radius: 8px; padding: 12px; }
  .metric-label { font-size: 10px; color: #888; margin-bottom: 4px; }
  .metric-value { font-size: 18px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f5f5f3; padding: 8px; text-align: left; font-weight: 600; }
  td { padding: 8px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  .swot { margin-top: 8px; }
  .swot td { padding: 12px; font-size: 11px; line-height: 1.8; width: 50%; }
  .strengths { background: #f0faf4; }
  .weaknesses { background: #fefaf0; }
  .opportunities { background: #eff6ff; }
  .threats { background: #fff5f5; }
  .summary-box { background: #f9f9f8; border-radius: 8px; padding: 16px; margin-top: 8px; font-size: 12px; line-height: 1.8; }
</style>
</head>
<body>
  <h1>${report.product}</h1>
  <div class="meta">${report.industry} · ${report.market} · ${report.generatedAt}</div>

  <div class="metrics">
    <div class="metric"><div class="metric-label">${isZh ? '市场规模' : 'Market Size'}</div><div class="metric-value">${report.marketSize}</div></div>
    <div class="metric"><div class="metric-label">${isZh ? '识别竞品' : 'Competitors'}</div><div class="metric-value">${(report.competitors || []).length}</div></div>
    <div class="metric"><div class="metric-label">${isZh ? '市场集中度' : 'Concentration'}</div><div class="metric-value">${report.concentration}</div></div>
    <div class="metric"><div class="metric-label">${isZh ? '预测规模' : 'Projected'}</div><div class="metric-value">${report.marketSizeProjected}</div></div>
  </div>

  <h2>${isZh ? '主要竞品' : 'Key Competitors'}</h2>
  <table>
    <tr><th>${isZh ? '公司' : 'Company'}</th><th>${isZh ? '市值/融资' : 'Valuation'}</th><th>${isZh ? '营收' : 'Revenue'}</th><th>${isZh ? '市场份额' : 'Market Share'}</th><th>${isZh ? '核心优势' : 'Strength'}</th></tr>
    ${competitorsHtml}
  </table>

  <h2>SWOT</h2>
  ${swotHtml}

  <h2>${isZh ? '行业趋势' : 'Industry Trends'}</h2>
  <table>
    ${(report.trends || []).map((tr: Trend) => `<tr><td><strong>${tr.title}</strong><br><span style="color:#888">${tr.description}</span></td><td style="width:80px;color:#666">${tr.impact}</td></tr>`).join('')}
  </table>

  <h2>${isZh ? '执行摘要' : 'Executive Summary'}</h2>
  <div class="summary-box">${report.summary}</div>

  <h2>${isZh ? '差异化策略建议' : 'Differentiation Strategy'}</h2>
  <div class="summary-box">${report.strategy}</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="report.html"'
    }
  });
}
