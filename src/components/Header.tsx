import { SearchBar } from './SearchBar';
import { Play, Code2, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function Header() {
  const navigate = useNavigate();
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border h-14 flex items-center px-4 gap-4">
      {!mobileSearch && (
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
          </div>
          <span className="text-lg font-bold text-primary hidden sm:block">MediaFusion</span>
        </button>
      )}

      <div className="flex-1 flex justify-center">
        <div className={mobileSearch ? 'w-full' : 'hidden sm:block w-full max-w-xl'}>
          <SearchBar />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setMobileSearch(!mobileSearch)}
          className="sm:hidden p-2 rounded-full hover:bg-accent transition-colors"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => navigate('/developers')}
          className="p-2 rounded-full hover:bg-accent transition-colors hidden sm:block"
          title="Developer Portal"
        >
          <Code2 className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </header>
  );
}
