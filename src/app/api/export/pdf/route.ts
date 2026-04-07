import { NextRequest, NextResponse } from 'next/server';

interface Competitor {
  name: string;
  valuation?: string;
  revenue?: string;
  marketShare?: number;
  marketShare_?: number;
  strength?: string;
  weakness?: string;
  growth?: string;
  threat?: string;
  founded?: number;
  hq?: string;
  positioning?: string;
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
    <tr class="competitor-row">
      <td class="col-name"><strong>${c.name}</strong>${c.hq ? `<br><span class="sub">${c.hq}</span>` : ''}${c.founded ? `<br><span class="sub">${c.founded}</span>` : ''}</td>
      <td class="col-val">${c.valuation || '—'}</td>
      <td class="col-rev">${c.revenue || '—'}</td>
      <td class="col-share">${c.marketShare != null ? c.marketShare + '%' : '—'}</td>
      <td class="col-growth">${c.growth || '—'}</td>
      <td class="col-strength">${c.strength || '—'}</td>
      <td class="col-threat threat-${c.threat || 'low'}">${c.threat || '—'}</td>
    </tr>
  `).join('');

  const swotHtml = `
    <table class="swot-table">
      <colgroup>
        <col style="width:50%">
        <col style="width:50%">
      </colgroup>
      <tr>
        <td class="swot-cell strengths">
          <div class="swot-label">${isZh ? '优势 Strengths' : 'Strengths'}</div>
          <ul>${(report.swot?.strengths || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
        </td>
        <td class="swot-cell weaknesses">
          <div class="swot-label">${isZh ? '劣势 Weaknesses' : 'Weaknesses'}</div>
          <ul>${(report.swot?.weaknesses || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
        </td>
      </tr>
      <tr>
        <td class="swot-cell opportunities">
          <div class="swot-label">${isZh ? '机会 Opportunities' : 'Opportunities'}</div>
          <ul>${(report.swot?.opportunities || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
        </td>
        <td class="swot-cell threats">
          <div class="swot-label">${isZh ? '威胁 Threats' : 'Threats'}</div>
          <ul>${(report.swot?.threats || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
        </td>
      </tr>
    </table>
  `;

  const trendsHtml = (report.trends || []).map((tr: Trend) => `
    <tr class="trend-row">
      <td class="col-trend-title"><strong>${tr.title}</strong></td>
      <td class="col-trend-desc">${tr.description}</td>
      <td class="col-trend-impact impact-${tr.impact}">${tr.impact}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    padding: 40px;
    line-height: 1.6;
    background: #fff;
  }

  /* ── Header ── */
  .report-header { margin-bottom: 20px; border-bottom: 2px solid #1A5FA8; padding-bottom: 14px; }
  .report-title { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 4px; }
  .report-meta { font-size: 10px; color: #888; }

  /* ── Section headings ── */
  h2 {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #1A5FA8;
    margin: 22px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #dde8f5;
  }

  /* ── Metrics table ── */
  .metrics-table { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 4px; }
  .metrics-table td { width: 25%; background: #f5f7fa; border-radius: 6px; padding: 10px 12px; vertical-align: top; }
  .metric-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
  .metric-value { font-size: 16px; font-weight: 700; color: #111; line-height: 1.2; }

  /* ── Competitors table ── */
  .competitors-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .competitors-table colgroup col.col-name    { width: 14%; }
  .competitors-table colgroup col.col-val     { width: 18%; }
  .competitors-table colgroup col.col-rev     { width: 18%; }
  .competitors-table colgroup col.col-share   { width: 8%; }
  .competitors-table colgroup col.col-growth  { width: 9%; }
  .competitors-table colgroup col.col-strength{ width: 22%; }
  .competitors-table colgroup col.col-threat  { width: 11%; }

  .competitors-table th {
    background: #1A5FA8;
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 7px 6px;
    text-align: left;
    white-space: nowrap;
  }
  .competitor-row td {
    padding: 7px 6px;
    font-size: 10px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .competitor-row:nth-child(even) td { background: #fafafa; }
  .sub { font-size: 9px; color: #aaa; }

  .threat-high   { color: #c0392b; font-weight: 600; }
  .threat-medium { color: #d68910; font-weight: 600; }
  .threat-low    { color: #27ae60; font-weight: 600; }

  /* ── SWOT ── */
  .swot-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .swot-cell {
    width: 50%;
    padding: 12px 14px;
    vertical-align: top;
    font-size: 10px;
    line-height: 1.7;
  }
  .swot-label { font-size: 10px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
  .swot-cell ul { padding-left: 14px; }
  .swot-cell li { margin-bottom: 3px; }

  .strengths     { background: #f0faf4; border: 1px solid #c3e6cb; }
  .weaknesses    { background: #fefaf0; border: 1px solid #fde8a0; }
  .opportunities { background: #eff6ff; border: 1px solid #bfdbfe; }
  .threats       { background: #fff5f5; border: 1px solid #fecaca; }

  /* ── Trends table ── */
  .trends-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .trends-table colgroup col.col-trend-title  { width: 22%; }
  .trends-table colgroup col.col-trend-desc   { width: 66%; }
  .trends-table colgroup col.col-trend-impact { width: 12%; }

  .trend-row td {
    padding: 8px 6px;
    font-size: 10px;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .trend-row:nth-child(even) td { background: #fafafa; }

  .impact-high   { color: #c0392b; font-weight: 600; text-align: center; }
  .impact-medium { color: #d68910; font-weight: 600; text-align: center; }
  .impact-low    { color: #27ae60; font-weight: 600; text-align: center; }

  /* ── Text boxes ── */
  .text-box {
    background: #f9f9f8;
    border-left: 3px solid #1A5FA8;
    border-radius: 4px;
    padding: 12px 14px;
    font-size: 11px;
    line-height: 1.8;
    margin-top: 6px;
    word-wrap: break-word;
  }

  /* ── Print settings ── */
  @media print {
    body { padding: 40px; }
    .competitor-row { page-break-inside: avoid; }
    .trend-row      { page-break-inside: avoid; }
    .swot-table     { page-break-inside: avoid; }
    .text-box       { page-break-inside: avoid; }
    h2              { page-break-after: avoid; }
  }
</style>
</head>
<body>

  <div class="report-header">
    <div class="report-title">${report.product}</div>
    <div class="report-meta">${report.industry} &nbsp;·&nbsp; ${report.market} &nbsp;·&nbsp; ${report.generatedAt}</div>
  </div>

  <!-- Metrics -->
  <table class="metrics-table">
    <tr>
      <td><div class="metric-label">${isZh ? '市场规模' : 'Market Size'}</div><div class="metric-value">${report.marketSize}</div></td>
      <td><div class="metric-label">${isZh ? '识别竞品' : 'Competitors Found'}</div><div class="metric-value">${(report.competitors || []).length}</div></td>
      <td><div class="metric-label">${isZh ? '市场集中度' : 'Concentration'}</div><div class="metric-value">${report.concentration}</div></td>
      <td><div class="metric-label">${isZh ? '2028年预测' : 'Projected (2028)'}</div><div class="metric-value">${report.marketSizeProjected}</div></td>
    </tr>
  </table>

  <!-- Competitors -->
  <h2>${isZh ? '主要竞品' : 'Key Competitors'}</h2>
  <table class="competitors-table">
    <colgroup>
      <col class="col-name">
      <col class="col-val">
      <col class="col-rev">
      <col class="col-share">
      <col class="col-growth">
      <col class="col-strength">
      <col class="col-threat">
    </colgroup>
    <tr>
      <th>${isZh ? '公司' : 'Company'}</th>
      <th>${isZh ? '市值/融资' : 'Valuation'}</th>
      <th>${isZh ? '营收' : 'Revenue'}</th>
      <th>${isZh ? '份额' : 'Share'}</th>
      <th>${isZh ? '增长' : 'Growth'}</th>
      <th>${isZh ? '核心优势' : 'Strength'}</th>
      <th>${isZh ? '威胁' : 'Threat'}</th>
    </tr>
    ${competitorsHtml}
  </table>

  <!-- SWOT -->
  <h2>SWOT ${isZh ? '分析' : 'Analysis'}</h2>
  ${swotHtml}

  <!-- Trends -->
  <h2>${isZh ? '行业趋势' : 'Industry Trends'}</h2>
  <table class="trends-table">
    <colgroup>
      <col class="col-trend-title">
      <col class="col-trend-desc">
      <col class="col-trend-impact">
    </colgroup>
    <tr style="background:#f5f7fa">
      <th style="padding:6px;font-size:9px;text-align:left;font-weight:700;">${isZh ? '趋势' : 'Trend'}</th>
      <th style="padding:6px;font-size:9px;text-align:left;font-weight:700;">${isZh ? '说明' : 'Description'}</th>
      <th style="padding:6px;font-size:9px;text-align:center;font-weight:700;">${isZh ? '影响' : 'Impact'}</th>
    </tr>
    ${trendsHtml}
  </table>

  <!-- Summary -->
  <h2>${isZh ? '执行摘要' : 'Executive Summary'}</h2>
  <div class="text-box">${report.summary}</div>

  <!-- Strategy -->
  <h2>${isZh ? '差异化策略建议' : 'Differentiation Strategy'}</h2>
  <div class="text-box">${report.strategy}</div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'attachment; filename="report.html"'
    }
  });
}
