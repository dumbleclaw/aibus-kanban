import { useState, useEffect } from 'react';

const API = import.meta.env.PUBLIC_CONVEX_SITE_URL;

interface WorldState {
  phase: string;
  currentRound?: string;
  treasuryDumble: number;
  treasuryMon: number;
  totalRounds: number;
  totalAppsBuilt: number;
  totalSpellsCast: number;
  totalCharacters: number;
  updatedAt: number;
}

interface Character {
  _id: string;
  name: string;
  spellWord: string;
  role: string;
  description: string;
  appearances: number;
  wins: number;
  rarity: string;
  lastSeenAt: number;
}

interface Idea {
  _id: string;
  title: string;
  description: string;
  submittedBy: string;
  stakeAmount: number;
  stakeCurrency: string;
  votes: number;
  isWinner: boolean;
}

interface Spell {
  _id: string;
  word: string;
  caster: string;
  cost: number;
}

interface Vote {
  _id: string;
  characterId: string;
  ideaId: string;
  reasoning: string;
  weight: number;
}

interface RoundData {
  round: any;
  ideas: Idea[];
  spells: Spell[];
  votes: Vote[];
  phase: string;
}

const PHASE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  idle: { label: 'Awaiting', emoji: '💤', color: '#888' },
  cauldron: { label: 'Cauldron', emoji: '📥', color: '#f59e0b' },
  spells: { label: 'Conjuring', emoji: '⚗️', color: '#8b5cf6' },
  council: { label: 'Council', emoji: '🏛️', color: '#3b82f6' },
  forge: { label: 'Forging', emoji: '🔨', color: '#ef4444' },
  portal: { label: 'Launching', emoji: '🚀', color: '#10b981' },
  completed: { label: 'Complete', emoji: '✅', color: '#10b981' },
};

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  legendary: '#f59e0b',
};

const ROLE_EMOJI: Record<string, string> = {
  tech: '💻', marketing: '📢', design: '🎨', growth: '📈',
  product: '🎯', founder: '🚀', compliance: '⚖️', finance: '💰', vc: '🦈',
};

export default function ClawartsDashboard() {
  const [world, setWorld] = useState<WorldState | null>(null);
  const [round, setRound] = useState<RoundData | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [wRes, rRes, cRes] = await Promise.all([
        fetch(`${API}/api/clawarts/world`),
        fetch(`${API}/api/clawarts/round`),
        fetch(`${API}/api/clawarts/characters`),
      ]);
      const w = await wRes.json();
      const r = await rRes.json();
      const c = await cRes.json();
      if (!w.error) setWorld(w);
      if (!r.error) setRound(r);
      setCharacters(c.characters ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center py-20" style={{ color: 'var(--fg-muted)' }}>Loading world state...</div>;
  if (error) return <div className="card p-6 text-center" style={{ color: 'var(--priority-high)' }}>{error}</div>;

  const phase = PHASE_LABELS[world?.phase ?? 'idle'] ?? PHASE_LABELS.idle;

  return (
    <div className="space-y-6">
      {/* World Status */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{phase.emoji}</span>
            <div>
              <h2 className="text-xl font-bold" style={{ color: phase.color }}>{phase.label}</h2>
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                {world?.currentRound ?? 'No active round'}
              </p>
            </div>
          </div>
          <div className="text-right text-sm" style={{ color: 'var(--fg-muted)' }}>
            <div>Treasury: <span style={{ color: 'var(--fg)' }}>{world?.treasuryDumble ?? 0} $STEALTH</span></div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            { label: 'Rounds', value: world?.totalRounds ?? 0, emoji: '🔄' },
            { label: 'Apps Built', value: world?.totalAppsBuilt ?? 0, emoji: '📦' },
            { label: 'Spells Cast', value: world?.totalSpellsCast ?? 0, emoji: '✨' },
            { label: 'Characters', value: world?.totalCharacters ?? 0, emoji: '🃏' },
          ].map(({ label, value, emoji }) => (
            <div key={label} className="card p-3">
              <div className="text-2xl">{emoji}</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Round */}
      {round?.round && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>
            🏛️ {round.round.roundId} — {round.round.appName ? `Winner: ${round.round.appName}` : 'In Progress'}
          </h3>

          {/* Ideas */}
          {round.ideas.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>Ideas in the Cauldron</h4>
              <div className="space-y-2">
                {round.ideas.map((idea) => (
                  <div key={idea._id} className="card p-3 flex items-center justify-between" style={{
                    borderLeft: idea.isWinner ? '3px solid var(--primary)' : 'none'
                  }}>
                    <div>
                      <span className="font-medium" style={{ color: 'var(--fg)' }}>
                        {idea.isWinner && '🏆 '}{idea.title}
                      </span>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{idea.description}</p>
                    </div>
                    <div className="text-right text-sm">
                      <div style={{ color: 'var(--fg)' }}>{idea.votes} votes</div>
                      <div style={{ color: 'var(--fg-muted)' }}>{idea.stakeAmount} {idea.stakeCurrency}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spells */}
          {round.spells.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>Spells Cast</h4>
              <div className="flex flex-wrap gap-2">
                {round.spells.map((spell) => (
                  <span key={spell._id} className="card px-3 py-1 text-sm" style={{ color: '#8b5cf6' }}>
                    ✨ {spell.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Votes */}
          {round.votes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--fg-muted)' }}>Council Votes</h4>
              <div className="space-y-2">
                {round.votes.map((vote) => {
                  const char = characters.find(c => c._id === vote.characterId);
                  const idea = round.ideas.find(i => i._id === vote.ideaId);
                  return (
                    <div key={vote._id} className="card p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{ROLE_EMOJI[char?.role ?? ''] ?? '🧙'}</span>
                        <span className="font-medium" style={{ color: 'var(--fg)' }}>{char?.name ?? 'Unknown'}</span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{
                          background: RARITY_COLORS[char?.rarity ?? 'common'] + '22',
                          color: RARITY_COLORS[char?.rarity ?? 'common'],
                        }}>{char?.rarity}</span>
                        <span style={{ color: 'var(--fg-muted)' }}>→</span>
                        <span className="font-medium" style={{ color: 'var(--primary)' }}>{idea?.title ?? '?'}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{vote.reasoning}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Characters */}
      {characters.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg)' }}>
            🃏 Characters ({characters.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {characters.map((char) => (
              <div key={char._id} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{ROLE_EMOJI[char.role] ?? '🧙'}</span>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--fg)' }}>{char.name || 'Unnamed'}</div>
                    <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>"{char.spellWord}"</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs mb-2">
                  <span className="px-2 py-0.5 rounded" style={{
                    background: RARITY_COLORS[char.rarity] + '22',
                    color: RARITY_COLORS[char.rarity],
                  }}>{char.rarity}</span>
                  <span style={{ color: 'var(--fg-muted)' }}>{char.role}</span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--fg-muted)' }}>{char.description}</p>
                <div className="flex gap-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                  <span>👁️ {char.appearances}x</span>
                  <span>🏆 {char.wins}W</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs py-4" style={{ color: 'var(--fg-muted)', opacity: 0.5 }}>
        Auto-refreshing every 5s · Headmistress Aibus Dumbleclaw 🧙‍♀️
      </div>
    </div>
  );
}
