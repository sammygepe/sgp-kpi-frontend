'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function RiwayatPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/my-tasks');
      const all = response.data.data || [];
      setTasks(all.filter(t => t.status === 'completed'));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="p-4">Loading...</div>
      </div>
    );
  }

  const totalSkor = tasks.reduce((sum, t) => sum + (parseFloat(t.skor_akhir) || 0), 0);
  const rataRata = tasks.length > 0 ? (totalSkor / tasks.length).toFixed(2) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">🏆 Riwayat KPI</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-3xl font-bold text-blue-600">{tasks.length}</p>
            <p className="text-sm text-gray-500">Total Tugas Selesai</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-3xl font-bold text-green-600">{rataRata}</p>
            <p className="text-sm text-gray-500">Rata-rata Skor KPI</p>
          </div>
        </div>

        {tasks.length === 0 ? (
          <p className="text-gray-500">Belum ada tugas yang selesai.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="border p-4 rounded-lg shadow-sm bg-white">
                <h4 className="font-semibold text-gray-800">{task.judul_spesifik}</h4>
                <p className="text-sm text-gray-600">
                  Status: <span className="font-medium text-green-600">completed</span>
                </p>
                <p className="text-sm text-gray-600">
                  Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">
                  Bobot: {task.bobot} | Nilai: {task.nilai} | Faktor Waktu: {task.faktor_waktu}
                </p>
                <p className="text-lg font-bold text-blue-600 mt-2">
                  Skor Akhir: {task.skor_akhir}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}