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
  const [activeTab, setActiveTab] = useState('in_progress');

  // === STATE MODAL ===
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [catatanDraft, setCatatanDraft] = useState('');
  const [subtasksDraft, setSubtasksDraft] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

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
      
      // === UPDATE LOCAL STATE ===
      updateLocalTask({ 
        status: 'submitted',
        tanggal_submit: new Date().toISOString().split('T')[0],
        submitted_at: new Date().toISOString()
      });
      
      // Fetch ulang untuk dapatkan data terbaru
      const response = await api.get(`/tasks/${taskId}`);
      updateLocalTask(response.data);
      
      // Tutup modal setelah berhasil
      setTimeout(() => {
        closeModal();
        fetchTasks();
      }, 1000);
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
    setCatatanDraft(task.catatan_harian || '');
    setSubtasksDraft(task.subtasks?.map(s => ({ id: s.id, is_done: s.is_done })) || []);
    setIsModalOpen(true);
  };

  // === FUNGSI TUTUP MODAL ===
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setCatatanDraft('');
    setSubtasksDraft([]);
  };

  // === FUNGSI FILTER TUGAS ===
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Perlu Dikerjakan = semua tugas 'approved' (belum submit)
  const inProgressTasks = tasks
    .filter(t => t.status === 'approved')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  // 2. Terlambat = dari 'approved', yang deadline-nya sudah lewat
  const overdueTasks = tasks
    .filter(t => {
      if (t.status !== 'approved') return false;
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime();
    })
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  // 3. Menunggu Penilaian = tugas 'submitted'
  const submittedTasks = tasks.filter(t => t.status === 'submitted');

  // === DATA UNTUK TAB ===
  const tabs = [
    { id: 'in_progress', label: '🔥 Perlu Dikerjakan', count: inProgressTasks.length, data: inProgressTasks },
    { id: 'overdue', label: '⚠️ Terlambat', count: overdueTasks.length, data: overdueTasks },
    { id: 'submitted', label: '⏳ Menunggu Penilaian', count: submittedTasks.length, data: submittedTasks },
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
      case 'draft': return 'text-gray-500';
      case 'proposed': return 'text-yellow-600';
      case 'approved': return 'text-blue-600';
      case 'submitted': return 'text-purple-600';
      case 'completed': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const activeData = tabs.find(tab => tab.id === activeTab)?.data || [];

    // === UPDATE LOCAL TASK (untuk modal) ===
  const updateLocalTask = (updatedData) => {
    setSelectedTask(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  // === RENDER ===
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
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

                    {/* Jenis Tugas */}
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
                    <p className={`text-sm ${
                      task.deadline && new Date(task.deadline) < today && task.status === 'approved'
                        ? 'text-red-600 font-semibold'
                        : 'text-gray-600'
                    }`}>
                      Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : 'N/A'}
                    </p>

                    {/* Bobot */}
                    {task.bobot && <p className="text-sm text-gray-600">Bobot: {task.bobot}</p>}

                    {/* Progress (kalau ada subtask) */}
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
                  <div className="flex gap-2 flex-wrap ml-4">
                    {task.status === 'draft' && (
                      <button
                        onClick={() => {
                          console.log('🔍 Menyimpan draft ID:', task.id); // <-- DEBUG
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
                            subtasks: task.subtasks?.map(s => ({ 
                              judul: s.judul, 
                              porsi: s.porsi || 0 
                            })) || [],
                          }));
                          router.push('/tasks/propose?edit=true');
                        }}
                        className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600 transition"
                      >
                        ✏️ Lanjutkan Draft
                      </button>
                    )}

                    {task.status === 'rejected' && (
                      <button
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 transition"
                      >
                        ✏️ Edit & Ajukan Ulang
                      </button>
                    )}

                    {task.status !== 'draft' && task.status !== 'rejected' && (
                      <button
                        onClick={() => openModal(task)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                      >
                        Detail
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
              {/* ===== INFO TUGAS (2 KOLOM) ===== */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <p><strong>Jenis:</strong> {selectedTask.jenis === 'rutin' ? '🔄 Rutin' : '📌 Proyek'}</p>
                <p><strong>Status:</strong> {selectedTask.status}</p>
                <p><strong>Deadline:</strong> {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('id-ID') : 'N/A'}</p>
                <p><strong>Bobot:</strong> {selectedTask.bobot}</p>
                <p><strong>Periode:</strong> {selectedTask.recurrence_type || 'N/A'}</p>
                <p><strong>Deskripsi:</strong> {selectedTask.deskripsi || 'Tidak ada deskripsi'}</p>
              </div>
              
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
                  rows="3"
                  placeholder="Tulis catatan hasil kerja hari ini..."
                  value={catatanDraft}
                  onChange={(e) => setCatatanDraft(e.target.value)}
                  disabled={selectedTask.status === 'submitted' || selectedTask.status === 'completed'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Perubahan akan tersimpan setelah klik "Simpan Perubahan".
                </p>
              </div>

              {/* ===== SUBTASK CHECKLIST ===== */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">✅ Checklist</h4>
                  <ul className="space-y-1">
                    {[...selectedTask.subtasks]
                    .sort((a, b) => a.id - b.id)
                    .map((subtask) => {
                      const draft = subtasksDraft.find(s => s.id === subtask.id);
                      const isDone = draft ? draft.is_done : subtask.is_done;

                      return (
                        <li key={subtask.id} className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={(e) => {
                                const newValue = e.target.checked;
                                setSubtasksDraft(prev => {
                                  const existing = prev.find(s => s.id === subtask.id);
                                  if (existing) {
                                    return prev.map(s => s.id === subtask.id ? { ...s, is_done: newValue } : s);
                                  }
                                  return [...prev, { id: subtask.id, is_done: newValue }];
                                });
                              }}
                              className="w-4 h-4 text-blue-600"
                              disabled={selectedTask.status === 'submitted' || selectedTask.status === 'completed'}
                            />
                            <span className={isDone ? 'line-through text-gray-400' : ''}>
                              {subtask.judul}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{subtask.porsi || 0}%</span>
                        </li>
                      );
                    })}
                  </ul>
                  {/* Progress Bar */}
                  {selectedTask.subtasks.length > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${selectedTask.progress || 0}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Progress: {selectedTask.progress || 0}% 
                        (Berdasarkan porsi)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* === RIWAYAT AKTIVITAS === */}
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">📜 Riwayat Aktivitas</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded-md">
                  {selectedTask.progress_logs && selectedTask.progress_logs.length > 0 ? (
                    selectedTask.progress_logs.map((log) => (
                      <div key={log.id} className="text-xs border-b border-gray-200 py-1 last:border-0">
                        <div className="flex justify-between">
                          <span className="text-gray-400">
                            {new Date(log.created_at).toLocaleString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="text-blue-600">{log.progress !== undefined && `${log.progress}%`}</span>
                        </div>
                        <div className="mt-0.5">
                          <span className="font-medium">
                            {log.activity_type === 'note' && '📝'}
                            {log.activity_type === 'subtask' && '✅'}
                            {log.activity_type === 'submit' && '📤'}
                            {log.activity_type === 'approve' && '✅'}
                            {log.activity_type === 'score' && '⭐'}
                          </span>
                          <div className="whitespace-pre-wrap text-gray-700 mt-0.5 text-xs">
                            {log.description}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic">Belum ada aktivitas.</p>
                  )}
                </div>
              </div>
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
                      {/* Tombol Simpan Perubahan */}
                      <button
                        onClick={async () => {
                          try {
                            setIsSaving(true);
                            await api.put(`/tasks/${selectedTask.id}/update-progress`, {
                              catatan_harian: catatanDraft,
                              subtasks: subtasksDraft,
                            });
                            const response = await api.get(`/tasks/${selectedTask.id}`);
                            setSelectedTask(response.data);
                            setCatatanDraft(response.data.catatan_harian || '');
                            setSubtasksDraft(response.data.subtasks?.map(s => ({ id: s.id, is_done: s.is_done })) || []);
                            await fetchTasks();
                            alert('Perubahan berhasil disimpan.');
                          } catch (err) {
                            console.error('Error saving progress:', err);
                            alert('Gagal menyimpan perubahan.');
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? 'Menyimpan...' : '💾 Simpan Perubahan'}
                      </button>

                      {/* Tombol Submit */}
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
                    </>
                  )}
                  <button
                    onClick={closeModal}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
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