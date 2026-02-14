import type { TickTask } from './api';

/** Extract project name from project:* tag, or 'untagged' */
export function getProjectTag(task: TickTask): string {
  const tag = task.tags.find((t) => t.startsWith('project:'));
  return tag ? tag.replace('project:', '') : 'untagged';
}

/** Group tasks by their project:* tag */
export function groupByProject(tasks: TickTask[]): Record<string, TickTask[]> {
  const groups: Record<string, TickTask[]> = {};
  for (const task of tasks) {
    const project = getProjectTag(task);
    if (!groups[project]) groups[project] = [];
    groups[project].push(task);
  }
  return groups;
}

/** Get project summary stats */
export function projectStats(tasks: TickTask[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const lastUpdate = tasks.reduce((max, t) => {
    const ts = new Date(t.updatedAt).getTime();
    return ts > max ? ts : max;
  }, 0);
  return { total, done, inProgress, lastUpdate };
}
