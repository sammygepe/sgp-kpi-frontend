
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import { useSearchParams } from 'next/navigation';

export default function UsulanPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('draft');
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  // useEffect #1 — login check & fetch data (TETAP)
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

  // useEffect #2 — baca parameter tab dari URL (TAMBAHAN)
  useEffect(() => {
    if (tabParam && ['draft', 'proposed', 'rejected', 'approved'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/my-proposals');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'text-gray-500';
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

  const draftTasks = tasks.filter(t => t.status === 'draft');
  const proposedTasks = tasks.filter(t => t.status === 'proposed');
  const rejectedTasks = tasks.filter(t => t.status === 'rejected');
  const approvedTasks = tasks.filter(t => t.status === 'approved');

  const tabs = [
    { id: 'draft', label: '📝 Draft', count: draftTasks.length, data: draftTasks },
    { id: 'proposed', label: '⏳ Menunggu Persetujuan', count: proposedTasks.length, data: proposedTasks },
    { id: 'rejected', label: '❌ Ditolak', count: rejectedTasks.length, data: rejectedTasks },
    { id: 'approved', label: '✅ Disetujui', count: approvedTasks.length, data: approvedTasks },
  ];

  const activeData = tabs.find(t => t.id === activeTab)?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">📋 Menu Usulan</h2>
          <button
            onClick={() => router.push('/tasks/propose')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Buat Usulan Baru
          </button>
        </div>

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
              <div key={task.id} className="border p-4 rounded-lg shadow-sm bg-white flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{task.judul_spesifik}</h4>

                  {/* Jenis */}
                  <p className="text-sm text-gray-600">
                    {task.jenis === 'rutin' ? '🔄 Rutin' : '📌 Proyek'}
                    {task.jenis === 'rutin' && task.recurrence_type && (
                      <>
                        {' - '}
                        {task.recurrence_type === 'daily' && 'Harian'}
                        {task.recurrence_type === 'weekly' && 'Mingguan'}
                        {task.recurrence_type === 'monthly' && 'Bulanan'}
                        {task.recurrence_type === 'yearly' && 'Tahunan'}
                      </>
                    )}
                    {' | '}
                    Status: <span className={`font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                  </p>

                  {/* Deadline */}
                  <p className="text-sm text-gray-600">
                    Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : 'N/A'}
                  </p>

                  {/* Bobot */}
                  {task.bobot && (
                    <p className="text-sm text-gray-600">Bobot: {task.bobot}</p>
                  )}

                  {/* Progress Checklist (kalau ada subtask) */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress Checklist</span>
                        <span className="font-medium">{task.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {task.subtasks.filter(s => s.is_done).length}/{task.subtasks.length} checklist selesai
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {task.status === 'draft' && (
                    <button
                      onClick={() => {
                        sessionStorage.setItem('editDraftId', task.id);
                        sessionStorage.setItem('editTaskData', JSON.stringify({
                          judul_spesifik: task.judul_spesifik,
                          deskripsi: task.deskripsi,
                          jenis: task.jenis,
                          recurrence_type: task.recurrence_type,
                          recurrence_day: task.recurrence_day,
                          recurrence_month: task.recurrence_month,
                          generate_offset_days: task.generate_offset_days,
                          bobot: task.bobot,
                          deadline: task.deadline?.split('T')[0] || '',
                          subtasks: task.subtasks?.map(s => ({ judul: s.judul, porsi: s.porsi || 0 })) || [],
                        }));
                        router.push('/tasks/propose?edit=true');
                      }}
                      className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                    >
                      ✏️ Lanjutkan Draft
                    </button>
                  )}
                  {task.status === 'rejected' && (
                    <button
                      onClick={() => router.push(`/tasks/${task.id}`)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                    >
                      ✏️ Edit & Ajukan Ulang
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}