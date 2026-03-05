import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FaTrash, 
  FaBuilding, 
  FaMapMarkerAlt, 
  FaSearch, 
  FaPlus, 
  FaEdit, 
  FaFilter, 
  FaTimes, 
  FaExclamation, 
  FaCalendarAlt,
  FaIdCard,
  FaChevronDown,
  FaSync
} from 'react-icons/fa';
import './UserMenu.css';

function Branches() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  
  // UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filter Menu States
  const [showDateMenu, setShowDateMenu] = useState(false);
  
  // Form State
  const [newBranch, setNewBranch] = useState({ name: '', address: '' });
  const [editingBranch, setEditingBranch] = useState(null);
  
  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterId, setFilterId] = useState('');
  const [filterAddress, setFilterAddress] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Refs for click outside
  const dateMenuRef = useRef(null);

  useEffect(() => {
    const userRole = localStorage.getItem('currentUserRole');
    const username = localStorage.getItem('currentUserUsername');
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchBranches(username === 'admin');

    // Click outside handler
    const handleClickOutside = (event) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target)) setShowDateMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const anyOpen = !!(showAddModal || showEditModal || showDeleteModal);
    window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: anyOpen } }));
  }, [showAddModal, showEditModal, showDeleteModal]);

  const fetchBranches = async (isSystemAdmin = false) => {
    try {
      const res = await axios.get('http://localhost:5000/branches');
      const currentBranch = localStorage.getItem('currentBranch');

      let data = res.data;
      if (!isSystemAdmin && currentBranch) {
        data = data.filter(b => b.name === currentBranch);
      }

      const sorted = data.sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
      );
      setBranches(sorted);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFilterName('');
    setFilterId('');
    setFilterAddress('');
    setFilterDate('');
    await fetchBranches();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newBranch.name.trim()) return;

    try {
      await axios.post('http://localhost:5000/branches', newBranch);
      setShowAddModal(false);
      setNewBranch({ name: '', address: '' });
      fetchBranches();
    } catch (err) {
      console.error('Failed to add branch:', err);
      alert('Failed to add branch. Name might be duplicate.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBranch || !editingBranch.name.trim()) return;

    try {
      await axios.put(`http://localhost:5000/branches/${editingBranch._id}`, {
        name: editingBranch.name,
        address: editingBranch.address
      });
      setShowEditModal(false);
      setEditingBranch(null);
      fetchBranches();
    } catch (err) {
      console.error('Failed to update branch:', err);
      alert('Failed to update branch.');
    }
  };

  const handleDeleteClick = (branch) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to recover this branch!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#dd3333',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:5000/branches/${branch._id}`);
          fetchBranches();
          Swal.fire(
            'Deleted!',
            'The branch has been deleted.',
            'success'
          );
        } catch (err) {
          console.error('Failed to delete branch:', err);
          Swal.fire(
            'Error!',
            'Failed to delete branch.',
            'error'
          );
        }
      }
    });
  };

  const filteredBranches = branches.filter(branch => {
    const matchName = branch.name.toLowerCase().includes(filterName.toLowerCase());
    const matchId = (branch._id || '').toLowerCase().includes(filterId.toLowerCase());
    const matchAddress = (branch.address || '').toLowerCase().includes(filterAddress.toLowerCase());
    
    let matchDate = true;
    if (filterDate) {
      const date = branch.createdAt ? new Date(branch.createdAt) : new Date();
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr !== filterDate) matchDate = false;
    }
    
    return matchName && matchId && matchAddress && matchDate;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  return (
    <div className="usermenu-root" style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
        
        {/* Header - Fixed */}
        <div className="page-header" style={{ flexShrink: 0, marginBottom: '20px' }}>
          <h1 className="page-title">Branch Management</h1>
          <p className="page-subtitle">Manage store locations and addresses.</p>
        </div>

        {/* Filter Bar - Fixed */}
        <div className="filter-bar" style={{ flexShrink: 0, marginBottom: '20px' }}>
          {/* Name Filter (Search) */}
          <div className="search-container">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search branch name..." 
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
          </div>

          {/* ID Filter */}
          <div className="search-container">
            <FaIdCard className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Branch ID" 
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
            />
          </div>

          {/* Address Filter */}
          <div className="search-container">
            <FaMapMarkerAlt className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Address" 
              value={filterAddress}
              onChange={(e) => setFilterAddress(e.target.value)}
            />
          </div>

          {/* Date Filter */}
          <div className="filter-dropdown" ref={dateMenuRef}>
            <button className="filter-btn" onClick={() => setShowDateMenu(!showDateMenu)}>
              <FaCalendarAlt /> {filterDate || 'Date'} <FaChevronDown size={10} />
            </button>
            <div className={`filter-menu ${showDateMenu ? 'show' : ''}`} style={{ padding: '16px', minWidth: '250px' }}>
               <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>Select Date</label>
               <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="form-input"
                style={{ marginBottom: '12px' }}
              />
              <button 
                className="btn-secondary" 
                style={{ width: '100%', textAlign: 'center' }}
                onClick={() => { setFilterDate(''); setShowDateMenu(false); }}
              >
                Clear Date
              </button>
            </div>
          </div>

          {/* Refresh Button */}
          <button 
            className={`filter-btn refresh-btn ${isRefreshing ? 'spinning' : ''}`} 
            onClick={handleRefresh}
            title="Refresh List"
          >
            <FaSync />
          </button>

          <div className="spacer"></div>

          {/* Add Branch Button (Right Aligned) */}
          <button 
            className="btn-add-user"
            onClick={() => setShowAddModal(true)}
            style={{ background: '#1A2CA3', boxShadow: '0 4px 10px rgba(0, 77, 64, 0.35)' }}
          >
            <FaPlus /> Add Branch
          </button>
        </div>

        {/* Table - Scrollable */}
        <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="users-table">
            <thead>
              <tr>
                <th>Branch ID</th>
                <th>Branch Name</th>
                <th>Address</th>
                <th>Date Added</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No branches found.
                  </td>
                </tr>
              ) : (
                filteredBranches.map(branch => (
                  <tr key={branch._id}>
                    <td style={{ fontFamily: 'monospace', color: '#64748b' }}>
                      {branch._id.substring(branch._id.length - 6).toUpperCase()}
                    </td>
                    <td>
                      <div className="user-info">
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '8px', 
                          background: '#B2DFDB', color: '#00695C', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center' 
                        }}>
                          <FaBuilding size={14} />
                        </div>
                        <span className="user-name">{branch.name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
                        <FaMapMarkerAlt size={12} color="#94a3b8" />
                        {branch.address || 'No address'}
                      </div>
                    </td>
                    <td style={{ color: '#475569' }}>
                      {formatDate(branch.createdAt)}
                    </td>
                    <td>
                      <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                        <button 
                          className="action-btn" 
                          onClick={() => {
                            setEditingBranch(branch);
                            setShowEditModal(true);
                          }}
                          title="Edit Branch"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDeleteClick(branch)}
                          title="Delete Branch"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Add New Branch</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Branch Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Main Street Store"
                    value={newBranch.name}
                    onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 123 Main St"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {showEditModal && editingBranch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Edit Branch</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Branch Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingBranch.name}
                    onChange={(e) => setEditingBranch({...editingBranch, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingBranch.address}
                    onChange={(e) => setEditingBranch({...editingBranch, address: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (SweetAlert Style) */}
      {showDeleteModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ width: '400px', padding: '30px', textAlign: 'center', borderRadius: '12px', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', border: '4px solid #f8bb86',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
            }}>
              <FaExclamation style={{ fontSize: '40px', color: '#f8bb86' }} />
            </div>
            <h2 style={{ fontSize: '30px', color: '#595959', fontWeight: '600', marginBottom: '10px', margin: 0 }}>Are you sure?</h2>
            <p style={{ fontSize: '16px', color: '#545454', marginBottom: '25px', marginTop: '10px' }}>
              You will not be able to recover this branch!
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', width: '100%' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  background: '#7066e0',
                  color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontSize: '15px', cursor: 'pointer', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  background: '#dd3333',
                  color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontSize: '15px', cursor: 'pointer', fontWeight: 500
                }}
              >
                Yes, delete it!
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Branches;
