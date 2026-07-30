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
      // Validasi reason jika menolak
      if (status === 'rejected' && !reason.trim()) {
        alert('Alasan penolakan wajib diisi!');
        return;
      }

      // Validasi reason jika ada perubahan bobot/deadline
      const task = tasks.find(t => t.id === taskId);
      const hasChanges = 
        (editedBobot !== task?.bobot) || 
        (editedDeadline && editedDeadline !== task?.deadline?.split('T')[0]);

      if (hasChanges && !reason.trim()) {
        alert('Alasan perubahan wajib diisi!');
        return;
      }

      setIsSubmitting(true);
      await api.put(`/tasks/${taskId}/approve`, {
        status: status,
        bobot: editedBobot,
        deadline: editedDeadline || undefined,
        reason: reason || (status === 'approved' ? 'Disetujui oleh atasan' : 'Ditolak oleh atasan')
      });
      
      // Reset modal
      setIsModalOpen(false);
      setSelectedTask(null);
      setReason('');
      setEditedBobot(3);
      setEditedDeadline('');
      fetchTasks();
    } catch (error) {
      console.error('Error approving task:', error);
      alert('Gagal memproses tugas');
    } finally {
      setIsSubmitting(false);
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

  // === FUNGSI BUKA MODAL ===
  const openModal = (task) => {
    setSelectedTask(task);
    setEditedBobot(task.bobot || 3);
    setEditedDeadline(task.deadline ? task.deadline.split('T')[0] : '');
    setReason('');
    setIsModalOpen(true);
  };

  // === FUNGSI TUTUP MODAL ===
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
                    <button
                      onClick={() => openModal(task)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                    >
                      Detail
                    </button>
                    {task.status === 'submitted' && (
                      <button
                        onClick={() => {
                          const nilai = prompt('Masukkan nilai (0-100):', '85');
                          if (nilai !== null) {
                            const reason = prompt('Alasan (opsional):', '');
                            handleNilai(task.id, parseInt(nilai), reason || '');
                          }
                        }}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition"
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

      {/* ===== MODAL DETAIL TUGAS ===== */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-bold text-gray-800">{selectedTask.judul_spesifik}</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3">
              <p><strong>Status:</strong> {selectedTask.status}</p>
              <p><strong>Deadline:</strong> {selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('id-ID') : 'N/A'}</p>
              <p><strong>Bobot:</strong> {selectedTask.bobot}</p>
              <p><strong>Jenis:</strong> {selectedTask.jenis || 'N/A'}</p>
              <p><strong>Deskripsi:</strong> {selectedTask.deskripsi || 'Tidak ada deskripsi'}</p>

              {/* Subtask */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div>
                  <strong>Subtask:</strong>
                  <ul className="list-disc pl-5 mt-1">
                    {selectedTask.subtasks.map((sub) => (
                      <li key={sub.id} className={sub.is_done ? 'line-through text-gray-400' : ''}>
                        {sub.judul}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form Edit (hanya untuk status proposed) */}
              {selectedTask.status === 'proposed' && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-2">✏️ Edit Usulan (Opsional)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bobot</label>
                      <input
                        type="number"
                        value={editedBobot}
                        onChange={(e) => setEditedBobot(parseInt(e.target.value))}
                        min="1"
                        max="10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Deadline</label>
                      <input
                        type="date"
                        value={editedDeadline}
                        onChange={(e) => setEditedDeadline(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Alasan Perubahan <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Wajib diisi jika ada perubahan atau menolak..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Aksi */}
            <div className="border-t pt-4 mt-4 flex gap-3 flex-wrap">
              {selectedTask.status === 'proposed' && (
                <>
                  <button
                    onClick={() => handleApprove(selectedTask.id, 'approved')}
                    disabled={isSubmitting}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Memproses...' : '✅ Setujui'}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedTask.id, 'rejected')}
                    disabled={isSubmitting}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Memproses...' : '❌ Tolak'}
                  </button>
                </>
              )}
              {selectedTask.status === 'submitted' && (
                <button
                  onClick={() => {
                    const nilai = prompt('Masukkan nilai (0-100):', '85');
                    if (nilai !== null) {
                      const reason = prompt('Alasan (opsional):', '');
                      handleNilai(selectedTask.id, parseInt(nilai), reason || '');
                      closeModal();
                    }
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