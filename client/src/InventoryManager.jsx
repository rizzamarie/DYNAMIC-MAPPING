import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaUserCircle, FaHome, FaMap, FaBox, FaPowerOff,
  FaSearch, FaTabletAlt, FaPen, FaTrash, FaCog,
  FaFileImport, FaFileExport, FaCalendarAlt, FaChevronDown, FaFilter, FaUndo, FaSync
} from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const theme = {
  colors: {
    primary: '#00695C',
    primaryHover: '#00796B',
    accent: '#26A69A',
    surface: '#ffffff',
    surfaceAlt: '#E0F2F1',
    border: '#B2DFDB',
    text: '#102A27',
    textMuted: '#4B635E',
    success: '#10b981', // Green
    danger: '#ef4444', // Red
    warning: '#f59e0b', // Amber
    shadow: '0 4px 6px -1px rgba(0, 77, 64, 0.25), 0 2px 4px -1px rgba(0, 77, 64, 0.18)',
    bg: '#E0F2F1'
  }
};

function InventoryManager() {
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
  const [avatarError, setAvatarError] = useState(false);

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

  // Pagination & Filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Single delete state and handler
  const [singleDeletingId, setSingleDeletingId] = useState(null);

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Countdown timer state for deleted products
  const [countdownTime, setCountdownTime] = useState(Date.now());

  // Notification state for expiring products
  const [showExpiryNotification, setShowExpiryNotification] = useState(false);
  const [expiringProducts, setExpiringProducts] = useState([]);

  const [historyItems, setHistoryItems] = useState([]);
  const [historyEventFilter, setHistoryEventFilter] = useState('All');
  const [showHistory, setShowHistory] = useState(false);
  const [historyOnly, setHistoryOnly] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleRefreshClick = async () => {
    await fetchProducts();
    setStatusFilter('All');
    setCategoryFilter('All');
    setDateStart('');
    setSearchTerm('');
    setSortMode('status');
    setCurrentPage(1);
  };

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
    return dt.toLocaleTimeString([], { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  };

  useEffect(() => {
    if (location.pathname === '/inventory-history') {
      setShowHistory(true);
      setHistoryOnly(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const anyOpen = !!(showUndoModal || showEditModal || showDeleteConfirmModal || showVariantModal || showVariantWarning);
    window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: anyOpen } }));
  }, [showUndoModal, showEditModal, showDeleteConfirmModal, showVariantModal, showVariantWarning]);

  useEffect(() => {
    const userRole = localStorage.getItem('currentUserRole');
    if (!userRole) {
      navigate('/login', { replace: true });
      return;
    }

    fetchProducts();
    fetchCategories();
    fetchHistory();
    const storedUsername = localStorage.getItem('currentUserUsername');
    const storedName = localStorage.getItem('currentUserName');
    const storedRole = localStorage.getItem('currentUserRole');
    const storedProfileImage = localStorage.getItem('currentUserProfileImage');
    if (storedUsername) {
      setCurrentUser({ 
        username: storedUsername,
        name: storedName,
        role: storedRole,
        profileImage: storedProfileImage
      });
      setAvatarError(false);
      if (!storedProfileImage) {
        (async () => {
          try {
            const res = await axios.get('http://localhost:5000/users');
            const user = (res.data || []).find(u => u.username === storedUsername);
            if (user) {
              if (user.profileImage) {
                localStorage.setItem('currentUserProfileImage', user.profileImage);
              }
              setCurrentUser({
                username: user.username,
                name: user.name || storedName,
                role: user.role || storedRole,
                profileImage: user.profileImage || null,
              });
              setAvatarError(false);
            }
          } catch {}
        })();
      }
    }

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
        const oneDay = 24 * 60 * 60 * 1000; // 1 day

        const expired = parsed.filter(item => now - item.deletedAt >= oneDay);
        const valid = parsed.filter(item => now - item.deletedAt < oneDay);

        setRecentlyDeleted(valid);
        localStorage.setItem('recentlyDeletedProducts', JSON.stringify(valid));

        expired.forEach(async (product) => {
          try {
            await axios.delete(`http://localhost:5000/products/${product._id}?permanent=true`);
          } catch (err) {
            console.error(`Failed to permanently delete ${product.name}:`, err);
          }
        });
      }
    };

    cleanupExpiredProducts();

    const onBeforeUnload = () => {
      localStorage.setItem('inventoryLastVisit', new Date().toISOString());
      localStorage.removeItem('inventoryJustRestored');
      localStorage.removeItem('inventoryJustAddedIds');
      localStorage.setItem('inventorySeenUpdatedAt', JSON.stringify(seenUpdatedAt));
    };
    window.addEventListener('beforeunload', onBeforeUnload);

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

    // Poll for updates every 2 seconds
    const updateInterval = setInterval(checkForUpdates, 2000);
    checkForUpdates(); // Check immediately

    return () => {
      onBeforeUnload();
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
      clearInterval(cleanupInterval);
      clearInterval(updateInterval);
    };
  }, []);

  // Update countdown timer every minute when there are deleted products
  useEffect(() => {
    if (recentlyDeleted.length === 0) return;
    const timer = setInterval(() => {
      setCountdownTime(Date.now());
    }, 60 * 1000);
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
      return timeLeft > 0 && timeLeft < 2 * 60 * 60 * 1000;
    });
    if (expiring.length > 0) {
      setExpiringProducts(expiring);
      setShowExpiryNotification(true);
    } else {
      setShowExpiryNotification(false);
      setExpiringProducts([]);
    }
  }, [recentlyDeleted, countdownTime]);

  // Highlight effect for redirected products
  useEffect(() => {
    if (location.state?.highlightId && products.length > 0) {
      // Reset filters to ensure product is visible
      setCategoryFilter('All');
      setSearchTerm('');
      
      const id = location.state.highlightId;
      setHighlightedEditedIds(prev => new Set([...prev, id]));
      
      setTimeout(() => {
        const element = document.getElementById(`product-row-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            setHighlightedEditedIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, 3000);
        }
      }, 500);
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state, products]);

  const fetchProducts = async () => {
    try {
      const currentBranch = localStorage.getItem('currentBranch');
      const url = currentBranch
        ? `http://localhost:5000/products?branch=${encodeURIComponent(currentBranch)}`
        : 'http://localhost:5000/products';

      const res = await axios.get(url);
      const active = (res.data || []).filter(p => !p.deletedAt);
      setProducts(active);

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

  const fetchHistory = async () => {
    try {
      const currentBranch = localStorage.getItem('currentBranch');
      const currentRole = localStorage.getItem('currentUserRole');
      const currentUsername = localStorage.getItem('currentUserUsername');
      const params = new URLSearchParams();
      const isSystemAdmin = currentRole && currentRole.toLowerCase() === 'admin' && currentUsername === 'admin';
      if (currentBranch && !isSystemAdmin) params.append('branch', currentBranch);
      params.append('limit', '300');
      const url = `http://localhost:5000/stock-history?${params.toString()}`;
      const res = await axios.get(url);
      setHistoryItems(res.data || []);
    } catch (err) {
      console.error('❌ Failed to fetch stock history:', err.message);
    }
  };

  const uniqueCategories = ['All', ...Array.from(new Set(products.map(p => p.category || ''))).sort((a, b) => a.localeCompare(b))];
  
  function effectiveStockOf(p) {
    if (!p) return 0;
    let total = 0;
    const add = (arr) => {
      if (Array.isArray(arr)) {
        total += arr.reduce((s, v) => s + (v && typeof v === 'object' && v.quantity ? (Number(v.quantity) || 0) : 0), 0);
      }
    };
    add(p.sizeColorQuantities);
    add(p.colorQuantities);
    add(p.sizeQuantities);
    add(p.brandUnitQuantities);
    add(p.brandQuantities);
    add(p.unitQuantities);
    if (total > 0) return total;
    if (p.totalStock !== undefined && p.totalStock !== null && !isNaN(Number(p.totalStock)) && Number(p.totalStock) > 0) {
      return Number(p.totalStock);
    }
    return Number(p.stockQty) || 0;
  }

  const baseFiltered = products.filter((p) => {
    if (!p) return false;
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.details?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status Filter
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      const eff = effectiveStockOf(p);
      if (statusFilter === 'Low Stock') matchesStatus = eff > 0 && eff < 100;
      else if (statusFilter === 'In Stock') matchesStatus = eff >= 100;
      else if (statusFilter === 'Out of Stock') matchesStatus = eff === 0;
    }

    // Date Filter
    let matchesDate = true;
    if (dateStart) {
      const pDate = new Date(p.createdAt);
      const filterDate = new Date(dateStart);
      // Check if same day
      matchesDate = pDate.getFullYear() === filterDate.getFullYear() &&
                    pDate.getMonth() === filterDate.getMonth() &&
                    pDate.getDate() === filterDate.getDate();
    }

    return matchesCategory && matchesSearch && matchesStatus && matchesDate;
  });

  const getStatus = (qty) => {
    if (qty === 0) return { label: 'Out of Stock', color: '#ef4444', bg: '#fef2f2' };
    if (qty < 100) return { label: 'Low Stock', color: '#b45309', bg: '#fffbeb' };
    return { label: 'In Stock', color: '#047857', bg: '#ecfdf5' };
  };
  const statusRank = (qty) => (qty === 0 ? 0 : qty < 100 ? 1 : 2);
  const nameKey = (p) => p.name?.toLowerCase() || '';

  

  const hasVariants = (product) => {
    const stripNonEmpty = (s) => String(s || '').replace(/[\[\]"\\]/g,'').trim();
    if (product && product.hasVariants) return true;
    const hasSizeColorQty = Array.isArray(product.sizeColorQuantities) && product.sizeColorQuantities.some(v => stripNonEmpty(v.size) && stripNonEmpty(v.color));
    const hasSizeQty = Array.isArray(product.sizeQuantities) && product.sizeQuantities.some(v => stripNonEmpty(v.size));
    const hasColorQty = Array.isArray(product.colorQuantities) && product.colorQuantities.some(v => stripNonEmpty(v.color));
    const hasBrandUnitQty = Array.isArray(product.brandUnitQuantities) && product.brandUnitQuantities.some(v => stripNonEmpty(v.brand) && stripNonEmpty(v.unit));
    const hasBrandQty = Array.isArray(product.brandQuantities) && product.brandQuantities.some(v => stripNonEmpty(v.brand));
    const hasUnitQty = Array.isArray(product.unitQuantities) && product.unitQuantities.some(v => stripNonEmpty(v.unit));
    const hasSizeOpts = Array.isArray(product.sizeOptions) && product.sizeOptions.map(stripNonEmpty).some(Boolean);
    const hasColorOpts = Array.isArray(product.colorOptions) && product.colorOptions.map(stripNonEmpty).some(Boolean);
    const hasBrandOpts = Array.isArray(product.brandOptions) && product.brandOptions.map(stripNonEmpty).some(Boolean);
    const hasUnitOpts = Array.isArray(product.unitOptions) && product.unitOptions.map(stripNonEmpty).some(Boolean);
    return !!(hasSizeColorQty || hasSizeQty || hasColorQty || hasBrandUnitQty || hasBrandQty || hasUnitQty || hasSizeOpts || hasColorOpts || hasBrandOpts || hasUnitOpts);
  };

  const getVariantPriceSummary = (product) => {
    const prices = [];
    const pushPrice = (v) => {
      if (!v) return;
      const p = typeof v.price === 'number' ? v.price : parseFloat(v.price);
      if (!isNaN(p) && p > 0) prices.push(p);
    };

    (product.sizeColorQuantities || []).forEach(pushPrice);
    (product.sizeQuantities || []).forEach(pushPrice);
    (product.colorQuantities || []).forEach(pushPrice);
    (product.brandUnitQuantities || []).forEach(pushPrice);
    (product.brandQuantities || []).forEach(pushPrice);
    (product.unitQuantities || []).forEach(pushPrice);

    if (!prices.length) {
      const base = parseFloat(product.price || 0) || 0;
      return `₱${base.toFixed(2)}`;
    }

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `₱${min.toFixed(2)}`;
    return `₱${min.toFixed(2)} - ₱${max.toFixed(2)}`;
  };

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
        return arr.sort((a, b) => {
          const ea = effectiveStockOf(a);
          const eb = effectiveStockOf(b);
          const sr = statusRank(ea) - statusRank(eb);
          if (sr !== 0) return sr;
          return nameKey(a).localeCompare(nameKey(b));
        });
    }
  })();

  let ordered = [...baseOrdered];
  if (!acknowledgedHighlights && (highlightedNewIds.size > 0 || highlightedEditedIds.size > 0 || justAddedIds.size > 0 || justRestoredIds.size > 0 || justEditedIds.size > 0)) {
    const newProducts = [];
    const editedProducts = [];
    const added = [];
    const restored = [];
    const edited = [];
    const rest = [];
    ordered.forEach(p => {
      if (highlightedNewIds.has(p._id)) newProducts.push(p);
      else if (highlightedEditedIds.has(p._id)) editedProducts.push(p);
      else if (justAddedIds.has(p._id)) added.push(p);
      else if (justRestoredIds.has(p._id)) restored.push(p);
      else if (justEditedIds.has(p._id)) edited.push(p);
      else rest.push(p);
    });
    ordered = [...newProducts, ...editedProducts, ...added, ...restored, ...edited, ...rest];
  }

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTableData = ordered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(ordered.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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

  const handleVariantQuantityChange = async (product, variant, change) => {
    try {
      const newQuantity = (variant.quantity || 0) + change;
      if (newQuantity < 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Stock Error',
          text: '⚠️ Quantity cannot be negative',
          confirmButtonColor: '#1A2CA3'
        });
        return;
      }

      let updatedProduct = { ...product };
      if (variant.type === 'size-color') {
        updatedProduct.sizeColorQuantities = updatedProduct.sizeColorQuantities.map(v => 
          v.size === variant.size && v.color === variant.color ? { ...v, quantity: newQuantity } : v
        );
      } else if (variant.type === 'color-only') {
        updatedProduct.colorQuantities = updatedProduct.colorQuantities.map(v => 
          v.color === variant.color ? { ...v, quantity: newQuantity } : v
        );
      } else if (variant.type === 'size-only') {
        updatedProduct.sizeQuantities = updatedProduct.sizeQuantities.map(v => 
          v.size === variant.size ? { ...v, quantity: newQuantity } : v
        );
      } else if (variant.type === 'brand-unit') {
        updatedProduct.brandUnitQuantities = updatedProduct.brandUnitQuantities.map(v => 
          v.brand === variant.brand && v.unit === variant.unit ? { ...v, quantity: newQuantity } : v
        );
      } else if (variant.type === 'brand-only') {
        updatedProduct.brandQuantities = updatedProduct.brandQuantities.map(v => 
          v.brand === variant.brand ? { ...v, quantity: newQuantity } : v
        );
      } else if (variant.type === 'unit-only') {
        updatedProduct.unitQuantities = updatedProduct.unitQuantities.map(v => 
          v.unit === variant.unit ? { ...v, quantity: newQuantity } : v
        );
      }

      const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
      const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
      await axios.put(
        `http://localhost:5000/products/${product._id}?source=variant&actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`,
        updatedProduct
      );
      
      // Signal inventory update to other components (Cashier, etc.)
      localStorage.setItem('inventoryLastUpdate', Date.now().toString());
      window.dispatchEvent(new Event('inventoryUpdated'));
      
      await fetchProducts();
      const updatedProducts = await axios.get('http://localhost:5000/products');
      const updatedProductData = updatedProducts.data.find(p => p._id === product._id);
      setSelectedProductForVariant(updatedProductData);
      
    } catch (err) {
      console.error('Failed to update variant quantity:', err);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: '❌ Failed to update quantity',
        confirmButtonColor: '#1A2CA3'
      });
    }
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

      const currentBranch = localStorage.getItem('currentBranch');
      if (currentBranch) {
        uploadData.append('branch', currentBranch);
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
      const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
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
        text: '❌ Error saving product',
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
    navigate(`/addproduct?role=manager&mode=edit&id=${product._id}`, {
      state: { editProduct: product, mode: 'edit' }
    });
  };

  const handleRestock = async (id, amount) => {
    const product = products.find(p => p._id === id);
    if (!product) return;

    if (hasVariants(product)) {
      setVariantWarningProduct(product);
      setShowVariantWarning(true);
      return;
    }

    try {
      const newQty = (product.stockQty || 0) + amount;
      if (newQty < 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Stock Error',
          text: '⚠️ Stock cant be negative',
          confirmButtonColor: '#1A2CA3'
        });
        return;
      }
      const updatedProduct = { ...product, stockQty: newQty };
      const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
      const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
      await axios.put(
        `http://localhost:5000/products/${id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`,
        updatedProduct
      );
      localStorage.setItem('inventoryLastUpdate', Date.now().toString());
      window.dispatchEvent(new Event('inventoryUpdated'));
      fetchProducts();
    } catch (err) {
      console.error('Stock update failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: '❌ Stock update failed',
        confirmButtonColor: '#1A2CA3'
      });
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
          const toDelete = products.filter(p => selectedIds.includes(p._id));
          const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
          const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
          
          await Promise.all(toDelete.map(async (p) => {
            await axios.delete(`http://localhost:5000/products/${p._id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}&source=admin`);
          }));
          const withDate = toDelete.map(p => ({ ...p, deletedAt: Date.now() }));
          const updated = [...recentlyDeleted, ...withDate];
          setRecentlyDeleted(updated);
          localStorage.setItem('recentlyDeletedProducts', JSON.stringify(updated));
          setSelectedIds([]);
          setShowDeleteMode(false);
          fetchProducts();
          localStorage.setItem('inventoryLastUpdate', Date.now().toString());
          window.dispatchEvent(new Event('inventoryUpdated'));
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

  const handleUndoClick = () => {
    setSelectedUndo([]);
    setShowUndoModal(true);
  };

  const handleUndoDelete = async (productsToRestore) => {
    try {
      const ids = [];
      const times = { ...restoreTimes };
      const nowIso = new Date().toISOString();
      const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
      const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
      
      for (const product of productsToRestore) {
        await axios.patch(`http://localhost:5000/products/${product._id}/undo?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}&source=admin`);
        ids.push(product._id);
        times[product._id] = nowIso;
      }
      localStorage.setItem('inventoryJustRestored', JSON.stringify(ids));
      localStorage.setItem('inventoryRestoreTimes', JSON.stringify(times));
      setJustRestoredIds(new Set(ids));
      setRestoreTimes(times);

      setRecentlyDeleted(recentlyDeleted.filter(p => !selectedUndo.includes(p._id)));
      localStorage.setItem('recentlyDeletedProducts', JSON.stringify(recentlyDeleted.filter(p => !selectedUndo.includes(p._id))));
      fetchProducts();
      localStorage.setItem('inventoryLastUpdate', Date.now().toString());
      window.dispatchEvent(new Event('inventoryUpdated'));
    } catch (error) {
      console.error('Error undoing delete:', error);
    }
  };

  const handleRestoreAll = async () => {
    try {
      const ids = [];
      const times = { ...restoreTimes };
      const nowIso = new Date().toISOString();
      const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
      const name = currentUser?.name || localStorage.getItem('currentUserName') || '';

      for (const product of recentlyDeleted) {
        await axios.patch(`http://localhost:5000/products/${product._id}/undo?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}&source=admin`);
        ids.push(product._id);
        times[product._id] = nowIso;
      }
      localStorage.setItem('inventoryJustRestored', JSON.stringify(ids));
      localStorage.setItem('inventoryRestoreTimes', JSON.stringify(times));
      setJustRestoredIds(new Set(ids));
      setRestoreTimes(times);

      setRecentlyDeleted([]);
      localStorage.setItem('recentlyDeletedProducts', JSON.stringify([]));
      fetchProducts();
      localStorage.setItem('inventoryLastUpdate', Date.now().toString());
      window.dispatchEvent(new Event('inventoryUpdated'));
    } catch (error) {
      console.error('Error restoring all products:', error);
    }
  };

  const handlePermanentDelete = async (productIds) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to PERMANENTLY delete the selected ${productIds.length} product(s)? This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete permanently!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
          const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
          for (const id of productIds) {
            await axios.delete(
              `http://localhost:5000/products/${id}?permanent=true&actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`
            );
          }
          setRecentlyDeleted(recentlyDeleted.filter(p => !productIds.includes(p._id)));
          localStorage.setItem('recentlyDeletedProducts', JSON.stringify(recentlyDeleted.filter(p => !productIds.includes(p._id))));
          Swal.fire('Deleted!', 'Products have been permanently deleted.', 'success');
        } catch (error) {
          console.error('Error permanently deleting products:', error);
          Swal.fire('Error!', 'Failed to permanently delete products.', 'error');
        }
      }
    });
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

  const getVariantDetails = (product) => {
    const strip = (s) => String(s).replace(/[\[\]"\\]/g, '').trim();
    const variants = [];

    const sizes = Array.isArray(product.sizeOptions) ? product.sizeOptions.map(strip) : [];
    const colors = Array.isArray(product.colorOptions) ? product.colorOptions.map(strip) : [];
    const brands = Array.isArray(product.brandOptions) ? product.brandOptions.map(strip) : [];
    const units = Array.isArray(product.unitOptions) ? product.unitOptions.map(strip) : [];

    const scq = Array.isArray(product.sizeColorQuantities) ? product.sizeColorQuantities : [];
    const cq = Array.isArray(product.colorQuantities) ? product.colorQuantities : [];
    const sq = Array.isArray(product.sizeQuantities) ? product.sizeQuantities : [];
    const buq = Array.isArray(product.brandUnitQuantities) ? product.brandUnitQuantities : [];
    const bq = Array.isArray(product.brandQuantities) ? product.brandQuantities : [];
    const uq = Array.isArray(product.unitQuantities) ? product.unitQuantities : [];

    if (sizes.length && colors.length) {
      sizes.forEach(sz => {
        colors.forEach(cl => {
          const existing = scq.find(v => strip(v.size) === sz && strip(v.color) === cl);
          variants.push({ type: 'size-color', size: sz, color: cl, quantity: existing ? (existing.quantity || 0) : 0 });
        });
      });
    } else if (scq.length) {
      scq.forEach(v => variants.push({ type: 'size-color', size: strip(v.size), color: strip(v.color), quantity: v.quantity || 0 }));
    }

    if (sizes.length && (!colors.length)) {
      sizes.forEach(sz => {
        const existing = sq.find(v => strip(v.size) === sz);
        variants.push({ type: 'size-only', size: sz, quantity: existing ? (existing.quantity || 0) : 0 });
      });
    } else if (sq.length) {
      sq.forEach(v => variants.push({ type: 'size-only', size: strip(v.size), quantity: v.quantity || 0 }));
    }

    if (colors.length && (!sizes.length)) {
      colors.forEach(cl => {
        const existing = cq.find(v => strip(v.color) === cl);
        variants.push({ type: 'color-only', color: cl, quantity: existing ? (existing.quantity || 0) : 0 });
      });
    } else if (cq.length) {
      cq.forEach(v => variants.push({ type: 'color-only', color: strip(v.color), quantity: v.quantity || 0 }));
    }

    if (brands.length && units.length) {
      brands.forEach(br => {
        units.forEach(un => {
          const existing = buq.find(v => strip(v.brand) === br && strip(v.unit) === un);
          variants.push({ type: 'brand-unit', brand: br, unit: un, quantity: existing ? (existing.quantity || 0) : 0 });
        });
      });
    } else if (buq.length) {
      buq.forEach(v => variants.push({ type: 'brand-unit', brand: strip(v.brand), unit: strip(v.unit), quantity: v.quantity || 0 }));
    }

    if (brands.length && !units.length) {
      brands.forEach(br => {
        const existing = bq.find(v => strip(v.brand) === br);
        variants.push({ type: 'brand-only', brand: br, quantity: existing ? (existing.quantity || 0) : 0 });
      });
    } else if (bq.length) {
      bq.forEach(v => variants.push({ type: 'brand-only', brand: strip(v.brand), quantity: v.quantity || 0 }));
    }

    if (units.length && !brands.length) {
      units.forEach(un => {
        const existing = uq.find(v => strip(v.unit) === un);
        variants.push({ type: 'unit-only', unit: un, quantity: existing ? (existing.quantity || 0) : 0 });
      });
    } else if (uq.length) {
      uq.forEach(v => variants.push({ type: 'unit-only', unit: strip(v.unit), quantity: v.quantity || 0 }));
    }

    return variants;
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
            backgroundColor: theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            transition: 'background-color 0.15s ease, transform 0.12s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.colors.primaryHover; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.colors.primary; e.currentTarget.style.transform = 'translateY(0)'; }}
          title="View variants"
        >
          View Variants
        </button>
      );
    }
    return 'N/A';
  };

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

  // Fullscreen controls (use browser Fullscreen API for true desktop fullscreen)
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {}
    setIsFullscreen(true);
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
    setIsFullscreen(false);
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const iconWrapper = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22 };
  const sidebarItem = (to, icon, label, isActive = false) => (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      style={{
        ...sidebarLink,
        ...(isActive ? {
          backgroundColor: theme.colors.primary,
          color: '#ffffff',
          borderColor: theme.colors.primary,
          boxShadow: '0 8px 18px rgba(13,71,161,0.18)'
        } : {})
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(13,71,161,0.10)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.backgroundColor = '#ffffff';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(13, 71, 161, 0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.backgroundColor = theme.colors.surface;
        }
      }}
    >
      <div style={iconWrapper}>{icon}</div>
      <span style={{ ...labelStyle, color: isActive ? '#ffffff' : sidebarLink.color }}>{label}</span>
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
    const showEditedDate = edited && new Date(edited) > new Date(added || 0);

    return (
      <div style={{ fontSize: fontSettings.size - 1, textAlign: 'center', fontFamily: fontSettings.family }}>
        {added && (
          <div style={{ marginBottom: '3px' }}>
            <strong>Added:</strong> {fmtDate(added)}<div style={{ color: theme.colors.textMuted, fontSize: fontSettings.size - 2 }}>{fmtTime(added)}</div>
          </div>
        )}
        {restored && (
          <div style={{ marginBottom: '3px' }}>
            <strong>Restored:</strong> {fmtDate(restored)}<div style={{ color: theme.colors.textMuted, fontSize: fontSettings.size - 2 }}>{fmtTime(restored)}</div>
          </div>
        )}
        {showEditedDate && (
          <div style={{ marginBottom: '3px' }}>
            <strong>Edited:</strong> {fmtDate(edited)}<div style={{ color: theme.colors.textMuted, fontSize: fontSettings.size - 2 }}>{fmtTime(edited)}</div>
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
                background: t === 'New' ? '#e8f5e9' : t === 'Restored' ? '#fff8e1' : '#e3f2fd',
                color: theme.colors.text,
                fontFamily: fontSettings.family,
                border: `1px solid ${theme.colors.border}`
              }}>{t}</span>
            ))}
          </div>
        )}
      </div>
    );
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
          const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
          const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
          
          await axios.delete(`http://localhost:5000/products/${product._id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}&source=admin`);
          
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

  const confirmDeleteSingle = async () => {
    if (!productToDelete) return;
    try {
      setSingleDeletingId(productToDelete._id);
      const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
      const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
      
      await axios.delete(`http://localhost:5000/products/${productToDelete._id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}&source=admin`);
      
      const withDate = { ...productToDelete, deletedAt: Date.now() };
      const updated = [...recentlyDeleted, withDate];
      setRecentlyDeleted(updated);
      localStorage.setItem('recentlyDeletedProducts', JSON.stringify(updated));
      setSelectedIds(prev => prev.filter(id => id !== productToDelete._id));
      fetchProducts();
      setShowDeleteConfirmModal(false);
      setProductToDelete(null);
      Swal.fire('Deleted!', 'Product has been deleted.', 'success');
    } catch (err) {
      console.error('Failed to delete product:', err);
      Swal.fire('Error!', 'Failed to delete product.', 'error');
    } finally {
      setSingleDeletingId(null);
    }
  };

  const filteredHistoryItems = historyItems.filter(h => {
    const matchesType = historyEventFilter === 'All' || h.type === historyEventFilter;
    const matchesSearch = !searchTerm || 
      (h.productName && h.productName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.note && h.note.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.type && h.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.branch && h.branch.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesDate = true;
    if (dateStart) {
      const hDate = new Date(h.createdAt);
      const filterDate = new Date(dateStart);
      matchesDate = hDate.toDateString() === filterDate.toDateString();
    }
    
    return matchesType && matchesSearch && matchesDate;
  });

  const path = location.pathname;

  return (
    <div style={{ width: '100%', height: '100%', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', overflow: 'hidden', color: theme.colors.text, WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
      
      <div style={{ width: '100%', height: '100%', padding: '20px', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={handleAcknowledge}>
          {/* Header removed per request */}
          <div style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>


          {/* Header Row: Title and Main Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: theme.colors.text }}>
                {showHistory ? 'Inventory History' : 'Products List'}
              </h2>
              <p style={{ fontSize: '14px', color: theme.colors.textMuted, margin: '4px 0 0 0' }}>
                {showHistory
                  ? 'Track all stock and price changes per branch.'
                  : 'View and manage all product inventory, variants, and stock levels.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {!showHistory && currentUser?.role !== 'staff' && (
                <button 
                  onClick={() => setShowUndoModal(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'white', color: theme.colors.text, 
                    border: `1px solid ${theme.colors.border}`,
                    padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <FaUndo /> Restore Products
                </button>
              )}
              {!historyOnly && currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    const next = !showHistory;
                    setShowHistory(next);
                    if (next) fetchHistory();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: showHistory ? theme.colors.primary : 'white',
                    color: showHistory ? 'white' : theme.colors.text,
                    border: `1px solid ${theme.colors.border}`,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  History
                </button>
              )}
              {!showHistory && (
                <Link to={`/addproduct?role=${currentUser?.role === 'staff' ? 'staff' : 'manager'}&mode=add`} style={{ textDecoration: 'none' }}>
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: theme.colors.primary, color: 'white', 
                    border: 'none',
                    padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                    fontSize: '14px'
                  }}>
                    + Add Product
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* Filter Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '12px 16px', borderRadius: '12px', border: `1px solid ${theme.colors.border}` }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.textMuted }} />
              <input
                type="text"
                placeholder={showHistory ? "Search history (product, note, type)" : "Search"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 38px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.colors.border}`,
                  outline: 'none',
                  fontSize: '14px',
                  color: theme.colors.text
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {showHistory ? (
                <>
                  <button
                    onClick={fetchHistory}
                    title="Refresh history"
                    style={{
                      background: 'white',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: '8px',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: theme.colors.text
                    }}
                  >
                    <FaSync />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', border: `1px solid ${theme.colors.border}`, borderRadius: '8px' }}>
                    <FaCalendarAlt style={{ color: theme.colors.textMuted }} />
                    <input 
                      type="date" 
                      value={dateStart} 
                      onChange={(e) => setDateStart(e.target.value)}
                      style={{ border: 'none', outline: 'none', fontSize: '13px', color: theme.colors.text, fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={historyEventFilter} 
                      onChange={(e) => setHistoryEventFilter(e.target.value)} 
                      style={{
                        appearance: 'none',
                        padding: '8px 32px 8px 12px',
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: '8px',
                        background: 'white',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        color: theme.colors.text,
                        minWidth: '140px'
                      }}
                    >
                      <option value="All">All Types</option>
                      {Array.from(new Set((historyItems || []).map(h => h.type).filter(Boolean))).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <FaChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: theme.colors.textMuted, pointerEvents: 'none' }} />
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleRefreshClick}
                    title="Refresh products"
                    style={{
                      background: 'white',
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: '8px',
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: theme.colors.text
                    }}
                  >
                    <FaSync />
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', border: `1px solid ${theme.colors.border}`, borderRadius: '8px' }}>
                    <FaCalendarAlt style={{ color: theme.colors.textMuted }} NB/>
                    <input 
                      type="date" 
                      value={dateStart} 
                      onChange={(e) => setDateStart(e.target.value)}
                      style={{ border: 'none', outline: 'none', fontSize: '13px', color: theme.colors.text, fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)} 
                      style={{
                        appearance: 'none',
                        padding: '8px 32px 8px 12px',
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: '8px',
                        background: 'white',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        color: theme.colors.text,
                        minWidth: '100px'
                      }}
                    >
                      <option value="All">Status</option>
                      <option value="Low Stock">Low Stock</option>
                      <option value="In Stock">In Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                    <FaChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: theme.colors.textMuted, pointerEvents: 'none' }} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={categoryFilter} 
                      onChange={(e) => setCategoryFilter(e.target.value)} 
                      style={{
                        appearance: 'none',
                        padding: '8px 32px 8px 12px',
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: '8px',
                        background: 'white',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        color: theme.colors.text,
                        minWidth: '120px'
                      }}
                    >
                      <option value="All">Category</option>
                      {uniqueCategories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <FaChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: theme.colors.textMuted, pointerEvents: 'none' }} />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <select 
                      value={sortMode} 
                      onChange={(e) => setSortMode(e.target.value)} 
                      style={{
                        appearance: 'none',
                        padding: '8px 32px 8px 12px',
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: '8px',
                        background: 'white',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        color: theme.colors.text,
                        minWidth: '120px'
                      }}
                    >
                      <option value="nameAsc">A-Z</option>
                      <option value="nameDesc">Z-A</option>
                      <option value="stockAsc">Stock ↑</option>
                      <option value="stockDesc">Stock ↓</option>
                    </select>
                    <FaChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: theme.colors.textMuted, pointerEvents: 'none' }} />
                  </div>
                </>
              )}
            </div>
          </div>

          {showFontSettings && (
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px', padding: '12px', backgroundColor: theme.colors.surfaceAlt, borderRadius: '12px', border: `1px solid ${theme.colors.border}` }}>
              <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Font Size:</label>
              <input
                type="range"
                min="10"
                max="18"
                value={fontSettings.size}
                onChange={(e) => handleFontChange('size', parseInt(e.target.value))}
                style={{ width: '140px' }}
              />
              <span style={{ fontSize: '12px', color: theme.colors.textMuted }}>{fontSettings.size}px</span>

              <label style={{ fontSize: '14px', fontWeight: 'bold', marginLeft: '20px' }}>Font Family:</label>
              <select
                value={fontSettings.family}
                onChange={(e) => handleFontChange('family', e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, background: theme.colors.surface }}
                onFocus={(e) => { e.currentTarget.style.borderColor = theme.colors.primary; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,71,161,0.12)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = theme.colors.border; e.currentTarget.style.boxShadow = 'none'; }}
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
                style={{ ...addBtnStyle, backgroundColor: '#6b7280', marginLeft: '12px' }}
              >
                Close
              </button>
            </div>
          )}

          {showDeleteMode && currentUser?.role !== 'staff' && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '12px', border: '1px solid #ffeaa7' }}>
              <button onClick={handleSelectAll} style={{ ...addBtnStyle, backgroundColor: theme.colors.primary }}>
                Select All
              </button>
              {selectedIds.length > 0 && (
                <>
                  <button
                    onClick={() => setSelectedIds([])}
                    style={{ ...addBtnStyle, backgroundColor: '#17a2b8' }}
                  >
                    Deselect
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    style={{ ...addBtnStyle, backgroundColor: theme.colors.danger }}
                  >
                    Delete Selected ({selectedIds.length})
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowDeleteMode(false);
                  setSelectedIds([]);
                }}
                style={{ ...addBtnStyle, backgroundColor: '#6b7280' }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingRight: isFullscreen ? '0' : '6px', background: 'transparent', borderRadius: '12px' }}>
            {showHistory ? (
              <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse', background: 'transparent' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 2, borderBottom: `1px solid ${theme.colors.border}` }}>
                  <tr style={{ textAlign: 'center', color: theme.colors.text, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Product</th>
                    <th style={thStyle}>Branch</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Prev Stock</th>
                    <th style={thStyle}>New Stock</th>
                    <th style={thStyle}>Prev Price</th>
                    <th style={thStyle}>New Price</th>
                    <th style={thStyle}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryItems.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '20px', color: theme.colors.textMuted, fontSize: '16px', background: 'transparent' }}>
                        No history found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryItems.map((h) => (
                      <tr key={h._id} style={{ textAlign: 'center', borderBottom: `1px solid ${theme.colors.border}` }}>
                        <td style={tdStyle}>{fmtDate(h.createdAt)}</td>
                        <td style={tdStyle}>{fmtTime(h.createdAt)}</td>
                        <td style={{ ...tdStyle, textAlign: 'left', paddingLeft: 20, fontWeight: 700 }}>{h.productName}</td>
                        <td style={tdStyle}>{h.branch || 'Main Branch'}</td>
                        <td style={tdStyle}>{h.type}</td>
                        <td style={tdStyle}>{h.quantity}</td>
                        <td style={tdStyle}>{h.previousStock}</td>
                        <td style={tdStyle}>{h.newStock}</td>
                        <td style={tdStyle}>₱{parseFloat(h.previousSellingPrice || 0).toFixed(2)}</td>
                        <td style={tdStyle}>₱{parseFloat(h.sellingPrice || 0).toFixed(2)}</td>
                        <td style={{ ...tdStyle, textAlign: 'left', paddingLeft: 12 }}>{h.note}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'collapse', background: 'transparent' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 2, borderBottom: `1px solid ${theme.colors.border}` }}>
                  <tr style={{ textAlign: 'center', color: theme.colors.text, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {showDeleteMode && currentUser?.role !== 'staff' && (
                      <th style={thStyle}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.length === ordered.length && ordered.length > 0}
                            onChange={handleSelectAll}
                          />
                          <span>Select All</span>
                        </label>
                      </th>
                    )}
                    <th style={{ ...thStyle, width: 100 }}>Image</th>
                    <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 20 }}>Product Name</th>
                    <th style={thStyle}>Branch</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Variants</th>
                    <th style={thStyle}>Stock</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ordered.length === 0 ? (
                    <tr>
                      <td colSpan={showDeleteMode ? "10" : "9"} style={{ textAlign: 'center', padding: '20px', color: theme.colors.textMuted, fontSize: '16px', background: 'transparent' }}>
                        No products found.
                      </td>
                    </tr>
                  ) : (
                  currentTableData.map((item) => {
                    const eff = effectiveStockOf(item);
                    const status = getStatus(eff);

                    const isNewlyAdded = highlightedNewIds.has(item._id);
                    const isNewlyEdited = highlightedEditedIds.has(item._id);
                    const isNew = justAddedIds.has(item._id);
                    const isRestored = justRestoredIds.has(item._id);
                    const isEdited = justEditedIds.has(item._id);
                    
                    let rowBg = 'transparent';
                    if (!acknowledgedHighlights) {
                      if (isNewlyAdded || isNew) rowBg = '#e8f5e9';
                      else if (isNewlyEdited || isEdited) rowBg = '#e3f2fd';
                      else if (isRestored) rowBg = '#fff8e1';
                    }
                    if (showDeleteMode && selectedIds.includes(item._id)) rowBg = '#ffebee';

                    return (
                      <tr
                        id={`product-row-${item._id}`}
                        key={item._id}
                        style={{
                          textAlign: 'center',
                          background: rowBg,
                          transition: 'background 0.2s ease',
                          borderBottom: `1px solid ${theme.colors.border}`
                        }}
                        onMouseEnter={(e) => { if (rowBg === 'transparent') e.currentTarget.style.backgroundColor = '#f5faff'; }}
                        onMouseLeave={(e) => { if (rowBg === 'transparent') e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {showDeleteMode && currentUser?.role !== 'staff' && (
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
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: `1px solid ${theme.colors.border}`, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                            onError={(e) => { e.target.src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect width=%2248%22 height=%2248%22 fill=%22%23e5e7eb%22/></svg>'; }}
                          />
                        </td>
                        <td style={{...tdStyle, textAlign: 'left', paddingLeft: 20, fontSize: fontSettings.size, fontFamily: fontSettings.family, fontWeight: 700, color: theme.colors.text }}>{item.name}</td>
                        <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '3px 10px',
                              borderRadius: 999,
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {item.branch || 'Main Branch'}
                          </span>
                        </td>
                        <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family, color: theme.colors.text }}>
                          {item.category || 'Uncategorized'}
                        </td>
                        <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                          {hasVariants(item) ? (
                            <button
                              onClick={() => {
                                setSelectedProductForVariant(item);
                                setShowVariantModal(true);
                              }}
                              style={{
                                background: theme.colors.primary,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              View Variants
                            </button>
                          ) : (
                            <span style={{ color: theme.colors.textMuted, fontSize: '12px' }}>-</span>
                          )}
                        </td>
                        <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}><strong>{eff}</strong></td>
                        <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                          {hasVariants(item)
                            ? <span>{getVariantPriceSummary(item)}</span>
                            : <span>₱{parseFloat(item.price || 0).toFixed(2)}</span>}
                        </td>
                        <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            backgroundColor: status.bg,
                            color: status.color,
                            fontWeight: '600',
                            fontSize: '11px',
                            border: `1px solid ${status.color}20`
                          }}>
                            {status.label}
                          </div>
                        </td>
                        <td style={{...tdStyle, fontSize: fontSettings.size, fontFamily: fontSettings.family}}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                            <button type="button" aria-label="Edit product" onClick={() => handleEdit(item)} title="Edit" style={iconButtonStyle('primary')}>
                              <FaPen size={16} color="#fff" />
                            </button>
                            {currentUser?.role !== 'staff' && (
                              <button type="button" aria-label="Delete product" onClick={() => handleDeleteSingle(item)} title="Delete" style={iconButtonStyle('danger')}>
                                <FaTrash size={16} color="#fff" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
                </tbody>
              </table>
            )}
          </div>

          {!showHistory && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderTop: `1px solid ${theme.colors.border}`, marginTop: '10px' }}>
              <div style={{ fontSize: '14px', color: theme.colors.textMuted }}>
                Showing {ordered.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, ordered.length)} of {ordered.length} entries
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  onClick={() => paginate(currentPage - 1)} 
                  disabled={currentPage === 1}
                  style={{ ...addBtnStyle, backgroundColor: currentPage === 1 ? '#e5e7eb' : theme.colors.surface, color: currentPage === 1 ? '#9ca3af' : theme.colors.text, border: `1px solid ${theme.colors.border}`, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                
                 {(() => {
                    let pages = [];
                    const maxButtons = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                    
                    if (endPage - startPage + 1 < maxButtons) {
                      startPage = Math.max(1, endPage - maxButtons + 1);
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => paginate(i)}
                          style={{
                            ...addBtnStyle,
                            minWidth: '32px',
                            padding: '0 8px',
                            backgroundColor: currentPage === i ? theme.colors.primary : theme.colors.surface,
                            color: currentPage === i ? '#fff' : theme.colors.text,
                            border: currentPage === i ? 'none' : `1px solid ${theme.colors.border}`
                          }}
                        >
                          {i}
                        </button>
                      );
                    }
                    return pages;
                 })()}

                <button 
                  onClick={() => paginate(currentPage + 1)} 
                  disabled={currentPage === totalPages || totalPages === 0}
                  style={{ ...addBtnStyle, backgroundColor: (currentPage === totalPages || totalPages === 0) ? '#e5e7eb' : theme.colors.surface, color: (currentPage === totalPages || totalPages === 0) ? '#9ca3af' : theme.colors.text, border: `1px solid ${theme.colors.border}`, cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Variant Warning Modal */}
      {showVariantWarning && variantWarningProduct && (
        <div style={modalOverlayStyle}>
          <div style={variantWarningModalStyle}>
            <h3 style={{ marginBottom: '15px', color: theme.colors.danger }}>⚠️ Product Has Variants</h3>
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
                style={{ ...actionBtnStyle, backgroundColor: '#6b7280' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowVariantWarning(false);
                  setVariantWarningProduct(null);
                  handleEdit(variantWarningProduct);
                }}
                style={{ ...actionBtnStyle, backgroundColor: theme.colors.primary }}
              >
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && productToDelete && (
        <div style={modalOverlayStyle}>
          <div style={deleteConfirmModalStyle}>
            <h3 style={{ marginBottom: '15px', color: theme.colors.danger }}>⚠️ Confirm Delete</h3>
            <p style={{ marginBottom: '20px', lineHeight: '1.5' }}>
              Are you sure you want to delete "<strong>{productToDelete.name}</strong>"?
            </p>
            <p style={{ marginBottom: '20px', lineHeight: '1.5', fontSize: '14px', color: theme.colors.textMuted }}>
              You can restore it from Deleted Products within 1 day.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setProductToDelete(null);
                }}
                style={{ ...actionBtnStyle, backgroundColor: '#6b7280' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSingle}
                style={{ ...actionBtnStyle, backgroundColor: theme.colors.danger }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Details Modal */}
      {showVariantModal && selectedProductForVariant && (
        <div style={modalOverlayStyle}>
          <div style={variantModalStyle}>
            <h3 style={{ marginBottom: '4px', color: theme.colors.primary }}>
              Variants for: <strong>{selectedProductForVariant.name}</strong>
            </h3>
            <div style={{ marginBottom: 12 }}>
              {(() => {
                const strip = (s) => String(s || '').replace(/[\[\]"\\]/g,'').trim();
                const sizes = (selectedProductForVariant.sizeOptions || []).map(strip).filter(Boolean);
                const colors = (selectedProductForVariant.colorOptions || []).map(strip).filter(Boolean);
                const brands = (selectedProductForVariant.brandOptions || []).map(strip).filter(Boolean);
                const units = (selectedProductForVariant.unitOptions || []).map(strip).filter(Boolean);
                const materialLike = sizes.length && !colors.length && !brands.length && !units.length
                  ? 'Material'
                  : sizes.length ? 'Size'
                  : colors.length ? 'Color'
                  : brands.length && units.length ? 'Brand & Unit'
                  : brands.length ? 'Brand'
                  : units.length ? 'Unit'
                  : 'Variants';
                return (
                  <div style={{ fontWeight: 700, marginBottom: 6, color: '#1f2933' }}>
                    Variant: <span style={{ fontWeight: 800, color: theme.colors.primary }}>{materialLike}</span>
                  </div>
                );
              })()}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(() => {
                  const strip = (s) => String(s).replace(/[\[\]"\\]/g,'').trim();
                  const brandVals = (selectedProductForVariant.brandOptions && selectedProductForVariant.brandOptions.length > 0)
                    ? selectedProductForVariant.brandOptions
                    : [selectedProductForVariant.brand];
                  const unitVals = (selectedProductForVariant.unitOptions && selectedProductForVariant.unitOptions.length > 0)
                    ? selectedProductForVariant.unitOptions
                    : [selectedProductForVariant.unit];
                  return (
                    <>
                      {brandVals.filter(Boolean).map((b,i) => (
                        <span
                          key={`br-${i}`}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '12px',
                            border: `1px solid ${theme.colors.border}`,
                            background: '#e8f5e9',
                            fontSize: 12,
                            fontWeight: 700,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                          }}
                        >
                          Brand: {strip(b)}
                        </span>
                      ))}
                      {unitVals.filter(Boolean).map((u,i) => (
                        <span
                          key={`un-${i}`}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '12px',
                            border: `1px solid ${theme.colors.border}`,
                            background: '#fff8e1',
                            fontSize: 12,
                            fontWeight: 700,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                          }}
                        >
                          Unit: {strip(u)}
                        </span>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {(() => {
                const strip = (s) => String(s).replace(/[\[\]"\\]/g,'').trim();
                const brands = (selectedProductForVariant.brandOptions || []).map(strip);
                const units = (selectedProductForVariant.unitOptions || []).map(strip);
                const sizes = (selectedProductForVariant.sizeOptions || []).map(strip);
                const colors = (selectedProductForVariant.colorOptions || []).map(strip);
                const rawScq = (selectedProductForVariant.sizeColorQuantities || []);
                const stripNonEmpty = (s) => { const t = strip(s); return t ? t : ''; };
                const scq = rawScq
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
                const hasSizeOrColor = (scq.length + cq.length + sq.length) > 0;
                const buq = (selectedProductForVariant.brandUnitQuantities || []);
                if (!hasSizeOrColor && brands.length === 0 && units.length === 0 && buq.length === 0) {
                  return <p style={{ textAlign: 'center', color: theme.colors.textMuted }}>No variants found</p>;
                }
                return (
                  <div>
                    

                    {scq.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'transparent', marginBottom: '16px', border: `1px solid ${theme.colors.border}`, borderRadius: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: theme.colors.primary, borderBottom: `2px solid ${theme.colors.border}` }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Variant</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Item Code</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Brand</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Price</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scq.map((v,i) => {
                            const match = (selectedProductForVariant.sizeColorQuantities || []).find(m => strip(m.size) === strip(v.size) && strip(m.color) === strip(v.color));
                            const variantName = `${strip(v.size)} / ${strip(v.color)}`;
                            const sku = match && match.sku ? match.sku : 'Auto';
                            const ret = match && match.price ? match.price : (selectedProductForVariant.price || 0);
                            const brandVal = (match && match.brand) ? strip(match.brand)
                              : (selectedProductForVariant.brand ? strip(selectedProductForVariant.brand)
                                : ((selectedProductForVariant.brandOptions || []).map(strip)[0] || 'N/A'));
                            return (
                              <tr key={`sc-item-${i}`} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{variantName}</td>
                                <td style={{ padding: '10px' }}>{sku}</td>
                                <td style={{ padding: '10px' }}>{brandVal}</td>
                                <td style={{ padding: '10px' }}>₱{parseFloat(ret).toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: theme.colors.primary }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      aria-label="Decrease stock by 1"
                                      disabled={(v.quantity || 0) <= 0}
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'size-color', size: strip(v.size), color: strip(v.color), quantity: v.quantity || 0 }, -1)}
                                      style={qtyButtonStyle('danger', (v.quantity || 0) <= 0)}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      type="button"
                                      aria-label="Increase stock by 1"
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'size-color', size: strip(v.size), color: strip(v.color), quantity: v.quantity || 0 }, 1)}
                                      style={qtyButtonStyle('success', false)}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {sq.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'transparent', marginBottom: '16px', border: `1px solid ${theme.colors.border}`, borderRadius: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: theme.colors.primary, borderBottom: `2px solid ${theme.colors.border}` }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Variant</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Item Code</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Brand</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Price</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sq.map((v,i) => {
                            const match = (selectedProductForVariant.sizeQuantities || []).find(m => strip(m.size) === strip(v.size));
                            const variantName = `${strip(v.size)}`;
                            const sku = match && match.sku ? match.sku : 'Auto';
                            const ret = match && match.price ? match.price : (selectedProductForVariant.price || 0);
                            const brandVal = (match && match.brand) ? strip(match.brand)
                              : (selectedProductForVariant.brand ? strip(selectedProductForVariant.brand)
                                : ((selectedProductForVariant.brandOptions || []).map(strip)[0] || 'N/A'));
                            return (
                              <tr key={`size-only-${i}`} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{variantName}</td>
                                <td style={{ padding: '10px' }}>{sku}</td>
                                <td style={{ padding: '10px' }}>{brandVal}</td>
                                <td style={{ padding: '10px' }}>₱{parseFloat(ret).toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: theme.colors.primary }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      aria-label="Decrease stock by 1"
                                      disabled={(v.quantity || 0) <= 0}
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'size-only', size: strip(v.size), quantity: v.quantity || 0 }, -1)}
                                      style={qtyButtonStyle('danger', (v.quantity || 0) <= 0)}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      type="button"
                                      aria-label="Increase stock by 1"
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'size-only', size: strip(v.size), quantity: v.quantity || 0 }, 1)}
                                      style={qtyButtonStyle('success', false)}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {cq.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'transparent', marginBottom: '16px', border: `1px solid ${theme.colors.border}`, borderRadius: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: theme.colors.primary, borderBottom: `2px solid ${theme.colors.border}` }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Variant</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Item Code</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Brand</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Price</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cq.map((v,i) => {
                            const match = (selectedProductForVariant.colorQuantities || []).find(m => strip(m.color) === strip(v.color));
                            const variantName = `${strip(v.color)}`;
                            const sku = match && match.sku ? match.sku : 'Auto';
                            const ret = match && match.price ? match.price : (selectedProductForVariant.price || 0);
                            const brandVal = (match && match.brand) ? strip(match.brand)
                              : (selectedProductForVariant.brand ? strip(selectedProductForVariant.brand)
                                : ((selectedProductForVariant.brandOptions || []).map(strip)[0] || 'N/A'));
                            return (
                              <tr key={`color-only-${i}`} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{variantName}</td>
                                <td style={{ padding: '10px' }}>{sku}</td>
                                <td style={{ padding: '10px' }}>{brandVal}</td>
                                <td style={{ padding: '10px' }}>₱{parseFloat(ret).toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: theme.colors.primary }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      aria-label="Decrease stock by 1"
                                      disabled={(v.quantity || 0) <= 0}
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'color-only', color: strip(v.color), quantity: v.quantity || 0 }, -1)}
                                      style={qtyButtonStyle('danger', (v.quantity || 0) <= 0)}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      type="button"
                                      aria-label="Increase stock by 1"
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'color-only', color: strip(v.color), quantity: v.quantity || 0 }, 1)}
                                      style={qtyButtonStyle('success', false)}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {buq.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'transparent', marginBottom: '16px', border: `1px solid ${theme.colors.border}`, borderRadius: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: theme.colors.primary, borderBottom: `2px solid ${theme.colors.border}` }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Variant</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Item Code</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Brand</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Price</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {buq.map((v,i) => {
                            const variantName = `${strip(v.brand)} / ${strip(v.unit)}`;
                            const sku = v.sku ? v.sku : 'Auto';
                            const ret = v.price ? v.price : (selectedProductForVariant.price || 0);
                            const brandVal = strip(v.brand);
                            return (
                              <tr key={`brand-unit-${i}`} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{variantName}</td>
                                <td style={{ padding: '10px' }}>{sku}</td>
                                <td style={{ padding: '10px' }}>{brandVal}</td>
                                <td style={{ padding: '10px' }}>₱{parseFloat(ret).toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: theme.colors.primary }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      aria-label="Decrease stock by 1"
                                      disabled={(v.quantity || 0) <= 0}
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'brand-unit', brand: strip(v.brand), unit: strip(v.unit), quantity: v.quantity || 0 }, -1)}
                                      style={qtyButtonStyle('danger', (v.quantity || 0) <= 0)}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      type="button"
                                      aria-label="Increase stock by 1"
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'brand-unit', brand: strip(v.brand), unit: strip(v.unit), quantity: v.quantity || 0 }, 1)}
                                      style={qtyButtonStyle('success', false)}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {((selectedProductForVariant.brandQuantities || []).length > 0) && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'transparent', marginBottom: '16px', border: `1px solid ${theme.colors.border}`, borderRadius: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: theme.colors.primary, borderBottom: `2px solid ${theme.colors.border}` }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Variant</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Item Code</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Brand</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Price</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedProductForVariant.brandQuantities || []).map((v,i) => {
                            const variantName = `${strip(v.brand)}`;
                            const sku = v.sku ? v.sku : 'Auto';
                            const ret = v.price ? v.price : (selectedProductForVariant.price || 0);
                            const brandVal = strip(v.brand);
                            return (
                              <tr key={`brand-only-${i}`} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{variantName}</td>
                                <td style={{ padding: '10px' }}>{sku}</td>
                                <td style={{ padding: '10px' }}>{brandVal}</td>
                                <td style={{ padding: '10px' }}>₱{parseFloat(ret).toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: theme.colors.primary }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      aria-label="Decrease stock by 1"
                                      disabled={(v.quantity || 0) <= 0}
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'brand-only', brand: strip(v.brand), quantity: v.quantity || 0 }, -1)}
                                      style={qtyButtonStyle('danger', (v.quantity || 0) <= 0)}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      type="button"
                                      aria-label="Increase stock by 1"
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'brand-only', brand: strip(v.brand), quantity: v.quantity || 0 }, 1)}
                                      style={qtyButtonStyle('success', false)}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {((selectedProductForVariant.unitQuantities || []).length > 0) && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: 'transparent', marginBottom: '16px', border: `1px solid ${theme.colors.border}`, borderRadius: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: theme.colors.primary, borderBottom: `2px solid ${theme.colors.border}` }}>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Variant</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Item Code</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Brand</th>
                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Price</th>
                            <th style={{ padding: '10px', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border}`, color: '#ffffff' }}>Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedProductForVariant.unitQuantities || []).map((v,i) => {
                            const variantName = `${strip(v.unit)}`;
                            const sku = v.sku ? v.sku : 'Auto';
                            const ret = v.price ? v.price : (selectedProductForVariant.price || 0);
                            const brandVal = selectedProductForVariant.brand ? strip(selectedProductForVariant.brand) : ((selectedProductForVariant.brandOptions || []).map(strip)[0] || 'N/A');
                            return (
                              <tr key={`unit-only-${i}`} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                <td style={{ padding: '10px', fontWeight: 700 }}>{variantName}</td>
                                <td style={{ padding: '10px' }}>{sku}</td>
                                <td style={{ padding: '10px' }}>{brandVal}</td>
                                <td style={{ padding: '10px' }}>₱{parseFloat(ret).toFixed(2)}</td>
                                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: theme.colors.primary }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      aria-label="Decrease stock by 1"
                                      disabled={(v.quantity || 0) <= 0}
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'unit-only', unit: strip(v.unit), quantity: v.quantity || 0 }, -1)}
                                      style={qtyButtonStyle('danger', (v.quantity || 0) <= 0)}
                                      title="Subtract 1"
                                    >
                                      -
                                    </button>
                                    <span>{v.quantity || 0}</span>
                                    <button
                                      type="button"
                                      aria-label="Increase stock by 1"
                                      onClick={() => handleVariantQuantityChange(selectedProductForVariant, { type: 'unit-only', unit: strip(v.unit), quantity: v.quantity || 0 }, 1)}
                                      style={qtyButtonStyle('success', false)}
                                      title="Add 1"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
                style={{ ...actionBtnStyle, backgroundColor: '#6b7280' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore modal */}
      {showUndoModal && (
        <div style={modalOverlayStyle}>
          <div style={expandedModalBoxStyle}>
            <h2 style={{ marginBottom: '12px', fontSize: '20px', color: theme.colors.primary }}>Restore Deleted Products</h2>
            <p style={{ fontSize: '12px', color: theme.colors.danger, marginTop: '-5px', marginBottom: '12px' }}>
              ⚠️ Note: Deleted products will be permanently removed after 1 day.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '16px' }}>Select products to restore:</h4>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                {recentlyDeleted.length} product{recentlyDeleted.length !== 1 ? 's' : ''} available
              </div>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', border: `1px solid ${theme.colors.border}`, borderRadius: '8px', padding: '8px', marginBottom: '15px', background: theme.colors.surface }}>
              {recentlyDeleted.length === 0 ? (
                <p style={{ textAlign: 'center', color: theme.colors.textMuted, padding: '15px', fontSize: '14px' }}>No deleted products to restore</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {recentlyDeleted.map(item => (
                    <li key={item._id} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', border: `1px solid ${theme.colors.border}`, borderRadius: '8px', backgroundColor: theme.colors.surfaceAlt }}>
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, cursor: 'pointer' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{item.name}</span>
                        <span style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '2px' }}>
                          Brand: {item.brand || 'N/A'} | Category: {item.category || 'N/A'}
                        </span>
                        {item.deletedAt && (
                          <span style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                            Deleted: {fmtDate(item.deletedAt)} at {fmtTime(item.deletedAt)}
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
                  style={{ ...actionBtnStyle, backgroundColor: theme.colors.success, fontSize: '12px', padding: '8px 14px' }}
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
                  style={{
                    ...actionBtnStyle,
                    backgroundColor: selectedUndo.length === 0 ? '#ccc' : theme.colors.warning,
                    color: selectedUndo.length === 0 ? '#666' : '#000',
                    cursor: selectedUndo.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    padding: '8px 14px'
                  }}
                >
                  Restore Selected{selectedUndo.length > 0 ? ` (${selectedUndo.length})` : ''}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    if (selectedUndo.length === 0) {
                      Swal.fire('Info', 'Please select products to delete permanently', 'info');
                      return;
                    }
                    handlePermanentDelete(selectedUndo);
                    setSelectedUndo([]);
                  }}
                  disabled={selectedUndo.length === 0}
                  style={{
                    ...actionBtnStyle,
                    backgroundColor: selectedUndo.length === 0 ? '#ccc' : theme.colors.danger,
                    cursor: selectedUndo.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    padding: '8px 14px'
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
                  style={{ ...actionBtnStyle, backgroundColor: '#6b7280', color: 'white', fontSize: '12px', padding: '8px 14px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sidebar + shared styles (aligned to UserMenu)
const sidebarStyle = {
  width: '230px',
  background: 'linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%)',
  border: `1px solid ${theme.colors.border}`,
  borderRight: `1px solid ${theme.colors.border}`,
  boxShadow: '2px 0 14px rgba(13, 71, 161, 0.06)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '20px 12px'
};
const iconGroupStyle = { display: 'flex', flexDirection: 'column', gap: '16px' };
const sidebarLink = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  textDecoration: 'none',
  color: theme.colors.text,
  borderRadius: '10px',
  border: `1px solid ${theme.colors.border}`,
  backgroundColor: theme.colors.surface,
  transition: 'transform 0.15s ease, box-shadow 0.2s ease, background-color 0.2s ease',
  boxShadow: '0 2px 8px rgba(13, 71, 161, 0.04)',
  minHeight: '48px',
  overflow: 'hidden'
};
const labelStyle = { 
  fontSize: '15px', 
  fontWeight: 700,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '140px',
  flex: 1
};
const addBtnStyle = {
  backgroundColor: theme.colors.primary,
  color: 'white',
  padding: '10px 18px',
  borderRadius: '10px',
  fontWeight: 'bold',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  boxShadow: theme.colors.shadow,
  transition: 'transform 0.12s ease, filter 0.12s ease'
};
const filterSelectStyle = {
  padding: '10px 20px',
  borderRadius: '10px',
  border: `2px solid ${theme.colors.primary}`,
  backgroundColor: theme.colors.surface,
  color: theme.colors.primary,
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'box-shadow 0.12s ease'
};
const thStyle = {
  padding: '12px 10px',
  borderBottom: `2px solid ${theme.colors.border}`,
  fontSize: '13px',
  fontWeight: 800,
  color: '#ffffff',
  backgroundColor: theme.colors.primary
};
const tdStyle = {
  padding: '12px 10px',
  borderBottom: `1px solid ${theme.colors.border}`,
  fontSize: '12px',
  color: theme.colors.text,
  background: 'transparent'
};
const restockBtnStyle = {
  backgroundColor: theme.colors.warning,
  color: '#111827',
  padding: '6px 10px',
  borderRadius: '8px',
  border: 'none',
  margin: '2px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '12px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
};
const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.3)',
  backdropFilter: 'none',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999
};
const modalBoxStyle = {
  backgroundColor: theme.colors.surface,
  padding: '25px 30px',
  borderRadius: '12px',
  maxWidth: '600px',
  width: '100%',
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  textAlign: 'center',
  maxHeight: '90vh',
  overflowY: 'auto',
  border: `2px solid ${theme.colors.primary}`
};
const expandedModalBoxStyle = {
  backgroundColor: theme.colors.surface,
  padding: '20px',
  borderRadius: '12px',
  maxWidth: '700px',
  width: '90%',
  maxHeight: '75vh',
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  overflowY: 'auto',
  border: `2px solid ${theme.colors.primary}`
};
const actionBtnStyle = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px',
  color: 'white',
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
};
const btnColors = { primary: theme.colors.primary, secondary: '#6b7280', danger: theme.colors.danger, success: theme.colors.success, warning: theme.colors.warning };
const getButtonStyle = (variant, disabled) => ({
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 700,
  fontSize: '14px',
  color: variant === 'warning' ? '#000' : '#fff',
  backgroundColor: btnColors[variant] || theme.colors.primary,
  opacity: disabled ? 0.6 : 1,
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
});
const iconButtonStyle = (variant, disabled) => ({
  backgroundColor: btnColors[variant] || theme.colors.primary,
  border: 'none',
  borderRadius: 10,
  width: 36,
  height: 36,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
  opacity: disabled ? 0.6 : 1
});
const qtyButtonStyle = (variant, disabled) => ({
  backgroundColor: btnColors[variant] || theme.colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  width: 28,
  height: 28,
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1
});
const variantWarningModalStyle = {
  backgroundColor: theme.colors.surface,
  padding: '25px',
  borderRadius: '12px',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  textAlign: 'center',
  border: `2px solid ${theme.colors.primary}`
};
const deleteConfirmModalStyle = {
  backgroundColor: theme.colors.surface,
  padding: '25px',
  borderRadius: '12px',
  maxWidth: '500px',
  width: '90%',
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  textAlign: 'center',
  border: `2px solid ${theme.colors.primary}`
};
const variantModalStyle = {
  backgroundColor: theme.colors.surface,
  padding: '25px',
  borderRadius: '12px',
  maxWidth: '700px',
  width: '90%',
  boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
  textAlign: 'center',
  border: `2px solid ${theme.colors.primary}`
};

// Unified tag styles (match StaffDashboard aesthetics)
const tagBaseStyle = { padding: '5px 10px', borderRadius: '12px', border: `1px solid ${theme.colors.border}`, fontSize: 12, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const brandTagStyle = { ...tagBaseStyle, background: '#e8f5e9' };
const unitTagStyle = { ...tagBaseStyle, background: '#fff8e1' };
const sizeTagStyle = { ...tagBaseStyle, background: '#e3f2fd' };
const colorTagStyle = { ...tagBaseStyle, background: '#fce4ec' };

export default InventoryManager;
