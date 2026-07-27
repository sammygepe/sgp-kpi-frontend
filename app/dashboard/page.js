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
      fetchTasks(); // Refresh daftar tugas setelah submit
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

        <h3 className="text-xl font-semibold text-gray-700 mb-3">Tugas Anda</h3>
        {tasks.length === 0 ? (
          <p className="text-gray-500">Belum ada tugas.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="border p-4 rounded-lg shadow-sm bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-800">{task.judul_spesifik}</h4>
                    <p className="text-sm text-gray-600">
                      Status: <span className="font-medium">{task.status}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Deadline: {new Date(task.deadline).toLocaleDateString('id-ID')}
                    </p>
                    {task.bobot && (
                      <p className="text-sm text-gray-600">
                        Bobot: {task.bobot}
                      </p>
                    )}
                  </div>
                  {task.status === 'approved' && (
                    <button
                      onClick={() => handleSubmit(task.id)}
                      className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 transition text-sm"
                    >
                      Submit
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