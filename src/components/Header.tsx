import { SearchBar } from './SearchBar';
import { Play, Code2, Menu, LogIn, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Header() {
  const navigate = useNavigate();
  const [mobileSearch, setMobileSearch] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast.success('Signed out');
    navigate('/');
  };

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
        {user ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full hover:bg-accent transition-colors"
            >
              <User className="w-5 h-5 text-foreground" />
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-full hover:bg-accent transition-colors hidden sm:block"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 text-foreground" />
            </button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/auth')}
            className="gap-1.5 hidden sm:flex"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
