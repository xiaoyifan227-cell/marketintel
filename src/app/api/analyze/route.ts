import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 内存限流：IP -> { count, date }
// 注意：Vercel 无状态环境下每个实例独立，冷启动后重置，适合中低流量场景
const rateLimitStore = new Map<string, { count: number; date: string }>();
const DAILY_LIMIT = 5;

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

  const { query, market, style, language } = await req.json();

  const isZh = language === 'zh';

  const styleInstruction = isZh
    ? (style === 'detailed'
        ? '【报告风格：详细版】执行摘要约200字，列出6-8家核心竞品（含定位、优劣势、增长率、威胁等级等完整维度），行业趋势5-6条（每条含深度解读），SWOT每项4-5条，差异化策略约300字。'
        : style === 'consulting'
        ? '【报告风格：咨询版】模仿麦肯锡/BCG风格，执行摘要约300字（正式商业语言，量化数据支撑），列出6-8家竞品，差异化策略约400字（结构化编号建议，每条含量化预期收益），行业趋势5-6条（含量化影响评估），SWOT每项5条，全程使用严谨专业的商业顾问语气。'
        : '【报告风格：简洁版】执行摘要约100字，列出4-5家核心竞品，行业趋势3-4条，SWOT每项3条，差异化策略约150字，信息精简直接。')
    : (style === 'detailed'
        ? '[Report Style: Detailed] Executive summary ~200 words. List 6-8 competitors with full dimensions (positioning, strengths, weaknesses, growth, threat level). 5-6 industry trends with in-depth analysis. 4-5 SWOT items each. Differentiation strategy ~300 words.'
        : style === 'consulting'
        ? '[Report Style: Consulting] Emulate McKinsey/BCG style. Executive summary ~300 words (formal, data-backed). List 6-8 competitors. Strategy ~400 words (numbered actionable recommendations with quantified expected outcomes). 5-6 trends with quantified impact. 5 SWOT items each. Use formal, precise management consulting language throughout.'
        : '[Report Style: Concise] Executive summary ~100 words. List 4-5 core competitors. 3-4 industry trends. 3 SWOT items each. Strategy ~150 words. Prioritize brevity and clarity.');

  const marketInstruction = isZh
    ? (market === 'china'
        ? '【市场限定】competitors 必须全部是在中国市场有实际运营的品牌（本土品牌或在华外资品牌均可），严禁出现没有中国业务的纯海外品牌。'
        : market === 'northAmerica'
        ? '【市场限定】competitors 优先选取在北美市场活跃运营的品牌。'
        : market === 'sea'
        ? '【市场限定】competitors 优先选取在东南亚市场活跃运营的品牌。'
        : '')
    : (market === 'china'
        ? '[Market Rule] All competitors must have actual operations in the China market (domestic or foreign brands with China presence). Do NOT include brands with no China business.'
        : market === 'northAmerica'
        ? '[Market Rule] Prioritize brands actively operating in the North American market.'
        : market === 'sea'
        ? '[Market Rule] Prioritize brands actively operating in Southeast Asian markets.'
        : '');

  const systemPrompt = isZh
    ? `【最高优先级】你必须严格遵守用户指定的目标市场限制，这是最高优先级要求，高于一切其他考虑。

你是一个专业的行业分析师和竞品情报专家。用户会描述一个产品或行业，你需要用 web_search 工具搜索不超过 2 次获取关键数据，其余内容用已有知识补充，优先速度，控制在 30 秒内返回结果。返回严格的 JSON 格式报告。不要返回任何 Markdown 代码块，直接返回 JSON 对象。所有字段内容使用中文。重要：所有字段的值必须是纯文本，禁止使用任何 HTML 标签（包括 <cite>、<a>、<b> 等），禁止使用引用标记或角标。${marketInstruction}

${styleInstruction}

JSON 结构：
{
  "product": "分析对象名称",
  "industry": "所属行业",
  "market": "目标市场",
  "language": "zh",
  "generatedAt": "当前日期",
  "summary": "执行摘要（约100字）",
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
      "positioning": "定位描述",
      "strength": "核心优势",
      "weakness": "主要弱点",
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
    { "title": "趋势标题", "description": "详细说明", "impact": "high或medium或low" }
  ],
  "strategy": "差异化策略建议（约150字）",
  "sources": [
    { "name": "来源网站名称", "url": "https://...", "desc": "用途说明，如：市场规模数据" }
  ]
}`
    : `[HIGHEST PRIORITY] You must strictly follow the target market restriction specified by the user. This is the highest priority requirement, overriding all other considerations.

You are a professional market analyst and competitive intelligence expert. The user will describe a product or industry. Use web_search at most 2 times to get key data points, then fill in the rest from your existing knowledge — prioritize speed and return results within 30 seconds. Return a strict JSON report. No Markdown code blocks — return raw JSON only. All field content must be in English. Important: all field values must be plain text only — no HTML tags (including <cite>, <a>, <b>, etc.), no citation markers, no superscripts. ${marketInstruction}

${styleInstruction}

JSON structure:
{
  "product": "subject of analysis",
  "industry": "industry name",
  "market": "target market",
  "language": "en",
  "generatedAt": "current date",
  "summary": "executive summary (~100 words)",
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
      "positioning": "positioning description",
      "strength": "core strength",
      "weakness": "main weakness",
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
    { "title": "trend title", "description": "detail", "impact": "high or medium or low" }
  ],
  "strategy": "differentiation strategy (~150 words)",
  "sources": [
    { "name": "source website name", "url": "https://...", "desc": "what data it provided, e.g. market size figures" }
  ]
}`;

  function buildUserMessage(q: string, m: string, zh: boolean): string {
    if (zh) {
      if (m === 'china')
        return `请分析：${q}。【重要限制】目标市场严格限定为中国大陆市场，所有竞品必须是在中国有实际销售和运营的品牌，优先中国本土品牌，外资品牌必须在中国有本地化运营才能列入。市场规模数据必须是中国市场数据，不是全球数据。`;
      if (m === 'northAmerica')
        return `请分析：${q}。【重要限制】目标市场严格限定为北美市场（美国+加拿大），所有竞品必须是在北美有实际业务的品牌，市场规模数据必须是北美市场数据。`;
      if (m === 'sea')
        return `请分析：${q}。【重要限制】目标市场严格限定为东南亚市场，所有竞品必须是在东南亚有实际业务的品牌，市场规模数据必须是东南亚市场数据。`;
      return `请分析：${q}。目标市场：全球市场，列出全球主要竞品。`;
    } else {
      if (m === 'china')
        return `Please analyze: ${q}. [STRICT CONSTRAINT] Target market is mainland China only. All competitors must have actual sales and operations in China. Prioritize Chinese domestic brands; foreign brands only qualify if they have localized operations in China. Market size data must be China market figures, not global.`;
      if (m === 'northAmerica')
        return `Please analyze: ${q}. [STRICT CONSTRAINT] Target market is North America (US + Canada) only. All competitors must have actual business in North America. Market size data must be North American figures.`;
      if (m === 'sea')
        return `Please analyze: ${q}. [STRICT CONSTRAINT] Target market is Southeast Asia only. All competitors must have actual business in Southeast Asia. Market size data must be Southeast Asian figures.`;
      return `Please analyze: ${q}. Target market: global. List the major global competitors.`;
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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: systemPrompt,
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: buildUserMessage(query, market, isZh) }]
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

        const start = fullText.indexOf('{');
        const end = fullText.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('Invalid JSON response from model');

        const reportData = JSON.parse(fullText.slice(start, end + 1));
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
