import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  FaUserCircle, FaHome, FaMap, FaBox, FaTrash, FaPen, FaPowerOff, FaTags, FaTabletAlt, FaSearch
} from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// Moved here before Category component
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

function Category({ isPopup = false }) {
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
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
  const [showUndoOptions, setShowUndoOptions] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', visible: false });
  const [search, setSearch] = useState('');
  const [avatarError, setAvatarError] = useState(false);


  useEffect(() => {
    fetchCategories();
    const storedUsername = localStorage.getItem('currentUserUsername');
    const storedName = localStorage.getItem('currentUserName');
    const storedProfileImage = localStorage.getItem('currentUserProfileImage');
    if (storedUsername) {
      setCurrentUser({ 
        username: storedUsername,
        name: storedName,
        profileImage: storedProfileImage
      });
      setAvatarError(false);
      if (!storedProfileImage) {
        axios.get('http://localhost:5000/users')
          .then(res => {
            const user = (res.data || []).find(u => u.username === storedUsername);
            if (user) {
              if (user.profileImage) {
                localStorage.setItem('currentUserProfileImage', user.profileImage);
              }
              setCurrentUser({
                username: user.username,
                name: user.name || storedName,
                profileImage: user.profileImage || null,
              });
              setAvatarError(false);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    if (editingId && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editingId]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('http://localhost:5000/categories');
      const sorted = res.data.sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
      );
      setCategories(sorted);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }

    const saved = localStorage.getItem('recentlyDeletedCategories');
    if (saved) {
      const parsed = JSON.parse(saved);
      const now = Date.now();
      const oneDay = 1 * 24 * 60 * 60 * 1000;

      const expired = parsed.filter(item => now - item.deletedAt >= oneDay);
      const valid = parsed.filter(item => now - item.deletedAt < oneDay);

      setRecentlyDeleted(valid);
      localStorage.setItem('recentlyDeletedCategories', JSON.stringify(valid));

      expired.forEach(async (cat) => {
        try {
          await axios.delete(`http://localhost:5000/categories/${cat._id}`);
          console.log(`Permanently deleted: ${cat.name}`);
        } catch (err) {
          console.error(`Failed to permanently delete ${cat.name}:`, err);
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    const trimmedName = categoryName.trim().toLowerCase();
    const isDuplicate = categories.some(cat =>
      cat.name.trim().toLowerCase() === trimmedName &&
      cat._id !== editingId
    );

    if (isDuplicate) {
      Swal.fire('Error', 'A category with this name already exists.', 'error');
      return;
    }

    try {
      const method = editingId ? axios.put : axios.post;
      const url = editingId
        ? `http://localhost:5000/categories/${editingId}`
        : 'http://localhost:5000/categories';
      await method(url, { name: categoryName, description });
      setCategoryName('');
      setDescription('');
      setEditingId(null);
      fetchCategories();
      localStorage.setItem('categoryUpdated', Date.now());
      showSnackbar(editingId ? 'Updated category' : 'Added category');
    } catch (err) {
      Swal.fire('Error', 'Error saving category', 'error');
    }
  };

  const handleEdit = (category) => {
    setCategoryName(category.name);
    setDescription(category.description || '');
    setEditingId(category._id);
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
          await axios.delete(`http://localhost:5000/categories/${id}`);
          const deleted = categories.find(cat => cat._id === id);
          const updated = [...recentlyDeleted, { ...deleted, deletedAt: Date.now() }];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedCategories', JSON.stringify(updated));
          fetchCategories();
          localStorage.setItem('categoryUpdated', Date.now());
          showSnackbar(`Deleted category "${name}"`);
        } catch (err) {
          Swal.fire('Error!', 'Failed to delete category.', 'error');
        }
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedCategories.length === 0) return;

    const selectedNames = categories
      .filter(cat => selectedCategories.includes(cat._id))
      .map(cat => cat.name)
      .join(', ');

    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete the selected ${selectedCategories.length} categor${selectedCategories.length === 1 ? 'y' : 'ies'}?\n\nItems: ${selectedNames}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete them!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setDeleting(true);
        try {
          const toDelete = categories.filter(cat => selectedCategories.includes(cat._id));
          await Promise.all(toDelete.map(cat => axios.delete(`http://localhost:5000/categories/${cat._id}`)));
          const withDate = toDelete.map(cat => ({ ...cat, deletedAt: Date.now() }));
          const updated = [...recentlyDeleted, ...withDate];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedCategories', JSON.stringify(updated));
          setSelectedCategories([]);
          setShowCheckboxIds([]);
          fetchCategories();
          showSnackbar(`Deleted ${toDelete.length} categor${toDelete.length === 1 ? 'y' : 'ies'}.`);
        } catch (err) {
          Swal.fire('Error!', 'Failed to delete selected categories.', 'error');
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

const handleUndoAll = async () => {
  if (recentlyDeleted.length === 0) return;

  Swal.fire({
    title: 'Are you sure?',
    text: `Restore all (${recentlyDeleted.length}) deleted categories?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#1A2CA3',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, restore all!'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await Promise.all(
          recentlyDeleted.map(cat =>
            axios.post('http://localhost:5000/categories', {
              name: cat.name,
              description: cat.description,
            })
          )
        );
        setRecentlyDeleted([]);
        localStorage.setItem('recentlyDeletedCategories', JSON.stringify([]));
        showSnackbar(`Restored all ${recentlyDeleted.length} categories.`);
        fetchCategories();
        setShowUndoModal(false);
      } catch (err) {
        Swal.fire('Error!', 'Failed to undo all deleted categories.', 'error');
      }
    }
  });
};

  const handleUndoDelete = async (toRestore) => {
    if (toRestore.length === 0) {
      Swal.fire('Info', 'Select at least one category.', 'info');
      return;
    }

    Swal.fire({
      title: 'Are you sure?',
      text: `Restore ${toRestore.length} categor${toRestore.length === 1 ? 'y' : 'ies'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await Promise.all(
            toRestore.map(cat =>
              axios.post('http://localhost:5000/categories', {
                name: cat.name,
                description: cat.description,
              })
            )
          );
          const remaining = recentlyDeleted.filter(cat => !toRestore.find(c => c._id === cat._id));
          setRecentlyDeleted(remaining);
          localStorage.setItem('recentlyDeletedCategories', JSON.stringify(remaining));
          showSnackbar(`Restored ${toRestore.length} categor${toRestore.length === 1 ? 'y' : 'ies'}.`);
          fetchCategories();
        } catch (err) {
          Swal.fire('Error!', 'Failed to undo delete.', 'error');
        }
      }
    });
  };

  const handlePermanentDelete = async (categoryIds) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to PERMANENTLY delete the selected ${categoryIds.length} categor${categoryIds.length === 1 ? 'y' : 'ies'}? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete permanently!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          for (const id of categoryIds) {
            await axios.delete(`http://localhost:5000/categories/${id}?permanent=true`);
          }
          const remaining = recentlyDeleted.filter(c => !categoryIds.includes(c._id));
          setRecentlyDeleted(remaining);
          localStorage.setItem('recentlyDeletedCategories', JSON.stringify(remaining));
          showSnackbar('✅ Categories permanently deleted');
        } catch (error) {
          console.error('Error permanently deleting categories:', error);
          showSnackbar('❌ Failed to permanently delete categories');
        }
      }
    });
  };

  const revealCheckbox = (id) => {
    if (!showCheckboxIds.includes(id)) {
      setShowCheckboxIds(prev => [...prev, id]);
    }

    if (!selectedCategories.includes(id)) {
      setSelectedCategories(prev => [...prev, id]);
    }

    clearTimeout(checkboxTimers.current[id]);
    checkboxTimers.current[id] = setTimeout(() => {
      setShowCheckboxIds(prev => prev.filter(i => i !== id));
      setSelectedCategories(prev => prev.filter(i => i !== id));
    }, 8000);
  };

  const handleSelectCategory = (id) => {
    const isSelected = selectedCategories.includes(id);
    const updated = isSelected
      ? selectedCategories.filter(cid => cid !== id)
      : [...selectedCategories, id];

    setSelectedCategories(updated);

    if (isSelected) {
      setShowCheckboxIds(prev => prev.filter(i => i !== id));
    } else {
      clearTimeout(checkboxTimers.current[id]);
    }
  };

  const handleSelectAll = () => {
    const allIds = categories.map(cat => cat._id);
    setSelectedCategories(allIds);
    setShowCheckboxIds(allIds); // 👈 ensures checkboxes are shown
  };
  
  const showSnackbar = (message, duration = 3000) => {
    setSnackbar({ message, visible: true });
    setTimeout(() => setSnackbar({ message: '', visible: false }), duration);
  };
  
  const sidebarItem = (to, icon, label) => (
    <Link to={to} style={sidebarLink}>
      {icon}
      <span style={labelStyle}>{label}</span>
    </Link>
  );

  const filteredCategories = categories.filter(cat => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = (cat.name || '').toLowerCase();
    const desc = (cat.description || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
  
  

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', background: 'transparent' }}>
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
        .ap-chip {
          background: #e7f3ff;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          border: 1px solid #cfe3ff;
          color: #0f172a;
        }
      `}</style>

      <div style={formContainerStyle}>
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingLeft: 8, paddingRight: 8 }}>
          <div style={stickyHeaderWrap}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <FaTags size={18} color="#E0F2F1" />
                <h3 style={{ ...headerStyle, margin: 0, fontSize: 20, fontWeight: 900 }}>Category Management</h3>
                <span className="ap-subtle" style={{ color: '#E0F2F1', opacity: 0.85 }}>Create, edit and organize categories</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => navigate(-1)} className="ap-btn" style={{ ...headerBtnStyle, backgroundColor: '#6b7280', border: '1px solid #4b5563' }}>Back</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="ap-card" style={{ width: '32%', padding: 16 }}>
              <h4 style={{ margin: 0, marginBottom: 12, fontWeight: 900, color: '#0f172a' }}>{editingId ? 'Edit Category' : 'Add Category'}</h4>
              <form onSubmit={handleSubmit}>
                <label style={formLabelStyle}>Category Name *</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g., Clothing"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  style={inputStyle}
                  className="ap-input"
                  required
                />
                <label style={formLabelStyle}>Description</label>
                <textarea
                  placeholder="Short description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ ...textAreaStyle, height: '90px' }}
                  className="ap-textarea"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="submit" className="ap-btn" style={submitBtnStyle}>{editingId ? 'Update' : 'Submit'}</button>
                  {editingId && (
                    <button
                      type="button"
                      className="ap-btn"
                      style={cancelBtnStyle}
                      onClick={() => { setEditingId(null); setCategoryName(''); setDescription(''); }}
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
                      placeholder="Search category by name or description..."
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
                    {categories.length > 0 && selectedCategories.length === categories.length ? (
                      <>
                        <button
                          style={{ ...selectBtnStyle, backgroundColor: '#6c757d' }}
                          disabled
                          title={`All ${categories.length} categories selected`}
                          className="ap-btn"
                        >
                          Select All ({categories.length})
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCategories([]);
                            setShowCheckboxIds([]);
                          }}
                          style={{ ...dangerBtnStyle }}
                          title="Click to deselect all categories"
                          className="ap-btn"
                        >
                          Deselect All
                        </button>
                      </>
                    ) : selectedCategories.length > 0 ? (
                      <button
                        onClick={handleSelectAll}
                        style={{ ...selectBtnStyle, backgroundColor: '#17a2b8', border: '1px solid #0e7490' }}
                        title={`Selected ${selectedCategories.length} out of ${categories.length || 0} categories`}
                        className="ap-btn"
                      >
                        Selected ({selectedCategories.length})
                      </button>
                    ) : (
                      <button
                        onClick={handleSelectAll}
                        style={selectBtnStyle}
                        title={`Click to select all ${categories.length || 0} categories`}
                        className="ap-btn"
                      >
                        Select All
                      </button>
                    )}

                    {selectedCategories.length > 0 && (
                      <button
                        onClick={handleDeleteSelected}
                        style={deleteBtnStyle}
                        title="Delete Selected"
                        className="ap-btn"
                      >
                        <FaTrash size={14} /> &nbsp;Delete Selected
                      </button>
                    )}

                    {recentlyDeleted.length > 0 && (
                      <button
                        onClick={handleUndoClick}
                        style={{ ...warnBtnStyle }}
                        title="Undo recently deleted"
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
                          Category
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
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
                            No categories found{search ? ` for "${search}"` : ''}.
                          </td>
                        </tr>
                      ) : filteredCategories.map(cat => (
                        <tr
                          key={cat._id}
                          style={{ textAlign: 'center', background: '#E0F2F1', transition: 'background 0.2s ease' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#E0F2F1'; }}
                        >
                          <td style={tdStyle}>{cat.name}</td>
                          <td style={tdStyle}>{cat.description || '-'}</td>
                          <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                            <button onClick={() => handleEdit(cat)} style={smallBtn('blue')} className="ap-btn">✎</button>
                            {showCheckboxIds.includes(cat._id) ? (
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(cat._id)}
                                onChange={() => handleSelectCategory(cat._id)}
                                style={{ marginLeft: '10px', transform: 'scale(1.2)', cursor: 'pointer' }}
                                title="Select to delete"
                                autoFocus
                              />
                            ) : (
                              <span
                                onClick={() => revealCheckbox(cat._id)}
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
                <h2 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Restore Deleted Categories</h2>
                <p className="ap-subtle" style={{ marginTop: '-5px', marginBottom: '12px' }}>
                  ⚠️ Deleted categories are permanently removed after 24 hours.
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>Select categories to restore:</h4>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {recentlyDeleted.length} categor{recentlyDeleted.length !== 1 ? 'ies' : 'y'} available
                  </div>
                </div>

                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '8px', marginBottom: '15px' }}>
                  {recentlyDeleted.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666', padding: '15px', fontSize: '14px' }}>No deleted categories to restore</p>
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
                      onClick={handleUndoAll}
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
                          showSnackbar('Please select categories to delete permanently');
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

const sidebarStyle = {
  width: '230px',
  background: '#ffffff',
  borderRight: '1px solid #e3e8ff',
  boxShadow: '2px 0 14px rgba(13,71,161,0.06)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '20px 12px',
  borderRadius: '0 12px 12px 0'
};

const iconGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const sidebarLink = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px',
  textDecoration: 'none',
  color: '#0f172a',
  borderRadius: '10px',
  transition: 'transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  boxShadow: '0 2px 8px rgba(13, 71, 161, 0.04)',
  border: '1px solid #e3e8ff',
  backgroundColor: '#ffffff'
};

const labelStyle = {
  fontSize: '15px',
  fontWeight: 'bold',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: '10px',
  borderRadius: '8px',
  border: '1px solid #e3e8ff',
  background: '#ffffff',
};

const textAreaStyle = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid #e3e8ff',
  background: '#ffffff',
  width: '100%',
  resize: 'vertical'
};

const formLabelStyle = {
  display: 'block',
  fontWeight: 800,
  color: '#374151',
  marginBottom: 6,
  fontSize: 13
};

const dropdownItemStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  border: 'none',
  background: 'none',
  textAlign: 'left',
  fontSize: '14px',
  cursor: 'pointer',
  borderBottom: '1px solid #eee',
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

const formContainerStyle = { flex: 1, padding: '0' };
const stickyHeaderWrap = { position: 'sticky', top: '70px', zIndex: 5, background: 'linear-gradient(90deg, #26A69A 0%, #B2DFDB 100%)', paddingTop: '0', paddingBottom: '12px', borderBottom: '1px solid #26A69A', marginBottom: 16, borderRadius: '0 0 12px 12px' };
const headerStyle = { textAlign: 'left', color: '#004D40' };
const headerBtnStyle = { color: '#ffffff', padding: '8px 12px', borderRadius: '8px', textDecoration: 'none', fontWeight: 800, fontSize: 13, boxShadow: '0 2px 6px rgba(0,0,0,0.08)' };

const submitBtnStyle = { backgroundColor: '#0d47a1', border: '1px solid #08306b', color: 'white', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, letterSpacing: '.2px', boxShadow: '0 2px 6px rgba(13,71,161,0.25)' };
const cancelBtnStyle = { backgroundColor: '#6b7280', border: '1px solid #4b5563', color: 'white', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, letterSpacing: '.1px' };

export default Category;
