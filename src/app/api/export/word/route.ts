import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';

export async function POST(req: NextRequest) {
  const report = await req.json();
  const isZh = report.language === 'zh';

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: report.product, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: `${isZh ? '行业' : 'Industry'}: ${report.industry} | ${isZh ? '市场' : 'Market'}: ${report.market} | ${report.generatedAt}` }),
        new Paragraph({ text: '' }),

        new Paragraph({ text: isZh ? '执行摘要' : 'Executive Summary', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: report.summary }),
        new Paragraph({ text: '' }),

        new Paragraph({ text: isZh ? '市场概况' : 'Market Overview', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: `${isZh ? '市场规模' : 'Market Size'}: ${report.marketSize}` }),
        new Paragraph({ text: `${isZh ? '增长率' : 'Growth Rate'}: ${report.marketGrowth}` }),
        new Paragraph({ text: `${isZh ? '预测规模' : 'Projected Size'}: ${report.marketSizeProjected}` }),
        new Paragraph({ text: '' }),

        new Paragraph({ text: isZh ? '主要竞品' : 'Key Competitors', heading: HeadingLevel.HEADING_2 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [isZh ? '公司' : 'Company', isZh ? '市值/融资' : 'Valuation', isZh ? '营收' : 'Revenue', isZh ? '市场份额' : 'Market Share', isZh ? '核心优势' : 'Strength'].map(h =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
              )
            }),
            ...(report.competitors || []).map((c: { name: string; valuation?: string; revenue?: string; marketShare?: number; strength?: string }) =>
              new TableRow({
                children: [c.name, c.valuation, c.revenue, `${c.marketShare}%`, c.strength].map(v =>
                  new TableCell({ children: [new Paragraph({ text: String(v || '—') })] })
                )
              })
            )
          ]
        }),
        new Paragraph({ text: '' }),

        new Paragraph({ text: 'SWOT', heading: HeadingLevel.HEADING_2 }),
        ...(['strengths', 'weaknesses', 'opportunities', 'threats'] as const).flatMap(k => [
          new Paragraph({
            text: isZh
              ? { strengths: '优势', weaknesses: '劣势', opportunities: '机会', threats: '威胁' }[k]
              : k.charAt(0).toUpperCase() + k.slice(1),
            heading: HeadingLevel.HEADING_3
          }),
          ...(report.swot?.[k] || []).map((item: string) => new Paragraph({ text: `• ${item}` }))
        ]),
        new Paragraph({ text: '' }),

        new Paragraph({ text: isZh ? '差异化策略建议' : 'Differentiation Strategy', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: report.strategy }),
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="report.docx"'
    }
  });
}
