import React, { useState, useEffect, useRef } from 'react';
import { 
  Languages, 
  CheckCircle2, 
  Sparkles, 
  Share2, 
  MessageSquare, 
  Type,
  Loader2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Terminal,
  Trash2
} from 'lucide-react';
import { processDocument, chatWithContext } from '../services/deepseek';
import { formatText } from '../utils/formatter';
import { debugLogger, DebugLog } from '../services/debugLogger';

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
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const debugContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to debug logger
  useEffect(() => {
    const unsubscribe = debugLogger.subscribe((logs) => {
      setDebugLogs(logs);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll debug window
  useEffect(() => {
    if (debugContainerRef.current) {
      debugContainerRef.current.scrollTop = debugContainerRef.current.scrollHeight;
    }
  }, [debugLogs]);

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
    setChatError(null);
    setChatResponse(null);
    try {
      console.log('[Editor] Sending chat request:', chatInput);
      console.log('[Editor] Content:', content?.substring(0, 100));
      console.log('[Editor] Context length:', context?.length);
      const result = await chatWithContext(content, context, chatInput);
      console.log('[Editor] Chat result length:', result?.length);
      console.log('[Editor] Chat result preview:', result?.substring(0, 100));
      onChange(result);
      setChatResponse('✅ 处理完成');
      setChatInput('');
    } catch (error: any) {
      console.error('Chat error:', error);
      setChatError(error.message || 'AI 处理失败，请稍后重试');
    } finally {
      console.log('[Editor] Setting isProcessing to false');
      setIsProcessing(false);
    }
  };

  const manualFormat = () => {
    onChange(formatText(content));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 bg-gray-50/50">
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
            
            <div className="flex-1 p-4 overflow-auto">
              {!chatResponse && !chatError && (
                <div className="text-xs text-gray-500 space-y-3">
                  <p>你可以让 AI 帮你：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>"把这段话改得更幽默一点"</li>
                    <li>"根据上下文补充一下技术细节"</li>
                    <li>"总结一下这篇文档的核心观点"</li>
                  </ul>
                </div>
              )}
              
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-emerald-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI 正在处理中...</span>
                </div>
              )}
              
              {chatError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {chatError}
                </div>
              )}
              
              {chatResponse && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                  {chatResponse}
                </div>
              )}
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

      {/* Debug Window Toggle Button */}
      <div className="border-t border-black/5 bg-gray-50/50 px-4 py-1.5 flex items-center justify-between">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>AI 调试窗口</span>
          {showDebug ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
        {debugLogs.length > 0 && (
          <span className="text-[10px] text-gray-400">{debugLogs.length} 条日志</span>
        )}
      </div>

      {/* Debug Window */}
      {showDebug && (
        <div className="border-t border-black/5 bg-gray-900 max-h-48 overflow-hidden flex flex-col">
          <div className="px-3 py-1.5 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-gray-300">AI 交互日志</span>
            </div>
            <button
              onClick={() => debugLogger.clearLogs()}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              清除
            </button>
          </div>
          <div 
            ref={debugContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar"
          >
            {debugLogs.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                暂无 AI 交互日志
              </div>
            ) : (
              debugLogs.map((log) => (
                <div key={log.id} className="font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 flex-shrink-0">{log.timestamp}</span>
                    <span className={`flex-shrink-0 ${
                      log.type === 'request' ? 'text-blue-400' :
                      log.type === 'response' ? 'text-emerald-400' :
                      'text-red-400'
                    }`}>
                      [{log.type.toUpperCase()}]
                    </span>
                    <span className="text-gray-400 flex-shrink-0">({log.model})</span>
                  </div>
                  <div className="mt-1 text-gray-300 break-all whitespace-pre-wrap pl-16">
                    {log.content.length > 500 ? log.content.substring(0, 500) + '...' : log.content}
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="text-gray-500 text-[10px] pl-16 mt-0.5">
                      {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
