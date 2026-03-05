import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaUserCircle, FaHome, FaMap, FaBox, FaPowerOff,
  FaSearch, FaPen, FaTrash, FaCog,
  FaUsers, FaUserCheck, FaTags, FaChartPie
} from 'react-icons/fa';
import NewProductsCarousel from './NewProductsCarousel.jsx';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Swal from 'sweetalert2';

function StaffDashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', 
    details: '', 
    brand: '', 
    category: '', 
    stockQty: 0, 
    unit: '', 
    price: '', 
    image: null,
    sizeOptions: [],
    colorOptions: [],
    sizeColorQuantities: [],
    colorQuantities: [],
    sizeQuantities: [],
    variantSize: '',
    variantColor: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);
  const [selectedUndo, setSelectedUndo] = useState([]);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [openVariantIndex, setOpenVariantIndex] = useState(null);
  const [hasVariant, setHasVariant] = useState(false);
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');
  const [showDeleteMode, setShowDeleteMode] = useState(false);

  // fullscreen toggle (hide sidebar, expand table)
  const [isFullscreen, setIsFullscreen] = useState(false);

  // transient highlight for newly-added/restored/edited rows
  const [justAddedIds, setJustAddedIds] = useState(new Set());
  const [justRestoredIds, setJustRestoredIds] = useState(new Set());
  const [justEditedIds, setJustEditedIds] = useState(new Set());
  const [acknowledgedHighlights, setAcknowledgedHighlights] = useState(false);

  // New highlighting states for newly added and edited products
  const [highlightedNewIds, setHighlightedNewIds] = useState(new Set());
  const [highlightedEditedIds, setHighlightedEditedIds] = useState(new Set());

  // Cashier stats
  const [cashierStats, setCashierStats] = useState({ total: 0, active: 0 });

  // Font customization
  const [showFontSettings, setShowFontSettings] = useState(false);
  const [fontSettings, setFontSettings] = useState({
    size: 12,
    family: 'Arial'
  });

  // Variant adjustment warning modal
  const [showVariantWarning, setShowVariantWarning] = useState(false);
  const [variantWarningProduct, setVariantWarningProduct] = useState(null);

  // local maps for activity timestamps
  const [restoreTimes, setRestoreTimes] = useState({});
  const [addedTimes, setAddedTimes] = useState({});
  const [editedTimes, setEditedTimes] = useState({});
  const [seenUpdatedAt, setSeenUpdatedAt] = useState({}); // track last seen update timestamps to detect "just edited"

  // sorting mode
  const [sortMode, setSortMode] = useState('status'); // status | stockAsc | stockDesc | nameAsc | nameDesc | dateAddedDesc | dateAddedAsc | dateEditedDesc | dateRestoredDesc

  // Single delete state and handler
  const [singleDeletingId, setSingleDeletingId] = useState(null);

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);

  // Countdown timer state for deleted products
  const [countdownTime, setCountdownTime] = useState(Date.now());

  // Notification state for expiring products
  const [showExpiryNotification, setShowExpiryNotification] = useState(false);
  const [expiringProducts, setExpiringProducts] = useState([]);

  // User profile modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  const navigate = useNavigate();

  const safeParse = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString();
  };
  const fmtTime = (d) => {
    if (!d) return '';
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString();
  };

  useEffect(() => {
    // Check user role - keep staff here, redirect managers; avoid login bounce
    let userRole = localStorage.getItem('currentUserRole');
    if (userRole === 'manager') {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (!userRole) {
      localStorage.setItem('currentUserRole', 'staff');
      userRole = 'staff';
    }

    fetchProducts();
    fetchCategories();
    fetchUserDetails();
    fetchCashierStats();
    
    const username = localStorage.getItem('currentUserUsername');
    if (username) setCurrentUser(username);

    // Load font settings from localStorage
    const savedFontSettings = safeParse('inventoryFontSettings', { size: 12, family: 'Arial' });
    setFontSettings(savedFontSettings);

    // Check for newly added/edited products from localStorage
    const newProducts = safeParse('inventoryHighlightNew', []);
    const editedProducts = safeParse('inventoryHighlightEdited', []);
    
    if (newProducts.length > 0 || editedProducts.length > 0) {
      setHighlightedNewIds(new Set(newProducts));
      setHighlightedEditedIds(new Set(editedProducts));
    }

    // pick up restored ids and times recorded by undo actions
    setJustRestoredIds(new Set(safeParse('inventoryJustRestored', [])));
    setRestoreTimes(safeParse('inventoryRestoreTimes', {}));

    // pick up just-added ids and times recorded by AddProduct or detection
    setJustAddedIds(new Set(safeParse('inventoryJustAddedIds', [])));
    setAddedTimes(safeParse('inventoryAddTimes', {}));

    // edited info (map id -> last edited ISO)
    setEditedTimes(safeParse('inventoryJustEdited', {}));
    setSeenUpdatedAt(safeParse('inventorySeenUpdatedAt', {}));

    // deleted buffer maintenance - changed to 1 day
    const cleanupExpiredProducts = () => {
      const deletedFromStorage = localStorage.getItem('recentlyDeletedProducts');
      if (deletedFromStorage) {
        const parsed = JSON.parse(deletedFromStorage);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // Changed from 1 week to 1 day

        const expired = parsed.filter(item => now - item.deletedAt >= oneDay);
        const valid = parsed.filter(item => now - item.deletedAt < oneDay);

        setRecentlyDeleted(valid);
        localStorage.setItem('recentlyDeletedProducts', JSON.stringify(valid));

        expired.forEach(async (product) => {
          try {
            await axios.delete(`http://localhost:5000/products/${product._id}?permanent=true`);
            console.log(`Permanently deleted: ${product.name}`);
          } catch (err) {
            console.error(`Failed to permanently delete ${product.name}:`, err);
          }
        });
      }
    };

    // Run cleanup on component mount
    cleanupExpiredProducts();

    const onBeforeUnload = () => {
      localStorage.setItem('inventoryLastVisit', new Date().toISOString());
      localStorage.removeItem('inventoryJustRestored');
      localStorage.removeItem('inventoryJustAddedIds');
      localStorage.setItem('inventorySeenUpdatedAt', JSON.stringify(seenUpdatedAt));
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    // Set up periodic cleanup every 5 minutes
    const cleanupInterval = setInterval(cleanupExpiredProducts, 5 * 60 * 1000);

    // Auto-refresh inventory when updated from Cashier or other sources
    const checkForUpdates = () => {
      const lastUpdate = localStorage.getItem('inventoryLastUpdate');
      if (lastUpdate) {
        const lastKnownUpdate = localStorage.getItem('inventoryLastKnownUpdate');
        if (!lastKnownUpdate || lastUpdate !== lastKnownUpdate) {
          fetchProducts();
          localStorage.setItem('inventoryLastKnownUpdate', lastUpdate);
        }
      }
    };

    // Listen for immediate inventory updates
    const handleInventoryUpdate = () => {
      fetchProducts();
      const lastUpdate = localStorage.getItem('inventoryLastUpdate');
      if (lastUpdate) {
        localStorage.setItem('inventoryLastKnownUpdate', lastUpdate);
      }
    };
    window.addEventListener('inventoryUpdated', handleInventoryUpdate);

    const handleProfileUpdate = () => {
      fetchUserDetails();
    };
    window.addEventListener('user:profileUpdated', handleProfileUpdate);

    // Poll for updates every 2 seconds
    const updateInterval = setInterval(checkForUpdates, 2000);
    checkForUpdates(); // Check immediately

    return () => {
      onBeforeUnload();
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
      window.removeEventListener('user:profileUpdated', handleProfileUpdate);
      clearInterval(cleanupInterval);
      clearInterval(updateInterval);
    };
  }, []);

  // Update countdown timer every minute when there are deleted products
  useEffect(() => {
    if (recentlyDeleted.length === 0) return;
    
    const timer = setInterval(() => {
      setCountdownTime(Date.now());
    }, 60 * 1000); // Update every minute

    return () => clearInterval(timer);
  }, [recentlyDeleted.length]);

  // Check for expiring products and show notifications
  useEffect(() => {
    if (recentlyDeleted.length === 0) {
      setShowExpiryNotification(false);
      setExpiringProducts([]);
      return;
    }

    const now = Date.now();
    const expiring = recentlyDeleted.filter(item => {
      const timeLeft = 24 * 60 * 60 * 1000 - (now - item.deletedAt);
      return timeLeft > 0 && timeLeft < 2 * 60 * 60 * 1000; // Less than 2 hours left
    });

    if (expiring.length > 0) {
      setExpiringProducts(expiring);
      setShowExpiryNotification(true);
    } else {
      setShowExpiryNotification(false);
      setExpiringProducts([]);
    }
  }, [recentlyDeleted, countdownTime]);

  const fetchProducts = async () => {
    try {
      const role = localStorage.getItem('currentUserRole');
      const branch = localStorage.getItem('currentBranch');
      let url = 'http://localhost:5000/products';

      if (branch && role && role !== 'admin') {
        url = `http://localhost:5000/products?branch=${encodeURIComponent(branch)}`;
      }

      const res = await axios.get(url);
      const active = res.data.filter(p => !p.deletedAt);
      setProducts(active);

      // compute "just added" using last visit timestamp and merge with stored ids
      try {
        const lastVisitIso = localStorage.getItem('inventoryLastVisit');
        if (lastVisitIso) {
          const lastVisit = new Date(lastVisitIso);
          const ids = active.filter(p => p.createdAt && new Date(p.createdAt) > lastVisit).map(p => p._id);
          if (ids.length) {
            setJustAddedIds(prev => new Set([...Array.from(prev), ...ids]));
            const addTimes = { ...addedTimes };
            ids.forEach(id => { if (!addTimes[id]) addTimes[id] = new Date().toISOString(); });
            setAddedTimes(addTimes);
            localStorage.setItem('inventoryAddTimes', JSON.stringify(addTimes));
            localStorage.setItem('inventoryJustAddedIds', JSON.stringify(Array.from(new Set([...Array.from(justAddedIds), ...ids]))));
          }
        }
      } catch {}

      // detect "just edited": compare product.updatedAt to last seen
      const seenMap = safeParse('inventorySeenUpdatedAt', {});
      const editedMap = { ...editedTimes };
      const newJustEdited = new Set([...justEditedIds]);
      active.forEach(p => {
        if (p.updatedAt) {
          const prev = seenMap[p._id];
          const updatedNewer = !prev || new Date(p.updatedAt) > new Date(prev);
          const reallyEdited = p.createdAt ? new Date(p.updatedAt) > new Date(p.createdAt) : true;
          if (updatedNewer && reallyEdited) {
            newJustEdited.add(p._id);
            editedMap[p._id] = p.updatedAt;
          }
          seenMap[p._id] = p.updatedAt;
        }
      });
      setJustEditedIds(newJustEdited);
      setEditedTimes(editedMap);
      setSeenUpdatedAt(seenMap);
      localStorage.setItem('inventoryJustEdited', JSON.stringify(editedMap));
      localStorage.setItem('inventorySeenUpdatedAt', JSON.stringify(seenMap));
    } catch (err) {
      console.error('❌ Failed to fetch products:', err.message);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('http://localhost:5000/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('❌ Failed to fetch categories:', err.message);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const storedUsername = localStorage.getItem('currentUserUsername');
      if (!storedUsername) return;
      
      const res = await axios.get('http://localhost:5000/users');
      const user = res.data.find(u => u.username === storedUsername);
      if (user) {
        setUserDetails({
          name: user.name || localStorage.getItem('currentUserName') || 'N/A',
          username: user.username || storedUsername,
          profileImage: user.profileImage || null
        });
      } else {
        // Fallback to localStorage data
        setUserDetails({
          name: localStorage.getItem('currentUserName') || 'N/A',
          username: storedUsername,
          profileImage: null
        });
      }
    } catch (err) {
      console.error('❌ Failed to fetch user details:', err.message);
      // Fallback to localStorage data
      const storedUsername = localStorage.getItem('currentUserUsername');
      const userName = localStorage.getItem('currentUserName');
      if (storedUsername) {
        setUserDetails({
          name: userName || 'N/A',
          username: storedUsername,
          profileImage: null
        });
      }
    }
  };

  const fetchCashierStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/users');
      const users = Array.isArray(res.data) ? res.data : [];
      const cashiers = users.filter(u => String(u.role).toLowerCase() === 'cashier');
      const active = cashiers.filter(u => u.isActive !== false).length;
      setCashierStats({ total: cashiers.length, active });
    } catch (err) {
      console.error('❌ Failed to fetch cashier stats:', err.message);
    }
  };

  const uniqueCategories = ['All', ...Array.from(new Set(products.map(p => p.category || ''))).sort((a, b) => a.localeCompare(b))];

  // search/filter
  const baseFiltered = products.filter((p) => {
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.details?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // stock-based status
  const getStatus = (qty) => {
    if (qty === 0) return { label: 'OUT OF STOCK', color: '#d32f2f' };
    if (qty < 50) return { label: 'LOW STOCK', color: '#ffc107' };
    return { label: 'IN STOCK', color: '#4caf50' };
  };
  const statusRank = (qty) => (qty === 0 ? 0 : qty < 50 ? 1 : 2);

  const nameKey = (p) => p.name?.toLowerCase() || '';

  // compute effective stock used for ordering
  const effectiveStockOf = (p) => {
    if (typeof p.totalStock === 'number' && p.totalStock >= 0) return p.totalStock;
    let total = 0;
    if (Array.isArray(p.sizeColorQuantities)) total += p.sizeColorQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
    if (Array.isArray(p.colorQuantities)) total += p.colorQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
    if (Array.isArray(p.sizeQuantities)) total += p.sizeQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
    if (Array.isArray(p.brandUnitQuantities)) total += p.brandUnitQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
    if (Array.isArray(p.brandQuantities)) total += p.brandQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
    if (Array.isArray(p.unitQuantities)) total += p.unitQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
    if (total > 0) return total;
    return (typeof p.stockQty === 'number' ? p.stockQty : 0);
  };

  // Check if product has variants
  const hasVariants = (product) => {
    const clean = (s) => String(s || '').replace(/[\[\]"\\]/g,'').trim();
    const hasSizeColor = Array.isArray(product.sizeColorQuantities) && product.sizeColorQuantities.some(v => clean(v.size) && clean(v.color));
    const hasColor = Array.isArray(product.colorQuantities) && product.colorQuantities.some(v => clean(v.color));
    const hasSize = Array.isArray(product.sizeQuantities) && product.sizeQuantities.some(v => clean(v.size));
    return !!(hasSizeColor || hasColor || hasSize);
  };

  // build ordered list based on selected sort mode
  const baseOrdered = (() => {
    const arr = [...baseFiltered];
    switch (sortMode) {
      case 'stockAsc':
        return arr.sort((a, b) => effectiveStockOf(a) - effectiveStockOf(b));
      case 'stockDesc':
        return arr.sort((a, b) => effectiveStockOf(b) - effectiveStockOf(a));
      case 'nameAsc':
        return arr.sort((a, b) => nameKey(a).localeCompare(nameKey(b)));
      case 'nameDesc':
        return arr.sort((a, b) => nameKey(b).localeCompare(nameKey(a)));
      case 'dateAddedDesc':
        return arr.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      case 'dateAddedAsc':
        return arr.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      case 'dateEditedDesc':
        return arr.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      case 'dateRestoredDesc':
        return arr.sort((a, b) => new Date(restoreTimes[b._id] || 0) - new Date(restoreTimes[a._id] || 0));
      case 'status':
      default:
        // out-of-stock first, then low stock, then others; secondary by name
        return arr.sort((a, b) => {
          const ea = effectiveStockOf(a);
          const eb = effectiveStockOf(b);
          const sr = statusRank(ea) - statusRank(eb);
          if (sr !== 0) return sr;
          return nameKey(a).localeCompare(nameKey(b));
        });
    }
  })();

  // Reorder to show highlighted products at the top
  let ordered = [...baseOrdered];
  
  // Only show highlights if not acknowledged
  if (!acknowledgedHighlights && (highlightedNewIds.size > 0 || highlightedEditedIds.size > 0 || justAddedIds.size > 0 || justRestoredIds.size > 0 || justEditedIds.size > 0)) {
    const newProducts = [];
    const editedProducts = [];
    const added = [];
    const restored = [];
    const edited = [];
    const rest = [];
    
    ordered.forEach(p => {
      if (highlightedNewIds.has(p._id)) {
        newProducts.push(p);
      } else if (highlightedEditedIds.has(p._id)) {
        editedProducts.push(p);
      } else if (justAddedIds.has(p._id)) {
        added.push(p);
      } else if (justRestoredIds.has(p._id)) {
        restored.push(p);
      } else if (justEditedIds.has(p._id)) {
        edited.push(p);
      } else {
        rest.push(p);
      }
    });
    
    // Priority order: newly added -> edited -> restored -> rest
    ordered = [...newProducts, ...editedProducts, ...added, ...restored, ...edited, ...rest];
  }

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: locationField === 'floor' ? value : Number(value) || 0
        }
      }));
    } else if (name === 'image') {
      setFormData({ ...formData, image: files[0] });
    } else if (name === 'stockQty') {
      setFormData({ ...formData, stockQty: parseInt(value) || 0 });
    } else if (name === 'price') {
      setFormData({ ...formData, price: parseFloat(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addSize = () => {
    if (newSize && !formData.sizeOptions.includes(newSize)) {
      setFormData(prev => ({ ...prev, sizeOptions: [...prev.sizeOptions, newSize] }));
      setNewSize('');
    }
  };

  const addColor = () => {
    if (newColor && !formData.colorOptions.includes(newColor)) {
      setFormData(prev => ({ ...prev, colorOptions: [...prev.colorOptions, newColor] }));
      setNewColor('');
    }
  };

  const removeSize = (sizeToRemove) => {
    setFormData(prev => ({
      ...prev,
      sizeOptions: prev.sizeOptions.filter(size => size !== sizeToRemove),
      sizeColorQuantities: prev.sizeColorQuantities.filter(q => q.size !== sizeToRemove),
      sizeQuantities: prev.sizeQuantities.filter(q => q.size !== sizeToRemove)
    }));
  };

  const removeColor = (colorToRemove) => {
    setFormData(prev => ({
      ...prev,
      colorOptions: prev.colorOptions.filter(color => color !== colorToRemove),
      sizeColorQuantities: prev.sizeColorQuantities.filter(q => q.color !== colorToRemove),
      colorQuantities: prev.colorQuantities.filter(q => q.color !== colorToRemove)
    }));
  };

  const handleQuantityChange = (size, color, value) => {
    setFormData(prev => {
      const updated = [...prev.sizeColorQuantities];
      const index = updated.findIndex(q => q.size === size && q.color === color);
      if (index > -1) {
        updated[index].quantity = parseInt(value) || 0;
      } else {
        updated.push({ size, color, quantity: parseInt(value) || 0 });
      }
      return { ...prev, sizeColorQuantities: updated };
    });
  };

  const handleSizeOnlyQtyChange = (size, value) => {
    setFormData(prev => {
      const updated = [...prev.sizeQuantities];
      const i = updated.findIndex(q => q.size === size);
      if (i > -1) updated[i].quantity = parseInt(value) || 0;
      else updated.push({ size, quantity: parseInt(value) || 0 });
      return { ...prev, sizeQuantities: updated };
    });
  };

  const handleColorOnlyQtyChange = (color, value) => {
    setFormData(prev => {
      const updated = [...prev.colorQuantities];
      const i = updated.findIndex(q => q.color === color);
      if (i > -1) updated[i].quantity = parseInt(value) || 0;
      else updated.push({ color, quantity: parseInt(value) || 0 });
      return { ...prev, colorQuantities: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const uploadData = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (['sizeColorQuantities', 'colorQuantities', 'sizeQuantities', 'brandUnitQuantities', 'brandQuantities', 'unitQuantities', 'location'].includes(key)) {
          uploadData.append(key, JSON.stringify(val));
        } else if (key === 'image' && val instanceof File) {
          uploadData.append(key, val);
        } else if (key === 'sizeOptions' || key === 'colorOptions') {
          const clean = (Array.isArray(val) ? val : []).map(v => String(v).replace(/[\[\]"\\]/g, '').trim()).filter(Boolean);
          uploadData.append(key, clean.join(','));
        } else if (key === 'brandOptions' || key === 'unitOptions') {
          const clean = (Array.isArray(val) ? val : []).map(v => String(v).replace(/[\[\]"\\]/g, '').trim()).filter(Boolean);
          uploadData.append(key, clean.join(','));
        } else if (val !== null && val !== undefined && val !== '') {
          uploadData.append(key, val);
        }
      });

      const sum = (arr) => Array.isArray(arr) ? arr.reduce((s, v) => s + (Number(v.quantity) || 0), 0) : 0;
      const totalStock =
        sum(formData.sizeColorQuantities) +
        sum(formData.colorQuantities) +
        sum(formData.sizeQuantities) +
        sum(formData.brandUnitQuantities) +
        sum(formData.brandQuantities) +
        sum(formData.unitQuantities) || (Number(formData.stockQty) || 0);
      uploadData.append('totalStock', String(totalStock));
      const hasVariantsFlag = (
        (Array.isArray(formData.sizeOptions) && formData.sizeOptions.length > 0) ||
        (Array.isArray(formData.colorOptions) && formData.colorOptions.length > 0) ||
        (Array.isArray(formData.sizeColorQuantities) && formData.sizeColorQuantities.length > 0) ||
        (Array.isArray(formData.colorQuantities) && formData.colorQuantities.length > 0) ||
        (Array.isArray(formData.sizeQuantities) && formData.sizeQuantities.length > 0) ||
        (Array.isArray(formData.brandUnitQuantities) && formData.brandUnitQuantities.length > 0) ||
        (Array.isArray(formData.brandQuantities) && formData.brandQuantities.length > 0) ||
        (Array.isArray(formData.unitQuantities) && formData.unitQuantities.length > 0)
      );
      uploadData.append('hasVariants', hasVariantsFlag ? 'true' : 'false');

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const role = localStorage.getItem('currentUserRole') || '';
      const name = localStorage.getItem('currentUserName') || '';
      if (editingId) {
        await axios.put(
          `http://localhost:5000/products/${editingId}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`,
          uploadData,
          config
        );
      } else {
        await axios.post(
          `http://localhost:5000/products?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`,
          uploadData,
          config
        );
      }
      resetForm();
      fetchProducts();
      setShowEditModal(false);
      localStorage.setItem('inventoryLastUpdate', Date.now().toString());
      window.dispatchEvent(new Event('inventoryUpdated'));
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error saving product',
        confirmButtonColor: '#1A2CA3'
      });
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: '', details: '', brand: '', category: '', stockQty: 0, unit: '', price: '',
      image: null, sizeOptions: [], colorOptions: [], sizeColorQuantities: [],
      colorQuantities: [], sizeQuantities: [], variantSize: '', variantColor: '',
    });
    setEditingId(null);
    setHasVariant(false);
    setNewSize('');
    setNewColor('');
  };

  const handleEdit = (product) => {
    try {
      localStorage.setItem('productToEdit', JSON.stringify(product));
      localStorage.setItem('productEditMode', 'true');
    } catch (_) {}
    navigate(`/addproduct?role=staff&mode=edit&id=${product._id}`, {
      state: { editProduct: product, mode: 'edit' }
    });
  };

  const handleRestock = async (id, amount) => {
    const product = products.find(p => p._id === id);
    if (!product) return;

    try {
      let updatedProduct = { ...product };

      // Check if product has variants
      if (hasVariants(product)) {
        // Update variant quantities
        if (product.brandUnitQuantities && product.brandUnitQuantities.length > 0) {
          updatedProduct.brandUnitQuantities = product.brandUnitQuantities.map(variant => {
            const newQuantity = (variant.quantity || 0) + amount;
            if (newQuantity < 0) {
              Swal.fire('Warning', 'Stock cannot be negative', 'warning');
              return variant;
            }
            return { ...variant, quantity: newQuantity };
          });
        }
        if (product.sizeColorQuantities && product.sizeColorQuantities.length > 0) {
          updatedProduct.sizeColorQuantities = product.sizeColorQuantities.map(variant => {
            const newQuantity = (variant.quantity || 0) + amount;
            if (newQuantity < 0) {
              Swal.fire('Warning', 'Stock cannot be negative', 'warning');
              return variant;
            }
            return { ...variant, quantity: newQuantity };
          });
        }
        
        if (product.colorQuantities && product.colorQuantities.length > 0) {
          updatedProduct.colorQuantities = product.colorQuantities.map(variant => {
            const newQuantity = (variant.quantity || 0) + amount;
            if (newQuantity < 0) {
              Swal.fire('Warning', 'Stock cannot be negative', 'warning');
              return variant;
            }
            return { ...variant, quantity: newQuantity };
          });
        }
        
        if (product.sizeQuantities && product.sizeQuantities.length > 0) {
          updatedProduct.sizeQuantities = product.sizeQuantities.map(variant => {
            const newQuantity = (variant.quantity || 0) + amount;
            if (newQuantity < 0) {
              Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: 'Stock cannot be negative',
                confirmButtonColor: '#1A2CA3'
              });
              return variant;
            }
            return { ...variant, quantity: newQuantity };
          });
        }
        
        if (product.brandQuantities && product.brandQuantities.length > 0) {
          updatedProduct.brandQuantities = product.brandQuantities.map(variant => {
            const newQuantity = (variant.quantity || 0) + amount;
            if (newQuantity < 0) {
              Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: 'Stock cannot be negative',
                confirmButtonColor: '#1A2CA3'
              });
              return variant;
            }
            return { ...variant, quantity: newQuantity };
          });
        }
        
        if (product.unitQuantities && product.unitQuantities.length > 0) {
          updatedProduct.unitQuantities = product.unitQuantities.map(variant => {
            const newQuantity = (variant.quantity || 0) + amount;
            if (newQuantity < 0) {
              Swal.fire({
                icon: 'warning',
                title: 'Warning',
                text: 'Stock cannot be negative',
                confirmButtonColor: '#1A2CA3'
              });
              return variant;
            }
            return { ...variant, quantity: newQuantity };
          });
        }
        
        // Recalculate totalStock
        updatedProduct.totalStock = calculateTotalStock(updatedProduct);
        updatedProduct.stockQty = updatedProduct.totalStock;
        updatedProduct.hasVariants = true;
      } else {
        // Update regular stock quantity
        const newQty = (product.stockQty || 0) + amount;
        if (newQty < 0) {
          Swal.fire('Warning', 'Stock cannot be negative', 'warning');
          return;
        }
        updatedProduct.stockQty = newQty;
        updatedProduct.totalStock = newQty;
        updatedProduct.hasVariants = false;
      }

      const role = localStorage.getItem('currentUserRole') || '';
      const name = localStorage.getItem('currentUserName') || '';
      await axios.put(
        `http://localhost:5000/products/${id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`,
        updatedProduct
      );
      
      // Signal inventory update to other components (Cashier, etc.)
      localStorage.setItem('inventoryLastUpdate', Date.now().toString());
      window.dispatchEvent(new Event('inventoryUpdated'));
      
      fetchProducts();
    } catch (err) {
      console.error('Stock update failed:', err);
      Swal.fire('Error', 'Stock update failed', 'error');
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(_id => _id !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const allVisibleIds = ordered.map(p => p._id);
    setSelectedIds(selectedIds.length === allVisibleIds.length ? [] : allVisibleIds);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const selectedNames = products.filter(p => selectedIds.includes(p._id)).map(p => p.name).join(', ');
    
    Swal.fire({
      title: 'Are you sure?',
      text: `You want to delete the selected ${selectedIds.length} product(s)?\n\nItems: ${selectedNames}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete them!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setDeleting(true);
        try {
          const role = localStorage.getItem('currentUserRole') || '';
          const name = localStorage.getItem('currentUserName') || '';
          const toDelete = products.filter(p => selectedIds.includes(p._id));
          await Promise.all(toDelete.map(p => axios.delete(`http://localhost:5000/products/${p._id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`)));
          const withDate = toDelete.map(p => ({ ...p, deletedAt: Date.now() }));
          const updated = [...recentlyDeleted, ...withDate];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedProducts', JSON.stringify(updated));
          setSelectedIds([]);
          setShowDeleteMode(false);
          fetchProducts();
          Swal.fire('Deleted!', 'Products have been deleted.', 'success');
        } catch (err) {
          console.error('Failed to delete products:', err);
          Swal.fire('Error!', 'Failed to delete selected products.', 'error');
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  const getVariantDetails = (product) => {
    const strip = (s) => String(s).replace(/[\[\]"\\]/g, '').trim();
    const variants = [];
    
    if (product.sizeColorQuantities && product.sizeColorQuantities.length > 0) {
      product.sizeColorQuantities.forEach(variant => {
        if ((variant.quantity || 0) > 0) {
          variants.push({
            type: 'size-color',
            size: strip(variant.size),
            color: strip(variant.color),
            quantity: variant.quantity
          });
        }
      });
    }
    if (product.colorQuantities && product.colorQuantities.length > 0) {
      product.colorQuantities.forEach(variant => {
        if ((variant.quantity || 0) > 0) {
          variants.push({
            type: 'color-only',
            color: strip(variant.color),
            quantity: variant.quantity
          });
        }
      });
    }
    if (product.sizeQuantities && product.sizeQuantities.length > 0) {
      product.sizeQuantities.forEach(variant => {
        if ((variant.quantity || 0) > 0) {
          variants.push({
            type: 'size-only',
            size: strip(variant.size),
            quantity: variant.quantity
          });
        }
      });
    }
    return variants;
  };

  const hasAnyVariantData = (p) => {
    return (
      (Array.isArray(p.sizeOptions) && p.sizeOptions.length > 0) ||
      (Array.isArray(p.colorOptions) && p.colorOptions.length > 0) ||
      (Array.isArray(p.brandOptions) && p.brandOptions.length > 0) ||
      (Array.isArray(p.unitOptions) && p.unitOptions.length > 0) ||
      (Array.isArray(p.sizeColorQuantities) && p.sizeColorQuantities.length > 0) ||
      (Array.isArray(p.colorQuantities) && p.colorQuantities.length > 0) ||
      (Array.isArray(p.sizeQuantities) && p.sizeQuantities.length > 0) ||
      (Array.isArray(p.brandUnitQuantities) && p.brandUnitQuantities.length > 0) ||
      (Array.isArray(p.brandQuantities) && p.brandQuantities.length > 0) ||
      (Array.isArray(p.unitQuantities) && p.unitQuantities.length > 0)
    );
  };

  const formatVariants = (product) => {
    const hasData = hasAnyVariantData(product);
    if (hasData) {
      return (
        <button
          onClick={() => {
            setSelectedProductForVariant(product);
            setShowVariantModal(true);
          }}
          style={{
            backgroundColor: '#0d47a1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1565c0'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#0d47a1'; e.currentTarget.style.transform = 'translateY(0)'; }}
          title="View variants"
        >
          View Variants
        </button>
      );
    }
    return 'N/A';
  };

  // acknowledge highlights on any main area click
  const handleAcknowledge = () => {
    setAcknowledgedHighlights(true);
    setJustAddedIds(new Set());
    setJustRestoredIds(new Set());
    setJustEditedIds(new Set());
    setHighlightedNewIds(new Set());
    setHighlightedEditedIds(new Set());
    localStorage.removeItem('inventoryJustRestored');
    localStorage.removeItem('inventoryJustAddedIds');
    localStorage.removeItem('inventoryHighlightNew');
    localStorage.removeItem('inventoryHighlightEdited');
  };

  const handleFontChange = (setting, value) => {
    const newSettings = { ...fontSettings, [setting]: value };
    setFontSettings(newSettings);
    localStorage.setItem('inventoryFontSettings', JSON.stringify(newSettings));
  };

  const sidebarItem = (to, icon, label) => (
    <Link to={to} style={sidebarLink}>
      {icon}
      <span style={labelStyle}>{label}</span>
    </Link>
  );

  const renderActivity = (p) => {
    const tags = [];
    if (highlightedNewIds.has(p._id)) tags.push('New');
    if (highlightedEditedIds.has(p._id)) tags.push('Edited');
    if (justAddedIds.has(p._id)) tags.push('New');
    if (justRestoredIds.has(p._id)) tags.push('Restored');
    if (justEditedIds.has(p._id)) tags.push('Edited');

    const added = p.createdAt;
    const restored = restoreTimes[p._id];
    const edited = editedTimes[p._id] || p.updatedAt;

    // Show all activity dates for complete tracking
    const showEditedDate = edited && new Date(edited) > new Date(added || 0);

    return (
      <div style={{ fontSize: fontSettings.size - 1, textAlign: 'center', fontFamily: fontSettings.family }}>
        {added && (
          <div style={{ marginBottom: '3px' }}>
            <strong>Added:</strong> {fmtDate(added)}<div style={{ color: '#666', fontSize: fontSettings.size - 2 }}>{fmtTime(added)}</div>
          </div>
        )}
        {restored && (
          <div style={{ marginBottom: '3px' }}>
            <strong>Restored:</strong> {fmtDate(restored)}<div style={{ color: '#666', fontSize: fontSettings.size - 2 }}>{fmtTime(restored)}</div>
          </div>
        )}
        {showEditedDate && (
          <div style={{ marginBottom: '3px' }}>
            <strong>Edited:</strong> {fmtDate(edited)}<div style={{ color: '#666', fontSize: fontSettings.size - 2 }}>{fmtTime(edited)}</div>
          </div>
        )}
        {tags.length > 0 && (
          <div style={{ marginTop: 3, display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[...new Set(tags)].map((t, i) => (
              <span key={i} style={{
                padding: '2px 5px',
                borderRadius: 6,
                fontSize: fontSettings.size - 3,
                fontWeight: 'bold',
                background: t === 'New' ? '#c8e6c9' : t === 'Restored' ? '#fff3cd' : t === 'Edited' ? '#e3f2fd' : '#e3f2fd',
                color: '#333',
                fontFamily: fontSettings.family
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper function to calculate total stock from all variant quantities
  const calculateTotalStock = (product) => {
    const sum = (arr) => Array.isArray(arr) ? arr.reduce((s, v) => s + (Number(v?.quantity) || 0), 0) : 0;
    const totalVariants =
      sum(product.sizeColorQuantities) +
      sum(product.colorQuantities) +
      sum(product.sizeQuantities) +
      sum(product.brandUnitQuantities) +
      sum(product.brandQuantities) +
      sum(product.unitQuantities);
    return totalVariants > 0 ? totalVariants : (Number(product.stockQty) || 0);
  };

  const handleVariantQuantityChange = async (product, variant, change) => {
    try {
      const newQuantity = (variant.quantity || 0) + change;
      if (newQuantity < 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Warning',
          text: 'Quantity cannot be negative',
          confirmButtonColor: '#1A2CA3'
        });
        return;
      }

      let updatedProduct = { ...product };
      const clean = (s) => String(s || '').replace(/[\[\]"\\]/g,'').trim();
      
      // Update the appropriate variant array based on type
      if (variant.type === 'size-color') {
        updatedProduct.sizeColorQuantities = updatedProduct.sizeColorQuantities.map(v => 
          clean(v.size) === clean(variant.size) && 
          clean(v.color) === clean(variant.color)
            ? { ...v, quantity: newQuantity }
            : v
        );
      } else if (variant.type === 'color-only') {
        updatedProduct.colorQuantities = updatedProduct.colorQuantities.map(v => 
          clean(v.color) === clean(variant.color)
            ? { ...v, quantity: newQuantity }
            : v
        );
      } else if (variant.type === 'size-only') {
        updatedProduct.sizeQuantities = updatedProduct.sizeQuantities.map(v => 
          clean(v.size) === clean(variant.size)
            ? { ...v, quantity: newQuantity }
            : v
        );
      } else if (variant.type === 'brand-unit') {
        updatedProduct.brandUnitQuantities = updatedProduct.brandUnitQuantities.map(v => 
          clean(v.brand) === clean(variant.brand) && 
          clean(v.unit) === clean(variant.unit)
            ? { ...v, quantity: newQuantity }
            : v
        );
      } else if (variant.type === 'brand-only') {
        updatedProduct.brandQuantities = updatedProduct.brandQuantities.map(v => 
          clean(v.brand) === clean(variant.brand)
            ? { ...v, quantity: newQuantity }
            : v
        );
      } else if (variant.type === 'unit-only') {
        updatedProduct.unitQuantities = updatedProduct.unitQuantities.map(v => 
          clean(v.unit) === clean(variant.unit)
            ? { ...v, quantity: newQuantity }
            : v
        );
      }

      // Recalculate totalStock
      updatedProduct.totalStock = calculateTotalStock(updatedProduct);
      updatedProduct.stockQty = updatedProduct.totalStock;
      updatedProduct.hasVariants = true;

      const role = localStorage.getItem('currentUserRole') || '';
      const name = localStorage.getItem('currentUserName') || '';
      await axios.put(
        `http://localhost:5000/products/${product._id}?source=variant&actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`,
        updatedProduct
      );
      
      // Signal inventory update to other components (Cashier, etc.)
      localStorage.setItem('inventoryLastUpdate', Date.now().toString());
      window.dispatchEvent(new Event('inventoryUpdated'));
      
      // Refresh products and update the selected product in modal
      await fetchProducts();
      const updatedProducts = await axios.get('http://localhost:5000/products');
      const updatedProductData = updatedProducts.data.find(p => p._id === product._id);
      setSelectedProductForVariant(updatedProductData);
      
    } catch (err) {
      console.error('Failed to update variant quantity:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update quantity',
        confirmButtonColor: '#1A2CA3'
      });
    }
  };

  const handleDeleteSingle = (product) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${product.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setSingleDeletingId(product._id);
        try {
          const role = localStorage.getItem('currentUserRole') || '';
          const name = localStorage.getItem('currentUserName') || '';
          await axios.delete(`http://localhost:5000/products/${product._id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`);
          const withDate = { ...product, deletedAt: Date.now() };
          const updated = [...recentlyDeleted, withDate];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedProducts', JSON.stringify(updated));
          setSelectedIds(prev => prev.filter(id => id !== product._id));
          fetchProducts();
          Swal.fire('Deleted!', 'Product has been deleted.', 'success');
        } catch (err) {
          console.error('Failed to delete product:', err);
          Swal.fire('Error!', 'Failed to delete product.', 'error');
        } finally {
          setSingleDeletingId(null);
        }
      }
    });
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', fontFamily: 'Arial', overflowY: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isFullscreen ? '0' : '20px', overflowY: 'auto' }} onClick={handleAcknowledge}>
        {/* Top Metrics Row */}
        {!isFullscreen && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
            {/* Products */}
            <div
              style={{ flex: '1 1 220px', minWidth: 220, background: '#ffffff', border: '1px solid #B2DFDB', borderRadius: 12, padding: 14, boxShadow: '0 6px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <FaBox color="#26A69A" />
                <strong style={{ color: '#00695C' }}>Products</strong>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#00695C' }}>{products.length}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Total items in inventory</div>
            </div>
            {/* Categories */}
            <div
              style={{ flex: '1 1 220px', minWidth: 220, background: '#ffffff', border: '1px solid #B2DFDB', borderRadius: 12, padding: 14, boxShadow: '0 6px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <FaTags color="#26A69A" />
                <strong style={{ color: '#00695C' }}>Categories</strong>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#00695C' }}>{categories.length}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Types</div>
            </div>
            {/* Stock Status */}
            {(() => {
              const out = products.filter(p => effectiveStockOf(p) === 0).length;
              const low = products.filter(p => { const s = effectiveStockOf(p); return s > 0 && s < 50; }).length;
              const inS = products.filter(p => effectiveStockOf(p) >= 50).length;
              const total = Math.max(out + low + inS, 1);
              const pctOut = Math.round((out / total) * 100);
              const pctLow = Math.round((low / total) * 100);
              const grad = `conic-gradient(#d32f2f 0% ${pctOut}%, #ffc107 ${pctOut}% ${pctOut + pctLow}%, #28a745 ${pctOut + pctLow}% 100%)`;
              return (
                <div
                  style={{ flex: '2 1 320px', minWidth: 320, background: '#ffffff', border: '1px solid #B2DFDB', borderRadius: 12, padding: 14, boxShadow: '0 6px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <FaChartPie color="#26A69A" />
                    <strong style={{ color: '#00695C' }}>Product Stock Status</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: grad, boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, background: '#d32f2f', borderRadius: '3px' }}></span><span style={{ fontSize: 13 }}>Out: {out}</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, background: '#ffc107', borderRadius: '3px' }}></span><span style={{ fontSize: 13 }}>Low: {low}</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 12, height: 12, background: '#28a745', borderRadius: '3px' }}></span><span style={{ fontSize: 13 }}>In: {inS}</span></div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Cashier Stats */}
            <div
              style={{ flex: '1 1 260px', minWidth: 240, background: '#ffffff', border: '1px solid #B2DFDB', borderRadius: 12, padding: 14, boxShadow: '0 6px 12px rgba(0,0,0,0.06)', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <FaUsers color="#ff6b6b" />
                <strong style={{ color: '#00695C' }}>Cashiers</strong>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Active Accounts</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#00695C', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaUserCheck color="#28a745" /> {cashierStats.active}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Total Registered</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#00695C' }}>{cashierStats.total}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!isFullscreen && (
          <div style={{ 
            background: 'linear-gradient(135deg, #004D40 0%, #00695C 50%, #00796B 100%)',
            color: '#fff',
            borderRadius: 24,
            padding: '22px',
            marginBottom: 18,
            boxShadow: '0 20px 32px rgba(0,77,64,0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', color: '#fff', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                <FaCog /> CONTROL CENTER
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 10 }}>
                Welcome back, <span style={{ color: '#B2DFDB' }}>{userDetails?.name || localStorage.getItem('currentUserName') || 'Staff'}</span>!
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
                Role: Staff
              </div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
                Review stock and maps. Your access focuses on inventory tools.
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
                <Link to="/invent" style={{ textDecoration: 'none' }}>
                  <button
                    style={{ 
                      background: '#ffffff', color: '#00695C', border: 'none', borderRadius: 999, padding: '10px 18px', 
                      fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 16px rgba(255,255,255,0.15)', transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 22px rgba(255,255,255,0.25)'; e.currentTarget.style.background = '#E0F2F1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(255,255,255,0.15)'; e.currentTarget.style.background = '#ffffff'; }}
                  >
                    Manage Inventory
                  </button>
                </Link>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 900 }}>{categories.length}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Categories</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 30, fontWeight: 900 }}>{products.length}</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Products</div>
              </div>
            </div>
          </div>
        )}
        {!isFullscreen && <NewProductsCarousel />}
        {isFullscreen && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: '20px', padding: isFullscreen ? '0 20px' : '0' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <FaBox size={22} color="#26A69A" />
            <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#00695C' }}>Product Inventory</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={filterSelectStyle}>
              {uniqueCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: 14, color: '#555', fontWeight: 'bold' }}>Sort:</label>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #B2DFDB', fontSize: '14px', background: '#ffffff' }}
              >
                <option value="status">Status (OOS → Low → In)</option>
                <option value="stockDesc">Stock (High → Low)</option>
                <option value="stockAsc">Stock (Low → High)</option>
                <option value="nameAsc">Name (A → Z)</option>
                <option value="nameDesc">Name (Z → A)</option>
                <option value="dateAddedDesc">Date Added (Newest)</option>
                <option value="dateAddedAsc">Date Added (Oldest)</option>
                <option value="dateEditedDesc">Last Edited (Newest)</option>
                <option value="dateRestoredDesc">Last Restored (Newest)</option>
              </select>
            </div>
            <button
              onClick={() => setShowFontSettings(!showFontSettings)}
              style={{ ...addBtnStyle, backgroundColor: '#6c757d', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="Font Settings"
            >
              <FaCog size={14} />
              Font
            </button>
            {!isFullscreen ? (
              <button
                onClick={() => setIsFullscreen(true)}
                style={{ ...addBtnStyle, backgroundColor: '#0d6efd' }}
                title="View full screen"
              >
                Full Screen
              </button>
            ) : (
              <button
                onClick={() => setIsFullscreen(false)}
                style={{ ...addBtnStyle, backgroundColor: '#6c757d' }}
                title="Back"
              >
                Back
              </button>
            )}
            <Link
              to="/addproduct?role=staff&mode=add"
              onClick={() => { localStorage.removeItem('productToEdit'); localStorage.removeItem('productEditMode'); }}
              style={{ textDecoration: 'none' }}
            >
              <button style={{ ...addBtnStyle, backgroundColor: '#1ec14c' }}> + Add Product </button>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #B2DFDB', borderRadius: '10px', padding: '6px 12px', width: 320, background: '#ffffff' }}>
              <FaSearch color="#888" />
              <input type="text" placeholder="Search product..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', marginLeft: 8, width: '100%', padding: 6, fontSize: 14 }} />
            </div>
          </div>
        </div>
        )}

        {showFontSettings && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px', padding: '12px', backgroundColor: '#E0F2F1', borderRadius: '8px', border: '1px solid #B2DFDB' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Font Size:</label>
            <input
              type="range"
              min="10"
              max="18"
              value={fontSettings.size}
              onChange={(e) => handleFontChange('size', parseInt(e.target.value))}
              style={{ width: '120px' }}
            />
            <span style={{ fontSize: '12px', color: '#666' }}>{fontSettings.size}px</span>

            <label style={{ fontSize: '14px', fontWeight: 'bold', marginLeft: '20px' }}>Font Family:</label>
            <select
              value={fontSettings.family}
              onChange={(e) => handleFontChange('family', e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
            </select>

            <button
              onClick={() => setShowFontSettings(false)}
              style={{ ...addBtnStyle, backgroundColor: '#6c757d', marginLeft: '20px' }}
            >
              Close
            </button>
          </div>
        )}

        

        {showEditModal && (
          <div style={modalOverlayStyle}>
            <div style={{ ...modalBoxStyle, maxWidth: '800px' }}>
              <h3>Edit Product</h3>
            </div>
          </div>
        )}

        {/* Variant Warning Modal */}
        {showVariantWarning && variantWarningProduct && (
          <div style={modalOverlayStyle}>
            <div style={variantWarningModalStyle}>
              <h3 style={{ marginBottom: '15px', color: '#dc3545' }}>⚠️ Product Has Variants</h3>
              <p style={{ marginBottom: '20px', lineHeight: '1.5' }}>
                The product "<strong>{variantWarningProduct.name}</strong>" has multiple variants with different quantities. 
                To adjust stock for specific variants, please use the Edit Product page where you can modify individual variant quantities.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                <button
                  onClick={() => {
                    setShowVariantWarning(false);
                    setVariantWarningProduct(null);
                  }}
                  style={{ ...actionBtnStyle, backgroundColor: '#6c757d' }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowVariantWarning(false);
                    setVariantWarningProduct(null);
                    handleEdit(variantWarningProduct);
                  }}
                  style={{ ...actionBtnStyle, backgroundColor: '#007bff' }}
                >
                  Edit Product
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Variant Details Modal */}
        {showVariantModal && selectedProductForVariant && (
          <div style={modalOverlayStyle}>
            <div style={variantModalStyle}>
              <h3 style={{ marginBottom: '15px', color: '#007bff' }}>
                Variants for: <strong>{selectedProductForVariant.name}</strong>
              </h3>
              
              <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                {(() => {
                  const strip = (s) => String(s).replace(/[\[\]"\\]/g,'').trim();
                  const brands = (selectedProductForVariant.brandOptions || []).map(strip);
                  const units = (selectedProductForVariant.unitOptions || []).map(strip);
                  const rawScq = (selectedProductForVariant.sizeColorQuantities || []);
                  const stripNonEmpty = (s) => { const t = strip(s); return t ? t : ''; };
                  const scqFilled = rawScq
                    .filter(v => stripNonEmpty(v.size) && stripNonEmpty(v.color))
                    .map(v => ({ size: stripNonEmpty(v.size), color: stripNonEmpty(v.color), quantity: v.quantity || 0 }));
                  const sqFromScq = rawScq
                    .filter(v => stripNonEmpty(v.size) && !stripNonEmpty(v.color))
                    .map(v => ({ size: stripNonEmpty(v.size), quantity: v.quantity || 0 }));
                  const cqFromScq = rawScq
                    .filter(v => stripNonEmpty(v.color) && !stripNonEmpty(v.size))
                    .map(v => ({ color: stripNonEmpty(v.color), quantity: v.quantity || 0 }));
                  const cqRaw = (selectedProductForVariant.colorQuantities || []).map(v => ({ color: stripNonEmpty(v.color), quantity: v.quantity || 0 }));
                  const sqRaw = (selectedProductForVariant.sizeQuantities || []).map(v => ({ size: stripNonEmpty(v.size), quantity: v.quantity || 0 }));
                  const mergeByKey = (items, key) => {
                    const map = new Map();
                    items.forEach(it => {
                      const k = it[key];
                      if (!k) return;
                      const prev = map.get(k) || 0;
                      map.set(k, prev + (it.quantity || 0));
                    });
                    return Array.from(map.entries()).map(([k, q]) => ({ [key]: k, quantity: q }));
                  };
                  const sq = mergeByKey([...sqRaw, ...sqFromScq], 'size');
                  const cq = mergeByKey([...cqRaw, ...cqFromScq], 'color');
                  const hasSizeOrColor = (scqFilled.length + sq.length + cq.length) > 0;
                  const showBrandUnitQtyTable = false;
                  
                  // Get brand-unit quantities
                  const buqRaw = (selectedProductForVariant.brandUnitQuantities || []).map(v => ({ 
                    brand: stripNonEmpty(v.brand), 
                    unit: stripNonEmpty(v.unit), 
                    quantity: v.quantity || 0 
                  })).filter(v => v.brand && v.unit);
                  
                  // Get brand-only quantities
                  const bqRaw = (selectedProductForVariant.brandQuantities || []).map(v => ({ 
                    brand: stripNonEmpty(v.brand), 
                    quantity: v.quantity || 0 
                  })).filter(v => v.brand);
                  
                  // Get unit-only quantities
                  const uqRaw = (selectedProductForVariant.unitQuantities || []).map(v => ({ 
                    unit: stripNonEmpty(v.unit), 
                    quantity: v.quantity || 0 
                  })).filter(v => v.unit);
                  
                  if ((scqFilled.length + cq.length + sq.length + buqRaw.length + bqRaw.length + uqRaw.length) === 0) {
                    return <p style={{ textAlign: 'center', color: '#666' }}>No variants found</p>;
                  }
                  return (
                    <div>
                      {/* Brand and Unit display at top */}
                      {(brands.length > 0 || units.length > 0) && (
                        <div style={{ marginBottom: 16, padding: '12px', background: '#E0F2F1', borderRadius: '8px', border: '1px solid #B2DFDB' }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                            {brands.map((b,i) => (
                              <span key={`br-${i}`} style={brandTagStyle}>
                                Brand: {b}
                              </span>
                            ))}
                            {units.map((u,i) => (
                              <span key={`un-${i}`} style={unitTagStyle}>
                                Unit: {u}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Brand-Unit Quantities Table (show only if there are size/color variants present) */}
                      {showBrandUnitQtyTable && buqRaw.length > 0 && hasSizeOrColor && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '16px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#00695C', borderBottom: '2px solid #004D40' }}>
                              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Brand</th>
                              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Unit</th>
                              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {buqRaw.map((v,i) => (
                              <tr key={`bu-item-${i}`} style={{ borderBottom: '1px solid #eee', background: '#E0F2F1' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.brand}</td>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.unit}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#00695C' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'brand-unit', brand: v.brand, unit: v.unit, quantity: v.quantity || 0 }, -1)}
                                      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'brand-unit', brand: v.brand, unit: v.unit, quantity: v.quantity || 0 }, 1)}
                                      style={{ backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Brand-only Quantities Table */}
                      {bqRaw.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '16px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#00695C', borderBottom: '2px solid #004D40' }}>
                              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Brand</th>
                              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bqRaw.map((v,i) => (
                              <tr key={`b-only-${i}`} style={{ borderBottom: '1px solid #eee', background: '#E0F2F1' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.brand}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#00695C' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'brand-only', brand: v.brand, quantity: v.quantity || 0 }, -1)}
                                      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'brand-only', brand: v.brand, quantity: v.quantity || 0 }, 1)}
                                      style={{ backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Unit-only Quantities Table */}
                      {uqRaw.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '16px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#00695C', borderBottom: '2px solid #004D40' }}>
                              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Unit</th>
                              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {uqRaw.map((v,i) => (
                              <tr key={`u-only-${i}`} style={{ borderBottom: '1px solid #eee', background: '#E0F2F1' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{v.unit}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#00695C' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'unit-only', unit: v.unit, quantity: v.quantity || 0 }, -1)}
                                      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'unit-only', unit: v.unit, quantity: v.quantity || 0 }, 1)}
                                      style={{ backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {scqFilled.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '16px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#00695C', borderBottom: '2px solid #004D40' }}>
                              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Size</th>
                              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Color</th>
                              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scqFilled.map((v,i) => (
                              <tr key={`sc-item-${i}`} style={{ borderBottom: '1px solid #eee', background: '#E0F2F1' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{strip(v.size)}</td>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{strip(v.color)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#00695C' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'size-color', size: strip(v.size), color: strip(v.color), quantity: v.quantity || 0 }, -1)}
                                      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'size-color', size: strip(v.size), color: strip(v.color), quantity: v.quantity || 0 }, 1)}
                                      style={{ backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {sq.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '16px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#00695C', borderBottom: '2px solid #004D40' }}>
                              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Size</th>
                              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sq.map((v,i) => (
                              <tr key={`size-only-${i}`} style={{ borderBottom: '1px solid #eee', background: '#E0F2F1' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{strip(v.size)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#00695C' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'size-only', size: strip(v.size), quantity: v.quantity || 0 }, -1)}
                                      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'size-only', size: strip(v.size), quantity: v.quantity || 0 }, 1)}
                                      style={{ backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {cq.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#00695C', borderBottom: '2px solid #004D40' }}>
                              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Color</th>
                              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #004D40', color: '#ffffff' }}>Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cq.map((v,i) => (
                              <tr key={`color-only-${i}`} style={{ borderBottom: '1px solid #eee', background: '#E0F2F1' }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{strip(v.color)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#00695C' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'color-only', color: strip(v.color), quantity: v.quantity || 0 }, -1)}
                                      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'color-only', color: strip(v.color), quantity: v.quantity || 0 }, 1)}
                                      style={{ backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', width: '24px', height: '24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setShowVariantModal(false);
                    setSelectedProductForVariant(null);
                  }}
                  style={{ ...actionBtnStyle, backgroundColor: '#6c757d' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

               {/* allow horizontal scrolling always */}
        {isFullscreen && (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingRight: isFullscreen ? '0' : '10px' }}>
          <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'collapse', background: '#E0F2F1', borderRadius: '12px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#00695C', zIndex: 1, boxShadow: '0 1px 0 #004D40' }}>
              <tr style={{ textAlign: 'center' }}>
               
                <th style={thStyle}>Image</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Details</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Variants</th>
                <th style={thStyle}>Stock</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Activity</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Adjust</th>
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 ? (
                <tr>
                  <td colSpan={showDeleteMode ? "14" : "13"} style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '16px' }}>
                    No products found.
                  </td>
                </tr>
              ) : (
                ordered.map((item) => {
                  const eff = effectiveStockOf(item);
                  const status = getStatus(eff);

                  // Highlight logic - show green for new, blue for edited
                  const isNewlyAdded = highlightedNewIds.has(item._id);
                  const isNewlyEdited = highlightedEditedIds.has(item._id);
                  const isNew = justAddedIds.has(item._id);
                  const isRestored = justRestoredIds.has(item._id);
                  const isEdited = justEditedIds.has(item._id);
                  
                  let rowBg = '#E0F2F1';
                  if (!acknowledgedHighlights) {
                    if (isNewlyAdded || isNew) {
                      rowBg = '#e8f5e8'; // Light green for newly added
                    } else if (isNewlyEdited || isEdited) {
                      rowBg = '#e3f2fd'; // Light blue for edited
                    } else if (isRestored) {
                      rowBg = '#fff8e1'; // Light yellow for restored
                    }
                  }

                  // Add red highlight for selected items in delete mode
                  if (showDeleteMode && selectedIds.includes(item._id)) {
                    rowBg = '#ffebee'; // Light red background for selected items
                  }

                  return (
                    <tr
                      key={item._id}
                      style={{ 
                        textAlign: 'center', 
                        background: rowBg, 
                        transition: 'background 0.3s ease',
                        border: (isNewlyAdded || isNewlyEdited) && !acknowledgedHighlights ? '2px solid #4caf50' : 'none'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = rowBg; }}
                    >
                      {showDeleteMode && (
                        <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item._id)}
                            onChange={() => handleSelect(item._id)}
                          />
                        </td>
                      )}
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                        <img
                          src={item.image ? `http://localhost:5000${item.image}` : 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%2260%22 height=%2260%22 fill=%22%23e5e7eb%22/></svg>'}
                          alt={item.name}
                          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e3e8ff' }}
                          onError={(e) => { e.target.src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2255%22 height=%2255%22><rect width=%2255%22 height=%2255%22 fill=%22%23e5e7eb%22/></svg>'; }}
                        />
                      </td>
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family, fontWeight: 700}}>{item.name}</td>
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                        <div style={{ maxWidth: '180px', wordWrap: 'break-word', textAlign: 'left', margin: '0 auto' }}>
                          {item.details && item.details.length > 60 ? `${item.details.substring(0, 60)}...` : item.details || 'N/A'}
                        </div>
                      </td>
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>{item.category}</td>
                      <td style={{ ...tdStyle, maxWidth: '200px', fontSize: fontSettings.size, fontFamily: fontSettings.family }}>
                        <div style={{ maxHeight: '60px', overflowY: 'auto', textAlign: 'left' }}>
                          {formatVariants(item)}
                        </div>
                      </td>
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}><strong>{eff}</strong></td>
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>₱{parseFloat(item.price || 0).toFixed(2)}</td>
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                        <div style={{ fontWeight: 'bold', color: status.color, lineHeight: 1.2 }}>
                          {status.label}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, minWidth: 150, fontSize: fontSettings.size, fontFamily: fontSettings.family }}>
                        {renderActivity(item)}
                      </td>
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                        <button onClick={() => handleEdit(item)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: 8 }}>
                          <FaPen size={18} color="#0d47a1" />
                        </button>
                        <button onClick={() => handleDeleteSingle(item)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                          <FaTrash size={18} color="#d32f2f" />
                        </button>
                      </td>
                      <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                        <button title="Add 1" onClick={() => handleRestock(item._id, 1)} style={restockBtnStyle} disabled={hasVariants(item)}>+</button>
                        <button title="Subtract 1" onClick={() => handleRestock(item._id, -1)} style={restockBtnStyle} disabled={hasVariants(item)}>-</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserModal && (
        <div style={modalOverlayStyle} onClick={() => setShowUserModal(false)}>
          <div style={userModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#00695C', fontSize: '24px' }}>User Profile</h2>
              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              {/* Profile Image */}
              <div style={{ position: 'relative' }}>
                {userDetails?.profileImage ? (
                  <img
                    src={`http://localhost:5000${userDetails.profileImage}`}
                    alt="Profile"
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '4px solid #00695C',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    backgroundColor: '#E0F2F1',
                    display: userDetails?.profileImage ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '4px solid #00695C',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  <FaUserCircle size={60} color="#00695C" />
                </div>
              </div>

              {/* User Details */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={userDetailItemStyle}>
                  <label style={userDetailLabelStyle}>Full Name:</label>
                  <div style={userDetailValueStyle}>{userDetails?.name || localStorage.getItem('currentUserName') || 'N/A'}</div>
                </div>
                
                <div style={userDetailItemStyle}>
                  <label style={userDetailLabelStyle}>Role:</label>
                  <div style={userDetailValueStyle}>
                    {localStorage.getItem('currentUserRole') 
                      ? localStorage.getItem('currentUserRole').charAt(0).toUpperCase() + localStorage.getItem('currentUserRole').slice(1)
                      : 'N/A'}
                  </div>
                </div>
                
                <div style={userDetailItemStyle}>
                  <label style={userDetailLabelStyle}>Username:</label>
                  <div style={userDetailValueStyle}>{userDetails?.username || localStorage.getItem('currentUserUsername') || 'N/A'}</div>
                </div>
              </div>

              <button
                onClick={() => setShowUserModal(false)}
                style={{
                  ...actionBtnStyle,
                  backgroundColor: '#0066ff',
                  marginTop: '10px',
                  width: '100%'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Styles - Updated for better readability and consistent button sizes
const sidebarStyle = { width: '230px', background: '#ffffff', borderRight: '1px solid #ccc', boxShadow: '2px 0 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px 12px' };
const iconGroupStyle = { display: 'flex', flexDirection: 'column', gap: '20px' };
const sidebarLink = { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', textDecoration: 'none', color: '#333', borderRadius: '8px' };
const labelStyle = { fontSize: '15px', fontWeight: 'bold' };
const addBtnStyle = { backgroundColor: '#1ec14c', color: 'white', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '14px' };
const filterSelectStyle = { padding: '10px 20px', borderRadius: '8px', border: '2px solid #00695C', backgroundColor: 'white', color: '#00695C', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };
const thStyle = {
  padding: '12px 10px',
  borderBottom: '2px solid #B2DFDB',
  fontSize: '13px',
  fontWeight: 800,
  color: '#ffffff',
  backgroundColor: '#00695C'
};
const tdStyle = {
  padding: '12px 10px',
  borderBottom: '1px solid #B2DFDB',
  fontSize: '12px',
  color: '#102A27',
  background: '#E0F2F1'
};
const selectBtnStyle = { padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' };
const restockBtnStyle = { backgroundColor: '#f59e0b', color: '#111827', padding: '6px 10px', borderRadius: '8px', border: 'none', margin: '2px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 };
const modalBoxStyle = { backgroundColor: 'white', padding: '25px 30px', borderRadius: '12px', maxWidth: '600px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto' };
const expandedModalBoxStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', maxWidth: '700px', width: '90%', maxHeight: '75vh', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflowY: 'auto' };
const actionBtnStyle = { padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: 'white' };
const variantWarningModalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '12px', maxWidth: '500px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', textAlign: 'center' };
const variantModalStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '12px', maxWidth: '700px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', textAlign: 'center' };
const tagBaseStyle = { padding: '5px 10px', borderRadius: '12px', border: '1px solid #dee2e6', fontSize: 12, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const brandTagStyle = { ...tagBaseStyle, background: '#e8f5e9' };
const unitTagStyle = { ...tagBaseStyle, background: '#fff8e1' };
const sizeTagStyle = { ...tagBaseStyle, background: '#e3f2fd' };
const colorTagStyle = { ...tagBaseStyle, background: '#fce4ec' };
const userModalStyle = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '16px',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  zIndex: 1000
};
const userDetailItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
  padding: '12px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e0e0e0'
};
const userDetailLabelStyle = {
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};
const userDetailValueStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#333',
  wordBreak: 'break-word'
};

export default StaffDashboard;
