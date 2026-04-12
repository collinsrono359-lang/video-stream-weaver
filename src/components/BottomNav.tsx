import { Home, Download, Bell, Settings, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Download, label: 'Downloads', path: '/downloads' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on watch page
  if (location.pathname.startsWith('/watch/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border h-16 flex items-center justify-around px-2 sm:hidden">
      {tabs.map(({ icon: Icon, label, path }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
