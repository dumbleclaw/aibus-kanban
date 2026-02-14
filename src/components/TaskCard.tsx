import type { TickTask } from '../lib/api';

interface Props {
  task: TickTask;
  onClick?: (task: TickTask) => void;
}

export default function TaskCard({ task, onClick }: Props) {
  const priorityIcon = {
    high: '🔴',
    medium: '🟡',
    low: '⚪',
  }[task.priority] || '⚪';

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div
      className="card p-3 cursor-pointer"
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono" style={{ color: 'var(--fg-muted)' }}>
          {task.tickId}
        </span>
        <span title={task.priority}>{priorityIcon}</span>
      </div>

      <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
        {task.title}
      </h4>

      <div className="flex flex-wrap gap-1 mb-2">
        {task.tags.map((tag) => (
          <span
            key={tag}
            className="badge"
            style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--fg-muted)' }}>
        <span>{task.claimedBy || task.createdBy}</span>
        <span>{timeAgo(task.updatedAt)}</span>
      </div>
    </div>
  );
}
