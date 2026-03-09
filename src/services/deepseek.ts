import { AIAnalysis } from "../types";
import { debugLogger } from "./debugLogger";

const API_URL = "/api/ai/chat";

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function callDeepSeek(prompt: string, jsonMode: boolean = false, model: string = "deepseek-chat"): Promise<string> {
  debugLogger.addLog({
    type: 'request',
    model: model,
    content: prompt,
    metadata: { jsonMode }
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    console.log('[DeepSeek] Request timeout, aborting...');
    controller.abort();
  }, 120000); // 120秒超时（reasoner模型需要更长时间）

  try {
    console.log('[DeepSeek] Starting fetch request...');
    console.log('[DeepSeek] API_URL:', API_URL);
    console.log('[DeepSeek] Model:', model);
    console.log('[DeepSeek] Prompt length:', prompt.length);
    
    const requestBody: any = {
      model: model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 32000,
    };
    
    // deepseek-reasoner 不支持 response_format 和 temperature
    if (model === "deepseek-chat" && jsonMode) {
      requestBody.response_format = { type: "json_object" };
    }
    
    const requestBodyStr = JSON.stringify(requestBody);
    console.log('[DeepSeek] Request body length:', requestBodyStr.length);
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBodyStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log('[DeepSeek] Response received, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DeepSeek] Error response:', errorText);
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        errorMsg = errorText || errorMsg;
      }
      debugLogger.addLog({
        type: 'error',
        model: model,
        content: errorMsg,
        metadata: { status: response.status }
      });
      throw new Error(`DeepSeek API error: ${errorMsg}`);
    }

    const data: DeepSeekResponse = await response.json();
    console.log('[DeepSeek] Response data:', data);
    const result = data.choices[0]?.message?.content || "";

    debugLogger.addLog({
      type: 'response',
      model: model,
      content: result,
      metadata: { promptLength: prompt.length, responseLength: result.length }
    });

    return result;
  } catch (error: any) {
    clearTimeout(timeout);
    console.error('[DeepSeek] Error:', error);
    debugLogger.addLog({
      type: 'error',
      model: model,
      content: error.message || String(error),
    });
    
    if (error.name === 'AbortError') {
      throw new Error('AI 响应超时（120秒），请稍后重试');
    }
    throw error;
  }
}

export async function analyzeNote(content: string): Promise<AIAnalysis> {
  const prompt = `分析以下灵感笔记内容，提取主题、涉及人员、类别、主语和被描述的对象名称。
请以 JSON 格式返回，格式如下：
{
  "topic": "主要讨论的话题",
  "people": ["人员1", "人员2"],
  "category": "所属类别（只能是：科技类、经济类、法律类、政治类、社会类、文化类、体育类、健康类、其它之一）",
  "summary": "简短摘要",
  "subjects": ["主语1", "主语2"],
  "objects": ["对象名称1", "对象名称2"]
}

类别定义：
科技类：涵盖信息技术、人工智能、生物科技、工程技术、科学发现等。
经济类：包括宏观经济、金融市场、产业发展、企业管理、消费趋势等。
法律类：涉及法律法规解读、司法案例、合规政策、国际法等。
政治类：包括国家政策、国际关系、选举动态、政府治理等。
社会类：关注民生热点、教育医疗、文化习俗、人口问题、环境保护等。
文化类：涵盖文学艺术、影视娱乐、历史哲学、宗教传统等。
体育类：涉及赛事报道、运动员动态、体育产业、健身健康等。
健康类：包括疾病预防、心理健康、营养保健、医疗技术等。
如果不属于以上类别，填写"其它"。

注意：
- 主语：句子中执行动作或被描述的主体（如：公司、产品、团队、工具等）
- 对象名称：被描述的具体事物（如：产品名称、项目名称、技术名词、专有名词等）
- 主语和对象名称必须分别提取，不能混淆
- 每个主语和对象名称都要单独作为一个标签
- 只提取有意义的名词和专有名词，不要提取代词、量词、助词等
- 不要提取：我、你、他、她、它、我们、你们、他们等代词
- 不要提取：这个、那个、这些、那些等指示词
- 不要提取：什么、怎么、为什么等疑问词
- 不要提取：因为、所以、但是、而且等连词
- 不要提取：开始、一直、总是、完全等副词
- 不要提取：非常、特别、比较等程度副词
- 不要提取：应该、可能、需要等助动词
- 不要提取：感觉、发现、问题等通用词
- 不要提取：情况、时候、现在等时间词
- 不要提取单字标签（除非是专有名词）
- 不要提取与 topic 或 category 重复的词

内容: "${content}"`;

  const response = await callDeepSeek(prompt, true);
  return JSON.parse(response);
}

