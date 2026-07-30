'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AtasanDashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.role !== 'atasan' && parsed.role !== 'supervisor' && parsed.role !== 'admin') {
        router.push('/dashboard');
      }
    }

    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/supervisor-queue');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId, status) => {
    try {
      await api.put(`/tasks/${taskId}/approve`, {
        status: status,
        reason: status === 'approved' ? 'Disetujui oleh atasan' : 'Ditolak oleh atasan'
      });
      fetchTasks();
    } catch (error) {
      console.error('Error approving task:', error);
    }
  };

  const handleNilai = async (taskId, nilai, reason) => {
    try {
      await api.post(`/tasks/${taskId}/nilai`, { nilai, reason });
      fetchTasks();
    } catch (error) {
      console.error('Error scoring task:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">SGP KPI System</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.name} ({user?.role})
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Atasan</h2>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Semua ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('proposed')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'proposed' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Menunggu Approval ({tasks.filter(t => t.status === 'proposed').length})
          </button>
          <button
            onClick={() => setFilter('submitted')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'submitted' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Menunggu Nilai ({tasks.filter(t => t.status === 'submitted').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm ${
              filter === 'completed' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Selesai ({tasks.filter(t => t.status === 'completed').length})
          </button>
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <p className="text-gray-500">Tidak ada tugas.</p>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task.id} className="border p-4 rounded-lg shadow-sm bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{task.judul_spesifik}</h3>
                    <p className="text-sm text-gray-600">
                      Staf: {task.assignee?.name || 'N/A'} | 
                      Status: <span className="font-medium">{task.status}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : 'N/A'}
                    </p>
                    {task.status === 'submitted' && task.nilai !== null && (
                      <p className="text-sm text-gray-600">
                        Nilai Sementara: {task.nilai}
                      </p>
                    )}
                    {task.status === 'completed' && (
                      <p className="text-sm font-semibold text-green-600">
                        Skor Akhir: {task.skor_akhir}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {task.status === 'proposed' && (
                      <>
                        <button
                          onClick={() => handleApprove(task.id, 'approved')}
                          className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleApprove(task.id, 'rejected')}
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
                        >
                          Tolak
                        </button>
                      </>
                    )}
                    {task.status === 'submitted' && (
                      <button
                        onClick={() => {
                          const nilai = prompt('Masukkan nilai (0-100):', '85');
                          if (nilai !== null) {
                            const reason = prompt('Alasan (opsional):', '');
                            handleNilai(task.id, parseInt(nilai), reason || '');
                          }
                        }}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                      >
                        Beri Nilai
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}