import type { TickTask } from '../lib/api';

interface Props {
  task: TickTask;
  onClose: () => void;
}

export default function TaskDetail({ task, onClose }: Props) {
  const formatDate = (ts: string | number) => {
    const d = new Date(typeof ts === 'number' ? ts : ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg overflow-y-auto"
        style={{ background: 'var(--bg-card)', borderLeft: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-mono" style={{ color: 'var(--fg-muted)' }}>
                {task.tickId}
              </span>
              <h2 className="text-xl font-semibold mt-1" style={{ color: 'var(--fg)' }}>
                {task.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-2xl leading-none cursor-pointer"
              style={{ color: 'var(--fg-muted)' }}
            >
              ×
            </button>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Status</label>
              <div className={`badge status-badge-${task.status} mt-1`}>{task.status.replace('_', ' ')}</div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Priority</label>
              <div className={`mt-1 text-sm priority-${task.priority}`}>{task.priority}</div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Assigned</label>
              <div className="mt-1 text-sm">{task.claimedBy || task.assignedTo || 'Unassigned'}</div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Created by</label>
              <div className="mt-1 text-sm">{task.createdBy}</div>
            </div>
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="mb-6">
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Tags</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {task.tags.map((tag) => (
                  <span key={tag} className="badge" style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {task.dependsOn.length > 0 && (
            <div className="mb-6">
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>Dependencies</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {task.dependsOn.map((dep) => (
                  <span key={dep} className="badge font-mono" style={{ background: 'var(--border)', color: 'var(--primary)' }}>
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div>
            <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>History</label>
            <div className="mt-2 space-y-3">
              {task.history.map((entry, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--primary)' }} />
                  <div>
                    <div style={{ color: 'var(--fg)' }}>
                      <span className="font-medium">{entry.who}</span>
                      {' '}{entry.action}
                      {entry.from && entry.to && (
                        <span style={{ color: 'var(--fg-muted)' }}> ({entry.from} → {entry.to})</span>
                      )}
                    </div>
                    {entry.note && (
                      <div className="mt-1" style={{ color: 'var(--fg-muted)' }}>{entry.note}</div>
                    )}
                    <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)', opacity: 0.7 }}>
                      {formatDate(entry.ts)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
