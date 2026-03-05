import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaTrash, FaAward } from 'react-icons/fa';
import { FaSearch } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';

// Moved here before Brand component
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

function Brand({ isPopup = false }) {
  const [brands, setBrands] = useState([]);
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [selectedBrands, setSelectedBrands] = useState([]);
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
    fetchBrands();
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

  const fetchBrands = async () => {
    try {
      const res = await axios.get('http://localhost:5000/brands');
      const sorted = res.data.sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
      );
      setBrands(sorted);
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    }

    // Fetch soft-deleted brands from server and sync with localStorage
    try {
      const deletedRes = await axios.get('http://localhost:5000/brands/deleted');
      const serverDeletedBrands = deletedRes.data;
      
      // Update localStorage with server data
      if (serverDeletedBrands.length > 0) {
        setRecentlyDeleted(serverDeletedBrands);
        localStorage.setItem('recentlyDeletedBrands', JSON.stringify(serverDeletedBrands));
      } else {
        // If no soft-deleted brands on server, clear localStorage
        setRecentlyDeleted([]);
        localStorage.setItem('recentlyDeletedBrands', JSON.stringify([]));
      }
    } catch (err) {
      console.error('Failed to fetch deleted brands:', err);
      
      // Fallback to localStorage if server request fails
      const saved = localStorage.getItem('recentlyDeletedBrands');
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        const oneDay = 1 * 24 * 60 * 60 * 1000;

        const expired = parsed.filter(item => now - item.deletedAt >= oneDay);
        const valid = parsed.filter(item => now - item.deletedAt < oneDay);

        setRecentlyDeleted(valid);
        localStorage.setItem('recentlyDeletedBrands', JSON.stringify(valid));

        if (expired.length > 0) {
          console.log(`Removed ${expired.length} expired brands from localStorage`);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    const trimmedName = brandName.trim().toLowerCase();
    const isDuplicate = brands.some(brand =>
      brand.name.trim().toLowerCase() === trimmedName &&
      brand._id !== editingId
    );

    if (isDuplicate) {
      showSnackbar('A brand with this name already exists.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/brands/${editingId}`, {
          name: brandName.trim(),
          description: brandDescription.trim()
        });
        showSnackbar(`Updated brand "${brandName.trim()}"`);
      } else {
        await axios.post('http://localhost:5000/brands', {
          name: brandName.trim(),
          description: brandDescription.trim()
        });
        showSnackbar(`Added brand "${brandName.trim()}"`);
      }

      setBrandName('');
      setBrandDescription('');
      setEditingId(null);
      fetchBrands();
    } catch (err) {
      console.error('Failed to save brand:', err);
      if (err.response?.status === 409) {
        showSnackbar('A brand with this name already exists.');
      } else {
        showSnackbar('Failed to save brand. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (brand) => {
    setEditingId(brand._id);
    setBrandName(brand.name);
    setBrandDescription(brand.description || '');
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
          await axios.delete(`http://localhost:5000/brands/${id}`);
          const deleted = brands.find(brand => brand._id === id);
          const updated = [...recentlyDeleted, { ...deleted, deletedAt: Date.now() }];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedBrands', JSON.stringify(updated));
          fetchBrands();
          showSnackbar(`Deleted brand "${name}"`);
        } catch (err) {
          console.error('Failed to delete brand:', err);
          Swal.fire('Error!', 'Failed to delete brand. Please try again.', 'error');
        }
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedBrands.length === 0) return;

    const selectedNames = brands
      .filter(brand => selectedBrands.includes(brand._id))
      .map(brand => brand.name)
      .join(', ');

    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete the selected ${selectedBrands.length} brand${selectedBrands.length === 1 ? '' : 's'}?\n\nItems: ${selectedNames}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete them!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setDeleting(true);
        try {
          const toDelete = brands.filter(brand => selectedBrands.includes(brand._id));
          await Promise.all(toDelete.map(brand => axios.delete(`http://localhost:5000/brands/${brand._id}`)));
          const withDate = toDelete.map(brand => ({ ...brand, deletedAt: Date.now() }));
          const updated = [...recentlyDeleted, ...withDate];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedBrands', JSON.stringify(updated));
          setSelectedBrands([]);
          setShowCheckboxIds([]);
          fetchBrands();
          showSnackbar(`Deleted ${toDelete.length} brand${toDelete.length === 1 ? '' : 's'}.`);
        } catch (err) {
          console.error('Failed to delete selected brands:', err);
          Swal.fire('Error!', 'Failed to delete selected brands. Please try again.', 'error');
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
      title: 'Restore All Brands?',
      text: `Are you sure you want to restore all ${recentlyDeleted.length} recently deleted brand${recentlyDeleted.length === 1 ? '' : 's'}?`,
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
          const failedBrands = [];
          
          for (const brand of recentlyDeleted) {
            try {
              await axios.post('http://localhost:5000/brands', {
                name: brand.name,
                description: brand.description
              });
              restoredCount++;
            } catch (error) {
              console.error(`Failed to restore brand ${brand.name}:`, error);
              failedBrands.push(brand.name);
            }
          }

          if (restoredCount > 0) {
            showSnackbar(`Successfully restored ${restoredCount} brand${restoredCount === 1 ? '' : 's'}!`);
          }
          
          if (failedBrands.length > 0) {
            showSnackbar(`Failed to restore some brands (already exist)`);
          }
          
          await fetchBrands();
          setShowUndoModal(false);
        } catch (error) {
          console.error('Error restoring all brands:', error);
          showSnackbar('Failed to restore all brands');
        }
      }
    });
  };

  const handlePermanentDelete = async (brandIds) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to PERMANENTLY delete the selected ${brandIds.length} brand${brandIds.length === 1 ? '' : 's'}? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete permanently!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          for (const id of brandIds) {
            await axios.delete(`http://localhost:5000/brands/${id}?permanent=true`);
          }
          const remaining = recentlyDeleted.filter(b => !brandIds.includes(b._id));
          setRecentlyDeleted(remaining);
          localStorage.setItem('recentlyDeletedBrands', JSON.stringify(remaining));
          showSnackbar('✅ Brands permanently deleted');
        } catch (error) {
          console.error('Error permanently deleting brands:', error);
          showSnackbar('❌ Failed to permanently delete brands');
        }
      }
    });
  };

  const handleUndoDelete = async (toRestore) => {
    if (toRestore.length === 0) {
      showSnackbar('Select at least one brand.');
      return;
    }

    Swal.fire({
      title: 'Restore Brands?',
      text: `Restore ${toRestore.length} brand${toRestore.length === 1 ? '' : 's'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore them!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          let restoredCount = 0;
          const failedBrands = [];
          
          for (const brand of toRestore) {
            try {
              await axios.post('http://localhost:5000/brands', {
                name: brand.name,
                description: brand.description
              });
              restoredCount++;
            } catch (error) {
              console.error(`Failed to restore brand ${brand.name}:`, error);
              failedBrands.push(brand.name);
            }
          }
          
          if (restoredCount > 0) {
            showSnackbar(`Successfully restored ${restoredCount} brand${restoredCount === 1 ? '' : 's'}.`);
          }
          
          if (failedBrands.length > 0) {
            showSnackbar(`Failed to restore some brands (already exist)`);
          }
          
          await fetchBrands();
          setShowUndoModal(false);
        } catch (err) {
          console.error('Error restoring brands:', err);
          showSnackbar('Failed to restore brands.');
        }
      }
    });
  };

  const revealCheckbox = (id) => {
    if (!showCheckboxIds.includes(id)) {
      setShowCheckboxIds(prev => [...prev, id]);
    }

    if (!selectedBrands.includes(id)) {
      setSelectedBrands(prev => [...prev, id]);
    }

    clearTimeout(checkboxTimers.current[id]);
    checkboxTimers.current[id] = setTimeout(() => {
      setShowCheckboxIds(prev => prev.filter(i => i !== id));
      setSelectedBrands(prev => prev.filter(i => i !== id));
    }, 8000);
  };

  const handleSelectBrand = (id) => {
    const isSelected = selectedBrands.includes(id);
    const updated = isSelected
      ? selectedBrands.filter(uid => uid !== id)
      : [...selectedBrands, id];

    setSelectedBrands(updated);

    if (isSelected) {
      setShowCheckboxIds(prev => prev.filter(i => i !== id));
    } else {
      clearTimeout(checkboxTimers.current[id]);
    }
  };

  const handleSelectAll = () => {
    const allIds = brands.map(brand => brand._id);
    setSelectedBrands(allIds);
    setShowCheckboxIds(allIds);
  };
  
  const showSnackbar = (message, duration = 3000) => {
    setSnackbar({ message, visible: true });
    setTimeout(() => setSnackbar({ message: '', visible: false }), duration);
  };

  const filteredBrands = brands.filter(b => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (b.name || '').toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q);
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
          <div style={{ position: 'sticky', top: '70px', zIndex: 5, background: 'linear-gradient(90deg, #00695C 0%, #26A69A 100%)', paddingTop: '24px', paddingBottom: '12px', borderBottom: '1px solid #004D40', marginBottom: 16, borderRadius: '0 0 12px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <FaAward size={18} color="#E0F2F1" />
                <h3 style={{ textAlign: 'left', color: '#E0F2F1', margin: 0, fontSize: 20, fontWeight: 900 }}>Brand Management</h3>
                <span className="ap-subtle" style={{ color: '#E0F2F1', opacity: 0.85 }}>Create, edit and organize brands</span>
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
              <h4 style={{ margin: 0, marginBottom: 12, fontWeight: 900, color: '#0f172a' }}>{editingId ? 'Edit Brand' : 'Add Brand'}</h4>
              <form onSubmit={handleSubmit}>
                <label style={{ display: 'block', fontWeight: 800, color: '#374151', marginBottom: 6, fontSize: 13 }}>Brand Name *</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g., Nike, Apple"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  style={inputStyle}
                  className="ap-input"
                  required
                />
                <label style={{ display: 'block', fontWeight: 800, color: '#374151', marginBottom: 6, fontSize: 13, marginTop: 12 }}>Description</label>
                <textarea
                  placeholder="Brand description (optional)"
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  className="ap-textarea"
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
                        setBrandName('');
                        setBrandDescription('');
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
                      placeholder="Search brand by name or description..."
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
                    {brands.length > 0 && selectedBrands.length === brands.length ? (
                      <>
                        <button
                          style={{ ...selectBtnStyle, backgroundColor: '#6c757d' }}
                          disabled
                          title={`All ${brands.length} brands selected`}
                          className="ap-btn"
                        >
                          Select All ({brands.length})
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBrands([]);
                            setShowCheckboxIds([]);
                          }}
                          style={{ ...dangerBtnStyle }}
                          title="Click to deselect all brands"
                          className="ap-btn"
                        >
                          Deselect All
                        </button>
                      </>
                    ) : selectedBrands.length > 0 ? (
                      <button
                        onClick={handleSelectAll}
                        style={{ ...selectBtnStyle, backgroundColor: '#17a2b8', border: '1px solid #0e7490' }}
                        title={`Selected ${selectedBrands.length} out of ${brands.length || 0} brands`}
                        className="ap-btn"
                      >
                        Selected ({selectedBrands.length})
                      </button>
                    ) : (
                      <button
                        onClick={handleSelectAll}
                        style={selectBtnStyle}
                        title={`Click to select all ${brands.length || 0} brands`}
                        className="ap-btn"
                      >
                        Select All
                      </button>
                    )}

                    {selectedBrands.length > 0 && (
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
                        title="Restore recently deleted brands"
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
                          Brand
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
                          Description
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
                      {filteredBrands.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                            No brands found{search ? ` for "${search}"` : ''}.
                          </td>
                        </tr>
                      ) : filteredBrands.map(brand => (
                        <tr
                          key={brand._id}
                          style={{ textAlign: 'center', background: '#E0F2F1', transition: 'background 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#E0F2F1'; }}
                        >
                          <td style={tdStyle}>{brand.name}</td>
                          <td style={tdStyle}>{brand.description || '-'}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                            <button onClick={() => handleEdit(brand)} style={smallBtn('blue')} className="ap-btn">✎</button>
                            {showCheckboxIds.includes(brand._id) ? (
                              <input
                                type="checkbox"
                                checked={selectedBrands.includes(brand._id)}
                                onChange={() => handleSelectBrand(brand._id)}
                                style={{ marginLeft: '10px', transform: 'scale(1.2)', cursor: 'pointer' }}
                                title="Select to delete"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => revealCheckbox(brand._id)}
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
                <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Restore Deleted Brands</h2>
                <p className="ap-subtle" style={{ marginTop: '-5px', marginBottom: '12px' }}>
                  ⚠️ Deleted brands are permanently removed after 24 hours.
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>Select brands to restore:</h4>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {recentlyDeleted.length} brand{recentlyDeleted.length !== 1 ? 's' : ''} available
                  </div>
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px', marginBottom: '15px' }}>
                  {recentlyDeleted.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', padding: '15px', fontSize: '14px' }}>No deleted brands to restore</p>
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
                          showSnackbar('Please select brands to delete permanently');
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

export default Brand;
