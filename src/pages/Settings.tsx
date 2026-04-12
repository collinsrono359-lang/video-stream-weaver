import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { Moon, Globe, Shield, Wifi, HardDrive, Palette, ChevronRight, Code2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

export default function Settings() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const settingSections = [
    {
      title: 'Appearance',
      items: [
        { icon: Moon, label: 'Dark Mode', toggle: true, value: darkMode, onChange: setDarkMode },
        { icon: Palette, label: 'Theme Color', subtitle: 'Purple', action: true },
      ],
    },
    {
      title: 'Playback',
      items: [
        { icon: Globe, label: 'Autoplay Videos', toggle: true, value: autoplay, onChange: setAutoplay },
        { icon: Wifi, label: 'Data Saver Mode', subtitle: 'Lower quality on mobile data', toggle: true, value: dataSaver, onChange: setDataSaver },
      ],
    },
    {
      title: 'General',
      items: [
        { icon: Shield, label: 'Notifications', toggle: true, value: notifications, onChange: setNotifications },
        { icon: HardDrive, label: 'Storage & Cache', subtitle: 'Manage downloaded content', action: true },
        { icon: Code2, label: 'Developer Portal', subtitle: 'API access & documentation', action: true, onClick: () => navigate('/developers') },
        { icon: Shield, label: 'Admin Panel', subtitle: 'Manage application', action: true, onClick: () => navigate('/admin') },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      <Header />
      <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mt-4 mb-6">Settings</h1>

        {settingSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{section.title}</h3>
            <div className="bg-card rounded-xl overflow-hidden divide-y divide-border">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 px-4 py-3.5 ${item.action ? 'cursor-pointer hover:bg-surface-hover' : ''}`}
                  onClick={item.onClick}
                >
                  <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                  </div>
                  {item.toggle && (
                    <Switch checked={item.value} onCheckedChange={item.onChange} />
                  )}
                  {item.action && !item.toggle && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-center text-xs text-muted-foreground mt-8 mb-4">MediaFusion v1.0.0</p>
      </main>
      <BottomNav />
    </div>
  );
}
