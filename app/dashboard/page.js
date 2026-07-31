'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('approaching');
  
  // === STATE MODAL ===
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // === FUNGSI FETCH TASKS ===
  const fetchTasks = async () => {
    try {
      const response = await api.get('/my-tasks');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // === HANDLE SUBMIT ===
  const handleSubmit = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/submit`);
      fetchTasks();
      closeModal();
    } catch (error) {
      console.error('Error submitting task:', error);
    }
  };

  // === HANDLE LOGOUT ===
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // === FUNGSI BUKA MODAL ===
  const openModal = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // === FUNGSI TUTUP MODAL ===
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  // === FUNGSI FILTER TUGAS ===
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  const approachingTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    if (task.status === 'completed' || task.status === 'proposed') return false;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() >= today.getTime() && deadline.getTime() <= threeDaysFromNow.getTime();
  });

  const overdueTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    if (task.status === 'completed' || task.status === 'proposed') return false;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() < today.getTime();
  });

  const proposedTasks = tasks.filter(task => task.status === 'proposed');

  const submittedTasks = tasks.filter(task => task.status === 'submitted');

  const futureTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    if (task.status === 'completed' || task.status === 'proposed' || task.status === 'submitted') return false;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() > threeDaysFromNow.getTime();
  });

  const otherTasks = tasks.filter(task => {
    if (task.status === 'proposed' || task.status === 'completed' || task.status === 'submitted') return false;
    if (!task.deadline) return true;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    const isApproaching = deadline.getTime() >= today.getTime() && deadline.getTime() <= threeDaysFromNow.getTime();
    const isOverdue = deadline.getTime() < today.getTime();
    const isFuture = deadline.getTime() > threeDaysFromNow.getTime();
    return !isApproaching && !isOverdue && !isFuture;
  });

  // === DATA UNTUK TAB ===
  const tabs = [
    { id: 'approaching', label: '📋 Mendekati Deadline', count: approachingTasks.length, data: approachingTasks },
    { id: 'overdue', label: '⚠️ Terlambat', count: overdueTasks.length, data: overdueTasks },
    { id: 'proposed', label: '⏳ Menunggu Persetujuan', count: proposedTasks.length, data: proposedTasks },
    { id: 'submitted', label: '⏳ Menunggu Penilaian', count: submittedTasks.length, data: submittedTasks },
    { id: 'future', label: '📅 Akan Datang', count: futureTasks.length, data: futureTasks },
    { id: 'other', label: '📂 Lainnya', count: otherTasks.length, data: otherTasks },
  ];

  // === USEFFECT (FETCH DATA & RESTORE TAB/SCROLL) ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchTasks();

    // === RESTORE TAB & SCROLL POSITION ===
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('activeTab');
      if (savedTab && tabs.some(tab => tab.id === savedTab)) {
        setActiveTab(savedTab);
        sessionStorage.removeItem('activeTab');
      }

      const savedScroll = sessionStorage.getItem('scrollPosition');
      if (savedScroll) {
        const scrollY = parseInt(savedScroll);
        sessionStorage.removeItem('scrollPosition');
        
        const doScroll = () => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        };

        doScroll();
        [100, 300, 500, 1000].forEach(delay => {
          setTimeout(doScroll, delay);
        });
        requestAnimationFrame(() => {
          setTimeout(doScroll, 50);
        });
      }
    }
  }, []);

  // === LOADING ===
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // === GET STATUS COLOR ===
  const getStatusColor = (status) => {
    switch (status) {
      case 'proposed': return 'text-yellow-600';
      case 'approved': return 'text-blue-600';
      case 'submitted': return 'text-purple-600';
      case 'completed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const activeData = tabs.find(tab => tab.id === activeTab)?.data || [];

  // === RENDER ===
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">SGP KPI System</h1>
        <Navbar user={user} onLogout={handleLogout} />
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
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard Staf</h2>
          <button
            onClick={() => router.push('/tasks/propose')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + Ajukan Tugas
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          Selamat datang, {user?.name || 'User'}!
        </p>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 flex-wrap border-b border-gray-200 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Task List */}
        {activeData.length === 0 ? (
          <p className="text-gray-500 text-sm">Tidak ada tugas di kategori ini.</p>
        ) : (
          <div className="space-y-3">
            {activeData.map((task) => (
              <div key={task.id} className="border p-4 rounded-lg shadow-sm bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{task.judul_spesifik}</h4>
                    <p className="text-xs text-gray-500">
                      {task.jenis === 'rutin' ? '🔄 Rutin' : '📌 Proyek'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: <span className={`font-medium ${getStatusColor(task.status)}`}>{task.status}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : 'N/A'}
                    </p>
                    {task.bobot && <p className="text-sm text-gray-600">Bobot: {task.bobot}</p>}
                  </div>
                  <div className="flex gap-2 flex-wrap ml-4">
                    <button
                      onClick={() => openModal(task)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                    >
                      Detail
                    </button>
                    {task.status === 'approved' && (
                      <button
                        onClick={() => handleSubmit(task.id)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition text-sm"
                      >
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== MODAL DETAIL TUGAS ===== */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-bold text-gray-800">{selectedTask.judul_spesifik}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3">
              <p><strong>Jenis:</strong> {selectedTask.jenis === 'rutin' ? '🔄 Rutin' : '📌 Proyek'}</p>
              <p><strong>Status:</strong> {selectedTask.status}</p>
              <p><strong>Deadline:</strong> {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('id-ID') : 'N/A'}</p>
              <p><strong>Bobot:</strong> {selectedTask.bobot}</p>
              <p><strong>Periode:</strong> {selectedTask.recurrence_type || 'N/A'}</p>
              <p><strong>Deskripsi:</strong> {selectedTask.deskripsi || 'Tidak ada deskripsi'}</p>

              {/* CATATAN HARIAN */}
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-1">
                  📝 Catatan Harian
                  {(!selectedTask.subtasks || selectedTask.subtasks.length === 0) && (
                    <span className="text-red-500 text-sm ml-1">* Wajib</span>
                  )}
                </h4>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Tulis catatan hasil kerja hari ini..."
                  value={selectedTask.catatan_harian || ''}
                  onChange={async (e) => {
                    const value = e.target.value;
                    setSelectedTask(prev => ({ ...prev, catatan_harian: value }));
                    try {
                      await api.put(`/tasks/${selectedTask.id}`, { catatan_harian: value });
                    } catch (err) {
                      console.error('Error saving catatan:', err);
                    }
                  }}
                  disabled={selectedTask.status === 'submitted' || selectedTask.status === 'completed'}
                />
                <p className="text-xs text-gray-500 mt-1">💡 Catatan akan tersimpan otomatis.</p>
              </div>

              {/* SUBTASK CHECKLIST */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-1">✅ Checklist <span className="text-red-500 text-sm">* Wajib</span></h4>
                  <ul className="space-y-1">
                    {selectedTask.subtasks.map((subtask) => (
                      <li key={subtask.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={subtask.is_done}
                          onChange={async () => {
                            try {
                              await api.put(`/subtasks/${subtask.id}/toggle`);
                              const updatedSubtasks = selectedTask.subtasks.map(s =>
                                s.id === subtask.id ? { ...s, is_done: !s.is_done } : s
                              );
                              setSelectedTask(prev => ({
                                ...prev,
                                subtasks: updatedSubtasks,
                                progress: Math.round((updatedSubtasks.filter(s => s.is_done).length / updatedSubtasks.length) * 100)
                              }));
                            } catch (err) {
                              console.error('Error toggling subtask:', err);
                            }
                          }}
                          className="w-4 h-4 text-blue-600"
                          disabled={selectedTask.status === 'submitted' || selectedTask.status === 'completed'}
                        />
                        <span className={subtask.is_done ? 'line-through text-gray-400' : ''}>
                          {subtask.judul}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {selectedTask.subtasks.length > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${selectedTask.progress || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Progress: {selectedTask.progress || 0}%</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SUBMIT CONDITION */}
            {(() => {
              const totalSubtasks = selectedTask.subtasks?.length || 0;
              const doneSubtasks = selectedTask.subtasks?.filter(s => s.is_done).length || 0;
              const allSubtasksDone = totalSubtasks === 0 || doneSubtasks === totalSubtasks;
              const hasSubtask = totalSubtasks > 0;
              const noteFilled = selectedTask.catatan_harian && selectedTask.catatan_harian.trim().length > 0;
              const canSubmit = hasSubtask ? allSubtasksDone : allSubtasksDone && noteFilled;

              return (
                <div className="border-t pt-4 mt-4 flex gap-3 flex-wrap items-center">
                  {selectedTask.status === 'approved' && (
                    <>
                      <button
                        onClick={() => handleSubmit(selectedTask.id)}
                        disabled={!canSubmit}
                        className={`px-4 py-2 rounded transition ${
                          canSubmit
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        📤 Submit Tugas
                      </button>
                      {!canSubmit && (
                        <p className="text-sm text-red-500">
                          ⚠️ {!hasSubtask && !noteFilled
                            ? 'Catatan harian wajib diisi.'
                            : !allSubtasksDone
                              ? 'Selesaikan semua checklist.'
                              : ''}
                        </p>
                      )}
                    </>
                  )}
                  <button onClick={closeModal} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                    Tutup
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}