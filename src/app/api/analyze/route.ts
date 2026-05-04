import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 内存限流：IP -> { count, date }
// 注意：Vercel 无状态环境下每个实例独立，冷启动后重置，适合中低流量场景
const rateLimitStore = new Map<string, { count: number; date: string }>();
const DAILY_LIMIT = 20;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const record = rateLimitStore.get(ip);

  if (!record || record.date !== today) {
    rateLimitStore.set(ip, { count: 1, date: today });
    return { allowed: true, remaining: DAILY_LIMIT - 1 };
  }

  if (record.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  rateLimitStore.set(ip, { count: record.count + 1, date: today });
  return { allowed: true, remaining: DAILY_LIMIT - record.count - 1 };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: '今日次数已达上限（每天最多 5 次），请明天再试。' },
      { status: 429 }
    );
  }

  const { query, language } = await req.json();

  const isZh = language === 'zh';

  const systemPrompt = isZh
    ? `Return ONLY valid complete JSON. No HTML tags, no cite tags, no Markdown code blocks. Output the raw JSON object directly.

你是专业行业分析师。用 web_search 搜索不超过 2 次获取关键数据，其余用已有知识补充，30 秒内返回结果。

【输出约束 — 最高优先级，必须严格遵守】
· 回复必须是完整的 JSON 对象，不得截断
· competitors：最多 5 个
· summary：最多 80 字
· strategy：最多 100 字
· trends：最多 4 条，每条 description 不超过 30 字
· swot 每个子数组：最多 3 条
· 每个竞品的 strength、weakness：不超过 20 字；positioning：不超过 25 字
· 所有字段值必须是纯文本，严禁 HTML 标签（<cite>、<a>、<b>、<span> 等）

JSON 结构：
{
  "product": "分析对象名称",
  "industry": "所属行业",
  "market": "目标市场",
  "language": "zh",
  "generatedAt": "当前日期",
  "summary": "执行摘要（最多80字）",
  "marketSize": "市场规模如$XXX亿",
  "marketGrowth": "增长率如18%",
  "marketSizeProjected": "2028年预测规模",
  "concentration": "如CR3 58%",
  "competitors": [
    {
      "name": "公司名",
      "valuation": "市值或融资额，如：$260亿 (Bloomberg, 2024)",
      "revenue": "营收，如：$31.4亿 (公司财报, FY2024)",
      "marketShare": 数字,
      "founded": 年份数字,
      "hq": "总部城市",
      "positioning": "定位描述（最多25字）",
      "strength": "核心优势（最多20字）",
      "weakness": "主要弱点（最多20字）",
      "growth": "+XX% YoY",
      "threat": "high或medium或low",
      "isTop": true或false,
      "website": "该公司官网URL，必须100%确定真实存在，格式必须是 https://www.xxx.com，有任何不确定就填\"\"，宁可不显示也不填错误链接"
    }
  ],
  "marketShareData": { "labels": ["公司名数组"], "values": [数字数组总和100] },
  "revenueHistory": {
    "years": ["2021","2022","2023","2024"],
    "series": [{ "name": "公司名", "data": [数字数组单位百万美元] }]
  },
  "swot": {
    "strengths": ["优势1","优势2","优势3"],
    "weaknesses": ["劣势1","劣势2","劣势3"],
    "opportunities": ["机会1","机会2","机会3"],
    "threats": ["威胁1","威胁2","威胁3"]
  },
  "trends": [
    { "title": "趋势标题", "description": "说明（最多30字）", "impact": "high或medium或low" }
  ],
  "strategy": "差异化策略建议（最多100字）",
  "sources": [
    { "name": "来源网站名称", "url": "https://...", "desc": "用途说明" }
  ]
}`
    : `Return ONLY valid complete JSON. No HTML tags, no cite tags, no Markdown code blocks. Output the raw JSON object directly.

You are a professional market analyst. Use web_search at most 2 times to get key data, fill the rest from existing knowledge, return within 30 seconds.

[OUTPUT CONSTRAINTS — HIGHEST PRIORITY, STRICTLY ENFORCED]
· Response must be a complete JSON object — never truncate
· competitors: max 5 entries
· summary: max 80 words
· strategy: max 100 words
· trends: max 4 items, each description max 30 words
· each swot sub-array: max 3 items
· competitor strength/weakness: max 20 words each; positioning: max 25 words
· All field values must be plain text — no HTML tags (<cite>, <a>, <b>, <span>, etc.)

JSON structure:
{
  "product": "subject of analysis",
  "industry": "industry name",
  "market": "target market",
  "language": "en",
  "generatedAt": "current date",
  "summary": "executive summary (max 80 words)",
  "marketSize": "e.g. $89.8B",
  "marketGrowth": "e.g. 12.6%",
  "marketSizeProjected": "projected 2028 size",
  "concentration": "e.g. CR3 58%",
  "competitors": [
    {
      "name": "company name",
      "valuation": "e.g. $260B (Bloomberg, 2024)",
      "revenue": "e.g. $31.4B (Annual Report, FY2024)",
      "marketShare": number,
      "founded": year number,
      "hq": "headquarters city",
      "positioning": "positioning description (max 25 words)",
      "strength": "core strength (max 20 words)",
      "weakness": "main weakness (max 20 words)",
      "growth": "+XX% YoY",
      "threat": "high or medium or low",
      "isTop": true or false,
      "website": "Company's official website URL — must be 100% certain it exists, format must be https://www.xxx.com — if any doubt at all use \"\", never guess"
    }
  ],
  "marketShareData": { "labels": ["company names"], "values": [numbers summing to 100] },
  "revenueHistory": {
    "years": ["2021","2022","2023","2024"],
    "series": [{ "name": "company", "data": [numbers in million USD] }]
  },
  "swot": {
    "strengths": ["strength 1","strength 2","strength 3"],
    "weaknesses": ["weakness 1","weakness 2","weakness 3"],
    "opportunities": ["opportunity 1","opportunity 2","opportunity 3"],
    "threats": ["threat 1","threat 2","threat 3"]
  },
  "trends": [
    { "title": "trend title", "description": "detail (max 30 words)", "impact": "high or medium or low" }
  ],
  "strategy": "differentiation strategy (max 100 words)",
  "sources": [
    { "name": "source name", "url": "https://...", "desc": "what data it provided" }
  ]
}`;

  function buildUserMessage(q: string, zh: boolean): string {
    if (zh) {
      return `请分析：${q}`;
    } else {
      return `Please analyze: ${q}`;
    }
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const emit = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        emit({ text: isZh ? '正在理解分析需求...' : 'Understanding your query...' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msgStream = (client.messages as any).stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          system: systemPrompt,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: buildUserMessage(query, isZh) }]
        });

        let searchCount = 0;
        let reportStarted = false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        msgStream.on('streamEvent', (event: any) => {
          if (event.type !== 'content_block_start') return;
          const block = event.content_block;
          if (!block) return;

          if (block.type === 'tool_use' || block.type === 'server_tool_use') {
            searchCount++;
            emit({
              text: isZh
                ? `正在联网搜索竞品与市场数据（第 ${searchCount} 轮）...`
                : `Searching the web for competitor data (round ${searchCount})...`
            });
          } else if (block.type === 'text' && !reportStarted) {
            reportStarted = true;
            emit({
              text: isZh ? '正在整合数据，生成报告...' : 'Synthesizing data, generating report...'
            });
          }
        });

        const message = await msgStream.finalMessage();

        console.log('[analyze] stop_reason:', message.stop_reason);

        if (message.stop_reason === 'max_tokens') {
          emit({ error: isZh ? '内容过长，请尝试更具体的描述' : 'Response too long — please try a more specific query.' });
          return;
        }

        const fullText = (message.content as Anthropic.ContentBlock[])
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');

        console.log('[analyze] fullText length:', fullText.length);
        console.log('[analyze] fullText (first 2000 chars):', fullText.slice(0, 2000));
        console.log('[analyze] fullText (last 500 chars):', fullText.slice(-500));

        let reportData;
        try {
          const start = fullText.indexOf('{');
          const end = fullText.lastIndexOf('}');
          if (start === -1 || end === -1) throw new Error('No JSON found in response');
          let jsonStr = fullText.slice(start, end + 1);
          jsonStr = jsonStr.replace(/<[^>]*>/g, '');
          jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
          console.log('[analyze] jsonStr (first 500 chars):', jsonStr.slice(0, 500));
          reportData = JSON.parse(jsonStr);
        } catch(e) {
          console.error('[analyze] JSON parse error:', e instanceof Error ? e.message : e);
          emit({ error: '报告解析失败，请重试' });
          return;
        }
        reportData.id = uuidv4();

        emit({ done: true, report: reportData });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        emit({ error: msg });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
