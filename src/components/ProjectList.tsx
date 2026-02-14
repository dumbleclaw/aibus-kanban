import { useState, useEffect } from 'react';
import { fetchTasks, type TickTask } from '../lib/api';
import { groupByProject, projectStats } from '../lib/utils';

export default function ProjectList() {
  const [groups, setGroups] = useState<Record<string, TickTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all tasks (no project filter), group client-side
    fetchTasks()
      .then((tasks) => setGroups(groupByProject(tasks)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-20" style={{ color: 'var(--fg-muted)' }}>Loading projects...</div>;
  }

  if (error) {
    return <div className="card p-6 text-center" style={{ color: 'var(--priority-high)' }}>{error}</div>;
  }

  const projectNames = Object.keys(groups).sort();

  if (projectNames.length === 0) {
    return (
      <div className="card p-6 text-center" style={{ color: 'var(--fg-muted)' }}>
        No projects synced yet. The mycelium is still growing...
      </div>
    );
  }

  const syncDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projectNames.map((name) => {
        const stats = projectStats(groups[name]);
        const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
        return (
          <a key={name} href={`/board?project=${name}`} className="card block p-5 group">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>{name}</h3>
              <span className="text-xl">🍄</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: 'var(--border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: 'var(--primary)' }}
              />
            </div>

            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--fg-muted)' }}>
              <span>{stats.total} tasks</span>
              <span>·</span>
              <span>{stats.done} done</span>
              {stats.inProgress > 0 && (
                <>
                  <span>·</span>
                  <span>{stats.inProgress} active</span>
                </>
              )}
            </div>

            <div className="mt-2 text-xs" style={{ color: 'var(--fg-muted)', opacity: 0.7 }}>
              Updated {syncDate(stats.lastUpdate)}
            </div>
          </a>
        );
      })}
    </div>
  );
}
