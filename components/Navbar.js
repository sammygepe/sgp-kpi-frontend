'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function Navbar({ user, onLogout }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications.data || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
      setShowNotifications(false);
    }
  };

  const isAtasan = user?.role === 'atasan' || user?.role === 'supervisor' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center">
      {/* Kiri: Logo */}
      <h1 className="text-xl font-bold text-gray-800">SGP KPI System</h1>

      {/* Tengah: Menu Navigasi */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600 hover:text-blue-600">
          Dashboard
        </button>
        <button onClick={() => router.push('/usulan')} className="text-sm text-gray-600 hover:text-blue-600">
          Usulan
        </button>
        <button onClick={() => router.push('/riwayat')} className="text-sm text-gray-600 hover:text-blue-600">
          Riwayat KPI
        </button>

        {isAtasan && (
          <>
            <button onClick={() => router.push('/usulan-bawahan')} className="text-sm text-gray-600 hover:text-blue-600">
              Usulan Bawahan
            </button>
            <button onClick={() => router.push('/penilaian')} className="text-sm text-gray-600 hover:text-blue-600">
              Penilaian
            </button>
            <button onClick={() => router.push('/reports')} className="text-sm text-gray-600 hover:text-blue-600">
              Laporan KPI
            </button>
          </>
        )}

        {isAdmin && (
          <button onClick={() => router.push('/admin')} className="text-sm text-gray-600 hover:text-blue-600">
            Admin
          </button>
        )}
      </div>

      {/* Kanan: Notifikasi + User + Logout */}
      <div className="flex items-center gap-4">
        {/* Notifikasi */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-gray-600 hover:text-gray-800 transition"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
              <div className="flex justify-between items-center p-3 border-b">
                <span className="font-semibold text-sm">Notifikasi</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Tandai semua sudah dibaca
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="p-4 text-gray-500 text-sm">Tidak ada notifikasi.</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${!notif.is_read ? 'bg-blue-50' : ''}`}
                  >
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-gray-600">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notif.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User + Logout */}
        <span className="text-sm text-gray-600">
          {user?.name} ({user?.role})
        </span>
        <button
          onClick={onLogout}
          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}