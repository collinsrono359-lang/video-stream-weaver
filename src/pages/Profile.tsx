import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { User, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Profile() {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      <Header />
      <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mt-4 mb-6">Profile</h1>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Guest User</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Sign in to save your favorites, create playlists, and sync across devices.
          </p>
          <Button className="gap-2 rounded-full px-6">
            <LogIn className="w-4 h-4" />
            Sign In
          </Button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
