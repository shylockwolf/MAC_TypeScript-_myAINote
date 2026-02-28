import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const isDisabled = loading || disabled;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isDisabled) return;

    setLoading(true);
    try {
      await onSend(input);
      setInput('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={disabled ? "处理中..." : "记下你的灵感..."}
        className="w-full bg-white border border-black/10 rounded-2xl px-6 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
        disabled={isDisabled}
      />
      <button
        type="submit"
        disabled={isDisabled || !input.trim()}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-50"
      >
        {isDisabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </button>
    </form>
  );
};
