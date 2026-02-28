export interface DebugLog {
  id: string;
  timestamp: string;
  type: 'request' | 'response' | 'error';
  model: string;
  content: string;
  metadata?: Record<string, any>;
}

class DebugLogger {
  private logs: DebugLog[] = [];
  private listeners: ((logs: DebugLog[]) => void)[] = [];

  addLog(log: Omit<DebugLog, 'id' | 'timestamp'>) {
    const newLog: DebugLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
    };
    this.logs.push(newLog);
    this.notifyListeners();
  }

  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(listener: (logs: DebugLog[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getLogs()));
  }
}

export const debugLogger = new DebugLogger();
