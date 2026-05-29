import { ShieldAlert, Map, LogOut, Settings, Bell, User, Radio, Activity } from 'lucide-react';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';
import { cookies } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  let userRole = 'UNKNOWN';
  let userName = 'User';

  if (token) {
    try {
      // Decode JWT payload manually without relying on 'jsonwebtoken' package
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      if (decoded && decoded.role) {
        userRole = decoded.role;
        userName = decoded.name || 'User';
      }
    } catch (e) {
      console.error("Failed to decode token:", e);
    }
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/50 backdrop-blur-md flex flex-col z-20 relative">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <ShieldAlert className="w-6 h-6 text-red-500 mr-2" />
          <span className="font-bold text-lg tracking-wider text-white">SAPS</span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2">
          <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 px-2">Authorized Modules</div>
          
          {userRole === 'DRIVER' && (
            <Link href="/dashboard/driver" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Ambulance Driver View
            </Link>
          )}

          {userRole === 'POLICE' && (
            <Link href="/dashboard/police" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Traffic Command View
            </Link>
          )}

          {userRole === 'HOSPITAL' && (
            <>
              <Link href="/dashboard/hospital" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Hospital Command
              </Link>
              <Link href="/dashboard/workforce" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Workforce Management
              </Link>
            </>
          )}

          {/* Everyone can see Replay for now, or maybe only POLICE/HOSPITAL */}
          {(userRole === 'HOSPITAL' || userRole === 'POLICE') && (
            <>
              <Link href="/dashboard/simulator" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Emergency Simulator
              </Link>
              <Link href="/dashboard/coordinator" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
                <Radio className="w-4 h-4 text-cyan-400" />
                Fleet Coordinator
              </Link>
              <Link href="/dashboard/compliance" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
                <Radio className="w-4 h-4 text-purple-400" style={{ transform: 'rotate(90deg)' }} />
                Compliance Analyst
              </Link>
              <Link href="/dashboard/hospital" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                Hospital Balancer
              </Link>
              <Link href="/dashboard/replay" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors">
                <Map className="w-4 h-4" />
                Route Replay & Analytics
              </Link>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-white/70 hover:text-white transition-colors w-full text-left">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {/* Top Header */}
        <header className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between px-8 z-20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-white/80">System Online</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-white/10 relative text-white/70 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-black" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-white">{userName}</div>
                <div className="text-[10px] text-white/50 uppercase">{userRole}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold shadow-[0_0_10px_rgba(59,130,246,0.5)] uppercase">
                {userName.substring(0, 2)}
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto relative">
          {children}
        </div>
      </main>
    </div>
  );
}
