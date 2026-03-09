import React, { useState } from 'react';
import { Note, Tag } from '../types';
import { Calendar, User, Tag as TagIcon, Trash2, Eye, EyeOff, Check, Square } from 'lucide-react';
import Markdown from 'react-markdown';

interface NoteListProps {
  notes: Note[];
  onDelete: (id: number) => void;
  selectedTags: string[];
  onTagClick: (tagValue: string) => void;
  selectedNotes: Set<number>;
  onToggleSelect: (id: number) => void;
}

export const NoteList: React.FC<NoteListProps> = ({ notes, onDelete, selectedTags, onTagClick, selectedNotes, onToggleSelect }) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getSummaryFontSize = (summary: string): string => {
    const length = summary.length;
    if (length <= 20) return 'text-base';
    if (length <= 40) return 'text-sm';
    if (length <= 60) return 'text-xs';
    return 'text-[10px]';
  };

  return (
    <div className="space-y-2">
      {notes.map((note) => {
        const isExpanded = expandedNotes.has(note.id);
        const displayContent = isExpanded ? note.content : (note.summary || note.content);
        const isSummary = !isExpanded && note.summary;
        const isSelected = selectedNotes.has(note.id);

        return (
          <div key={note.id} className="bg-white border border-black/5 rounded-2xl p-2.5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-1.5">
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag, idx) => (
                  <button
                    key={idx}
                    onClick={() => onTagClick(tag.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTags.includes(tag.value)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag.key === 'date' && <Calendar className="w-3 h-3" />}
                    {tag.key === 'people' && <User className="w-3 h-3" />}
                    {tag.key === 'category' && <TagIcon className="w-3 h-3" />}
                    {tag.value}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleSelect(note.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isSelected ? "取消选择" : "选择汇总"}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  {isSelected ? "已选" : "选择"}
                </button>
                <button
                  onClick={() => toggleExpand(note.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                  title={isExpanded ? "显示总结" : "显示全文"}
                >
                  {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {isExpanded ? "总结" : "全文"}
                </button>
                <button
                  onClick={() => onDelete(note.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className={`prose prose-sm max-w-none text-gray-700 ${isSummary ? 'truncate whitespace-nowrap overflow-hidden' : ''} ${isSummary ? getSummaryFontSize(displayContent) : ''}`}>
              <Markdown>{displayContent}</Markdown>
            </div>
            <div className="mt-1.5 text-[10px] text-gray-400 font-mono">
              {new Date(note.created_at).toLocaleString()}
            </div>
          </div>
        );
      })}
      {notes.length === 0 && (
        <div className="text-center py-12 text-gray-400 italic">
          暂无灵感记录，快去记一笔吧
        </div>
      )}
    </div>
  );
};
