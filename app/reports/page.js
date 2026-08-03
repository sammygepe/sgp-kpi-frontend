'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ReportsPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [user, setUser] = useState(null);

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
      if (parsed.role !== 'atasan' && parsed.role !== 'admin') {
        router.push('/dashboard');
      }
    }

    fetchReport();
  }, [period, month, year]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/staff?period=${period}&month=${month}&year=${year}`);
      setReportData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // Data untuk grafik
  const chartData = {
    labels: reportData.map(item => item.staff_name),
    datasets: [
      {
        label: 'Rata-rata Skor KPI',
        data: reportData.map(item => item.avg_score),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Ranking KPI Staf',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">📊 Laporan KPI</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/atasan')}
            className="text-blue-600 hover:text-blue-800 transition"
          >
            ← Kembali
          </button>
          <span className="text-sm text-gray-600">{user?.name} ({user?.role})</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Laporan KPI Staf</h2>

        {/* Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700">Periode</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="month">Bulanan</option>
              <option value="quarter">Kuartal</option>
              <option value="year">Tahunan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {period !== 'year' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Bulan</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="mt-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={fetchReport}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Grafik */}
        {reportData.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}

        {/* Ranking */}
        {reportData.length === 0 ? (
          <p className="text-gray-500">Belum ada data laporan.</p>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">🏆 Ranking Staf</h3>
            {reportData.map((staff, index) => (
              <div key={staff.staff_id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">{staff.staff_name}</h4>
                      <p className="text-sm text-gray-500">Atasan: {staff.supervisor}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{staff.avg_score}</p>
                  <p className="text-sm text-gray-500">{staff.total_tasks} tugas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}