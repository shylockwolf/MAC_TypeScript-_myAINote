import React from 'react';
import { Note, Tag } from '../types';
import { Calendar, User, Tag as TagIcon, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';

interface NoteListProps {
  notes: Note[];
  onDelete: (id: number) => void;
  selectedTags: string[];
  onTagClick: (tagValue: string) => void;
}

export const NoteList: React.FC<NoteListProps> = ({ notes, onDelete, selectedTags, onTagClick }) => {
  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div key={note.id} className="bg-white border border-black/5 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start mb-3">
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
            <button
              onClick={() => onDelete(note.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700">
            <Markdown>{note.content}</Markdown>
          </div>
          <div className="mt-3 text-[10px] text-gray-400 font-mono">
            {new Date(note.created_at).toLocaleString()}
          </div>
        </div>
      ))}
      {notes.length === 0 && (
        <div className="text-center py-12 text-gray-400 italic">
          暂无灵感记录，快去记一笔吧
        </div>
      )}
    </div>
  );
};
