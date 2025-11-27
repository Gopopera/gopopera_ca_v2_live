/**
 * Visual Debugger for Mobile
 * 
 * Shows console logs directly on the phone screen
 * Useful when remote debugging is not available
 * 
 * Usage: Import and call initVisualDebugger() in App.tsx
 */

interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  data?: any;
}

class VisualDebugger {
  private logs: LogEntry[] = [];
  private maxLogs = 50;
  private isVisible = false;
  private container: HTMLDivElement | null = null;

  init() {
    if (typeof window === 'undefined') return;

    // Create debug panel
    this.createPanel();

    // Override console methods
    this.interceptConsole();

    // Add toggle button
    this.addToggleButton();

    console.log('[DEBUG] Visual debugger initialized');
  }

  private createPanel() {
    const container = document.createElement('div');
    container.id = 'visual-debug-panel';
    container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.9);
      color: #0f0;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 99999;
      display: none;
      border-top: 2px solid #0f0;
    `;
    document.body.appendChild(container);
    this.container = container;
  }

  private addToggleButton() {
    const button = document.createElement('button');
    button.textContent = '🔍';
    button.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #0f0;
      color: #000;
      border: none;
      font-size: 20px;
      z-index: 99998;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    button.onclick = () => this.toggle();
    document.body.appendChild(button);
  }

  private toggle() {
    if (!this.container) return;
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
    this.updateDisplay();
  }

  private interceptConsole() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = (...args: any[]) => {
      this.addLog('log', args);
      originalLog.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.addLog('warn', args);
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.addLog('error', args);
      originalError.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.addLog('info', args);
      originalInfo.apply(console, args);
    };
  }

  private addLog(level: LogEntry['level'], args: any[]) {
    const message = args
      .map((arg) => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    this.logs.push({
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data: args.length > 1 ? args : undefined,
    });

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Auto-scroll if visible
    if (this.isVisible) {
      this.updateDisplay();
    }
  }

  private updateDisplay() {
    if (!this.container) return;

    const html = this.logs
      .slice(-30) // Show last 30 logs
      .map((log) => {
        const color =
          log.level === 'error'
            ? '#f00'
            : log.level === 'warn'
            ? '#ff0'
            : log.level === 'info'
            ? '#0ff'
            : '#0f0';
        return `<div style="color: ${color}; margin: 2px 0; word-break: break-word;">
          <span style="opacity: 0.7;">[${log.timestamp}]</span>
          <span style="font-weight: bold;">[${log.level.toUpperCase()}]</span>
          ${this.escapeHtml(log.message)}
        </div>`;
      })
      .join('');

    this.container.innerHTML = html;
    this.container.scrollTop = this.container.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  clear() {
    this.logs = [];
    this.updateDisplay();
  }
}

// Singleton instance
let debuggerInstance: VisualDebugger | null = null;

export function initVisualDebugger() {
  if (typeof window === 'undefined') return;
  if (debuggerInstance) return;

  // Only enable in development mode (not in production)
  const isDev = import.meta.env.DEV;

  if (isDev) {
    debuggerInstance = new VisualDebugger();
    debuggerInstance.init();
    console.log('[DEBUG] Visual debugger enabled');
  }
}

export function clearVisualDebugger() {
  if (debuggerInstance) {
    debuggerInstance.clear();
  }
}

