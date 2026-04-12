import { Flame, Play, Sparkles, Music, Film, Gamepad2, Newspaper } from 'lucide-react';

interface CategoryChipsProps {
  activeCategory: string;
  onSelect: (category: string) => void;
}

const categories = [
  { id: 'trending', label: 'Trending', icon: Flame },
  { id: 'videos', label: 'Videos', icon: Play },
  { id: 'shorts', label: 'Shorts', icon: Sparkles },
  { id: 'songs', label: 'Songs', icon: Music },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'news', label: 'News', icon: Newspaper },
];

const quickSearch = [
  'Videos', 'Latest Movies', 'Football Highlights', 'DJ Mixes',
];

export function CategoryChips({ activeCategory, onSelect }: CategoryChipsProps) {
  return (
    <div className="space-y-3 mb-6">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {quickSearch.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q.toLowerCase())}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(({ id, label, icon: Icon }) => {
          const active = activeCategory === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`flex items-center gap-1.5 flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
