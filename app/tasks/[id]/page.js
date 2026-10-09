'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id;

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await api.get(`/tasks/${taskId}`);
      setTask(response.data);
    } catch (err) {
      setError('Gagal mengambil data task');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubtask = async (subtaskId) => {
    try {
      await api.put(`/subtasks/${subtaskId}/toggle`);
      fetchTask(); // Refresh task setelah toggle
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.post(`/tasks/${taskId}/submit`);
      router.push('/usulan');
    } catch (err) {
      console.error('Error submitting task:', err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (!task) {
    return <div className="text-center p-4">Task tidak ditemukan</div>;
  }

  const allSubtasksDone = task.subtasks?.every(s => s.is_done) ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">SGP KPI System</h1>
        
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('scrollPosition', window.scrollY.toString());
            }
            // Cek apakah ada halaman sebelumnya
            if (document.referrer && document.referrer.includes(window.location.host)) {
              router.back();
            } else {
              router.push('/usulan');
            }
          }}
          className="text-gray-600 hover:text-gray-800 transition"
        >
          ← Kembali ke Menu Usulan
        </button>
      </nav>

      <div className="container mx-auto max-w-2xl p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{task.judul_spesifik}</h2>
        
        {/* Info Task */}
        <div className="bg-white p-4 rounded-lg shadow space-y-2">
          <p><strong>Status:</strong> {task.status}</p>
          {/* Alasan Reject */}
          {task.reason && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-semibold text-red-700">📌 Alasan Penolakan:</p>
              <p className="text-sm text-red-600">{task.reason}</p>
            </div>
          )}          
          <p><strong>Deadline:</strong> {new Date(task.deadline).toLocaleDateString('id-ID')}</p>
          <p><strong>Bobot:</strong> {task.bobot}</p>
          {task.jenis && <p><strong>Jenis:</strong> {task.jenis}</p>}
          {task.recurrence_type && <p><strong>Periode:</strong> {task.recurrence_type}</p>}
          {task.progress !== undefined && (
            <div>
              <strong>Progress:</strong> {task.progress}%
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${task.progress}%` }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Subtask - READ ONLY */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold text-gray-700 mb-1">📋 Subtask</p>
            <ul className="space-y-1">
              {task.subtasks.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className={`text-sm ${s.is_done ? 'text-green-600' : 'text-gray-400'}`}>
                    {s.is_done ? '✅' : '⬜'}
                  </span>
                  <span className={s.is_done ? 'line-through text-gray-400' : ''}>
                    {s.judul} ({s.porsi || 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Catatan Harian - READ ONLY */}
        <div className="mt-4">
          <p className="font-semibold text-gray-700 mb-1">📝 Catatan Harian</p>
          <div className="bg-gray-50 p-3 rounded-md border border-gray-200 min-h-[60px]">
            {task.catatan_harian ? (
              <p className="text-gray-700 whitespace-pre-wrap">{task.catatan_harian}</p>
            ) : (
              <p className="text-gray-400 italic">Belum ada catatan.</p>
            )}
          </div>
        </div>

        {/* Tombol Submit */}
        {task.status === 'approved' && allSubtasksDone && (
          <button
            onClick={handleSubmit}
            className="mt-6 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
          >
            Submit Tugas
          </button>
        )}
        {task.status === 'approved' && !allSubtasksDone && (
          <p className="mt-4 text-yellow-600 text-sm">Selesaikan semua checklist sebelum submit.</p>
        )}

        {task.status === 'rejected' && (
          <button
            onClick={() => {
              // Simpan data ke sessionStorage untuk diedit
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
                subtasks: task.subtasks?.map(s => ({ judul: s.judul })) || [],
              }));
              router.push('/tasks/propose?edit=true');
            }}
            className="mt-4 w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition font-medium"
          >
            ✏️ Edit & Ajukan Ulang
          </button>
        )}        
      </div>
    </div>
  );
}