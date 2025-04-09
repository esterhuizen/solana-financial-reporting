import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', is_admin: false });
  const [actionSuccess, setActionSuccess] = useState('');
  const { getUsers, registerUser, deleteUser, isAdmin, user: currentUser } = useAuth();

  // Fetch users on component mount, but only once
  useEffect(() => {
    if (isAdmin && currentUser) {
      fetchUsers();
    }
  }, [isAdmin, currentUser]);  // Only depend on isAdmin and currentUser

  const fetchUsers = async () => {
    setLocalLoading(true);
    setError('');
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      setError('Failed to load users. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser({
      ...newUser,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLocalLoading(true);
    setError('');
    setActionSuccess('');
    
    try {
      if (!newUser.username || !newUser.password) {
        setError('Username and password are required');
        setLocalLoading(false);
        return;
      }
      
      await registerUser(newUser);
      setActionSuccess(`User ${newUser.username} created successfully`);
      setNewUser({ username: '', password: '', is_admin: false });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add user');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`Are you sure you want to delete user ${username}?`)) {
      setLocalLoading(true);
      setError('');
      setActionSuccess('');
      
      try {
        await deleteUser(userId);
        setActionSuccess(`User ${username} deleted successfully`);
        fetchUsers();
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete user');
      } finally {
        setLocalLoading(false);
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded text-center">
        <p className="text-yellow-400 text-sm font-medium">
          User management is only available to administrators
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-center">
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}
      
      {actionSuccess && (
        <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded text-center">
          <p className="text-green-400 text-sm font-medium">{actionSuccess}</p>
        </div>
      )}
      
      <div>
        {localLoading && users.length === 0 ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-8 text-center border border-gray-700">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-400">No users have been created yet</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-900 divide-y divide-gray-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/70 transition duration-150">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center text-white font-medium mr-3">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        {user.username}
                        {currentUser.id === user.id && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {user.is_admin ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-300">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-300">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {currentUser.id !== user.id ? (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-red-500 hover:text-red-400 bg-red-900/20 px-3 py-1 rounded text-xs"
                          disabled={localLoading}
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-gray-500 px-3 py-1 rounded text-xs">
                          Current User
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;