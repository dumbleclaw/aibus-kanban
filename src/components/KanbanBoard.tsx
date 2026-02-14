import { useState, useEffect, useCallback } from 'react';
import { fetchTasks, type TickTask } from '../lib/api';
import { getProjectTag } from '../lib/utils';
import TaskCard from './TaskCard';
import TaskDetail from './TaskDetail';

interface Props {
  projectSlug: string;
}

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', icon: '📋' },
  { key: 'todo', label: 'Todo', icon: '📌' },
  { key: 'in_progress', label: 'In Progress', icon: '🔨' },
  { key: 'review', label: 'Review', icon: '👀' },
  { key: 'done', label: 'Done', icon: '✅' },
];

const REFRESH_INTERVAL = 30_000;

export default function KanbanBoard({ projectSlug }: Props) {
  const [tasks, setTasks] = useState<TickTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<TickTask | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');

  const loadTasks = useCallback(async () => {
    try {
      const all = await fetchTasks();
      const data = all.filter((t) => getProjectTag(t) === projectSlug);
      setTasks(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const allTags = [...new Set(tasks.flatMap((t) => t.tags))].sort();

  const filtered = tasks.filter((t) => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterTag !== 'all' && !t.tags.includes(filterTag)) return false;
    return true;
  });

  const tasksByStatus = (status: string) => filtered.filter((t) => t.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg" style={{ color: 'var(--fg-muted)' }}>Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg" style={{ color: 'var(--priority-high)' }}>{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="badge cursor-pointer"
          style={{ background: 'var(--bg-card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        >
          <option value="all">All priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">⚪ Low</option>
        </select>

        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="badge cursor-pointer"
          style={{ background: 'var(--bg-card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        >
          <option value="all">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>

        <div className="ml-auto text-xs" style={{ color: 'var(--fg-muted)' }}>
          {filtered.length} tasks · refreshed {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.key);
          return (
            <div key={col.key} className="min-h-[200px]">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span>{col.icon}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{col.label}</span>
                <span
                  className="badge ml-auto"
                  style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}
                >
                  {colTasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTasks.map((task) => (
                  <TaskCard key={task.tickId} task={task} onClick={setSelectedTask} />
                ))}
                {colTasks.length === 0 && (
                  <div
                    className="text-center py-8 text-sm rounded-lg border border-dashed"
                    style={{ color: 'var(--fg-muted)', borderColor: 'var(--border)' }}
                  >
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {selectedTask && (
        <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}
