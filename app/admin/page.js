'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    supervisor_id: '',
    coordinator_id: '',
    jabatan: '',
    nik: '',
  });

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
      if (parsed.role !== 'admin') {
        router.push('/dashboard');
      }
    }

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, form);
      } else {
        await api.post('/admin/users', form);
      }
      setShowModal(false);
      setEditingUser(null);
      setForm({ name: '', email: '', password: '', role: 'staff', supervisor_id: '', coordinator_id: '', jabatan: '', nik: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Gagal menyimpan user');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Gagal menghapus user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'staff',
      supervisor_id: user.supervisor_id || '',
      coordinator_id: user.coordinator_id || '',
      jabatan: user.jabatan || '',
      nik: user.nik || '',
    });
    setShowModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">🛠️ Admin Panel</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/atasan')} className="text-blue-600 hover:text-blue-800 transition">
            ← Kembali
          </button>
          <span className="text-sm text-gray-600">{user?.name} ({user?.role})</span>
          <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
            Logout
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">👥 Daftar User</h2>
          <button
            onClick={() => { setEditingUser(null); setForm({ name: '', email: '', password: '', role: 'staff', supervisor_id: '', coordinator_id: '', jabatan: '', nik: '' }); setShowModal(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Tambah User
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Nama</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Atasan</th>
                <th className="px-4 py-2 text-left">Jabatan</th>
                <th className="px-4 py-2 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      u.role === 'admin' ? 'bg-red-100 text-red-700' :
                      u.role === 'atasan' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'supervisor' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">{u.supervisor?.name || '-'}</td>
                  <td className="px-4 py-2">{u.jabatan || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => handleEdit(u)} className="text-blue-600 hover:text-blue-800 mr-2">
                      ✏️
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-800">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL FORM USER ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="text-lg font-bold">{editingUser ? 'Edit User' : 'Tambah User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" name="name" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
              <input type="email" name="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
              {!editingUser && (
                <input type="password" name="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-3 py-2 border rounded-md" required />
              )}
              <select name="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                <option value="staff">Staff</option>
                <option value="atasan">Atasan</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
              <select name="supervisor_id" value={form.supervisor_id} onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                <option value="">Pilih Atasan</option>
                {users.filter(u => u.role === 'atasan').map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <input type="text" name="jabatan" placeholder="Jabatan" value={form.jabatan} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
              <input type="text" name="nik" placeholder="NIK" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} className="w-full px-3 py-2 border rounded-md" />

              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                {editingUser ? 'Update' : 'Simpan'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}