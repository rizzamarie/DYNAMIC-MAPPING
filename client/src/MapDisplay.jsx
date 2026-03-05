import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaMap,
  FaTrash,
  FaEdit,
  FaSearch,
  FaCalendarAlt,
  FaBuilding,
  FaIdCard,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaSync,
  FaPlus,
  FaHistory,
  FaUndo,
  FaTimes
} from 'react-icons/fa';
import axios from 'axios';
import Swal from 'sweetalert2';
import './UserMenu.css';

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
    success: '#16a34a',
    danger: '#dc2626',
    warning: '#f59e0b',
    shadow: '0 8px 18px rgba(0, 77, 64, 0.18)'
  }
};

function MapDisplay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [maps, setMaps] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterId, setFilterId] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const query = new URLSearchParams(location.search);
  const viewMapId = query.get('id');
  const [avatarError, setAvatarError] = useState(false);

  // Restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [deletedMaps, setDeletedMaps] = useState([]);
  const [selectedUndo, setSelectedUndo] = useState([]);
  const [restoreSearch, setRestoreSearch] = useState('');

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyActionFilter, setHistoryActionFilter] = useState('All');
  const [historySearch, setHistorySearch] = useState('');
  const [historyViewIndex, setHistoryViewIndex] = useState(0);
  const filteredHistoryItems = historyItems.filter(h => {
    const matchesAction = historyActionFilter === 'All' || h.action === historyActionFilter;
    const matchesSearch = !historySearch ||
      (h.mapName && h.mapName.toLowerCase().includes(historySearch.toLowerCase())) ||
      (h.actorName && h.actorName.toLowerCase().includes(historySearch.toLowerCase())) ||
      (h.details && h.details.toLowerCase().includes(historySearch.toLowerCase()));

    return matchesAction && matchesSearch;
  });

  // View Scale State for Read-Only Mode
  const [viewScale, setViewScale] = useState(1);

  // UI States for Filter Menus
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const branchMenuRef = useRef(null);
  const dateMenuRef = useRef(null);
  const fullViewContainerRef = useRef(null);

  useEffect(() => {
    fetchMaps();
    fetchCurrentUser();
    const storedDeleted = localStorage.getItem('recentlyDeletedMaps');
    if (storedDeleted) {
      setDeletedMaps(JSON.parse(storedDeleted));
    }
  }, []);

  useEffect(() => {
    if (showHistory) {
      fetchMapHistory();
    }
  }, [showHistory]);

  // Keep history view index in bounds when filter/search changes
  useEffect(() => {
    if (filteredHistoryItems.length > 0 && historyViewIndex >= filteredHistoryItems.length) {
      setHistoryViewIndex(filteredHistoryItems.length - 1);
    }
  }, [filteredHistoryItems.length]);

  // When filter or search changes, show first matching action
  useEffect(() => {
    if (showHistory) setHistoryViewIndex(0);
  }, [historyActionFilter, historySearch]);

  // Auto-fit map to available viewport in admin full-view mode
  useEffect(() => {
    if (!viewMapId || !fullViewContainerRef.current || maps.length === 0) return;
    const map = maps.find(m => m._id === viewMapId);
    if (!map) return;

    const container = fullViewContainerRef.current;
    const padding = 80; // leave space for close button and margins
    const availableWidth = Math.max(container.clientWidth - padding, 200);
    const availableHeight = Math.max(container.clientHeight - padding, 200);
    const mapWidth = map.canvasWidth || 3000;
    const mapHeight = map.canvasHeight || 3000;

    const scale = Math.min(availableWidth / mapWidth, availableHeight / mapHeight, 1);
    if (scale > 0 && Number.isFinite(scale)) {
      setViewScale(scale);
    } else {
      setViewScale(1);
    }
  }, [viewMapId, maps]);

  const fetchCurrentUser = async () => {
    try {
      const storedUsername = localStorage.getItem('currentUserUsername');
      if (storedUsername) {
        // Fetch full user data including profile image
        try {
          const usersRes = await axios.get('http://localhost:5000/users');
          const foundUser = usersRes.data.find(u => u.username === storedUsername);
          if (foundUser) {
            setCurrentUser(foundUser);
            // Auto-set branch filter if user is assigned to a branch
            if (foundUser.role !== 'admin' && foundUser.assignedBranch) {
              setFilterBranch(foundUser.assignedBranch);
            }
          } else {
             // Fallback to local storage if API fails or user not found
             setCurrentUser({
               name: localStorage.getItem('currentUserName'),
               role: localStorage.getItem('currentUserRole'),
               username: storedUsername
             });
          }
        } catch (e) {
          console.error("Failed to fetch users for profile", e);
          setCurrentUser({
             name: localStorage.getItem('currentUserName'),
             role: localStorage.getItem('currentUserRole'),
             username: storedUsername
           });
        }
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
    }
  };

  const fetchMaps = async () => {
    try {
      const isSystemAdmin = localStorage.getItem('currentUserRole') === 'admin';
      const currentBranch = localStorage.getItem('currentBranch');
      let url = 'http://localhost:5000/maps';
      
      // If staff/manager, filter by their branch automatically (optional enforcement)
      if (!isSystemAdmin && currentBranch) {
        url = `http://localhost:5000/maps?branch=${encodeURIComponent(currentBranch)}`;
      }
      
      const response = await axios.get(url);
      setMaps(response.data);
    } catch (error) {
      console.error('Error fetching maps:', error);
    }
  };

  const fetchMapHistory = async () => {
    try {
      const response = await axios.get('http://localhost:5000/map-history');
      setHistoryItems(response.data);
    } catch (error) {
      console.error('Error fetching map history:', error);
    }
  };

  const persistDeletedMaps = (list) => {
    setDeletedMaps(list);
    localStorage.setItem('recentlyDeletedMaps', JSON.stringify(list));
  };

  const handleMapClick = (id) => {
    if (currentUser?.role === 'admin') {
      // Admin View-Only Mode (Stay on same page with ID param)
      if (showHistory) return;
      navigate(`?id=${id}`);
    } else {
      // Staff/Manager Edit Mode
      navigate(`/map2?id=${id}`);
    }
  };

  const handleCreateClick = () => {
    navigate('/map2'); // New map
  };

  const handleDeleteClick = async (e, id) => {
    e.stopPropagation();
    const target = maps.find(m => m._id === id);
    window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: true } }));
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: false } }));
      if (result.isConfirmed) {
        try {
          // Save a copy locally for restore (soft-delete for UI)
          if (target) {
            const copy = {
              _id: target._id,
              name: target.name,
              elements: target.elements || [],
              paths: target.paths || [],
              widgets: target.widgets || [],
              placedProducts: target.placedProducts || [],
              productMarkers: target.productMarkers || [],
              canvasWidth: target.canvasWidth || 3000,
              canvasHeight: target.canvasHeight || 3000,
              isKioskMap: !!target.isKioskMap,
              deletedAt: Date.now(),
              branch: target.branch
            };
            const updated = [copy, ...deletedMaps.filter(dm => dm._id !== copy._id)];
            persistDeletedMaps(updated);
          }
          const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
          const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
          await axios.delete(`http://localhost:5000/maps/${id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`);
          setMaps(prev => prev.filter(m => m._id !== id));
          Swal.fire(
            'Deleted!',
            'Your map has been deleted.',
            'success'
          );
        } catch (err) {
          console.error(err);
          Swal.fire(
            'Error!',
            'Failed to delete map.',
            'error'
          );
        }
      }
    });
  };

  const handleSetKioskMap = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.patch(`http://localhost:5000/maps/${id}/set-kiosk`);
      window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: true } }));
      Swal.fire({
        title: 'Success!',
        text: 'This map is now set as the kiosk map.',
        icon: 'success',
        confirmButtonColor: '#1A2CA3'
      }).then(() => {
        window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: false } }));
      });
      fetchMaps();
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: true } }));
      Swal.fire({
        title: 'Error!',
        text: 'Failed to set map for kiosk.',
        icon: 'error',
        confirmButtonColor: '#1A2CA3'
      }).then(() => {
        window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: false } }));
      });
    }
  };

  // ========== RENDER HELPERS ==========
  const shapeColor = (type) => {
    switch(type) {
      case 'label': return '#ffffcc';
      case 'rectangle': return '#e5e7eb';
      case 'circle': return '#dbeafe';
      case 'text': return '#f3f4f6';
      default: return '#e5e7eb';
    }
  };

  // Match label rendering from MapEditor (rectangle with dynamic triangle pointer)
  const renderLabelWithTriangle = (el) => {
    const width = el.width || 0;
    const height = el.height || 0;
    const triangleOffset = el.triangleOffset || { x: 0.5, y: 1 };
    const x = triangleOffset.x * width;
    const y = triangleOffset.y * height;
    const TRIANGLE_LENGTH = 20;
    const TRIANGLE_BASE = 18;

    const distTop = triangleOffset.y;
    const distBottom = 1 - triangleOffset.y;
    const distLeft = triangleOffset.x;
    const distRight = 1 - triangleOffset.x;
    const minDist = Math.min(distTop, distBottom, distLeft, distRight);

    let base1, base2, tip;
    if (minDist === distTop) {
      tip = [x, 0 - TRIANGLE_LENGTH];
      base1 = [x - TRIANGLE_BASE / 2, 0];
      base2 = [x + TRIANGLE_BASE / 2, 0];
    } else if (minDist === distBottom) {
      tip = [x, height + TRIANGLE_LENGTH];
      base1 = [x - TRIANGLE_BASE / 2, height];
      base2 = [x + TRIANGLE_BASE / 2, height];
    } else if (minDist === distLeft) {
      tip = [0 - TRIANGLE_LENGTH, y];
      base1 = [0, y - TRIANGLE_BASE / 2];
      base2 = [0, y + TRIANGLE_BASE / 2];
    } else {
      tip = [width + TRIANGLE_LENGTH, y];
      base1 = [width, y - TRIANGLE_BASE / 2];
      base2 = [width, y + TRIANGLE_BASE / 2];
    }

    const pathBox = `M0,0 H${width} V${height} H0 Z`;
    const pathTriangle = `M${base1[0]},${base1[1]} L${tip[0]},${tip[1]} L${base2[0]},${base2[1]} Z`;

    return (
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          pointerEvents: "none",
          overflow: "visible",
          zIndex: 10,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))'
        }}
      >
        <path
          d={`${pathBox} ${pathTriangle}`}
          fill={el.color || "#fff8cc"}
          stroke="#6b7280"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <text
          x={width / 2}
          y={height / 2}
          fontSize={el.fontSize ?? 12}
          fontFamily={el.fontFamily || 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'}
          fill={el.fontColor || "#111827"}
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
          style={{ userSelect: "none", fontWeight: 700, letterSpacing: '.1px' }}
        >
          {el.content}
        </text>
      </svg>
    );
  };

  const getFurnitureStyle = (el) => {
    if (el.type === 'shelf') {
      const shelfBase = el.color || '#a0522d';
      return {
        background: `repeating-linear-gradient(to bottom, ${shelfBase}, ${shelfBase} 6px, #deb887 6px, #deb887 12px)`,
        border: '2px solid #8b4513',
        borderRadius: '4px',
      };
    }
    if (el.type === 'kiosk') {
      const kioskBase = el.color || '#1e40af';
      return {
        background: kioskBase,
        border: '3px solid #1e3a8a',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      };
    }
    if (el.type === 'entrance') {
      return {
        backgroundColor: el.color || '#16a34a',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      };
    }
    if (el.type === 'exit') {
      return {
        backgroundColor: el.color || '#b91c1c',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      };
    }
    if (el.type === 'cashier') {
      return {
        backgroundColor: el.color || '#1e40af',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      };
    }
    if (el.type === 'rack') {
      const rackBase = el.color || '#999';
      return {
        background: `repeating-linear-gradient(to right, ${rackBase}, ${rackBase} 4px, #ccc 4px, #ccc 8px)`,
        border: '2px solid #666',
        borderRadius: '4px',
      };
    }
    if (el.type === 'bubble') {
      return {
        background: el.color || '#fff8cc',
        border: '1px solid #f5e6a7',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: el.fontColor || '#111827',
        fontFamily: el.fontFamily || 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        fontSize: el.fontSize || 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      };
    }
    return { backgroundColor: el.color || '#d4a373', border: 'none' };
  };

  const renderElement = (el, i) => {
    const width = el.width || 0;
    const height = el.height || 0;

    if (el.type === 'label') {
      return (
        <div
          key={`element-${i}`}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width,
            height,
            transform: `rotate(${el.rotation || 0}deg)`,
            transformOrigin: 'center',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {renderLabelWithTriangle(el)}
        </div>
      );
    }

    if (['lshape', 'ushape', 'tshape'].includes(el.type)) {
      return (
        <div
          key={`element-${i}`}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width,
            height,
            transform: `rotate(${el.rotation || 0}deg)`,
            transformOrigin: 'center',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <svg width={width} height={height} style={{ overflow: 'visible', pointerEvents: 'none' }}>
            {el.type === 'lshape' && (
              <path d={`M0,0 V${height} H${width} V${height - height / 3} H${width / 3} V0 Z`} fill={el.color || "#d4a373"} stroke="none" />
            )}
            {el.type === 'ushape' && (
              <path d={`M0,0 V${height} H${width} V0 H${(width * 2) / 3} V${(height * 0.75)} H${width / 3} V0 Z`} fill={el.color || "#d4a373"} stroke="none" />
            )}
            {el.type === 'tshape' && (
              <path d={`M0,0 H${width} V${height/3} H${(width*2)/3} V${height} H${width/3} V${height/3} H0 Z`} fill={el.color || "#d4a373"} stroke="none" />
            )}
          </svg>
        </div>
      );
    }

    // Kiosk with detailed icon (match editor)
    if (el.type === 'kiosk') {
      return (
        <div
          key={`element-${i}`}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width,
            height,
            transform: `rotate(${el.rotation || 0}deg)`,
            transformOrigin: 'center',
            zIndex: 2,
            pointerEvents: 'none',
            ...getFurnitureStyle(el),
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              padding: 4,
            }}
          >
            <div
              style={{
                width: '90%',
                height: '60%',
                background: '#0f172a',
                borderRadius: 6,
                marginTop: 4,
                boxShadow: 'inset 0 0 0 2px rgba(148,163,184,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 8,
                fontWeight: 600,
              }}
            >
              KIOSK
            </div>
            <div
              style={{
                width: '40%',
                height: '18%',
                marginTop: 4,
                borderRadius: 999,
                background: '#0f172a',
                boxShadow: '0 2px 6px rgba(15,23,42,0.5)',
              }}
            />
          </div>
        </div>
      );
    }

    // Entrance / Exit / Cashier icons with labels (match editor)
    if (el.type === 'entrance' || el.type === 'exit' || el.type === 'cashier') {
      return (
        <div
          key={`element-${i}`}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width,
            height,
            transform: `rotate(${el.rotation || 0}deg)`,
            transformOrigin: 'center',
            zIndex: 2,
            pointerEvents: 'none',
            ...getFurnitureStyle(el),
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            {el.type === 'entrance' && (
              <svg width={Math.min(width, 40)} height={Math.min(height, 20)} viewBox="0 0 32 20">
                <rect x="2" y="4" width="20" height="12" fill="#10b981" />
                <path d="M24 10 L30 4 M24 10 L30 16" stroke="#10b981" strokeWidth="2" fill="none" />
              </svg>
            )}
            {el.type === 'exit' && (
              <svg width={Math.min(width, 40)} height={Math.min(height, 20)} viewBox="0 0 32 20">
                <rect x="10" y="4" width="20" height="12" fill="#ef4444" />
                <path d="M2 10 L8 4 M2 10 L8 16" stroke="#ef4444" strokeWidth="2" fill="none" />
              </svg>
            )}
            {el.type === 'cashier' && (
              <svg width={Math.min(width, 40)} height={Math.min(height, 20)} viewBox="0 0 32 20">
                <rect x="6" y="6" width="8" height="5" fill="#0f172a" />
                <circle cx="22" cy="8" r="2" fill="#facc15" />
                <line x1="2" y1="15" x2="30" y2="15" stroke="#9ca3af" strokeWidth="2" />
              </svg>
            )}
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#ffffff',
              }}
            >
              {el.type === 'entrance'
                ? 'ENTRANCE'
                : el.type === 'exit'
                ? 'EXIT'
                : 'CASHIER'}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`element-${i}`}
        style={{
          position: 'absolute',
          left: el.x,
          top: el.y,
          width,
          height,
          transform: `rotate(${el.rotation || 0}deg)`,
          transformOrigin: 'center',
          zIndex: 1,
          pointerEvents: 'none',
          ...getFurnitureStyle(el),
        }}
      >
        {el.type === 'bubble' && (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, textAlign: 'center', pointerEvents: 'none', fontWeight: 700 }}>
            {el.content || 'Message...'}
          </div>
        )}
      </div>
    );
  };

  const renderWidget = (widget, i) => (
    <div
      key={`widget-${i}`}
      style={{
        position: 'absolute',
        left: widget.x,
        top: widget.y,
        width: widget.width,
        height: widget.height,
        backgroundColor: widget.type === 'text' ? '#ffffcc' : 'transparent',
        transform: `rotate(${widget.rotation || 0}deg)`,
        transformOrigin: 'center',
        border: widget.type === 'text' ? '1px dashed gray' : 'none',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        color: '#01579b',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        overflow: 'hidden',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      {widget.type === 'text' ? (widget.content || 'TEXT') : (widget.content || `${widget.type || 'WIDGET'}`)}
    </div>
  );

  const getUniqueProducts = (map) => {
    const products = [];
    const seen = new Set();
    if (map.productMarkers) {
      map.productMarkers.forEach((marker, i) => {
        const key = `${marker.productId}-${marker.x}-${marker.y}`;
        if (!seen.has(key)) {
          products.push({ ...marker, type: 'marker', index: i, key: `marker-${i}` });
          seen.add(key);
        }
      });
    }
    if (map.placedProducts) {
      map.placedProducts.forEach((product, i) => {
        const key = `${product.productId}-${product.x}-${product.y}`;
        if (!seen.has(key)) {
          products.push({ ...product, type: 'placed', index: i, key: `placed-${i}` });
          seen.add(key);
        }
      });
    }
    return products;
  };

  const renderProduct = (product) => {
    if (product.type === 'marker') {
      return (
        <div
          key={product.key}
          style={{
            position: 'absolute',
            left: product.x - 20,
            top: product.y - 20,
            width: 40,
            height: 40,
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#92400e',
            fontSize: 10,
            textAlign: 'center',
            zIndex: 5,
            padding: '2px',
            pointerEvents: 'none',
          }}
        >
          🏷️
        </div>
      );
    }
    return (
      <div
        key={product.key}
        style={{
          position: "absolute",
          left: product.x - 6,
          top: product.y - 6,
          width: 12,
          height: 12,
          backgroundColor: "#ff0000",
          border: "2px solid #fff",
          borderRadius: "50%",
          zIndex: 4,
          pointerEvents: 'none',
        }}
      />
    );
  };

  // Restore actions
  const handleRestoreAll = async () => {
    if (deletedMaps.length === 0) return;
    Swal.fire({
      title: 'Restore All Maps?',
      text: `Are you sure you want to restore all ${deletedMaps.length} deleted map(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore all!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
          const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
          for (const m of deletedMaps) {
            await axios.post(`http://localhost:5000/maps?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}&source=restore`, {
              name: m.name,
              elements: m.elements || [],
              paths: m.paths || [],
              widgets: m.widgets || [],
              placedProducts: m.placedProducts || [],
              productMarkers: m.productMarkers || [],
              canvasWidth: m.canvasWidth || 3000,
              canvasHeight: m.canvasHeight || 3000,
              isKioskMap: !!m.isKioskMap,
              branch: m.branch
            });
          }
          persistDeletedMaps([]);
          setSelectedUndo([]);
          await fetchMaps();
          setShowRestoreModal(false);
          Swal.fire('Restored!', 'All maps have been restored.', 'success');
        } catch (err) {
          console.error('Failed to restore all maps', err);
          Swal.fire('Error!', 'Failed to restore all maps.', 'error');
        }
      }
    });
  };

  const handleRestoreSelected = async () => {
    if (selectedUndo.length === 0) return;
    Swal.fire({
      title: 'Restore Selected Maps?',
      text: `Restore ${selectedUndo.length} selected map(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, restore them!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const role = currentUser?.role || localStorage.getItem('currentUserRole') || '';
          const name = currentUser?.name || localStorage.getItem('currentUserName') || '';
          const toRestore = deletedMaps.filter(m => selectedUndo.includes(m._id));
          for (const m of toRestore) {
            await axios.post(`http://localhost:5000/maps?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}&source=restore`, {
              name: m.name,
              elements: m.elements || [],
              paths: m.paths || [],
              widgets: m.widgets || [],
              placedProducts: m.placedProducts || [],
              productMarkers: m.productMarkers || [],
              canvasWidth: m.canvasWidth || 3000,
              canvasHeight: m.canvasHeight || 3000,
              isKioskMap: !!m.isKioskMap,
              branch: m.branch
            });
          }
          const remaining = deletedMaps.filter(m => !selectedUndo.includes(m._id));
          persistDeletedMaps(remaining);
          setSelectedUndo([]);
          await fetchMaps();
          setShowRestoreModal(false);
          Swal.fire('Restored!', `Successfully restored ${toRestore.length} map(s).`, 'success');
        } catch (err) {
          console.error('Failed to restore selected maps', err);
          Swal.fire('Error!', 'Failed to restore selected maps.', 'error');
        }
      }
    });
  };

  const handlePermanentDelete = async () => {
    if (selectedUndo.length === 0) return;
    Swal.fire({
      title: 'Permanently Delete?',
      text: `Permanently remove ${selectedUndo.length} deleted map(s)? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete permanently!'
    }).then((result) => {
      if (result.isConfirmed) {
        const remaining = deletedMaps.filter(m => !selectedUndo.includes(m._id));
        persistDeletedMaps(remaining);
        setSelectedUndo([]);
        Swal.fire('Deleted!', 'Removed from restore history.', 'success');
      }
    });
  };

  const filteredDeletedMaps = deletedMaps.filter(m => {
    if (!restoreSearch.trim()) return true;
    const q = restoreSearch.trim().toLowerCase();
    const nameMatch = (m.name || '').toLowerCase().includes(q);
    const dateStr = m.deletedAt ? new Date(m.deletedAt).toLocaleString().toLowerCase() : '';
    return nameMatch || dateStr.includes(q);
  });

  const handleToggleSelectAll = () => {
    if (selectedUndo.length === filteredDeletedMaps.length) {
      setSelectedUndo([]);
    } else {
      setSelectedUndo(filteredDeletedMaps.map(m => m._id));
    }
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px'
  };

  const mapCardStyle = {
    backgroundColor: '#F4FBFA',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  };

  const mapTitleStyle = {
    fontSize: '16px',
    fontWeight: '700',
    color: theme.colors.text,
    margin: '0 0 12px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const previewContainer = {
    width: '100%',
    height: '220px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    border: `1px solid ${theme.colors.border}`
  };

  const previewCanvas = {
    transformOrigin: 'top left',
    position: 'absolute',
    top: 0,
    left: 0
  };

  const thStyle = { padding: '12px 16px', fontWeight: '600', color: theme.colors.text, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const tdStyle = { padding: '12px 16px', color: theme.colors.text, fontSize: '14px', whiteSpace: 'nowrap' };
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';

  const uniqueBranches = [...new Set(maps.map(m => m.branch).filter(Boolean))];

  const filteredMaps = maps.filter(map => {
    const matchesSearch = map.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesId = map._id?.toLowerCase().includes(filterId.toLowerCase());
    const matchesBranch = filterBranch ? map.branch === filterBranch : true;
    let matchesDate = true;
    if (filterDate) {
      const mapDate = new Date(map.createdAt || Date.now()).toISOString().split('T')[0];
      matchesDate = mapDate === filterDate;
    }
    return matchesSearch && matchesId && matchesBranch && matchesDate;
  });

  if (viewMapId) {
    const map = maps.find(m => m._id === viewMapId);
    
    if (!map && maps.length > 0) return (
       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 20 }}>
          <h2>Map not found</h2>
          <button onClick={() => navigate('/branches')} style={{
            backgroundColor: theme.colors.primary, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
          }}>Back to Branches</button>
       </div>
    );
    
    if (!map) return (
       <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <h3>Loading Map...</h3>
       </div>
    );

    const uniqueProducts = getUniqueProducts(map);

    return (
      <div
        ref={fullViewContainerRef}
        style={{ 
        position: 'relative',
        width: '100%', 
        height: '100%', 
        minHeight: 'calc(100vh - 120px)',
        overflow: 'hidden', 
        background: '#E0F2F1', 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '96px 20px 20px 20px',
        boxSizing: 'border-box'
      }}>
         {/* Top bar: map info + close button */}
         <div style={{
           position: 'absolute',
           top: '20px',
           left: '20px',
           right: '20px',
           zIndex: 2001,
           display: 'flex',
           alignItems: 'flex-start',
           justifyContent: 'space-between',
           gap: '12px'
         }}>
           <div style={{
             background: 'rgba(255,255,255,0.95)',
             padding: '12px 16px',
             borderRadius: '12px',
             boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
             border: `1px solid ${theme.colors.border}`,
             maxWidth: 'min(560px, calc(100% - 64px))',
             minWidth: 0
           }}>
             <div style={{ fontSize: '18px', fontWeight: 700, color: theme.colors.text, lineHeight: 1.2, wordBreak: 'break-word' }}>
               {map.name || 'Untitled Map'}
             </div>
             <div style={{ fontSize: '13px', color: theme.colors.textMuted, marginTop: '6px', lineHeight: 1.3 }}>
               Branch: {map.branch || 'Unassigned'}
             </div>
           </div>

           <button 
              onClick={() => navigate('/map-display')}
              title="Close"
              style={{
                  width: 44,
                  height: 44,
                  padding: 0,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.95)',
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  fontSize: '18px'
              }}
           >
              <FaTimes />
           </button>
         </div>

         <div style={{ 
             position: 'relative', 
             width: map.canvasWidth || 3000, 
             height: map.canvasHeight || 3000,
             background: 'white',
             boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
             borderRadius: '8px',
             overflow: 'hidden',
             transform: `scale(${viewScale})`,
         }}>
            <svg width={map.canvasWidth || 3000} height={map.canvasHeight || 3000} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                {map.paths?.map((path, i) => (
                    <polyline
                    key={`path-${i}`}
                    points={path.map(p => `${p.x},${p.y}`).join(' ')}
                    stroke="#374151"
                    strokeWidth="5"
                    fill="none"
                    />
                ))}
            </svg>
            {map.elements?.map((el, i) => renderElement(el, i))}
            {map.widgets?.map((widget, i) => renderWidget(widget, i))}
            {uniqueProducts.map(product => renderProduct(product))}
         </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', background: '#ffffff', color: theme.colors.text, height: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .mapdisplay-scroll::-webkit-scrollbar { width: 8px; }
        .mapdisplay-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
        .mapdisplay-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .mapdisplay-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      
      {/* Header */}
      <div style={{ padding: '20px 20px 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: theme.colors.text }}>
            {showHistory ? 'Map History' : 'Map Management'}
          </h2>
          <p style={{ fontSize: '14px', color: theme.colors.textMuted, margin: '4px 0 0 0' }}>
            {showHistory 
              ? 'View audit log of map creation, edits, and deletions.' 
              : 'Create, edit, and manage store layout maps.'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                if (showHistory) {
                   setShowHistory(false);
                } else {
                   setShowHistory(true);
                   setHistoryViewIndex(0);
                   fetchMapHistory();
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'white', color: theme.colors.text, 
                border: `1px solid ${theme.colors.border}`,
                padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showHistory ? <><FaTimes /> Close History</> : <><FaHistory /> View History</>}
            </button>
          )}

          {/* Only non-admin (e.g. manager) can restore/create maps */}
          {!showHistory && currentUser?.role !== 'staff' && currentUser?.role !== 'admin' && (
            <>
              <button 
                onClick={() => setShowRestoreModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'white', color: theme.colors.text, 
                  border: `1px solid ${theme.colors.border}`,
                  padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <FaUndo /> Restore Maps
              </button>
              
              <button 
                onClick={handleCreateClick}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: theme.colors.primary, color: 'white', 
                  border: 'none',
                  padding: '8px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                  fontSize: '14px',
                  boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)'
                }}
              >
                <FaPlus /> Create New Map
              </button>
            </>
          )}
        </div>
      </div>

      {showHistory ? (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '20px' }}>
           <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.textMuted }} />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, fontSize: '14px', outline: 'none' }}
              />
            </div>
            <select 
              value={historyActionFilter} 
              onChange={(e) => setHistoryActionFilter(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, background: 'white', fontSize: '14px', minWidth: '150px' }}
            >
              <option value="All">All Actions</option>
              {Array.from(new Set(historyItems.map(h => h.action))).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={fetchMapHistory} style={{ background: 'white', border: `1px solid ${theme.colors.border}`, borderRadius: '8px', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <FaSync />
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', background: 'white', borderRadius: '12px', border: `1px solid ${theme.colors.border}` }}>
            {filteredHistoryItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textMuted }}>No history records found.</div>
            ) : (
              <>
                {/* One action at a time: navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.colors.border}`, background: '#f9fafb' }}>
                  <span style={{ fontSize: '14px', color: theme.colors.textMuted, fontWeight: 600 }}>
                    Action {historyViewIndex + 1} of {filteredHistoryItems.length}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setHistoryViewIndex(i => Math.max(0, i - 1))}
                      disabled={historyViewIndex === 0}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`,
                        background: 'white', color: theme.colors.text, fontWeight: 600, cursor: historyViewIndex === 0 ? 'not-allowed' : 'pointer',
                        opacity: historyViewIndex === 0 ? 0.6 : 1
                      }}
                    >
                      <FaChevronLeft /> Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryViewIndex(i => Math.min(filteredHistoryItems.length - 1, i + 1))}
                      disabled={historyViewIndex === filteredHistoryItems.length - 1}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 14px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`,
                        background: 'white', color: theme.colors.text, fontWeight: 600, cursor: historyViewIndex === filteredHistoryItems.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: historyViewIndex === filteredHistoryItems.length - 1 ? 0.6 : 1
                      }}
                    >
                      Next <FaChevronRight />
                    </button>
                  </div>
                </div>
                {/* Single action card */}
                <div style={{ padding: '24px' }}>
                  {(() => {
                    const h = filteredHistoryItems[historyViewIndex];
                    if (!h) return null;
                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: `1px solid ${theme.colors.border}` }}>
                          <tr>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Time</th>
                            <th style={thStyle}>Action</th>
                            <th style={thStyle}>Map Name</th>
                            <th style={thStyle}>Branch</th>
                            <th style={thStyle}>User</th>
                            <th style={thStyle}>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                            <td style={tdStyle}>{fmtDate(h.createdAt)}</td>
                            <td style={tdStyle}>{fmtTime(h.createdAt)}</td>
                            <td style={tdStyle}>
                              <span style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600',
                                background: h.action.includes('Deleted') ? '#ffebee' : h.action.includes('Created') ? '#e8f5e9' : '#e3f2fd',
                                color: h.action.includes('Deleted') ? '#c62828' : h.action.includes('Created') ? '#2e7d32' : '#1565c0'
                              }}>{h.action}</span>
                            </td>
                            <td style={tdStyle}><strong>{h.mapName}</strong></td>
                            <td style={tdStyle}>{h.branch || '-'}</td>
                            <td style={tdStyle}>{h.actorName || 'System'}</td>
                            <td style={tdStyle}>{h.details}</td>
                          </tr>
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
           <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
             <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.colors.textMuted }} />
                <input 
                  type="text" 
                  placeholder="Search maps..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, fontSize: '14px' }}
                />
             </div>
             
             <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${theme.colors.border}` }}>
                <option value="">All Branches</option>
                {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
             </select>
             
             <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${theme.colors.border}` }} />
             
             <button onClick={fetchMaps} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`, background: 'white', cursor: 'pointer' }}><FaSync /></button>
           </div>

           <div className="mapdisplay-scroll" style={{ overflowY: 'auto', flex: 1 }}>
            {filteredMaps.length === 0 ? (
                <p style={{ color: theme.colors.textMuted }}>No maps found matching your filters.</p>
            ) : (
               <div style={gridStyle}>
                  {filteredMaps.map((map, index) => {
                    const uniqueProducts = getUniqueProducts(map);
                    return (
                      <div
                        key={map._id}
                        onClick={() => handleMapClick(map._id)}
                        style={mapCardStyle}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,77,64,0.18)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,77,64,0.10)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <h3 style={mapTitleStyle}>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {map.name || `Map #${index + 1}`}
                              {map.isKioskMap && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0ea5e9', background: '#e0f2fe', border: '1px solid #7dd3fc', padding: '2px 6px', borderRadius: '999px' }}>
                                  Kiosk
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: '11px', color: theme.colors.text }}>
                              Branch: {map.branch || 'Unassigned'}
                            </span>
                          </span>
                          <span>
                            {currentUser?.role !== 'admin' && (
                              <>
                                <FaEdit
                                  title="Edit map"
                                  style={{ color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMapClick(map._id);
                                  }}
                                />
                                <FaTrash
                                  title="Delete map"
                                  style={{ color: '#ef4444', cursor: 'pointer' }}
                                  onClick={(e) => handleDeleteClick(e, map._id)}
                                />
                              </>
                            )}
                          </span>
                        </h3>

                        {currentUser?.role !== 'admin' && (
                          <button
                            onClick={(e) => handleSetKioskMap(e, map._id)}
                            style={{
                              backgroundColor: '#0ea5e9',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              marginBottom: '10px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(14,165,233,0.25)',
                              transition: 'background-color 0.15s ease, transform 0.12s ease'
                            }}
                          >
                            Set as Kiosk Map
                          </button>
                        )}
                        
                        <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '10px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          <span>Elements: {map.elements?.length || 0}</span>
                          <span>Paths: {map.paths?.length || 0}</span>
                          <span>Widgets: {map.widgets?.length || 0}</span>
                          <span>Products: {uniqueProducts.length}</span>
                        </div>

                        <div style={previewContainer}>
                          <div style={{
                            ...previewCanvas,
                            width: map.canvasWidth || 3000,
                            height: map.canvasHeight || 3000,
                            transform: `scale(${Math.min(320 / (map.canvasWidth || 3000), 220 / (map.canvasHeight || 3000))})`
                          }}>
                            <svg width={map.canvasWidth || 3000} height={map.canvasHeight || 3000} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
                              {map.paths?.map((path, i) => (
                                <polyline
                                  key={`path-${i}`}
                                  points={path.map(p => `${p.x},${p.y}`).join(' ')}
                                  stroke="#374151"
                                  strokeWidth="10"
                                  fill="none"
                                />
                              ))}
                            </svg>
                            {map.elements?.map((el, i) => renderElement(el, i))}
                            {map.widgets?.map((widget, i) => renderWidget(widget, i))}
                            {uniqueProducts.map(product => renderProduct(product))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
            )}
           </div>
        </div>
      )}
      
      {/* Modals */}
      {showRestoreModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', maxWidth: '900px', width: '92%', maxHeight: '80vh', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ paddingBottom: 8 }}>
              <h2 style={{ margin: 0, marginBottom: '8px', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Restore Deleted Maps</h2>
              <p style={{ color: theme.colors.textMuted, fontSize: 12, margin: 0 }}>Deleted maps are stored locally for restore. You can search by name or deletion date/time.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, marginBottom: 12 }}>
              <input value={restoreSearch} onChange={(e) => setRestoreSearch(e.target.value)} placeholder="Search by map name or deletion date..." style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.colors.border}` }} />
              {restoreSearch && <button onClick={() => setRestoreSearch('')} style={{ background: '#e2e8f0', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer' }}><FaTimes /></button>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
               {/* Restore list logic here if needed, keeping it simple for now */}
               {filteredDeletedMaps.length === 0 ? <p>No deleted maps found.</p> : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                     {filteredDeletedMaps.map(m => (
                        <div key={m._id} style={{ border: `1px solid ${theme.colors.border}`, borderRadius: 8, padding: 12, cursor: 'pointer', background: selectedUndo.includes(m._id) ? '#e0f2fe' : 'white' }} onClick={() => { if(selectedUndo.includes(m._id)) setSelectedUndo(prev => prev.filter(id => id !== m._id)); else setSelectedUndo(prev => [...prev, m._id]); }}>
                           <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                           <div style={{ fontSize: 12, color: '#666' }}>{new Date(m.deletedAt).toLocaleString()}</div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.colors.border}`, paddingTop: 12 }}>
               <button onClick={handleToggleSelectAll} style={{ background: 'none', border: 'none', color: theme.colors.primary, cursor: 'pointer', fontWeight: 'bold' }}>{selectedUndo.length === filteredDeletedMaps.length ? 'Deselect All' : 'Select All'}</button>
               <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handlePermanentDelete} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Permanent Delete</button>
                  <button onClick={handleRestoreSelected} style={{ background: theme.colors.primary, color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Restore Selected</button>
                  <button onClick={() => setShowRestoreModal(false)} style={{ background: '#94a3b8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Close</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapDisplay;