export async function processDocument(
  content: string, 
  action: 'translate' | 'proofread' | 'format' | 'chat' | 'mindmap',
  context?: string
): Promise<string> {
  let prompt = "";
  switch (action) {
    case 'translate':
      prompt = `将以下内容翻译成英文。保持专业语气，如果是技术文档则使用准确的技术术语。如果是中文，翻译成英文；如果是英文，翻译成中文。
内容：
${content}`;
      break;
    case 'proofread':
      prompt = `对以下内容进行智能校对和优化：
1. 逻辑清晰化
2. 用词准确性检查
3. 修正语法错误
4. 保持原意不变，但表达更专业。
内容：
${content}`;
      break;
    case 'format':
      prompt = `对以下内容进行格式规范化处理：
1. 中英文之间添加半角空格
2. 中文和数字之间添加半角空格
3. 英文和数字之间添加半角空格
4. 统一中英文引号（根据主要语言统一）
5. 整理段落和列表格式。
内容：
${content}`;
      break;
    case 'chat':
      prompt = `基于以下上下文信息，回答用户的问题或执行修改指令。
上下文：
${context}
当前文档内容：
${content}
用户指令：
${action}`;
      break;
    case 'mindmap':
      prompt = `将以下文档内容转换为思维导图的 JSON 结构。
要求：
1. 根节点是文档标题或核心主题
2. 分支代表主要章节或观点
3. 叶子节点代表细节
4. 结构清晰，层级分明。
返回格式：{"name": "root", "children": [{"name": "child1", "children": [...]}]}
内容：
${content}`;
      break;
  }

  return await callDeepSeek(prompt, action === 'mindmap');
}

export async function chatWithContext(content: string, context: string, message: string): Promise<string> {
  console.log('[chatWithContext] Called with message:', message);
  console.log('[chatWithContext] Content length:', content?.length);
  console.log('[chatWithContext] Context length:', context?.length);

  // 使用 deepseek-reasoner 模型支持 128k 上下文（约 10 万汉字）
  const maxContentLength = 80000; // 约 80k 字符，留 20k 给系统提示和回复
  const maxContextLength = 80000; // 约 80k 字符
  const truncatedContent = content?.length > maxContentLength 
    ? content.substring(0, maxContentLength) + '\n...(内容已截断)' 
    : content || '';
  const truncatedContext = context?.length > maxContextLength 
    ? context.substring(0, maxContextLength) + '\n...(上下文已截断)' 
    : context || '';

  const prompt = `你是一个智能写作助手。
上下文背景（之前的笔记记录）：
${truncatedContext}

当前正在编辑的文档：
${truncatedContent}

用户指令：${message}

请根据上下文和当前文档内容，直接返回修改后的完整文档内容或回答用户的问题。如果是修改文档，请返回完整的 Markdown 文本。`;

  console.log('[chatWithContext] Prompt length:', prompt.length);
  console.log('[chatWithContext] About to call callDeepSeek with deepseek-reasoner...');
  
  try {
    // 使用 deepseek-reasoner 模型以获得更长的输出
    const result = await callDeepSeek(prompt, false, "deepseek-reasoner");
    console.log('[chatWithContext] callDeepSeek returned, result length:', result?.length);
    console.log('[chatWithContext] callDeepSeek returned, result preview:', result?.substring(0, 100));
    return result;
  } catch (error) {
    console.error('[chatWithContext] callDeepSeek error:', error);
    throw error;
  }
}
