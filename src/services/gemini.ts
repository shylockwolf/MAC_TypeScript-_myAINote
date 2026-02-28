import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

export const getAI = () => {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

export async function analyzeNote(content: string): Promise<AIAnalysis> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `分析以下灵感笔记内容，提取主题、涉及人员和类别。
内容: "${content}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING, description: "主要讨论的话题" },
          people: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "提及的人员姓名或代称" 
          },
          category: { 
            type: Type.STRING, 
            enum: ['IT技术', '管理', '财务', '私人事务', '其它'],
            description: "所属类别"
          },
          summary: { type: Type.STRING, description: "简短摘要" }
        },
        required: ["topic", "people", "category", "summary"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function processDocument(
  content: string, 
  action: 'translate' | 'proofread' | 'format' | 'chat' | 'mindmap',
  context?: string
): Promise<string> {
  const ai = getAI();
  
  let prompt = "";
  switch (action) {
    case 'translate':
      prompt = `将以下内容翻译成英文。保持专业语气，如果是技术文档则使用准确的技术术语。如果是中文，翻译成英文；如果是英文，翻译成中文。\n内容：\n${content}`;
      break;
    case 'proofread':
      prompt = `对以下内容进行智能校对和优化：
1. 逻辑清晰化
2. 用词准确性检查
3. 修正语法错误
4. 保持原意不变，但表达更专业。
内容：\n${content}`;
      break;
    case 'format':
      prompt = `对以下内容进行格式规范化处理：
1. 中英文之间添加半角空格
2. 中文和数字之间添加半角空格
3. 英文和数字之间添加半角空格
4. 统一中英文引号（根据主要语言统一）
5. 整理段落和列表格式。
内容：\n${content}`;
      break;
    case 'chat':
      prompt = `基于以下上下文信息，回答用户的问题或执行修改指令。
上下文：\n${context}
当前文档内容：\n${content}
用户指令：\n${action}`; // Note: action here is just a placeholder, in real use we pass the message
      break;
    case 'mindmap':
      prompt = `将以下文档内容转换为思维导图的 JSON 结构。
要求：
1. 根节点是文档标题或核心主题
2. 分支代表主要章节或观点
3. 叶子节点代表细节
4. 结构清晰，层级分明。
返回格式：{"name": "root", "children": [{"name": "child1", "children": [...]}]}
内容：\n${content}`;
      break;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
  });

  return response.text || "";
}

export async function chatWithContext(content: string, context: string, message: string): Promise<string> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `你是一个智能写作助手。
上下文背景（之前的笔记记录）：
${context}

当前正在编辑的文档：
${content}

用户指令：${message}

请根据上下文和当前文档内容，直接返回修改后的完整文档内容或回答用户的问题。如果是修改文档，请返回完整的 Markdown 文本。`,
  });

  return response.text || "";
}
