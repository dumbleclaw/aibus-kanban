import { useState, useEffect } from 'react';
import KanbanBoard from './KanbanBoard';

export default function BoardPage() {
  const [slug, setSlug] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSlug(params.get('project') || 'clawd');
  }, []);

  if (!slug) {
    return <div style={{ color: 'var(--fg-muted)' }}>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <a href="/" className="text-sm mb-2 inline-block hover:underline" style={{ color: 'var(--primary)' }}>
          ← Back to projects
        </a>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
          {slug}
        </h1>
      </div>
      <KanbanBoard projectSlug={slug} />
    </div>
  );
}
