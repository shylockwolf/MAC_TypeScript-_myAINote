import React, { useState } from 'react';
import { 
  Languages, 
  CheckCircle2, 
  Sparkles, 
  Share2, 
  MessageSquare, 
  Type,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { processDocument, chatWithContext } from '../services/gemini';
import { formatText } from '../utils/formatter';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  context: string;
  onGenerateMindMap: () => void;
}

export const Editor: React.FC<EditorProps> = ({ content, onChange, context, onGenerateMindMap }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  const handleAction = async (action: 'translate' | 'proofread' | 'format') => {
    if (!content || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await processDocument(content, action);
      onChange(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await chatWithContext(content, context, chatInput);
      onChange(result);
      setChatInput('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const manualFormat = () => {
    onChange(formatText(content));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-bottom border-black/5 bg-gray-50/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleAction('translate')}
            disabled={isProcessing}
            className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
            title="中英翻译"
          >
            <Languages className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAction('proofread')}
            disabled={isProcessing}
            className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
            title="智能校对"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={manualFormat}
            className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            title="一键格式化"
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={onGenerateMindMap}
            className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            title="生成思维导图"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={() => setShowChat(!showChat)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            showChat ? 'bg-emerald-600 text-white' : 'bg-white border border-black/5 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI 助手
        </button>
      </div>

      <div className="relative flex-1 flex">
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="在这里编辑你的文档，或者从左侧灵感库中汇总内容..."
          className="flex-1 p-8 focus:outline-none resize-none font-sans leading-relaxed text-gray-800"
        />

        {showChat && (
          <div className="w-80 border-l border-black/5 bg-gray-50 flex flex-col">
            <div className="p-4 border-b border-black/5 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold">对话式编辑</span>
            </div>
            <div className="flex-1 p-4 overflow-auto text-xs text-gray-500 space-y-3">
              <p>你可以让 AI 帮你：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>“把这段话改得更幽默一点”</li>
                <li>“根据上下文补充一下技术细节”</li>
                <li>“总结一下这篇文档的核心观点”</li>
              </ul>
            </div>
            <form onSubmit={handleChat} className="p-4 border-t border-black/5">
              <div className="relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="输入指令..."
                  className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  disabled={isProcessing}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !chatInput.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        )}

        {isProcessing && !showChat && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
            <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-xl border border-black/5">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span className="text-sm font-medium text-gray-600">AI 正在思考中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
