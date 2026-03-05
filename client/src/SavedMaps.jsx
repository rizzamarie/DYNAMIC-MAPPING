import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FaTrash, 
  FaMap, 
  FaDesktop,
  FaSearch, 
  FaPlus, 
  FaEdit, 
  FaFilter, 
  FaTimes, 
  FaExclamation, 
  FaCalendarAlt,
  FaIdCard,
  FaChevronDown,
  FaSync,
  FaMapMarkerAlt
} from 'react-icons/fa';

function SavedMaps() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState([]);
  
  // UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mapToDelete, setMapToDelete] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filter Menu States
  const [showDateMenu, setShowDateMenu] = useState(false);
  
  // Form State
  const [newMap, setNewMap] = useState({ name: '', isKioskMap: false });
  const [editingMap, setEditingMap] = useState(null);
  
  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterId, setFilterId] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Refs for click outside
  const dateMenuRef = useRef(null);

  useEffect(() => {
    const userRole = localStorage.getItem('currentUserRole');
    if (userRole !== 'manager' && userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchMaps();

    // Click outside handler
    const handleClickOutside = (event) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target)) setShowDateMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMaps = async () => {
    try {
      const res = await axios.get('http://localhost:5000/maps');
      const sorted = res.data.sort((a, b) =>
        (a.name || 'Untitled').localeCompare(b.name || 'Untitled', 'en', { sensitivity: 'base' })
      );
      setMaps(sorted);
    } catch (err) {
      console.error('Failed to fetch maps:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFilterName('');
    setFilterId('');
    setFilterDate('');
    await fetchMaps();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDirectAddMap = async () => {
    navigate('/map2');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingMap || !editingMap.name.trim()) return;

    try {
      await axios.put(`http://localhost:5000/maps/${editingMap._id}`, {
        name: editingMap.name,
        isKioskMap: editingMap.isKioskMap
      });
      setShowEditModal(false);
      setEditingMap(null);
      fetchMaps();
    } catch (err) {
      console.error('Failed to update map:', err);
      alert('Failed to update map.');
    }
  };

  const handleDeleteClick = (map) => {
    setMapToDelete(map);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!mapToDelete) return;
    try {
      await axios.delete(`http://localhost:5000/maps/${mapToDelete._id}`);
      setShowDeleteModal(false);
      setMapToDelete(null);
      fetchMaps();
    } catch (err) {
      console.error('Failed to delete map:', err);
      alert('Failed to delete map.');
    }
  };

  const filteredMaps = maps.filter(map => {
    const matchName = (map.name || '').toLowerCase().includes(filterName.toLowerCase());
    const matchId = (map._id || '').toLowerCase().includes(filterId.toLowerCase());
    
    let matchDate = true;
    if (filterDate) {
      const date = map.createdAt ? new Date(map.createdAt) : new Date();
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr !== filterDate) matchDate = false;
    }
    
    return matchName && matchId && matchDate;
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
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: '#eef4ff', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
      
      {/* Header Bar - Matches MapEditor */}
      <div style={{ 
        height: '60px', 
        background: 'linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 24px',
        color: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 20
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '1px' }}>SAVED MAPS</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>Store Manager</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Manager</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a' }}>
            <span style={{ fontSize: '18px' }}>👤</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        
        {/* Top Action/Filter Bar */}
        <div style={{ 
          background: 'white', 
          padding: '16px 24px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Search Name */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', padding: '8px 12px', flex: 1, minWidth: '200px' }}>
            <FaSearch style={{ color: '#64748b', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search map name..." 
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#1e293b' }}
            />
          </div>

          {/* Search ID */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', padding: '8px 12px', width: '150px' }}>
            <FaIdCard style={{ color: '#64748b', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Map ID" 
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#1e293b' }}
            />
          </div>

          {/* Date Filter */}
          <div style={{ position: 'relative' }} ref={dateMenuRef}>
            <button 
              onClick={() => setShowDateMenu(!showDateMenu)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: filterDate ? '#eff6ff' : '#f1f5f9', 
                color: filterDate ? '#3b82f6' : '#64748b',
                border: filterDate ? '1px solid #bfdbfe' : '1px solid transparent',
                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' 
              }}
            >
              <FaCalendarAlt /> {filterDate || 'Date'} <FaChevronDown size={10} />
            </button>
            {showDateMenu && (
              <div style={{ 
                position: 'absolute', top: '100%', right: 0, marginTop: '8px', 
                background: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                borderRadius: '8px', padding: '16px', zIndex: 50, border: '1px solid #e2e8f0', minWidth: '250px' 
              }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Select Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '12px' }}
                />
                <button 
                  onClick={() => { setFilterDate(''); setShowDateMenu(false); }}
                  style={{ width: '100%', padding: '8px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Clear Date
                </button>
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />

          <button 
            onClick={handleRefresh}
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', 
              color: isRefreshing ? '#3b82f6' : '#64748b', 
              padding: '8px', borderRadius: '6px', transition: 'all 0.2s' 
            }}
            title="Refresh List"
          >
            <FaSync className={isRefreshing ? 'spin' : ''} />
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
              .spin { animation: spin 1s linear infinite; }
            `}</style>
          </button>

          <button 
            onClick={handleDirectAddMap}
            style={{ 
              background: '#3b82f6', color: 'white', border: 'none', 
              padding: '10px 20px', borderRadius: '8px', fontWeight: '600', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
              marginLeft: 'auto'
            }}
          >
            <FaPlus /> New Map
          </button>
        </div>

        {/* Maps List */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
          overflow: 'hidden' 
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Map ID</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Map Name</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Added</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaps.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🗺️</div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>No maps found</div>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>Try adjusting your filters or create a new map.</div>
                  </td>
                </tr>
              ) : (
                filteredMaps.map(map => (
                  <tr key={map._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                    <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: '#64748b', fontSize: '13px' }}>
                      {map._id ? map._id.substring(map._id.length - 6).toUpperCase() : 'N/A'}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '36px', height: '36px', borderRadius: '8px', 
                          background: '#eff6ff', color: '#3b82f6', display: 'flex', 
                          alignItems: 'center', justifyContent: 'center' 
                        }}>
                          <FaMap size={16} />
                        </div>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{map.name || 'Untitled Map'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {map.isKioskMap ? (
                          <span style={{ 
                            background: '#ecfdf5', color: '#059669', padding: '4px 10px', 
                            borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' 
                          }}>
                            <FaDesktop size={10} /> Kiosk Map
                          </span>
                        ) : (
                          <span style={{ 
                            background: '#f1f5f9', color: '#64748b', padding: '4px 10px', 
                            borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' 
                          }}>
                            <FaMapMarkerAlt size={10} /> Standard
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontSize: '14px' }}>
                      {formatDate(map.createdAt)}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => navigate(`/map2?id=${map._id}`)}
                          style={{ 
                            width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0', 
                            background: 'white', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                          }}
                          title="Open in Editor"
                        >
                          <FaDesktop size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setEditingMap(map);
                            setShowEditModal(true);
                          }}
                          style={{ 
                            width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0', 
                            background: 'white', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                          }}
                          title="Edit Details"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(map)}
                          style={{ 
                            width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #fecaca', 
                            background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                          }}
                          title="Delete Map"
                        >
                          <FaTrash size={14} />
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

      {/* Edit Map Modal */}
      {showEditModal && editingMap && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '400px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>Edit Map Details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}><FaTimes /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#334155' }}>Map Name</label>
                <input 
                  type="text" 
                  value={editingMap.name}
                  onChange={(e) => setEditingMap({...editingMap, name: e.target.value})}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#334155' }}>
                  <input 
                    type="checkbox" 
                    checked={editingMap.isKioskMap}
                    onChange={(e) => setEditingMap({...editingMap, isKioskMap: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Set as Kiosk Map (Interactive)
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '360px', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px'
            }}>
              <FaExclamation />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Delete Map?</h2>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>
              Are you sure you want to delete this map? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer', flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '600', cursor: 'pointer', flex: 1 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SavedMaps;
