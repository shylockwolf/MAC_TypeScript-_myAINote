import React, { useState, useEffect, useMemo } from 'react';
import { Note, Tag } from './types';
import { analyzeNote, processDocument } from './services/deepseek';
import { ChatInput } from './components/ChatInput';
import { NoteList } from './components/NoteList';
import { Editor } from './components/Editor';
import { MindMap } from './components/MindMap';
import { DebugPanel } from './components/DebugPanel';
import { 
  Lightbulb, 
  Library, 
  FileEdit, 
  Network, 
  Plus, 
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Bug
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [docContent, setDocContent] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'editor' | 'mindmap'>('notes');
  const [mindMapData, setMindMapData] = useState<any>(null);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const res = await fetch('/api/notes');
    const data = await res.json();
    setNotes(data);
  };

  const handleAddNote = async (content: string) => {
    setIsAddingNote(true);
    setError(null);
    try {
      console.log('Starting analyzeNote...');
      const analysis = await analyzeNote(content);
      console.log('Analysis result:', analysis);
      const tags: Tag[] = [
        { key: 'date', value: new Date().toLocaleDateString() },
        { key: 'topic', value: analysis.topic },
        { key: 'category', value: analysis.category },
        ...analysis.people.map(p => ({ key: 'people', value: p }))
      ];

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tags })
      });
      const newNote = await res.json();
      setNotes([newNote, ...notes]);
    } catch (err: any) {
      console.error('Error adding note:', err);
      setError(err.message || '添加笔记失败，请检查 API 配置');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    setNotes(notes.filter(n => n.id !== id));
  };

  const handleClearAllNotes = async () => {
    await fetch('/api/notes', { method: 'DELETE' });
    setNotes([]);
    setSelectedTags([]);
    setShowClearConfirm(false);
  };

  const toggleTag = (tagValue: string) => {
    setSelectedTags(prev => 
      prev.includes(tagValue) ? prev.filter(t => t !== tagValue) : [...prev, tagValue]
    );
  };

  const filteredNotes = useMemo(() => {
    if (selectedTags.length === 0) return notes;
    return notes.filter(note => 
      selectedTags.every(selectedTag => 
        note.tags.some(tag => tag.value === selectedTag)
      )
    );
  }, [notes, selectedTags]);

  const allTags = useMemo(() => {
    const tagMap = new Map<string, number>();
    notes.forEach(note => {
      note.tags.forEach(tag => {
        tagMap.set(tag.value, (tagMap.get(tag.value) || 0) + 1);
      });
    });
    return Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const handleCollectToEditor = () => {
    const collectedContent = filteredNotes.map(n => n.content).join('\n\n---\n\n');
    setDocContent(collectedContent);
    setActiveTab('editor');
  };

  const handleGenerateMindMap = async () => {
    if (!docContent) return;
    setIsGeneratingMindMap(true);
    setActiveTab('mindmap');
    try {
      const result = await processDocument(docContent, 'mindmap');
      setMindMapData(JSON.parse(result));
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Lightbulb className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">灵感笔记</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Inspiration Notes</p>
          </div>
        </div>

        <nav className="flex bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'notes', icon: Library, label: '灵感库' },
            { id: 'editor', icon: FileEdit, label: '编辑器' },
            { id: 'mindmap', icon: Network, label: '思维导图' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-emerald-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            title="清除所有记录"
          >
            <Trash2 className="w-4 h-4" />
            清除
          </button>
          <button
            onClick={() => setIsDebugOpen(!isDebugOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              isDebugOpen 
                ? 'bg-gray-800 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Debug"
          >
            <Bug className="w-4 h-4" />
            Debug
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-12 gap-6 h-[calc(100vh-88px)]">
        {/* Sidebar: Tags & Filters */}
        <aside className="col-span-3 flex flex-col gap-6 overflow-hidden">
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <Filter className="w-4 h-4" />
                标签过滤
              </div>
              {selectedTags.length > 0 && (
                <button 
                  onClick={() => setSelectedTags([])}
                  className="text-[10px] text-emerald-600 hover:underline"
                >
                  清除全部
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-1">
              {allTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-emerald-50 text-emerald-700 font-medium ring-1 ring-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{tag}</span>
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-md text-gray-400">{count}</span>
                </button>
              ))}
            </div>

            {selectedTags.length > 0 && (
              <button
                onClick={handleCollectToEditor}
                className="mt-4 w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                汇总到编辑器 ({filteredNotes.length})
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="col-span-9 flex flex-col gap-6 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col h-full gap-6"
              >
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <strong>错误：</strong>{error}
                  </div>
                )}
                <ChatInput onSend={handleAddNote} disabled={isAddingNote} />
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <NoteList 
                    notes={filteredNotes} 
                    onDelete={handleDeleteNote}
                    selectedTags={selectedTags}
                    onTagClick={toggleTag}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'editor' && (
              <motion.div
                key="editor"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full"
              >
                <Editor 
                  content={docContent} 
                  onChange={setDocContent} 
                  context={filteredNotes.map(n => n.content).join('\n')}
                  onGenerateMindMap={handleGenerateMindMap}
                />
              </motion.div>
            )}

            {activeTab === 'mindmap' && (
              <motion.div
                key="mindmap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                {isGeneratingMindMap ? (
                  <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-black/5">
                    <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">正在解析文档结构...</p>
                  </div>
                ) : mindMapData ? (
                  <MindMap data={mindMapData} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-black/5 text-gray-400">
                    <Network className="w-12 h-12 mb-4 opacity-20" />
                    <p>暂无思维导图数据</p>
                    <button 
                      onClick={handleGenerateMindMap}
                      className="mt-4 text-emerald-600 hover:underline text-sm"
                    >
                      立即生成
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">确认清除所有记录？</h3>
            <p className="text-gray-500 text-sm mb-6">
              此操作将删除所有笔记和标签，且无法恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClearAllNotes}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors"
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      <DebugPanel isOpen={isDebugOpen} onToggle={() => setIsDebugOpen(!isDebugOpen)} />
    </div>
  );
}
