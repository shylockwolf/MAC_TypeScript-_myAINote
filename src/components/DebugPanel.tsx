import React, { useState, useEffect } from 'react';
import { debugLogger, DebugLog } from '../services/debugLogger';
import { Trash2, X, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface DebugPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onToggle }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  const toggleLog = (id: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearLogs = () => {
    debugLogger.clearLogs();
  };

  const getTypeColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'request':
        return 'text-blue-400';
      case 'response':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeBg = (type: DebugLog['type']) => {
    switch (type) {
      case 'request':
        return 'bg-blue-500/20';
      case 'response':
        return 'bg-green-500/20';
      case 'error':
        return 'bg-red-500/20';
      default:
        return 'bg-gray-500/20';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-gray-300 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
      >
        <Terminal className="w-4 h-4" />
        Debug
        {logs.length > 0 && (
          <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {logs.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 shadow-2xl transition-all duration-300">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Debug Console</span>
          <span className="text-xs text-gray-500">({logs.length} logs)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearLogs}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-2 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No logs yet. Interact with the AI to see debug information.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`border border-gray-700 rounded-lg overflow-hidden ${getTypeBg(log.type)}`}
            >
              <button
                onClick={() => toggleLog(log.id)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-semibold uppercase ${getTypeColor(log.type)}`}>
                    {log.type}
                  </span>
                  <span className="text-gray-500">{log.timestamp}</span>
                  <span className="text-gray-400">{log.model}</span>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <span className="text-gray-500">
                      {JSON.stringify(log.metadata).slice(0, 50)}...
                    </span>
                  )}
                </div>
                {expandedLogs.has(log.id) ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedLogs.has(log.id) && (
                <div className="px-3 py-2 border-t border-gray-700/50 bg-black/20">
                  <pre className="text-gray-300 whitespace-pre-wrap break-all">
                    {log.content}
                  </pre>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700/30">
                      <span className="text-gray-500">Metadata: </span>
                      <span className="text-gray-400">
                        {JSON.stringify(log.metadata, null, 2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
