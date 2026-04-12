import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Shield, Users, Video, Activity, Server, Database } from 'lucide-react';

const stats = [
  { icon: Users, label: 'Total Users', value: '—', color: 'text-primary' },
  { icon: Video, label: 'Videos Served', value: '—', color: 'text-primary' },
  { icon: Activity, label: 'API Calls Today', value: '—', color: 'text-primary' },
  { icon: Server, label: 'Server Status', value: 'Online', color: 'text-green-400' },
];

export default function Admin() {
  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      <Header />
      <main className="pt-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mt-4 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl p-4">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> API Configuration
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate Limiting</span>
                <span className="text-foreground">100 req/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cache Duration</span>
                <span className="text-foreground">5 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Default Region</span>
                <span className="text-foreground">US</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Recent Activity
            </h3>
            <p className="text-sm text-muted-foreground">No recent activity to display.</p>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
