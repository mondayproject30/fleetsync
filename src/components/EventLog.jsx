import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Filter, Trash2, ArrowDown } from 'lucide-react';

export function EventLog({ logs = [], onClearLogs }) {
  const [filter, setFilter] = useState('ALL');
  const terminalEndRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'ALL') return true;
    if (filter === 'LOCK' && (log.type === 'lock' || log.message.includes('SHELF') || log.message.includes('CONVEYOR'))) return true;
    if (filter === 'PRIORITY' && (log.message.includes('PRIORITY') || log.message.includes('YIELD'))) return true;
    if (filter === 'OBSTACLE' && (log.message.includes('OBSTACLE') || log.type === 'warning')) return true;
    if (filter === 'CHARGE' && log.message.includes('CHARG')) return true;
    return true;
  });

  return (
    <div className="panel event-log-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Terminal className="icon-sm text-cyan" />
          <span>Fleet Coordination Telemetry Log</span>
        </div>
        <div className="log-header-controls">
          <div className="filter-chips">
            {['ALL', 'LOCK', 'PRIORITY', 'OBSTACLE', 'CHARGE'].map(f => (
              <button
                key={f}
                className={`filter-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            className="btn-icon text-muted hover:text-white"
            onClick={onClearLogs}
            title="Clear Log History"
          >
            <Trash2 className="icon-xs" />
          </button>
        </div>
      </div>

      <div className="log-terminal">
        {filteredLogs.length === 0 ? (
          <div className="empty-log text-muted font-mono font-xs">
            [SYS READY] Waiting for events...
          </div>
        ) : (
          filteredLogs.map(item => (
            <div key={item.id} className={`log-line log-${item.type}`}>
              <span className="log-time">[{item.timestamp}]</span>
              <span className="log-text">{item.message}</span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
