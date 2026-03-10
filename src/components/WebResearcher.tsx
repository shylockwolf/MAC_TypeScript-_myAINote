import React, { useState, useRef, useEffect } from 'react';
import { Search, Globe, Loader2, ExternalLink, Sparkles, Terminal } from 'lucide-react';

interface SearchResult {
  position: number;
  title: string;
  link: string;
  date: string;
  snippet: string;
}

interface WebResearcherState {
  query: string;
  size: number;
  isSearching: boolean;
  searchStatus: string;
  results: SearchResult[];
  webError: string | null;
  debugSteps: DebugStep[];
  keywords: string[];
  selectedResults: Set<number>;
  addProgress: {
    isAdding: boolean;
    current: number;
    total: number;
    currentTitle: string;
  };
}

interface WebResearcherProps {
  state: WebResearcherState;
  setState: React.Dispatch<React.SetStateAction<WebResearcherState>>;
  onAddToNotes?: (result: SearchResult) => void;
  onNotesUpdated?: () => void;
}

interface DebugStep {
  step: string;
  content: string;
  timestamp: string;
}

export const WebResearcher: React.FC<WebResearcherProps> = ({ state, setState, onAddToNotes, onNotesUpdated }) => {
  const { query, size, isSearching, searchStatus, results, webError, debugSteps, keywords, selectedResults, addProgress } = state;
  const debugContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll debug window to bottom when new steps are added
  useEffect(() => {
    if (debugContainerRef.current) {
      debugContainerRef.current.scrollTop = debugContainerRef.current.scrollHeight;
    }
  }, [debugSteps]);

  const addDebugStep = (step: string, content: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setState(prev => ({
      ...prev,
      debugSteps: [...prev.debugSteps, { step, content, timestamp }]
    }));
  };

  const extractKeywords = async (question: string): Promise<string[]> => {
    addDebugStep('AI 分析', `正在分析问题: "${question}"`);
    
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个搜索专家。请将用户的问题分解为3-5个精准的搜索关键词，用于网络搜索。直接返回关键词，用逗号分隔，不要其他解释。'
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      throw new Error('关键词提取失败');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    addDebugStep('AI 响应', content);
    
    const extractedKeywords = content
      .split(/[,，、\n]+/)
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0 && k.length < 20);
    
    addDebugStep('关键词提取', `提取到 ${extractedKeywords.length} 个关键词: ${extractedKeywords.join(', ')}`);
    
    return extractedKeywords;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setState(prev => ({
      ...prev,
      isSearching: true,
      results: [],
      webError: null,
      debugSteps: [],
      keywords: []
    }));

    try {
      // Step 1: Extract keywords using AI
      setState(prev => ({ ...prev, searchStatus: '正在裂变关键词...' }));
      const extractedKeywords = await extractKeywords(query.trim());
      setState(prev => ({ ...prev, keywords: extractedKeywords }));

      // Step 2: Search using combined keywords
      setState(prev => ({ ...prev, searchStatus: '正在搜索...' }));
      const searchQuery = extractedKeywords.join(' ');
      addDebugStep('搜索请求', `搜索词: "${searchQuery}"`);
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: searchQuery, size: String(size) }),
      });

      const responseText = await response.text();
      
      if (!responseText) {
        throw new Error('服务器返回空响应');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Invalid JSON response:', responseText);
        throw new Error('服务器返回无效的 JSON 格式');
      }

      if (!response.ok) {
        throw new Error(data.error || '搜索失败');
      }

      addDebugStep('解析结果', '正在解析搜索结果...');
      
      const searchResults: SearchResult[] = [];
      const resultList = data.webpages || data.data || [];
      if (Array.isArray(resultList)) {
        resultList.forEach((item: any, index: number) => {
          searchResults.push({
            position: item.position || index + 1,
            title: item.title || '无标题',
            link: item.link || item.url || '#',
            date: item.date || '',
            snippet: item.snippet || item.content || '无摘要',
          });
        });
      }

      setState(prev => ({
        ...prev,
        results: searchResults,
        selectedResults: new Set(), // Clear selections on new search
        searchStatus: `搜索完成，找到 ${searchResults.length} 条结果`
      }));
      addDebugStep('完成', `成功获取 ${searchResults.length} 条搜索结果`);
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        webError: err.message || '搜索过程中发生错误',
        searchStatus: '搜索失败'
      }));
      addDebugStep('错误', err.message || '未知错误');
    } finally {
      setState(prev => ({
        ...prev,
        isSearching: false
      }));
    }
  };

  const toggleSelection = (position: number) => {
    setState(prev => {
      const newSet = new Set(prev.selectedResults);
      if (newSet.has(position)) {
        newSet.delete(position);
      } else {
        newSet.add(position);
      }
      return {
        ...prev,
        selectedResults: newSet
      };
    });
  };

  const handleAddToNotes = async () => {
    if (selectedResults.size === 0 || results.length === 0) return;

    const selectedItems = results.filter(r => selectedResults.has(r.position));
    addDebugStep('添加到笔记', `开始处理 ${selectedItems.length} 个选中项...`);

    // Initialize progress
    setState(prev => ({
      ...prev,
      addProgress: {
        isAdding: true,
        current: 0,
        total: selectedItems.length,
        currentTitle: ''
      }
    }));

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      
      // Update progress at the start of each item
      setState(prev => ({
        ...prev,
        addProgress: {
          ...prev.addProgress,
          current: i + 1,
          currentTitle: item.title
        }
      }));
      
      addDebugStep('提取内容', `正在提取: "${item.title}"`);
      
      try {
        addDebugStep('AI 分析', `正在分析内容...`);
        // Extract webpage content
        const readerResponse = await fetch('/api/reader', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.link }),
        });

        if (!readerResponse.ok) {
          const errorData = await readerResponse.json();
          throw new Error(errorData.error || '提取网页内容失败');
        }

        const readerData = await readerResponse.json();
        const content = `来源链接: ${item.link}\n\n网页内容:\n${readerData.content || '无法提取内容'}`;

        // Use AI to analyze and generate tags
        const analyzeResponse = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: '你是一个智能笔记分析助手。请分析用户输入的内容，提取关键信息。返回JSON格式：{"category":"分类","topic":"主题","people":["人名"],"subjects":["主体"],"objects":["对象"],"summary":"简短总结"}。分类可选：管理类、社会类、技术类、新闻类、其它。'
              },
              {
                role: 'user',
                content: content.substring(0, 2000) // Limit content length
              }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        let tags: any[] = [{ key: 'source', value: 'webresearch' }];
        let summary = item.title;

        if (analyzeResponse.ok) {
          const analyzeData = await analyzeResponse.json();
          const analysisContent = analyzeData.choices?.[0]?.message?.content;
          
          try {
            const analysis = JSON.parse(analysisContent);
            summary = analysis.summary || item.title;
            
            // Generate tags from analysis
            const ignoreWords = new Set(['我', '你', '他', '她', '它', '我们', '你们', '他们', '这个', '那个', '这些', '那些', '什么', '怎么', '为什么', '因为', '所以', '但是', '而且', '然后', '还是', '已经', '开始', '一直', '总是', '完全', '非常', '特别', '比较', '应该', '可能', '需要', '可以', '能够', '想要', '觉得', '感觉', '发现', '问题', '情况', '时候', '现在', '目前', '之前', '之后', '以上', '以下', '关于', '对于', '根据', '通过', '由于', '除了', '包括', '以及', '或者', '和', '与', '的', '了', '着', '过', '到', '在', '从', '把', '被', '让', '给', '为', '对', '向', '往', '往', '去', '来', '上', '下', '里', '外', '内', '前', '后', '左', '右', '中', '间', '旁', '边', '侧', '顶', '底', '头', '尾', '首', '末', '初', '终', '始', '终', '刚', '才', '就', '都', '也', '又', '再', '还', '更', '最', '太', '很', '好', '坏', '多', '少', '大', '小', '长', '短', '新', '旧', '真', '假', '是', '否', '有', '无', '没', '不', '没']);

            const allTags: any[] = [
              { key: 'category', value: analysis.category },
              { key: 'date', value: new Date().toLocaleDateString() },
              { key: 'topic', value: analysis.topic },
              ...(analysis.people || []).map((p: string) => ({ key: 'people', value: p })),
              ...(analysis.subjects || []).map((s: string) => ({ key: 'subject', value: s })),
              ...(analysis.objects || []).map((o: string) => ({ key: 'object', value: o })),
              { key: 'source', value: 'webresearch' }
            ];

            const filteredTags = allTags.filter(tag => {
              const value = tag.value?.trim();
              if (!value || value.length < 2) return false;
              if (ignoreWords.has(value)) return false;
              if (value === analysis.topic) return false;
              return true;
            });

            const uniqueTags = Array.from(
              new Map(filteredTags.map(tag => [tag.value, tag])).values()
            );

            const categoryTag = uniqueTags.find(t => t.key === 'category');
            const otherTags = uniqueTags.filter(t => t.key !== 'category');
            tags = categoryTag ? [categoryTag, ...otherTags] : uniqueTags;
            tags = tags.slice(0, 8);
          } catch (e) {
            console.error('Failed to parse AI analysis:', e);
          }
        }

        // Add to notes
        const noteResponse = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content,
            summary: summary,
            tags: tags
          }),
        });

        if (!noteResponse.ok) {
          throw new Error('保存笔记失败');
        }

        addDebugStep('成功', `已保存: "${item.title}"`);
      } catch (err: any) {
        addDebugStep('失败', `"${item.title}": ${err.message}`);
      }
    }

    addDebugStep('完成', `已完成 ${selectedItems.length} 项的添加`);
    setState(prev => ({
      ...prev,
      selectedResults: new Set(), // Clear selections
      addProgress: {
        isAdding: false,
        current: 0,
        total: 0,
        currentTitle: ''
      }
    }));
    onNotesUpdated?.(); // Refresh notes list in App
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - Search Config (1/5 width) */}
      <div className="w-1/5 flex flex-col gap-4 overflow-hidden">
        {/* Error message */}
        {webError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex-shrink-0">
            <strong>错误：</strong>{webError}
          </div>
        )}

        {/* Search Config Panel */}
        <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-4">
            <Search className="w-4 h-4" />
            网络调查配置
          </div>

          <div className="space-y-4">
            {/* Query Input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                调查内容
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setState(prev => ({ ...prev, query: e.target.value }))}
                placeholder="输入你想要调查的内容..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                disabled={isSearching}
              />
            </div>

            {/* Size Input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                返回结果数量（默认 8）
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={size}
                onChange={(e) => setState(prev => ({ ...prev, size: Math.min(20, Math.max(1, parseInt(e.target.value) || 8)) }))}
                className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                disabled={isSearching}
              />
            </div>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  搜索中...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  开始调查
                </>
              )}
            </button>
          </div>
        </div>

        {/* Debug Window - Always show */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-gray-300">调试窗口</span>
            </div>
            {searchStatus && (
              <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">
                {searchStatus}
              </span>
            )}
          </div>
          
          {/* Keywords in debug window */}
          {keywords.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                {keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 text-xs rounded border border-emerald-800"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div ref={debugContainerRef} className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {debugSteps.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-600 text-xs">
                等待搜索开始...
              </div>
            ) : (
              debugSteps.map((step, index) => (
                <div key={index} className="mb-2 last:mb-0 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 flex-shrink-0">{step.timestamp}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-emerald-400 font-medium">[{step.step}]</span>
                      <span className="text-gray-300 ml-1 break-all">{step.content}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Results Area (4/5 width) */}
      <div className="flex-1 overflow-hidden bg-white rounded-2xl border border-black/5 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            搜索结果
          </h3>
          <div className="flex items-center gap-3">
            {addProgress.isAdding ? (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                正在添加 {addProgress.current}/{addProgress.total}
              </span>
            ) : selectedResults.size > 0 && (
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                已选择 {selectedResults.size} 项
              </span>
            )}
            <button
              onClick={handleAddToNotes}
              className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              disabled={selectedResults.size === 0 || addProgress.isAdding}
            >
              {addProgress.isAdding ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  添加中...
                </>
              ) : (
                '添加到笔记'
              )}
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-60px)] p-4 space-y-4 custom-scrollbar">
          {results.length === 0 && !isSearching && !searchStatus && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Globe className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">输入调查内容并开始搜索</p>
            </div>
          )}

          {results.map((result) => (
            <div
              key={result.position}
              className={`group rounded-xl p-4 transition-colors border ${
                selectedResults.has(result.position)
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-gray-50 border-transparent hover:bg-emerald-50/50 hover:border-emerald-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-xs font-bold">
                    {result.position}
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedResults.has(result.position)}
                    onChange={() => toggleSelection(result.position)}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-gray-900 hover:text-emerald-600 transition-colors flex items-center gap-1 group/title"
                  >
                    {result.title}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                  </a>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {result.date && (
                      <span className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">
                        {result.date}
                      </span>
                    )}
                    <span className="truncate text-gray-400">{result.link}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                    {result.snippet}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
