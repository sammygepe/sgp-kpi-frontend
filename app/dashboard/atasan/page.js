'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function AtasanDashboard() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  
  // === STATE MODAL ===
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editedBobot, setEditedBobot] = useState(3);
  const [editedDeadline, setEditedDeadline] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (status === 'rejected' && !reason.trim()) {
        alert('Alasan penolakan wajib diisi!');
        return;
      }

      const task = tasks.find(t => t.id === taskId);
      const hasChanges = 
        (editedBobot !== task?.bobot) || 
        (editedDeadline && editedDeadline !== task?.deadline?.split('T')[0]);

      if (hasChanges && !reason.trim()) {
        alert('Alasan perubahan wajib diisi!');
        return;
      }

      setIsSubmitting(true);
      const response = await api.put(`/tasks/${taskId}/approve`, {
        status: status,
        bobot: editedBobot,
        deadline: editedDeadline || undefined,
        reason: reason || (status === 'approved' ? 'Disetujui oleh atasan' : 'Ditolak oleh atasan')
      });
      
      // === UPDATE LOCAL STATE ===
      updateLocalTask({
        status: status,
        bobot: editedBobot,
        deadline: editedDeadline || task?.deadline,
      });
      
      // Refresh data dari backend untuk dapatkan log terbaru
      const refreshedTask = await api.get(`/tasks/${taskId}`);
      updateLocalTask(refreshedTask.data);
      
      // Tutup modal setelah berhasil
      setTimeout(() => {
        setIsModalOpen(false);
        setSelectedTask(null);
        setReason('');
        setEditedBobot(3);
        setEditedDeadline('');
        fetchTasks();
      }, 500);
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Gagal memproses tugas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNilai = async (taskId, nilai, reason) => {
    try {
      const response = await api.post(`/tasks/${taskId}/nilai`, { nilai, reason });
      
      // === UPDATE LOCAL STATE ===
      updateLocalTask({
        status: 'completed',
        nilai: nilai,
        skor_akhir: response.data.data.skor_akhir,
        faktor_waktu: response.data.data.faktor_waktu,
      });
      
      // Refresh data dari backend untuk dapatkan log terbaru
      const refreshedTask = await api.get(`/tasks/${taskId}`);
      updateLocalTask(refreshedTask.data);
      
      fetchTasks();
    } catch (error) {
      console.error('Error scoring task:', error);
      alert('Gagal memberi nilai.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const openModal = (task) => {
    setSelectedTask(task);
    setEditedBobot(task.bobot || 3);
    setEditedDeadline(task.deadline ? task.deadline.split('T')[0] : '');
    setReason('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setReason('');
    setEditedBobot(3);
    setEditedDeadline('');
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

  // === UPDATE LOCAL TASK (untuk modal) ===
  const updateLocalTask = (updatedData) => {
    setSelectedTask(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar user={user} onLogout={handleLogout} />

      <div className="container mx-auto p-4">
        {/* ===== HEADER DENGAN TOMBOL LAPORAN ===== */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <h2 className="text-2xl font-bold text-gray-800">Dashboard Atasan</h2>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/reports')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
            >
              📊 Laporan KPI
            </button>
          </div>
        </div>

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
                    <p className="text-xs text-gray-500">
                      {task.jenis === 'rutin' ? '🔄 Rutin' : '📌 Proyek'}
                    </p>
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
                    <button
                      onClick={() => openModal(task)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                    >
                      Detail
                    </button>

                      {selectedTask && selectedTask.status === 'submitted' && (
                        <button
                          onClick={async () => {
                            const nilaiInput = prompt('Masukkan nilai (0-100):', '100');
                            if (nilaiInput === null) return;
                            
                            const nilai = parseInt(nilaiInput);
                            if (isNaN(nilai) || nilai < 0 || nilai > 100) {
                              alert('Nilai harus antara 0-100.');
                              return;
                            }
                            
                            let reason = '';
                            if (nilai < 100) {
                              reason = prompt('Alasan penurunan nilai (wajib):', '');
                              if (reason === null) return;
                              if (reason.trim() === '') {
                                alert('Alasan wajib diisi jika nilai di bawah 100.');
                                return;
                              }
                            }
                            
                            await handleNilai(selectedTask.id, nilai, reason || 'Nilai default 100');
                            
                            // === UPDATE LOCAL STATE ===
                            updateLocalTask({
                              status: 'completed',
                              nilai: nilai,
                            });
                            
                            // Refresh data dari backend
                            const refreshedTask = await api.get(`/tasks/${selectedTask.id}`);
                            updateLocalTask(refreshedTask.data);
                            
                            // Tutup modal setelah 1 detik
                            setTimeout(() => {
                              closeModal();
                            }, 1000);
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          ⭐ Beri Nilai
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
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-2xl" disabled={isSubmitting}>
                ✕
              </button>
            </div>

            {/* Body - dengan guard */}
            {selectedTask && (
              <div className="space-y-3">
                {/* ===== INFO TUGAS (2 KOLOM) ===== */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <p><strong>Staf:</strong> {selectedTask.assignee?.name || 'N/A'}</p>
                  <p><strong>Jenis:</strong> {selectedTask.jenis === 'rutin' ? '🔄 Rutin' : '📌 Proyek'}</p>
                  <p><strong>Status:</strong> {selectedTask.status}</p>
                  <p><strong>Deadline:</strong> {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('id-ID') : 'N/A'}</p>
                  <p><strong>Bobot:</strong> {selectedTask.bobot}</p>
                  <p><strong>Deskripsi:</strong> {selectedTask.deskripsi || 'Tidak ada deskripsi'}</p>
                </div>

                {/* ===== SUBTASK LIST ===== */}
                {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-semibold text-gray-700 mb-1">📋 Subtask</h4>
                    <ul className="space-y-1">
                      {selectedTask.subtasks.map((subtask) => (
                        <li key={subtask.id} className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${subtask.is_done ? 'text-green-600' : 'text-red-500'}`}>
                              {subtask.is_done ? '✅' : '⬜'}
                            </span>
                            <span className={subtask.is_done ? 'line-through text-gray-400' : ''}>
                              {subtask.judul}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">{subtask.porsi || 0}%</span>
                        </li>
                      ))}
                    </ul>
                    {/* Progress */}
                    {selectedTask.subtasks.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Progress: {selectedTask.progress || 0}% (Berdasarkan porsi)
                      </p>
                    )}
                  </div>
                )}

                {/* Catatan Harian */}
                {(selectedTask.status === 'submitted' || selectedTask.status === 'completed') && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <h4 className="font-semibold text-blue-700 mb-1">📝 Catatan Harian (Staf)</h4>
                    {selectedTask.catatan_harian ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.catatan_harian}</p>
                    ) : (
                      <p className="text-gray-400 italic">Staf belum mengisi catatan harian.</p>
                    )}
                  </div>
                )}

                {/* Riwayat Aktivitas */}
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
                              {' '}
                              {log.description}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">Belum ada aktivitas.</p>
                    )}
                  </div>
                </div>

                {/* Skor Akhir */}
                {selectedTask.status === 'completed' && (
                  <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                    <h4 className="font-semibold text-green-700 mb-1">🏆 Skor Akhir</h4>
                    <p className="text-2xl font-bold text-green-600">{selectedTask.skor_akhir}</p>
                    <p className="text-sm text-gray-500">
                      Bobot: {selectedTask.bobot} × Nilai: {selectedTask.nilai} × Faktor Waktu: {selectedTask.faktor_waktu}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Aksi - dengan guard */}
            <div className="border-t pt-4 mt-4 flex gap-3 flex-wrap">
              {selectedTask && selectedTask.status === 'proposed' && (
                <>
                  <button
                    onClick={() => handleApprove(selectedTask.id, 'approved')}
                    disabled={isSubmitting}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Memproses...' : '✅ Setujui'}
                  </button>
                  
                  <button
                    onClick={async () => {
                      // 1. Minta alasan penolakan
                      const reasonInput = prompt('Alasan penolakan (wajib):', '');
                      if (reasonInput === null) return; // Batal
                      if (reasonInput.trim() === '') {
                        alert('Alasan penolakan wajib diisi!');
                        return;
                      }
                      
                      // 2. Set reason ke state
                      setReason(reasonInput);
                      
                      // 3. Proses penolakan
                      await handleApprove(selectedTask.id, 'rejected');
                    }}
                    disabled={isSubmitting}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Memproses...' : '❌ Tolak'}
                  </button>
                </>
              )}
              
              {selectedTask && selectedTask.status === 'submitted' && (
                <button
                  onClick={async () => {
                    const nilaiInput = prompt('Masukkan nilai (0-100):', '100');
                    if (nilaiInput === null) return;
                    
                    const nilai = parseInt(nilaiInput);
                    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
                      alert('Nilai harus antara 0-100.');
                      return;
                    }
                    
                    let reason = '';
                    if (nilai < 100) {
                      reason = prompt('Alasan penurunan nilai (wajib):', '');
                      if (reason === null) return;
                      if (reason.trim() === '') {
                        alert('Alasan wajib diisi jika nilai di bawah 100.');
                        return;
                      }
                    }
                    
                    await handleNilai(selectedTask.id, nilai, reason || 'Nilai default 100');
                    closeModal();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  ⭐ Beri Nilai
                </button>
              )}
              
              <button
                onClick={closeModal}
                disabled={isSubmitting}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 disabled:opacity-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}