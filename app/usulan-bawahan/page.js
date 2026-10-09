'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function UsulanBawahanPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('proposed');

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
      const response = await api.get('/subordinate-proposals');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subordinate proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId, status, reason = '') => {
    try {
      await api.put(`/tasks/${taskId}/approve`, { status, reason });
      fetchTasks();
    } catch (error) {
      console.error('Error approving:', error);
      alert('Gagal memproses usulan');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'proposed': return 'text-yellow-600';
      case 'approved': return 'text-blue-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="p-4">Loading...</div>
      </div>
    );
  }

  const proposedTasks = tasks.filter(t => t.status === 'proposed');
  const approvedTasks = tasks.filter(t => t.status === 'approved');
  const rejectedTasks = tasks.filter(t => t.status === 'rejected');

  const tabs = [
    { id: 'proposed', label: '⏳ Menunggu Persetujuan', count: proposedTasks.length, data: proposedTasks },
    { id: 'approved', label: '✅ Disetujui', count: approvedTasks.length, data: approvedTasks },
    { id: 'rejected', label: '❌ Ditolak', count: rejectedTasks.length, data: rejectedTasks },
  ];

  const activeData = tabs.find(t => t.id === activeTab)?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">📥 Usulan Bawahan</h2>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {activeData.length === 0 ? (
          <p className="text-gray-500">Tidak ada usulan di kategori ini.</p>
        ) : (
          <div className="space-y-3">
            {activeData.map(task => (
              <div key={task.id} className="border p-4 rounded-lg shadow-sm bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{task.judul_spesifik}</h4>
                    <p className="text-sm text-gray-600">
                      Staf: {task.assignee?.name || 'N/A'} | 
                      Status: <span className={`font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : 'N/A'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {task.status === 'proposed' && (
                      <>
                        <button
                          onClick={() => handleApprove(task.id, 'approved', 'Disetujui oleh atasan')}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          ✅ Setujui
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Alasan penolakan (wajib):', '');
                            if (reason === null) return;
                            if (reason.trim() === '') {
                              alert('Alasan wajib diisi!');
                              return;
                            }
                            handleApprove(task.id, 'rejected', reason);
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          ❌ Tolak
                        </button>
                      </>
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