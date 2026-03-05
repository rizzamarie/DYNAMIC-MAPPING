import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  FaSearch,
  FaUserCircle,
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaFilter,
  FaCalendarAlt,
  FaChevronDown,
  FaTimes,
  FaCamera,
  FaEye,
  FaEyeSlash,
  FaSync,
  FaUser,
  FaIdCard,
  FaPhone,
  FaLock,
  FaUserTag,
  FaBuilding,
  FaExclamation,
  FaUserPlus,
  FaHistory
} from 'react-icons/fa';

import './UserMenu.css';

function UserMenu() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  
  // UI States
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form States
  const [newUser, setNewUser] = useState({ 
    firstName: '', 
    lastName: '', 
    username: '', 
    phone: '', 
    password: '', 
    confirmPassword: '', 
    role: 'staff', 
    assignedBranch: '' 
  });
  const [editingUser, setEditingUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyActionFilter, setHistoryActionFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');

  // Refs for click outside
  const roleMenuRef = useRef(null);
  const statusMenuRef = useRef(null);
  const dateMenuRef = useRef(null);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
    fetchBranches();

    // Click outside handler
    const handleClickOutside = (event) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target)) setShowRoleMenu(false);
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) setShowStatusMenu(false);
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target)) setShowDateMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCurrentUser = async () => {
    const storedUsername = localStorage.getItem('currentUserUsername');
    if (storedUsername) {
      try {
        const res = await axios.get('http://localhost:5000/users');
        const user = (res.data || []).find(u => u.username === storedUsername);
        if (user) setCurrentUser(user);
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const currentBranch = localStorage.getItem('currentBranch');
      const currentRole = localStorage.getItem('currentUserRole');
      const currentUsername = localStorage.getItem('currentUserUsername');

      let url = 'http://localhost:5000/users';

      const normalizedBranch = currentBranch && currentBranch.toLowerCase() !== 'unassigned'
        ? currentBranch
        : null;

      const isSystemAdmin = currentRole && currentRole.toLowerCase() === 'admin' && currentUsername === 'admin';

      if (normalizedBranch && currentRole && currentRole.toLowerCase() === 'admin' && !isSystemAdmin) {
        url = `http://localhost:5000/users?branch=${encodeURIComponent(normalizedBranch)}`;
      }

      const res = await axios.get(url);
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchUserHistory = async () => {
    try {
      const res = await axios.get('http://localhost:5000/user-history');
      setHistoryItems(res.data || []);
    } catch (err) {
      console.error('Error fetching user history:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Reset filters
    setSearchQuery('');
    setRoleFilter('All');
    setStatusFilter('All');
    setDateFilter('');
    
    // Fetch fresh data
    await fetchUsers();
    
    // Small delay to show animation/feedback
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('http://localhost:5000/branches');
      setBranches(res.data || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Filter Logic
  const getFilteredUsers = () => {
    return users.filter(user => {
      const name = (user.name || '').toString().toLowerCase();
      const username = (user.username || '').toString().toLowerCase();
      const q = searchQuery.toLowerCase();

      // Search
      const matchesSearch =
        (!q && (name || username)) ||
        name.includes(q) ||
        username.includes(q);
      
      // Role
      const matchesRole = roleFilter === 'All' || user.role.toLowerCase() === roleFilter.toLowerCase();
      
      // Status
      const isOnline = user.isOnline || (currentUser && user.username === currentUser.username);
      const status = isOnline ? 'Active' : 'Offline';
      const matchesStatus = statusFilter === 'All' || status === statusFilter;

      // Date
      let matchesDate = true;
      if (dateFilter) {
        const date = new Date(user.createdAt || Date.now());
        const dateString = date.toISOString().split('T')[0];
        if (dateString !== dateFilter) matchesDate = false;
      }

      return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });
  };

  const filteredUsers = getFilteredUsers();

  // Actions
  const handleRegister = async () => {
    if ((!newUser.firstName && !newUser.lastName) || !newUser.username || !newUser.password) {
      return alert('Full Name, Username, and Password are required.');
    }
    
    if (newUser.password !== newUser.confirmPassword) {
      return alert('Passwords do not match.');
    }
    
    try {
      const formData = new FormData();
      formData.append('name', `${newUser.firstName} ${newUser.lastName}`.trim());
      formData.append('username', newUser.username);
      formData.append('password', newUser.password);
      formData.append('role', newUser.role);
      if (newUser.phone) formData.append('phone', newUser.phone);
      if (newUser.assignedBranch) formData.append('assignedBranch', newUser.assignedBranch);
      if (profileImage) formData.append('profileImage', profileImage);
      
      const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
      const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
      await axios.post(`http://localhost:5000/users?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Swal.fire('Success', 'User registered!', 'success');
      setShowAddModal(false);
      setNewUser({ 
        firstName: '', 
        lastName: '', 
        username: '', 
        phone: '', 
        password: '', 
        confirmPassword: '', 
        role: 'staff', 
        assignedBranch: '' 
      });
      setProfileImage(null);
      setImagePreview(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    Swal.fire({
      title: 'Are you sure?',
      text: `Delete ${selectedUsers.length} user(s)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
          const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
          await axios.delete(`http://localhost:5000/users/bulk?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`, { data: { userIds: selectedUsers } });
          setUsers(users.filter(u => !selectedUsers.includes(u._id)));
          setSelectedUsers([]);
          Swal.fire('Deleted!', 'Users have been deleted.', 'success');
        } catch (err) {
          console.error('Delete failed:', err);
          Swal.fire('Error', 'Failed to delete users', 'error');
        }
      }
    });
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
          const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
          await axios.delete(`http://localhost:5000/users/${id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`);
          fetchUsers();
          Swal.fire(
            'Deleted!',
            'User has been deleted.',
            'success'
          );
        } catch (err) {
          console.error('Delete failed:', err);
          Swal.fire(
            'Error!',
            'Failed to delete user.',
            'error'
          );
        }
      }
    });
  };

  const handleUpdate = async () => {
    if (!editingUser.name || !editingUser.username) return alert('Name and username are required.');
    
    try {
      const formData = new FormData();
      formData.append('name', editingUser.name);
      formData.append('username', editingUser.username);
      formData.append('role', editingUser.role);
      if (editingUser.phone) formData.append('phone', editingUser.phone);
      if (editingUser.assignedBranch) formData.append('assignedBranch', editingUser.assignedBranch);
      else formData.append('assignedBranch', '');
      
      if (editingUser.password) formData.append('password', editingUser.password);
      if (profileImage) formData.append('profileImage', profileImage);

      const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
      const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
      await axios.put(`http://localhost:5000/users/${editingUser._id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Update localStorage if the edited user is the current user
      const currentUsername = localStorage.getItem('currentUserUsername');
      if (editingUser.username === currentUsername) {
        localStorage.setItem('currentUserName', editingUser.name);
        localStorage.setItem('currentUserRole', editingUser.role);
        localStorage.setItem('currentBranch', editingUser.assignedBranch || '');
        window.dispatchEvent(new CustomEvent('user:profileUpdated'));
      }

      Swal.fire({
        icon: 'success',
        title: 'User updated!',
        showConfirmButton: false,
        timer: 1500
      });
      setShowEditModal(false);
      setEditingUser(null);
      setProfileImage(null);
      setImagePreview(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const openEditModal = (user) => {
    setEditingUser({ ...user, password: '' });
    setImagePreview(user.profileImage ? `http://localhost:5000${user.profileImage}` : null);
    setShowEditModal(true);
  };

  useEffect(() => {
    const anyOpen = !!(showAddModal || showEditModal);
    window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: anyOpen } }));
  }, [showAddModal, showEditModal]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };



  const filteredHistoryItems = historyItems.filter(h => {
    const matchesAction = historyActionFilter === 'All' || h.action === historyActionFilter;
    const matchesSearch = !historySearch || 
      (h.targetUserName && h.targetUserName.toLowerCase().includes(historySearch.toLowerCase())) ||
      (h.actorName && h.actorName.toLowerCase().includes(historySearch.toLowerCase())) ||
      (h.details && h.details.toLowerCase().includes(historySearch.toLowerCase()));
    
    return matchesAction && matchesSearch;
  });

  const tdStyle = { padding: '12px 16px', color: '#111827', fontSize: '14px', whiteSpace: 'nowrap' };
  const thStyle = { padding: '12px 16px', fontWeight: '600', color: '#374151', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';

  return (
    <div className="usermenu-root">
      <div className="main-content">
        
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{showHistory ? 'User History' : 'User Management'}</h1>
            <p className="page-subtitle">
              {showHistory 
                ? 'View audit log of user creation, edits, and deletions.' 
                : 'Administrate user accounts, assign system roles, and monitor access statuses.'}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {!showHistory && currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  setShowHistory(true);
                  fetchUserHistory();
                }}
                className="toolbar-btn-secondary"
              >
                <FaHistory /> View History
              </button>
            )}

            {showHistory && (
              <button
                onClick={() => setShowHistory(false)}
                className="toolbar-btn-secondary"
              >
                <FaTimes /> Close History
              </button>
            )}
            
            {!showHistory && currentUser?.role !== 'staff' && (
              <button 
                onClick={() => {
                  setEditingUser(null);
                  setNewUser({ firstName: '', lastName: '', username: '', phone: '', password: '', confirmPassword: '', role: 'staff', assignedBranch: '' });
                  setProfileImage(null);
                  setImagePreview(null);
                  setShowAddModal(true);
                }}
                className="btn-add-user"
              >
                <FaUserPlus /> Add New User
              </button>
            )}
          </div>
        </div>

        {showHistory ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
           {/* Filters */}
           <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 36px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'white',
                  color: '#111827'
                }}
              />
            </div>
            
            <select 
              value={historyActionFilter} 
              onChange={(e) => setHistoryActionFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'white',
                fontSize: '14px',
                color: '#111827',
                cursor: 'pointer',
                minWidth: '150px'
              }}
            >
              <option value="All">All Actions</option>
              {Array.from(new Set(historyItems.map(h => h.action))).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            
            <button
              onClick={fetchUserHistory}
              title="Refresh History"
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              <FaSync />
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Target User</th>
                  <th style={thStyle}>Done By</th>
                  <th style={thStyle}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistoryItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>No history records found.</td>
                  </tr>
                ) : (
                  filteredHistoryItems.map(h => (
                    <tr key={h._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={tdStyle}>{fmtDate(h.createdAt)}</td>
                      <td style={tdStyle}>{fmtTime(h.createdAt)}</td>
                      <td style={tdStyle}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                          background: h.action.includes('Deleted') ? '#ffebee' : h.action.includes('Created') ? '#e8f5e9' : '#e3f2fd',
                          color: h.action.includes('Deleted') ? '#c62828' : h.action.includes('Created') ? '#2e7d32' : '#1565c0'
                        }}>
                          {h.action}
                        </span>
                      </td>
                      <td style={tdStyle}><strong>{h.targetUserName}</strong></td>
                      <td style={tdStyle}>{h.actorName || 'System'} <span style={{fontSize:'11px', color:'#666'}}>({h.actorRole || 'admin'})</span></td>
                      <td style={tdStyle}>{h.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search user..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <div className="filter-dropdown" ref={roleMenuRef}>
            <button className="filter-btn" onClick={() => setShowRoleMenu(!showRoleMenu)}>
              <FaUserCircle /> {roleFilter === 'All' ? 'Role' : roleFilter} <FaChevronDown size={10} />
            </button>
            <div className={`filter-menu ${showRoleMenu ? 'show' : ''}`}>
              <div className={`filter-option ${roleFilter === 'All' ? 'active' : ''}`} onClick={() => { setRoleFilter('All'); setShowRoleMenu(false); }}>All Roles</div>
              <div className={`filter-option ${roleFilter === 'Admin' ? 'active' : ''}`} onClick={() => { setRoleFilter('Admin'); setShowRoleMenu(false); }}>Admin</div>
              <div className={`filter-option ${roleFilter === 'Manager' ? 'active' : ''}`} onClick={() => { setRoleFilter('Manager'); setShowRoleMenu(false); }}>Manager</div>
              <div className={`filter-option ${roleFilter === 'Staff' ? 'active' : ''}`} onClick={() => { setRoleFilter('Staff'); setShowRoleMenu(false); }}>Staff</div>
              <div className={`filter-option ${roleFilter === 'Cashier' ? 'active' : ''}`} onClick={() => { setRoleFilter('Cashier'); setShowRoleMenu(false); }}>Cashier</div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="filter-dropdown" ref={statusMenuRef}>
            <button className="filter-btn" onClick={() => setShowStatusMenu(!showStatusMenu)}>
              <FaFilter /> {statusFilter === 'All' ? 'Status' : statusFilter} <FaChevronDown size={10} />
            </button>
            <div className={`filter-menu ${showStatusMenu ? 'show' : ''}`}>
              <div className={`filter-option ${statusFilter === 'All' ? 'active' : ''}`} onClick={() => { setStatusFilter('All'); setShowStatusMenu(false); }}>All Status</div>
              <div className={`filter-option ${statusFilter === 'Active' ? 'active' : ''}`} onClick={() => { setStatusFilter('Active'); setShowStatusMenu(false); }}>Active</div>
              <div className={`filter-option ${statusFilter === 'Offline' ? 'active' : ''}`} onClick={() => { setStatusFilter('Offline'); setShowStatusMenu(false); }}>Offline</div>
            </div>
          </div>

          {/* Date Filter */}
          <div className="filter-dropdown" ref={dateMenuRef}>
            <button className="filter-btn" onClick={() => setShowDateMenu(!showDateMenu)}>
              <FaCalendarAlt /> {dateFilter || 'Date'} <FaChevronDown size={10} />
            </button>
            <div className={`filter-menu ${showDateMenu ? 'show' : ''}`} style={{ padding: '16px', minWidth: '250px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>Select Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="form-input"
                style={{ marginBottom: '12px' }}
              />
              <button 
                className="btn-secondary" 
                style={{ width: '100%', textAlign: 'center' }}
                onClick={() => { setDateFilter(''); setShowDateMenu(false); }}
              >
                Clear Date
              </button>
            </div>
          </div>

          <button 
            className={`filter-btn refresh-btn ${isRefreshing ? 'spinning' : ''}`} 
            onClick={handleRefresh}
            title="Refresh List"
          >
            <FaSync />
          </button>

          <div className="spacer"></div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                {currentUser?.role === 'admin' && (
                  <th style={{ width: 40 }}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if (e.target.checked) setSelectedUsers(filteredUsers.filter(u => u.username !== 'admin').map(u => u._id));
                        else setSelectedUsers([]);
                      }}
                      checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.filter(u => u.username !== 'admin').length}
                    />
                  </th>
                )}
                <th>Full Name</th>
                <th>Username</th>
                <th>Status</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th>Branch</th>
                {currentUser?.role === 'admin' && (
                  <>
                    <th>Phone</th>
                    <th>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  const isOnline = user.isOnline || (currentUser && user.username === currentUser.username);
                  const isSelected = selectedUsers.includes(user._id);

                  return (
                    <tr key={user._id} style={{ background: isSelected ? '#f0fdf4' : 'transparent' }}>
                      {currentUser?.role === 'admin' && (
                        <td>
                          {user.username !== 'admin' && (
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedUsers([...selectedUsers, user._id]);
                                else setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                              }}
                            />
                          )}
                        </td>
                      )}
                      <td>
                        <div className="user-info">
                          {user.profileImage ? (
                            <img src={`http://localhost:5000${user.profileImage}`} alt="" className="user-avatar" />
                          ) : (
                            <div className="user-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FaUserCircle size={24} color="#ccc" />
                            </div>
                          )}
                          <div className="user-details">
                            <span className="user-name">{user.name}</span>
                          </div>
                        </div>
                      </td>
                      <td>{user.username}</td>
                      <td>
                        <span className={`status-badge ${isOnline ? 'status-active' : 'status-offline'}`}>
                          {isOnline ? 'Active' : 'Offline'}
                        </span>
                      </td>
                      <td>
                        <span className="role-badge">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{user.assignedBranch || 'Unassigned'}</td>
                      {currentUser?.role === 'admin' && (
                        <>
                          <td>{user.phone || 'N/A'}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn"
                                onClick={() => openEditModal(user)}
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              {user.username !== 'admin' && (
                                <button
                                  className="action-btn delete"
                                  onClick={() => handleDelete(user._id)}
                                  title="Delete"
                                >
                                  <FaTrashAlt />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={currentUser?.role === 'admin' ? 8 : 6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {selectedUsers.length > 0 && (
            <div style={{ padding: '12px', background: '#fee2e2', borderTop: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#991b1b', fontWeight: 600, fontSize: '14px' }}>{selectedUsers.length} users selected</span>
              <button 
                onClick={handleBulkDelete}
                style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                Delete Selected
              </button>
            </div>
          )}
        </div>
        </>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '900px', background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
              <div style={{ width: '40px', height: '40px', background: '#E0F2FE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaPlus style={{ color: '#0284c7' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Register New User</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Add system users</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <FaUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      value={`${newUser.firstName} ${newUser.lastName}`} 
                      onChange={e => {
                        const val = e.target.value;
                        const parts = val.split(' ');
                        setNewUser({...newUser, firstName: parts[0], lastName: parts.slice(1).join(' ') });
                      }}
                      placeholder="e.g. Maria Santos"
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <FaIdCard style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      value={newUser.username} 
                      onChange={e => setNewUser({...newUser, username: e.target.value})} 
                      placeholder="e.g. msantos01"
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <FaPhone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      value={newUser.phone} 
                      onChange={e => setNewUser({...newUser, phone: e.target.value})} 
                      placeholder="e.g. 0917 123 4567"
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={newUser.password} 
                      onChange={e => setNewUser({...newUser, password: e.target.value, confirmPassword: e.target.value})}
                      placeholder="e.g. StrongPass123!"
                      style={{ width: '100%', padding: '10px 35px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                    />
                    <div 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </div>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Role</label>
                  <div style={{ position: 'relative' }}>
                    <FaUserTag style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                    <select 
                      value={newUser.role} 
                      onChange={e => setNewUser({...newUser, role: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', appearance: 'none' }}
                    >
                      <option value="staff">Staff Member</option>
                      <option value="manager">Store Manager</option>
                      <option value="admin">System Admin</option>
                      <option value="cashier">Store Cashier</option>
                    </select>
                    <FaChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Branch */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Assigned Branch</label>
                  <div style={{ position: 'relative' }}>
                    <FaBuilding style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                    <select 
                      value={newUser.assignedBranch} 
                      onChange={e => setNewUser({...newUser, assignedBranch: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', appearance: 'none' }}
                    >
                      <option value="">-- Select Branch --</option>
                      {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                    </select>
                    <FaChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

              </div>
            </div>

            {/* Image Upload - Centered under fields */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #e2e8f0' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaUserCircle size={64} color="#94a3b8" />
                  </div>
                )}
                <label htmlFor="modal-img-upload" style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0'
                }}>
                  <FaCamera size={14} color="#64748b" />
                  <input type="file" id="modal-img-upload" style={{ display: 'none' }} onChange={handleImageChange} />
                </label>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                {imagePreview ? 'Change Photo' : 'Upload Photo'}
              </span>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleRegister} 
                style={{ 
                  flex: 1,
                  background: '#1A2CA3', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <FaPlus size={12} /> Register User
              </button>
              <button 
                onClick={() => setShowAddModal(false)}
                style={{ 
                  width: '100px',
                  background: 'white', 
                  color: '#64748b', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '900px', background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
              <div style={{ width: '40px', height: '40px', background: '#E0F2FE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FaEdit style={{ color: '#0284c7' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Edit User</h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Update user details</p>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <FaTimes size={18} />
              </button>
            </div>

            {/* Image Upload - Centered Top */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '25px' }}>
              <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #e2e8f0' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FaUserCircle size={60} color="#94a3b8" />
                  </div>
                )}
                <label htmlFor="edit-modal-img-upload" style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0'
                }}>
                  <FaCamera size={14} color="#64748b" />
                  <input type="file" id="edit-modal-img-upload" style={{ display: 'none' }} onChange={handleImageChange} />
                </label>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                {imagePreview ? 'Change Photo' : 'Update Photo'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <FaUser style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      value={editingUser.name} 
                      onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                      placeholder="Full Name"
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <FaIdCard style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      value={editingUser.username} 
                      onChange={e => setEditingUser({...editingUser, username: e.target.value})} 
                      placeholder="Username"
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <FaPhone style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      value={editingUser.phone || ''} 
                      onChange={e => setEditingUser({...editingUser, phone: e.target.value})} 
                      placeholder="Phone Number"
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                </div>

              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>New Password (leave blank to keep current)</label>
                  <div style={{ position: 'relative' }}>
                    <FaLock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={editingUser.password} 
                      onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                      placeholder="New Password"
                      style={{ width: '100%', padding: '10px 35px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                    />
                    <div 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </div>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Role</label>
                  <div style={{ position: 'relative' }}>
                    <FaUserTag style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                    <select 
                      value={editingUser.role} 
                      onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', appearance: 'none' }}
                    >
                      <option value="staff">Staff Member</option>
                      <option value="manager">Store Manager</option>
                      <option value="admin">System Admin</option>
                      <option value="cashier">Store Cashier</option>
                    </select>
                    <FaChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Branch */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Assigned Branch</label>
                  <div style={{ position: 'relative' }}>
                    <FaBuilding style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                    <select 
                      value={editingUser.assignedBranch || ''} 
                      onChange={e => setEditingUser({...editingUser, assignedBranch: e.target.value})}
                      style={{ width: '100%', padding: '10px 12px 10px 35px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: 'white', appearance: 'none' }}
                    >
                      <option value="">-- Select Branch --</option>
                      {branches.map(b => <option key={b._id} value={b.name}>{b.name}</option>)}
                    </select>
                    <FaChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  </div>
                </div>

              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: '25px', display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleUpdate} 
                style={{ 
                  flex: 1,
                  background: '#1A2CA3', 
                  color: 'white', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <FaEdit size={12} /> Save Changes
              </button>
              <button 
                onClick={() => setShowEditModal(false)}
                style={{ 
                  width: '100px',
                  background: 'white', 
                  color: '#64748b', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  </div>
  );
}

export default UserMenu;
