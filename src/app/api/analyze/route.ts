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

  const styleOverride = isZh
    ? `
【风格强制约束：详细版 — 必须严格遵守，优先级高于上方示例数量】
· competitors 数组：必须恰好包含 6-8 家竞品
· summary 字段：必须约 200 字，详细描述市场背景与竞争格局
· trends 数组：必须恰好包含 5 条，每条 description 不少于 60 字
· swot 四个子数组各自必须恰好包含 4 条
· strategy 字段：必须约 300 字，含具体建议
· 每个竞品的 strength、weakness、positioning 字段均须详细填写（不少于 30 字）`
    : `
[STYLE ENFORCEMENT: Detailed — MANDATORY, overrides example counts above]
· competitors array: must contain exactly 6-8 entries
· summary field: must be ~200 words, covering market background and competitive dynamics
· trends array: must contain exactly 5 items; each description must be 60+ words
· each swot sub-array must contain exactly 4 items
· strategy field: must be ~300 words with specific recommendations
· Each competitor's strength, weakness, positioning fields must be detailed (30+ words each)`;

  const systemPrompt = isZh
    ? `Return ONLY valid complete JSON. No HTML tags, no cite tags. Keep all text fields concise.

你是一个专业的行业分析师和竞品情报专家。用户会描述一个产品或行业，你需要用 web_search 工具搜索不超过 2 次获取关键数据，其余内容用已有知识补充，优先速度，控制在 30 秒内返回结果。返回严格的 JSON 格式报告。不要返回任何 Markdown 代码块，直接返回 JSON 对象。所有字段内容使用中文。【JSON完整性最高优先级】你的回复必须是完整的JSON，宁可每个字段内容短一点，也要保证JSON结构完整不被截断。【严格字段长度限制，违反将导致输出失败】competitors 最多5个；summary 严格不超过60字；strategy 严格不超过80字；trends 每条 description 严格不超过25字；每个竞品的 strength、weakness 严格不超过15字；positioning 不超过20字。整个 JSON 必须在 4000 tokens 内完整输出。【绝对禁止】所有字段的值必须是纯文本字符串，严禁在任何字段中使用任何 HTML 标签，包括但不限于 <cite>、</cite>、<a>、<b>、<span> 等，严禁使用引用标记、上下标或任何标记语言语法。违反此规则会导致整个报告无法显示。

JSON 结构：
{
  "product": "分析对象名称",
  "industry": "所属行业",
  "market": "目标市场",
  "language": "zh",
  "generatedAt": "当前日期",
  "summary": "执行摘要（严格不超过60字）",
  "marketSize": "市场规模如$XXX亿",
  "marketGrowth": "增长率如18%",
  "marketSizeProjected": "2028年预测规模",
  "concentration": "如CR3 58%",
  "competitors": [
    {
      "name": "公司名",
      "valuation": "市值或融资额，格式：数据 (来源: 机构名, 年份)，如：$260亿 (来源: Bloomberg, 2024年)",
      "revenue": "营收，格式：数据 (来源: 机构名或财报, 年份)，如：$31.4亿 (来源: 公司财报, FY2024)",
      "marketShare": 数字,
      "founded": 年份数字,
      "hq": "总部城市",
      "positioning": "定位描述（不超过20字）",
      "strength": "核心优势（严格不超过15字）",
      "weakness": "主要弱点（严格不超过15字）",
      "growth": "+XX% YoY",
      "threat": "high或medium或low",
      "isTop": true或false,
      "website": "只填你100%确定的官网URL，例如汤臣倍健填 https://www.by-health.com，Salesforce填 https://www.salesforce.com。只要有一丝不确定就填空字符串\"\"，宁可不显示也不填错误链接"
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
    { "title": "趋势标题", "description": "说明（严格不超过25字）", "impact": "high或medium或low" }
  ],
  "strategy": "差异化策略建议（严格不超过80字）",
  "sources": [
    { "name": "来源网站名称", "url": "https://...", "desc": "用途说明，如：市场规模数据" }
  ]
}
${styleOverride}`
    : `Return ONLY valid complete JSON. No HTML tags, no cite tags. Keep all text fields concise.

You are a professional market analyst and competitive intelligence expert. The user will describe a product or industry. Use web_search at most 2 times to get key data points, then fill in the rest from your existing knowledge — prioritize speed and return results within 30 seconds. Return a strict JSON report. No Markdown code blocks — return raw JSON only. All field content must be in English. [JSON COMPLETENESS — HIGHEST PRIORITY] Your response must be a complete, valid JSON object. Keep individual field content shorter if needed, but never truncate the JSON structure. [STRICT FIELD LENGTH LIMITS — violations will cause output failure] Max 5 competitors; summary: max 60 words; strategy: max 80 words; each trend description: max 25 words; each competitor's strength and weakness: max 15 words; positioning: max 20 words. The entire JSON must fit within 4000 tokens. [ABSOLUTE RULE] Every field value must be plain text only — never use any HTML tags in any field, including <cite>, </cite>, <a>, <b>, <span>, or any other tag. Never use citation markers, superscripts, or any markup syntax. Violations will cause the entire report to fail to render.

JSON structure:
{
  "product": "subject of analysis",
  "industry": "industry name",
  "market": "target market",
  "language": "en",
  "generatedAt": "current date",
  "summary": "executive summary (max 60 words)",
  "marketSize": "e.g. $89.8B",
  "marketGrowth": "e.g. 12.6%",
  "marketSizeProjected": "projected 2028 size",
  "concentration": "e.g. CR3 58%",
  "competitors": [
    {
      "name": "company name",
      "valuation": "market cap or funding with source, e.g. $260B (Source: Bloomberg, 2024)",
      "revenue": "annual revenue with source, e.g. $31.4B (Source: Annual Report, FY2024)",
      "marketShare": number,
      "founded": year number,
      "hq": "headquarters city",
      "positioning": "positioning description (max 20 words)",
      "strength": "core strength (max 15 words)",
      "weakness": "main weakness (max 15 words)",
      "growth": "+XX% YoY",
      "threat": "high or medium or low",
      "isTop": true or false,
      "website": "only fill in the URL you are 100% certain about, e.g. Salesforce → https://www.salesforce.com, HubSpot → https://www.hubspot.com. If there is any doubt at all, use empty string \"\". Never guess."
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
    { "title": "trend title", "description": "detail (max 25 words)", "impact": "high or medium or low" }
  ],
  "strategy": "differentiation strategy (max 80 words)",
  "sources": [
    { "name": "source website name", "url": "https://...", "desc": "what data it provided, e.g. market size figures" }
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

        const fullText = (message.content as Anthropic.ContentBlock[])
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');

        console.log('[analyze] stop_reason:', message.stop_reason);
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
