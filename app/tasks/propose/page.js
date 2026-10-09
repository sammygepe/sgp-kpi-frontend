'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ProposeTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    judul_spesifik: '',
    deskripsi: '',
    jenis: 'rutin',
    recurrence_type: 'daily',
    recurrence_day: '',
    recurrence_month: '',
    generate_offset_days: 0,
    bobot: 3,
    deadline: '',
    subtasks: [{ judul: '', porsi: 0 }],
  });

  // =====================================================
  // === TARUH KODE useEffect DI SINI (SETELAH STATE) ===
  // =====================================================
  useEffect(() => {
    const editData = sessionStorage.getItem('editTaskData');
    if (editData) {
      try {
        const data = JSON.parse(editData);
        setForm({
          judul_spesifik: data.judul_spesifik || '',
          deskripsi: data.deskripsi || '',
          jenis: data.jenis || 'rutin',
          recurrence_type: data.recurrence_type || 'daily',
          recurrence_day: data.recurrence_day || '',
          recurrence_month: data.recurrence_month || '',
          generate_offset_days: data.generate_offset_days || 0,
          bobot: data.bobot || 3,
          deadline: data.deadline || '',
          subtasks: data.subtasks?.length > 0 ? data.subtasks : [{ judul: '', porsi: 0 }],
        });
        // JANGAN HAPUS editDraftId DI SINI!
        // sessionStorage.removeItem('editTaskData'); // <-- HAPUS INI DULU
      } catch (e) {
        console.error('Error loading edit data:', e);
      }
    }
  }, []);

  // === HITUNG SISA PORSI ===
  const getRemainingPorsi = () => {
      const totalPorsi = form.subtasks.reduce((sum, s) => sum + (s.porsi || 0), 0);
      const remaining = 100 - totalPorsi;
      return remaining > 0 ? remaining : 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubtaskChange = (index, field, value) => {
      const newSubtasks = [...form.subtasks];
      newSubtasks[index][field] = value;
      setForm((prev) => ({ ...prev, subtasks: newSubtasks }));
  };

  const addSubtask = () => {
      const remaining = getRemainingPorsi();
      setForm((prev) => ({
          ...prev,
          subtasks: [...prev.subtasks, { judul: '', porsi: remaining }],
      }));
  };

  const removeSubtask = (index) => {
    if (form.subtasks.length <= 1) return;
    const newSubtasks = form.subtasks.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, subtasks: newSubtasks }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Filter subtasks yang kosong
    const filteredSubtasks = form.subtasks.filter((s) => s.judul.trim() !== '');

    // === VALIDASI SUBTASK WAJIB ===
    const isProyek = form.jenis === 'proyek';
    const isRutin = form.jenis === 'rutin';
    const isRutinMingguan = isRutin && form.recurrence_type === 'weekly';
    const isRutinBulanan = isRutin && form.recurrence_type === 'monthly';
    const isRutinTahunan = isRutin && form.recurrence_type === 'yearly';

    const isSubtaskRequired = isProyek || isRutinMingguan || isRutinBulanan || isRutinTahunan;

    if (isSubtaskRequired && filteredSubtasks.length === 0) {
        setError('Subtask wajib diisi untuk tugas ini!');
        setLoading(false);
        return;
    }

    // === VALIDASI TOTAL PORSI & SETIAP SUBTASK > 0 ===
    if (filteredSubtasks.length > 0) {
        // 1. Cek setiap subtask memiliki porsi > 0
        for (const s of filteredSubtasks) {
            if (!s.porsi || s.porsi <= 0) {
                setError(`Subtask '${s.judul}' harus memiliki porsi lebih dari 0!`);
                setLoading(false);
                return;
            }
        }
        
        // 2. Cek total porsi
        const totalPorsi = filteredSubtasks.reduce((sum, s) => sum + (s.porsi || 0), 0);
        if (totalPorsi !== 100) {
            setError(`Total porsi subtask harus 100% (saat ini: ${totalPorsi}%)`);
            setLoading(false);
            return;
        }
    }

    try {
        await api.post('/tasks/propose', {
            ...form,
            subtasks: filteredSubtasks,
        });
        
        setSuccess(true);
        setForm({
            judul_spesifik: '',
            deskripsi: '',
            jenis: 'rutin',
            recurrence_type: 'daily',
            recurrence_day: '',
            recurrence_month: '',
            generate_offset_days: 0,
            bobot: 3,
            deadline: '',
            subtasks: [{ judul: '', porsi: 0 }],
        });
        
        setTimeout(() => {
            router.push('/usulan?tab=proposed');
        }, 2000);
    } catch (err) {
        setError(err.response?.data?.message || 'Gagal mengajukan tugas. Silakan coba lagi.');
    } finally {
        setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    console.log('🔍 handleSaveDraft dipanggil');
    
    setLoading(true);
    setError('');
    setSuccess(false);

    const filteredSubtasks = form.subtasks.filter((s) => s.judul.trim() !== '');
    const editId = sessionStorage.getItem('editDraftId');
    
    console.log('🔍 editDraftId dari sessionStorage:', editId);
    
    // === LOG DATA YANG DIKIRIM ===
    const payload = {
      ...form,
      subtasks: filteredSubtasks,
    };
    console.log('🔍 Payload yang dikirim:', JSON.stringify(payload, null, 2));

    try {
      let response;
      if (editId) {
        console.log('🔍 UPDATE draft dengan ID:', editId);
        response = await api.put(`/tasks/draft/${editId}`, payload);
        sessionStorage.removeItem('editDraftId');
        sessionStorage.removeItem('editTaskData');
      } else {
        console.log('🔍 BUAT draft baru');
        response = await api.post('/tasks/propose', {
          ...form,
          status: 'draft',
          subtasks: filteredSubtasks,
        });
      }
      
      setSuccess(true);
      setForm({
        judul_spesifik: '',
        deskripsi: '',
        jenis: 'rutin',
        recurrence_type: 'daily',
        recurrence_day: '',
        recurrence_month: '',
        generate_offset_days: 0,
        bobot: 3,
        deadline: '',
        subtasks: [{ judul: '', porsi: 0 }],
      });
      
      setTimeout(() => {
        router.push('/usulan?tab=draft');
      }, 2000);
    } catch (err) {
      console.error('❌ Error saving draft:', err);
      console.error('❌ Response data:', err.response?.data);
      console.error('❌ Response status:', err.response?.status);
      console.error('❌ Response headers:', err.response?.headers);
      setError(err.response?.data?.message || 'Gagal menyimpan draft.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">SGP KPI System</h1>
        <button
          onClick={() => router.push('/usulan')}
          className="text-gray-600 hover:text-gray-800 transition"
        >
          ← Kembali ke Menu Usulan
        </button>
      </nav>

      <div className="container mx-auto max-w-2xl p-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Ajukan Tugas Baru</h2>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm border border-red-200 mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 text-green-700 p-3 rounded-md text-sm border border-green-200 mb-4">
            ✅ Tugas berhasil diajukan! Mengalihkan ke dashboard...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
          {/* Judul */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Judul Tugas *</label>
            <input
              type="text"
              name="judul_spesifik"
              value={form.judul_spesifik}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Laporan Penjualan - 28 Juli 2026"
              required
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
            <textarea
              name="deskripsi"
              value={form.deskripsi}
              onChange={handleChange}
              rows="3"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Jelaskan tugas ini secara detail..."
            />
          </div>

          {/* Jenis Tugas */}
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Tugas</label>
          <div className="flex gap-4">
              <label className="flex items-center gap-2">
              <input
                  type="radio"
                  name="jenis"
                  value="rutin"
                  checked={form.jenis === 'rutin'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">Rutin (Berulang)</span>
              </label>
              <label className="flex items-center gap-2">
              <input
                  type="radio"
                  name="jenis"
                  value="proyek"
                  checked={form.jenis === 'proyek'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">Proyek (Sekali)</span>
              </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
              {form.jenis === 'rutin' 
              ? 'Tugas yang dikerjakan berulang (harian/mingguan/bulanan).' 
              : 'Tugas yang dikerjakan satu kali dengan durasi panjang.'}
          </p>
          </div>

          {/* Periode Rutin (hanya jika jenis = rutin) */}
          {form.jenis === 'rutin' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Periode Rutin</label>
                <select
                  name="recurrence_type"
                  value={form.recurrence_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                  <option value="yearly">Tahunan</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {form.recurrence_type === 'daily' && 'Tugas akan muncul setiap hari.'}
                  {form.recurrence_type === 'weekly' && 'Tugas akan muncul setiap minggu (pilih hari).'}
                  {form.recurrence_type === 'monthly' && 'Tugas akan muncul setiap bulan (pilih tanggal).'}
                  {form.recurrence_type === 'yearly' && 'Tugas akan muncul setiap tahun (pilih bulan & tanggal).'}
                </p>
              </div>

              {/* Generate Offset (Hari Sebelum Deadline) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Muncul Berapa Hari Sebelum Deadline?
                </label>
                <input
                  type="number"
                  name="generate_offset_days"
                  value={form.generate_offset_days}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: 3 (muncul 3 hari sebelum deadline)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {form.generate_offset_days === 0 && 'Tugas akan muncul di hari deadline.'}
                  {form.generate_offset_days > 0 && `Tugas akan muncul ${form.generate_offset_days} hari sebelum deadline.`}
                </p>
              </div>
            </>
          )}

          {/* Field tambahan untuk mingguan, bulanan, tahunan */}
          {form.jenis === 'rutin' && form.recurrence_type === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Hari dalam Minggu</label>
              <select
                name="recurrence_day"
                value={form.recurrence_day || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">Senin</option>
                <option value="2">Selasa</option>
                <option value="3">Rabu</option>
                <option value="4">Kamis</option>
                <option value="5">Jumat</option>
                <option value="6">Sabtu</option>
                <option value="7">Minggu</option>
              </select>
            </div>
          )}

          {form.jenis === 'rutin' && (form.recurrence_type === 'monthly' || form.recurrence_type === 'yearly') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tanggal</label>
                <input
                  type="number"
                  name="recurrence_day"
                  value={form.recurrence_day || ''}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1-31"
                />
              </div>
              {form.recurrence_type === 'yearly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bulan</label>
                  <select
                    name="recurrence_month"
                    value={form.recurrence_month || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">Januari</option>
                    <option value="2">Februari</option>
                    <option value="3">Maret</option>
                    <option value="4">April</option>
                    <option value="5">Mei</option>
                    <option value="6">Juni</option>
                    <option value="7">Juli</option>
                    <option value="8">Agustus</option>
                    <option value="9">September</option>
                    <option value="10">Oktober</option>
                    <option value="11">November</option>
                    <option value="12">Desember</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {form.jenis === 'proyek' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
              <input
                type="date"
                name="tanggal_mulai"
                value={form.tanggal_mulai || ''}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Bobot & Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bobot (1-10)</label>
              <input
                type="number"
                name="bobot"
                value={form.bobot}
                onChange={handleChange}
                min="1"
                max="10"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Deadline *</label>
              <input
                type="date"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Subtasks */}
          <div>
              <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Subtask (Checklist)</label>
                  <span className="text-sm text-gray-500">
                      Sisa Porsi: <span className="font-bold text-blue-600">{getRemainingPorsi()}%</span>
                  </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">Opsional. Tambahkan langkah-langkah pengerjaan tugas.</p>
              
              {form.subtasks.map((subtask, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-center">
                      <input
                          type="text"
                          value={subtask.judul || ''}
                          onChange={(e) => handleSubtaskChange(index, 'judul', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Langkah ${index + 1}`}
                      />
                      <input
                          type="number"
                          value={subtask.porsi || 0}
                          onChange={(e) => handleSubtaskChange(index, 'porsi', parseInt(e.target.value) || 0)}
                          min="0"
                          max="100"
                          className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Porsi"
                      />
                      {form.subtasks.length > 1 && (
                          <button
                              type="button"
                              onClick={() => removeSubtask(index)}
                              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                          >
                              ✕
                          </button>
                      )}
                  </div>
              ))}
              
              <button
                  type="button"
                  onClick={addSubtask}
                  disabled={getRemainingPorsi() <= 0}
                  className={`text-sm transition ${
                      getRemainingPorsi() <= 0 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-blue-600 hover:text-blue-800'
                  }`}
              >
                  + Tambah Subtask {getRemainingPorsi() <= 0 && '(Porsi habis)'}
              </button>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={loading}
              className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition font-medium"
            >
              💾 Simpan Draft
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              {loading ? 'Mengirim...' : '🚀 Ajukan Tugas'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}