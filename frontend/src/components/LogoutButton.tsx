'use client';

import { LogOut } from 'lucide-react';
import axios from 'axios';

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5005/api/auth/logout', {}, { withCredentials: true });
      window.location.href = '/login';
    } catch(e) {
      console.error('Logout failed', e);
      window.location.href = '/login';
    }
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-white/70 hover:text-red-400 transition-colors w-full text-left"
    >
      <LogOut className="w-4 h-4" /> Logout
    </button>
  );
}
