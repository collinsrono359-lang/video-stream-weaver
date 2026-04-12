import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Bell } from 'lucide-react';

export default function Alerts() {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      <Header />
      <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mt-4 mb-6">Notifications</h1>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No notifications</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            You'll see notifications about new videos and updates here.
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
