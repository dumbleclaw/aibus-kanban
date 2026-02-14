const CONVEX_SITE_URL = import.meta.env.PUBLIC_CONVEX_SITE_URL;

if (!CONVEX_SITE_URL) {
  console.error('PUBLIC_CONVEX_SITE_URL environment variable is required');
}

export interface TickProject {
  _id: string;
  slug: string;
  name: string;
  schemaVersion: string;
  defaultWorkflow: string[];
  taskCount: number;
  lastSyncedAt: number;
}

export interface TickTask {
  _id: string;
  projectSlug: string;
  tickId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignedTo?: string;
  claimedBy?: string;
  createdBy: string;
  tags: string[];
  dependsOn: string[];
  blocks: string[];
  history: Array<{
    ts: string;
    who: string;
    action: string;
    note?: string;
    from?: string;
    to?: string;
  }>;
  createdAt: number;
  updatedAt: number;
}

export async function fetchProjects(): Promise<TickProject[]> {
  const res = await fetch(`${CONVEX_SITE_URL}/api/tick/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.projects ?? [];
}

export async function fetchAllTasks(): Promise<TickTask[]> {
  // Fetch projects first, then all tasks across all projects
  const projects = await fetchProjects();
  const allTasks: TickTask[] = [];
  for (const p of projects) {
    const params = new URLSearchParams({ slug: p.slug });
    const res = await fetch(`${CONVEX_SITE_URL}/api/tick/tasks?${params}`);
    if (!res.ok) continue;
    const data = await res.json();
    const tasks = Array.isArray(data) ? data : data.tasks ?? [];
    allTasks.push(...tasks);
  }
  return allTasks;
}

export async function fetchTasks(project?: string, status?: string): Promise<TickTask[]> {
  if (!project) return fetchAllTasks();
  const params = new URLSearchParams();
  params.set('slug', project);
  if (status) params.set('status', status);
  const res = await fetch(`${CONVEX_SITE_URL}/api/tick/tasks?${params}`);
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.tasks ?? data ?? [];
}
