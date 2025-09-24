import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    permissions: [],
    allowedMachines: []
  });

  const permissions = [
    { key: 'machines.read', label: '机台查看' },
    { key: 'machines.write', label: '机台管理' },
    { key: 'orders.read', label: '工单查看' },
    { key: 'orders.write', label: '工单管理' },
    { key: 'board', label: '生产看板' }
  ];

  useEffect(() => {
    loadUsers();
    loadMachines();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:12454/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };

  const loadMachines = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:12454/api/machines`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMachines(data);
    } catch (error) {
      console.error('加载机台失败:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingUser 
        ? `http://${window.location.hostname}:12454/api/users/${editingUser.id}`
        : `http://${window.location.hostname}:12454/api/users`;
      
      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        loadUsers();
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('保存用户失败:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个用户吗？')) {
      try {
        const response = await fetch(`http://${window.location.hostname}:12454/api/users/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          loadUsers();
        }
      } catch (error) {
        console.error('删除用户失败:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'user',
      permissions: [],
      allowedMachines: []
    });
    setEditingUser(null);
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        role: user.role,
        permissions: user.permissions || [],
        allowedMachines: user.allowedMachines || []
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          新增用户
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">权限</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">允许机台</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.permissions?.includes('all') ? '全部权限' : 
                   user.permissions?.map(p => permissions.find(perm => perm.key === p)?.label).join(', ') || '无'}
                </td>
                <td className="px-6 py-4">
                  {user.allowedMachines?.includes('all') ? '全部机台' : 
                   user.allowedMachines?.join(', ') || '无'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => openModal(user)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 用户表单模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? '编辑用户' : '新增用户'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">用户名</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">密码</label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder={editingUser ? '留空则不修改' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">权限</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, permissions: ['all']});
                        } else {
                          setFormData({...formData, permissions: []});
                        }
                      }}
                      className="mr-2"
                    />
                    全部权限
                  </label>
                  {!formData.permissions.includes('all') && permissions.map(perm => (
                    <label key={perm.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, permissions: [...formData.permissions, perm.key]});
                          } else {
                            setFormData({...formData, permissions: formData.permissions.filter(p => p !== perm.key)});
                          }
                        }}
                        className="mr-2"
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">允许访问的机台</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.allowedMachines.includes('all')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, allowedMachines: ['all']});
                        } else {
                          setFormData({...formData, allowedMachines: []});
                        }
                      }}
                      className="mr-2"
                    />
                    全部机台
                  </label>
                  {!formData.allowedMachines.includes('all') && machines.map(machine => (
                    <label key={machine.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allowedMachines.includes(machine.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({...formData, allowedMachines: [...formData.allowedMachines, machine.name]});
                          } else {
                            setFormData({...formData, allowedMachines: formData.allowedMachines.filter(m => m !== machine.name)});
                          }
                        }}
                        className="mr-2"
                      />
                      {machine.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;