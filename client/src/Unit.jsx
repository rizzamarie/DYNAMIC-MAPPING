import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaTrash, FaRuler } from 'react-icons/fa';
import { FaSearch } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';

// Moved here before Unit component
const smallBtn = (color) => ({
  backgroundColor: color === 'red' ? '#dc3545' : '#1A2CA3',
  color: 'white',
  fontSize: '12px',
  padding: '6px 10px',
  margin: '2px',
  border: '1px solid rgba(26,44,163,0.4)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 700,
  boxShadow: '0 1px 4px rgba(26,44,163,0.18)',
});

function Unit({ isPopup = false }) {
  const [units, setUnits] = useState([]);
  const [unitName, setUnitName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);
  const [selectedUndo, setSelectedUndo] = useState([]);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [showCheckboxIds, setShowCheckboxIds] = useState([]);
  const checkboxTimers = useRef({});
  const nameInputRef = useRef(null);
  const location = useLocation();
  const role = new URLSearchParams(location.search).get('role');
  const isManager = role === 'manager';
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({ message: '', visible: false });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUnits();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(checkboxTimers.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  useEffect(() => {
    if (editingId && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editingId]);

  const fetchUnits = async () => {
    try {
      const res = await axios.get('http://localhost:5000/units');
      const sorted = res.data.sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
      );
      setUnits(sorted);
    } catch (err) {
      console.error('Failed to fetch units:', err);
    }

    // Fetch soft-deleted units from server and sync with localStorage
    try {
      const deletedRes = await axios.get('http://localhost:5000/units/deleted');
      const serverDeletedUnits = deletedRes.data;
      
      // Update localStorage with server data
      if (serverDeletedUnits.length > 0) {
        setRecentlyDeleted(serverDeletedUnits);
        localStorage.setItem('recentlyDeletedUnits', JSON.stringify(serverDeletedUnits));
      } else {
        // If no soft-deleted units on server, clear localStorage
        setRecentlyDeleted([]);
        localStorage.setItem('recentlyDeletedUnits', JSON.stringify([]));
      }
    } catch (err) {
      console.error('Failed to fetch deleted units:', err);
      
      // Fallback to localStorage if server request fails
      const saved = localStorage.getItem('recentlyDeletedUnits');
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const oneDay = 1 * 24 * 60 * 60 * 1000;

        const expired = parsed.filter(item => now - item.deletedAt >= oneDay);
        const valid = parsed.filter(item => now - item.deletedAt < oneDay);

        setRecentlyDeleted(valid);
        localStorage.setItem('recentlyDeletedUnits', JSON.stringify(valid));

        if (expired.length > 0) {
          console.log(`Removed ${expired.length} expired units from localStorage`);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unitName.trim()) return;

    const trimmedName = unitName.trim().toLowerCase();
    const isDuplicate = units.some(unit =>
      unit.name.trim().toLowerCase() === trimmedName &&
      unit._id !== editingId
    );

    if (isDuplicate) {
      showSnackbar('A unit with this name already exists.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/units/${editingId}`, {
          name: unitName.trim()
        });
        showSnackbar(`Updated unit "${unitName.trim()}"`);
      } else {
        await axios.post('http://localhost:5000/units', {
          name: unitName.trim()
        });
        showSnackbar(`Added unit "${unitName.trim()}"`);
      }

      setUnitName('');
      setEditingId(null);
      fetchUnits();
    } catch (err) {
      console.error('Failed to save unit:', err);
      if (err.response?.status === 409) {
        showSnackbar('A unit with this name already exists.');
      } else {
        showSnackbar('Failed to save unit. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (unit) => {
    setEditingId(unit._id);
    setUnitName(unit.name);
  };

  const handleDelete = async (id, name) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:5000/units/${id}`);
          const deleted = units.find(unit => unit._id === id);
          const updated = [...recentlyDeleted, { ...deleted, deletedAt: Date.now() }];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedUnits', JSON.stringify(updated));
          fetchUnits();
          showSnackbar(`Deleted unit "${name}"`);
        } catch (err) {
          console.error('Failed to delete unit:', err);
          Swal.fire('Error!', 'Failed to delete unit. Please try again.', 'error');
        }
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedUnits.length === 0) return;

    const selectedNames = units
      .filter(unit => selectedUnits.includes(unit._id))
      .map(unit => unit.name)
      .join(', ');

    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete the selected ${selectedUnits.length} unit${selectedUnits.length === 1 ? '' : 's'}?\n\nItems: ${selectedNames}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete them!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setDeleting(true);
        try {
          const toDelete = units.filter(unit => selectedUnits.includes(unit._id));
          await Promise.all(toDelete.map(unit => axios.delete(`http://localhost:5000/units/${unit._id}`)));
          const withDate = toDelete.map(unit => ({ ...unit, deletedAt: Date.now() }));
          const updated = [...recentlyDeleted, ...withDate];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedUnits', JSON.stringify(updated));
          setSelectedUnits([]);
          setShowCheckboxIds([]);
          fetchUnits();
          showSnackbar(`Deleted ${toDelete.length} unit${toDelete.length === 1 ? '' : 's'}.`);
        } catch (err) {
          console.error('Failed to delete selected units:', err);
          Swal.fire('Error!', 'Failed to delete selected units. Please try again.', 'error');
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const handleUndoClick = () => {
    setSelectedUndo([]);
    setShowUndoModal(true);
  };

  const handleRestoreAll = async () => {
    if (recentlyDeleted.length === 0) return;

    Swal.fire({
      title: 'Restore All Units?',
      text: `Are you sure you want to restore all ${recentlyDeleted.length} recently deleted unit${recentlyDeleted.length === 1 ? '' : 's'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore all!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const deletedCount = recentlyDeleted.length;
          let restoredCount = 0;
          const failedUnits = [];
          
          for (const unit of recentlyDeleted) {
            try {
              await axios.post('http://localhost:5000/units', {
                name: unit.name,
              });
              restoredCount++;
            } catch (error) {
              console.error(`Failed to restore unit ${unit.name}:`, error);
              if (error.response?.status === 409) {
                failedUnits.push(unit.name);
              } else {
                failedUnits.push(unit.name);
              }
            }
          }

          if (restoredCount > 0) {
            showSnackbar(`Successfully restored ${restoredCount} unit${restoredCount === 1 ? '' : 's'}!`);
          }
          
          if (failedUnits.length > 0) {
            showSnackbar(`Failed to restore: ${failedUnits.join(', ')} (already exist)`);
          }
          
          await fetchUnits();
          setShowUndoModal(false);
        } catch (error) {
          console.error('Error restoring all units:', error);
          showSnackbar('Failed to restore all units');
        }
      }
    });
  };

  const handlePermanentDelete = async (unitIds) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to PERMANENTLY delete the selected ${unitIds.length} unit${unitIds.length === 1 ? '' : 's'}? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete permanently!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          for (const id of unitIds) {
            await axios.delete(`http://localhost:5000/units/${id}?permanent=true`);
          }
          const remaining = recentlyDeleted.filter(u => !unitIds.includes(u._id));
          setRecentlyDeleted(remaining);
          localStorage.setItem('recentlyDeletedUnits', JSON.stringify(remaining));
          showSnackbar('✅ Units permanently deleted');
        } catch (error) {
          console.error('Error permanently deleting units:', error);
          showSnackbar('❌ Failed to permanently delete units');
        }
      }
    });
  };

  const handleUndoDelete = async (toRestore) => {
    if (toRestore.length === 0) {
      showSnackbar('Select at least one unit.');
      return;
    }

    Swal.fire({
      title: 'Restore Units?',
      text: `Restore ${toRestore.length} unit${toRestore.length === 1 ? '' : 's'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore them!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          console.log('Attempting to restore units:', toRestore);
          let restoredCount = 0;
          const failedUnits = [];
          
          for (const unit of toRestore) {
            try {
              await axios.post('http://localhost:5000/units', {
                name: unit.name,
              });
              restoredCount++;
            } catch (error) {
              console.error(`Failed to restore unit ${unit.name}:`, error);
              if (error.response?.status === 409) {
                failedUnits.push(unit.name);
              } else {
                failedUnits.push(unit.name);
              }
            }
          }
          
          if (restoredCount > 0) {
            showSnackbar(`Successfully restored ${restoredCount} unit${restoredCount === 1 ? '' : 's'}.`);
          }
          
          if (failedUnits.length > 0) {
            showSnackbar(`Failed to restore: ${failedUnits.join(', ')} (already exist)`);
          }
          
          await fetchUnits();
          setShowUndoModal(false);
        } catch (err) {
          console.error('Error restoring units:', err);
          showSnackbar('Failed to restore units.');
        }
      }
    });
  };

  const revealCheckbox = (id) => {
    if (!showCheckboxIds.includes(id)) {
      setShowCheckboxIds(prev => [...prev, id]);
    }

    if (!selectedUnits.includes(id)) {
      setSelectedUnits(prev => [...prev, id]);
    }

    clearTimeout(checkboxTimers.current[id]);
    checkboxTimers.current[id] = setTimeout(() => {
      setShowCheckboxIds(prev => prev.filter(i => i !== id));
      setSelectedUnits(prev => prev.filter(i => i !== id));
    }, 8000);
  };

  const handleSelectUnit = (id) => {
    const isSelected = selectedUnits.includes(id);
    const updated = isSelected
      ? selectedUnits.filter(uid => uid !== id)
      : [...selectedUnits, id];

    setSelectedUnits(updated);

    if (isSelected) {
      setShowCheckboxIds(prev => prev.filter(i => i !== id));
    } else {
      clearTimeout(checkboxTimers.current[id]);
    }
  };

  const handleSelectAll = () => {
    const allIds = units.map(unit => unit._id);
    setSelectedUnits(allIds);
    setShowCheckboxIds(allIds);
  };
  
  const showSnackbar = (message, duration = 3000) => {
    setSnackbar({ message, visible: true });
    setTimeout(() => setSnackbar({ message: '', visible: false }), duration);
  };

  const filteredUnits = units.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', background: 'linear-gradient(180deg,#f8fbff 0%,#eef4ff 100%)', minHeight: 'calc(100vh - 70px)' }}>
      <style>{`
        .ap-input:focus, .ap-select:focus, .ap-textarea:focus {
          outline: none;
          border-color: #0d47a1 !important;
          box-shadow: 0 0 0 3px rgba(13, 71, 161, 0.12);
        }
        .ap-btn { transition: transform .12s ease, box-shadow .2s ease; }
        .ap-btn:hover { transform: translateY(-1px); }
        .ap-btn:active { transform: translateY(0); }
        .ap-card {
          background: #ffffff;
          border: 1px solid #e3e8ff;
          border-radius: 12px;
          box-shadow: 0 8px 18px rgba(13,71,161,0.08);
        }
        .ap-section-title {
          font-weight: 900;
          color: #0f172a;
          letter-spacing: .2px;
        }
        .ap-subtle {
          color: #6b7280;
          font-size: 12px;
        }
      `}</style>

      <div style={{ flex: 1, padding: '0' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingLeft: 8, paddingRight: 8 }}>
          <div style={{ position: 'sticky', top: '70px', zIndex: 5, background: 'linear-gradient(90deg, #26A69A 0%, #B2DFDB 100%)', paddingTop: '24px', paddingBottom: '12px', borderBottom: '1px solid #26A69A', marginBottom: 16, borderRadius: '0 0 12px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <FaRuler size={18} color="#E0F2F1" />
                <h3 style={{ textAlign: 'left', color: '#E0F2F1', margin: 0, fontSize: 20, fontWeight: 900 }}>Unit Management</h3>
                <span className="ap-subtle" style={{ color: '#E0F2F1', opacity: 0.85 }}>Create, edit and organize units</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="ap-btn"
                  style={{ color: '#ffffff', padding: '8px 12px', borderRadius: '8px', textDecoration: 'none', fontWeight: 800, fontSize: 13, boxShadow: '0 2px 6px rgba(0,0,0,0.08)', backgroundColor: '#6b7280', border: '1px solid #4b5563' }}
                >
                  Back
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="ap-card" style={{ width: '32%', padding: 16 }}>
              <h4 style={{ margin: 0, marginBottom: 12, fontWeight: 900, color: '#0f172a' }}>{editingId ? 'Edit Unit' : 'Add Unit'}</h4>
              <form onSubmit={handleSubmit}>
                <label style={{ display: 'block', fontWeight: 800, color: '#374151', marginBottom: 6, fontSize: 13 }}>Unit Name *</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g., pieces"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  style={inputStyle}
                  className="ap-input"
                  required
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button 
                    type="submit" 
                    className="ap-btn"
                    style={submitBtnStyle}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : (editingId ? 'Update' : 'Submit')}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      className="ap-btn"
                      onClick={() => {
                        setEditingId(null);
                        setUnitName('');
                      }}
                      style={cancelBtnStyle}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Search + Actions */}
              <div className="ap-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e3e8ff', borderRadius: 10, padding: '8px 12px', background: '#fff' }}>
                    <FaSearch size={14} color="#475569" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search unit by name..."
                      className="ap-input"
                      style={{ border: 'none', outline: 'none', flex: 1, padding: 0, background: 'transparent' }}
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="ap-btn"
                        style={{ background: '#e5e7eb', color: '#111827', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: 8, fontWeight: 700 }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {units.length > 0 && selectedUnits.length === units.length ? (
                      <>
                        <button
                          style={{ ...selectBtnStyle, backgroundColor: '#6c757d' }}
                          disabled
                          title={`All ${units.length} units selected`}
                          className="ap-btn"
                        >
                          Select All ({units.length})
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUnits([]);
                            setShowCheckboxIds([]);
                          }}
                          style={{ ...dangerBtnStyle }}
                          title="Click to deselect all units"
                          className="ap-btn"
                        >
                          Deselect All
                        </button>
                      </>
                    ) : selectedUnits.length > 0 ? (
                      <button
                        onClick={handleSelectAll}
                        style={{ ...selectBtnStyle, backgroundColor: '#17a2b8', border: '1px solid #0e7490' }}
                        title={`Selected ${selectedUnits.length} out of ${units.length || 0} units`}
                        className="ap-btn"
                      >
                        Selected ({selectedUnits.length})
                      </button>
                    ) : (
                      <button
                        onClick={handleSelectAll}
                        style={selectBtnStyle}
                        title={`Click to select all ${units.length || 0} units`}
                        className="ap-btn"
                      >
                        Select All
                      </button>
                    )}

                    {selectedUnits.length > 0 && (
                      <button
                        onClick={handleDeleteSelected}
                        style={deleteBtnStyle}
                        title="Delete Selected"
                        className="ap-btn"
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : (<><FaTrash size={14} />&nbsp;Delete Selected</>)}
                      </button>
                    )}

                    {recentlyDeleted.length > 0 && (
                      <button
                        onClick={handleUndoClick}
                        style={{ ...warnBtnStyle }}
                        title="Restore recently deleted units"
                        className="ap-btn"
                      >
                        ↩ Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* List (only this scrolls) */}
              <div className="ap-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  maxHeight: '540px',
                  overflowY: 'auto',
                  borderRadius: '12px'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'center' }}>
                        <th style={{
                          ...thStyle,
                          position: 'sticky',
                          top: 0,
                          backgroundColor: '#00695C',
                          color: '#ffffff',
                          zIndex: 2,
                          borderBottom: '1px solid #004D40'
                        }}>
                          Unit
                        </th>
                        <th style={{
                          ...thStyle,
                          position: 'sticky',
                          top: 0,
                          backgroundColor: '#00695C',
                          color: '#ffffff',
                          zIndex: 2,
                          borderBottom: '1px solid #004D40'
                        }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUnits.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                            No units found{search ? ` for "${search}"` : ''}.
                          </td>
                        </tr>
                      ) : filteredUnits.map(unit => (
                        <tr
                          key={unit._id}
                          style={{ textAlign: 'center', background: '#E0F2F1', transition: 'background 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#E0F2F1'; }}
                        >
                          <td style={tdStyle}>{unit.name}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                            <button onClick={() => handleEdit(unit)} style={smallBtn('blue')} className="ap-btn">✎</button>
                            {showCheckboxIds.includes(unit._id) ? (
                              <input
                                type="checkbox"
                                checked={selectedUnits.includes(unit._id)}
                                onChange={() => handleSelectUnit(unit._id)}
                                style={{ marginLeft: '10px', transform: 'scale(1.2)', cursor: 'pointer' }}
                                title="Select to delete"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => revealCheckbox(unit._id)}
                                style={{ cursor: 'pointer', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}
                                title="Mark for delete"
                              >
                                <FaTrash size={16} />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {snackbar.visible && (
                <div style={{
                  position: 'fixed',
                  bottom: '30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#111827',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                  zIndex: 9999,
                  fontSize: '14px'
                }}>
                  {snackbar.message}
                </div>
              )}
            </div>
          </div>

          {/* Undo Modal */}
          {showUndoModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
              justifyContent: 'center', alignItems: 'center', zIndex: 999
            }}>
              <div className="ap-card" style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '12px',
                maxWidth: '700px',
                width: '90%',
                maxHeight: '75vh',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                overflowY: 'auto'
              }}>
                <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Restore Deleted Units</h2>
                <p className="ap-subtle" style={{ marginTop: '-5px', marginBottom: '12px' }}>
                  ⚠️ Deleted units are permanently removed after 24 hours.
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>Select units to restore:</h4>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {recentlyDeleted.length} unit{recentlyDeleted.length !== 1 ? 's' : ''} available
                  </div>
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px', marginBottom: '15px' }}>
                  {recentlyDeleted.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', padding: '15px', fontSize: '14px' }}>No deleted units to restore</p>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {recentlyDeleted.map(item => (
                        <li key={item._id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', border: '1px solid #B2DFDB', borderRadius: '4px', backgroundColor: '#E0F2F1' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, cursor: 'pointer' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{item.name}</span>
                            {item.deletedAt && (
                              <span style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                                Deleted: {new Date(item.deletedAt).toLocaleDateString()} at {new Date(item.deletedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </label>
                          <input
                            type="checkbox"
                            checked={selectedUndo.includes(item._id)}
                            onChange={(e) => {
                              setSelectedUndo(prev => e.target.checked ? [...prev, item._id] : prev.filter(id => id !== item._id));
                            }}
                            style={{ transform: 'scale(1.1)', marginLeft: '12px' }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleRestoreAll}
                      className="ap-btn"
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #16a34a',
                        cursor: 'pointer',
                        fontWeight: 900,
                        fontSize: '12px',
                        color: 'white',
                        backgroundColor: '#22c55e'
                      }}
                      disabled={recentlyDeleted.length === 0}
                    >
                      Restore All ({recentlyDeleted.length})
                    </button>
                    <button
                      onClick={() => {
                        const selectedItems = recentlyDeleted.filter(item => selectedUndo.includes(item._id));
                        handleUndoDelete(selectedItems);
                        setShowUndoModal(false);
                        setSelectedUndo([]);
                      }}
                      disabled={selectedUndo.length === 0}
                      className="ap-btn"
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #d1a307',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        backgroundColor: selectedUndo.length === 0 ? '#ccc' : '#ffc107',
                        color: selectedUndo.length === 0 ? '#666' : '#000',
                        cursor: selectedUndo.length === 0 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Restore Selected{selectedUndo.length > 0 ? ` (${selectedUndo.length})` : ''}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        if (selectedUndo.length === 0) {
                          showSnackbar('Please select units to delete permanently');
                          return;
                        }
                        handlePermanentDelete(selectedUndo);
                        setSelectedUndo([]);
                      }}
                      disabled={selectedUndo.length === 0}
                      className="ap-btn"
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #b02a37',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        backgroundColor: selectedUndo.length === 0 ? '#ccc' : '#dc3545',
                        color: 'white',
                        cursor: selectedUndo.length === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <FaTrash size={12} />
                      Delete Permanently{selectedUndo.length > 0 ? ` (${selectedUndo.length})` : ''}
                    </button>
                    <button
                      onClick={() => {
                        setShowUndoModal(false);
                        setSelectedUndo([]);
                      }}
                      className="ap-btn"
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #4b5563',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        color: 'white',
                        backgroundColor: '#6b7280'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom back button removed; back now in header */}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: '10px',
  borderRadius: '8px',
  border: '1px solid #e3e8ff',
  background: '#ffffff',
};

const addBtnStyle = {
  backgroundColor: '#0d47a1',
  color: 'white',
  padding: '8px 16px',
  borderRadius: '10px',
  fontWeight: 'bold',
  border: '1px solid #08306b',
  cursor: 'pointer',
};

const thStyle = {
  padding: '12px',
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#ffffff'
};

const tdStyle = {
  padding: '12px',
  borderBottom: '1px solid #B2DFDB',
  fontSize: '14px',
  color: '#102A27',
  background: '#E0F2F1'
};

const selectBtnStyle = {
  padding: '8px 14px',
  backgroundColor: '#0d47a1',
  color: 'white',
  border: '1px solid #08306b',
  borderRadius: '10px',
  cursor: 'pointer',
  fontWeight: 800
};

const deleteBtnStyle = {
  backgroundColor: '#dc2626',
  color: 'white',
  padding: '8px 14px',
  borderRadius: '10px',
  border: '1px solid #991b1b',
  cursor: 'pointer',
  fontWeight: 800
};

const warnBtnStyle = {
  backgroundColor: '#ffc107',
  color: '#111827',
  padding: '8px 14px',
  borderRadius: '10px',
  border: '1px solid #d1a307',
  cursor: 'pointer',
  fontWeight: 800
};

const dangerBtnStyle = {
  backgroundColor: '#dc3545',
  color: 'white',
  padding: '8px 14px',
  borderRadius: '10px',
  border: '1px solid #b02a37',
  cursor: 'pointer',
  fontWeight: 800
};

const submitBtnStyle = { backgroundColor: '#0d47a1', border: '1px solid #08306b', color: 'white', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, letterSpacing: '.2px', boxShadow: '0 2px 6px rgba(13,71,161,0.25)' };
const cancelBtnStyle = { backgroundColor: '#6b7280', border: '1px solid #4b5563', color: 'white', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, letterSpacing: '.1px' };

export default Unit;
