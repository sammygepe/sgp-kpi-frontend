'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function DashboardPage() {
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
    if (userData) {
      setUser(JSON.parse(userData));
    }

    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get('/my-tasks');
      setTasks(response.data.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/submit`);
      fetchTasks();
    } catch (error) {
      console.error('Error submitting task:', error);
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

  // === FUNGSI FILTER ===
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  // 1. Mendekati Deadline (hari ini + 1-3 hari ke depan)
  const approachingTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    if (task.status === 'completed' || task.status === 'proposed') return false;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() >= today.getTime() && deadline.getTime() <= threeDaysFromNow.getTime();
  });

  // 2. Terlambat (Overdue)
  const overdueTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    if (task.status === 'completed' || task.status === 'proposed') return false;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() < today.getTime();
  });

  // 3. Menunggu Persetujuan
  const proposedTasks = tasks.filter(task => task.status === 'proposed');

  // 4. Akan Datang (deadline > 3 hari ke depan)
  const futureTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    if (task.status === 'completed' || task.status === 'proposed') return false;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() > threeDaysFromNow.getTime();
  });

  // Tugas lainnya (approved, submitted, on_progress) yang tidak masuk kategori
  const otherTasks = tasks.filter(task => {
    if (task.status === 'proposed' || task.status === 'completed') return false;
    if (!task.deadline) return true;
    const deadline = new Date(task.deadline);
    deadline.setHours(0, 0, 0, 0);
    const isApproaching = deadline.getTime() >= today.getTime() && deadline.getTime() <= threeDaysFromNow.getTime();
    const isOverdue = deadline.getTime() < today.getTime();
    const isFuture = deadline.getTime() > threeDaysFromNow.getTime();
    return !isApproaching && !isOverdue && !isFuture;
  });

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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
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

        {/* === SECTION 1: MENDekati DEADLINE === */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            📋 Mendekati Deadline
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded-full">{approachingTasks.length}</span>
          </h3>
          {approachingTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">Tidak ada tugas yang mendekati deadline.</p>
          ) : (
            <div className="space-y-3">
              {approachingTasks.map((task) => (
                <TaskCard key={task.id} task={task} onDetail={() => router.push(`/tasks/${task.id}`)} onSubmit={handleSubmit} />
              ))}
            </div>
          )}
        </div>

        {/* === SECTION 2: TERLAMBAT (OVERDUE) === */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            ⚠️ Terlambat (Overdue)
            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">{overdueTasks.length}</span>
          </h3>
          {overdueTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">Tidak ada tugas yang terlambat.</p>
          ) : (
            <div className="space-y-3">
              {overdueTasks.map((task) => (
                <TaskCard key={task.id} task={task} onDetail={() => router.push(`/tasks/${task.id}`)} onSubmit={handleSubmit} />
              ))}
            </div>
          )}
        </div>

        {/* === SECTION 3: MENUNGGU PERSETUJUAN === */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            ⏳ Menunggu Persetujuan
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{proposedTasks.length}</span>
          </h3>
          {proposedTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">Tidak ada usulan menunggu persetujuan.</p>
          ) : (
            <div className="space-y-3">
              {proposedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onDetail={() => router.push(`/tasks/${task.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* === SECTION 4: AKAN DATANG === */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            📅 Akan Datang
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{futureTasks.length}</span>
          </h3>
          {futureTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">Tidak ada tugas yang akan datang.</p>
          ) : (
            <div className="space-y-3">
              {futureTasks.map((task) => (
                <TaskCard key={task.id} task={task} onDetail={() => router.push(`/tasks/${task.id}`)} onSubmit={handleSubmit} />
              ))}
            </div>
          )}
        </div>

        {/* === SECTION 5: TUGAS LAINNYA === */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
            📂 Tugas Lainnya
            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">{otherTasks.length}</span>
          </h3>
          {otherTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">Tidak ada tugas lain.</p>
          ) : (
            <div className="space-y-3">
              {otherTasks.map((task) => (
                <TaskCard key={task.id} task={task} onDetail={() => router.push(`/tasks/${task.id}`)} onSubmit={handleSubmit} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === KOMPONEN TASK CARD ===
function TaskCard({ task, onDetail, onSubmit }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'proposed': return 'text-yellow-600';
      case 'approved': return 'text-blue-600';
      case 'submitted': return 'text-purple-600';
      case 'completed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="border p-4 rounded-lg shadow-sm bg-white">
      <div className="flex justify-between items-start">
        <div className="flex-1 cursor-pointer" onClick={onDetail}>
          <h4 className="font-semibold text-gray-800 hover:text-blue-600 transition">{task.judul_spesifik}</h4>
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
            onClick={onDetail}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
          >
            Detail
          </button>
          {task.status === 'approved' && (
            <button
              onClick={() => onSubmit(task.id)}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition text-sm"
            >
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}