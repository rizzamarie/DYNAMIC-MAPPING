import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useBlocker } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import {
  FaUndo, FaRedo, FaCopy, FaTrash, FaSave,
  FaArrowsAlt, FaThLarge, FaSearchPlus,
  FaSearchMinus, FaBars, FaArrowLeft, FaEdit, FaCheck,
  FaBox, FaEye, FaEyeSlash, FaTimes, FaSearch,
  FaChevronDown, FaChevronUp
} from 'react-icons/fa';

function ToolButton({ icon, label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontSize: 10,
        cursor: 'pointer',
        color: '#1e293b',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        fontWeight: 700,
        minWidth: 64,
        padding: '6px 8px',
        borderRadius: 8,
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        gap: 4
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ fontSize: 20 }}>{icon}</div>
      <span style={{ textAlign: 'center', lineHeight: 1 }}>{label}</span>
    </div>
  );
}

const DEFAULT_SHAPE_DIMENSIONS = {
  shelf: { width: 120, height: 60 },
  rack: { width: 100, height: 100 },
  label: { width: 100, height: 40 },
  square: { width: 120, height: 80 },
  lshape: { width: 160, height: 120 },
  ushape: { width: 160, height: 120 },
  tshape: { width: 160, height: 120 },
  kiosk: { width: 100, height: 120 },
  door: { width: 80, height: 80 },
  entrance: { width: 80, height: 80 },
  exit: { width: 80, height: 80 },
  cashier: { width: 100, height: 80 },
  promo: { width: 100, height: 60 },
  default: { width: 80, height: 80 }
};

const RibbonGroup = ({ title, children }) => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    padding: '4px 8px', 
    borderRight: '1px solid #e1e5e9', 
    minWidth: 90,
    flexShrink: 0,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
    margin: '0 1px',
    transition: 'all 0.2s ease'
  }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 8, 
      flexWrap: 'nowrap',
      justifyContent: 'center',
      marginBottom: '4px',
      flex: 1
    }}>
      {children}
    </div>
    <div style={{ 
      textTransform: 'uppercase', 
      fontSize: 10, 
      color: '#64748b', 
      fontWeight: 800, 
      textAlign: 'center',
      letterSpacing: '0.5px',
      opacity: 0.8
    }}>
      {title}
    </div>
  </div>
);

export default function MapEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapId = new URLSearchParams(location.search).get('id');

  const [elements, setElements] = useState([]);
  const [paths, setPaths] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const showTools = true;
  const showRibbon = true;
  const [toolsCollapsed, setToolsCollapsed] = useState(false);
  const [showBasicShapesGroup, setShowBasicShapesGroup] = useState(true);
  const [showFixturesGroup, setShowFixturesGroup] = useState(true);
  const [showLabelsGroup, setShowLabelsGroup] = useState(true);
  const [showIconsGroup, setShowIconsGroup] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sizePreset, setSizePreset] = useState('');
  const [isMoveMode, setIsMoveMode] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [isCanvasHovered, setIsCanvasHovered] = useState(false);

  const [selectedId, setSelectedId] = useState(null); // legacy single selection id
  const [selectedPlacedProductId, setSelectedPlacedProductId] = useState(null); // legacy single placed id

  // New multi-select sets
  const [selectedElementIds, setSelectedElementIds] = useState(new Set());
  const [selectedMarkerIds, setSelectedMarkerIds] = useState(new Set());
  const [selectedPlacedProductIds, setSelectedPlacedProductIds] = useState(new Set());

  const [draggingShapeId, setDraggingShapeId] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [rotating, setRotating] = useState(null);
  const [partResizing, setPartResizing] = useState(null);
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [draggingTriangle, setDraggingTriangle] = useState(null);

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [showLabelTools, setShowLabelTools] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Map name state & editing state
  const [mapName, setMapName] = useState('');
  const [editingMapName, setEditingMapName] = useState(false);
  const [mapNameLoading, setMapNameLoading] = useState(false);

  // Map canvas size (configurable; persisted)
  const [mapWidth, setMapWidth] = useState(3000);
  const [mapHeight, setMapHeight] = useState(3000);
  const [mapWidthInput, setMapWidthInput] = useState('3000');
  const [mapHeightInput, setMapHeightInput] = useState('3000');
  const [storeSizeDefined, setStoreSizeDefined] = useState(!!mapId);
  const [showStoreSizeReminder, setShowStoreSizeReminder] = useState(false);
  const [storeSizeHighlight, setStoreSizeHighlight] = useState(false);

  const [pixelsPerUnit, setPixelsPerUnit] = useState(100);
  const [unitType, setUnitType] = useState('meter');
  const [storeWidthUnits, setStoreWidthUnits] = useState('30.0');
  const [storeHeightUnits, setStoreHeightUnits] = useState('30.0');

  // Presets (local only)
  const [presets, setPresets] = useState([]);
  const [newPresetName, setNewPresetName] = useState('');

  // Dropdown helpers (dot size and map size)
  const dotSizePresets = [0, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40, 60, 80, 100, 120, 160, 200];
  const mapSizePresets = [800, 1000, 1200, 1600, 2000, 3000];

  const [dotSizeSelect, setDotSizeSelect] = useState('');
  const [customDotSize, setCustomDotSize] = useState('');

  const [mapWSelect, setMapWSelect] = useState('');
  const [mapHSelect, setMapHSelect] = useState('');
  const [customMapW, setCustomMapW] = useState('');
  const [customMapH, setCustomMapH] = useState('');

  // Inventory integration states
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [placedProducts, setPlacedProducts] = useState([]);
  const [showProductDots, setShowProductDots] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [productMarkers, setProductMarkers] = useState([]);
  const [draggingMarker, setDraggingMarker] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredElement, setHoveredElement] = useState(null);
  const [hoveredElementPosition, setHoveredElementPosition] = useState({ x: 0, y: 0 });

  // Single inventory search
  const [inventorySearch, setInventorySearch] = useState('');
  // Search within chosen category
  const [productSearch, setProductSearch] = useState('');

  // Selection (marquee) states
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionRect, setSelectionRect] = useState(null);

  // Group drag/resize states
  const [draggingGroup, setDraggingGroup] = useState(null);
  const [resizingGroup, setResizingGroup] = useState(null);

  const editorRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sidebarRef = useRef(null);
  const labelDivRefs = useRef({});
  const headerRef = useRef(null);
  const panStartRef = useRef(null);
  const spacePressedRef = useRef(false);
  const productModalRef = useRef(null);
  const inventoryModalRef = useRef(null);

  const suppressOffsetRef = useRef(false);
  const suppressTimeoutRef = useRef(null);
  const lastSidebarOffsetRef = useRef(120);
  const temporarilySuppressOffsetUpdate = () => {
    suppressOffsetRef.current = true;
    if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current);
    suppressTimeoutRef.current = setTimeout(() => { suppressOffsetRef.current = false; }, 150);
  };

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mapSizePresets');
    let list = [];
    if (saved) {
      try { list = JSON.parse(saved) || []; } catch {}
    }
    if (!list.some(p => p.name === 'Kiosk 1000×1000')) {
      list.unshift({ name: 'Kiosk 1000×1000', width: 1000, height: 1000 });
    }
    setPresets(list);
  }, []);

  useEffect(() => {
    const fixedRatio = 100;
    setPixelsPerUnit(fixedRatio);
    setUnitType('meter');
    localStorage.setItem('storeRatio', String(fixedRatio));
    localStorage.setItem('storeUnitType', 'meter');
  }, [mapId]);

  useEffect(() => {
    if (pixelsPerUnit && mapWidth > 0 && mapHeight > 0) {
      setStoreWidthUnits(((mapWidth || 0) / pixelsPerUnit).toFixed(1));
      setStoreHeightUnits(((mapHeight || 0) / pixelsPerUnit).toFixed(1));
    } else {
      setStoreWidthUnits('');
      setStoreHeightUnits('');
    }
  }, [mapWidth, mapHeight, pixelsPerUnit]);

  // Undo/Redo, Save, State Management
  const saveState = (newElements = elements, newPaths = paths, newWidgets = widgets, newProductMarkers = productMarkers, newPlacedProducts = placedProducts) => {
    setHistory(prev => [...prev, { elements, paths, widgets, productMarkers, placedProducts }]);
    setFuture([]);
    setElements(newElements);
    setPaths(newPaths);
    setWidgets(newWidgets);
    setProductMarkers(newProductMarkers);
    setPlacedProducts(newPlacedProducts);
    setIsDirty(true);
  };

  const handleUndo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture(f => [{ elements, paths, widgets, productMarkers, placedProducts }, ...f]);
    setElements(prev.elements);
    setPaths(prev.paths);
    setWidgets(prev.widgets);
    setProductMarkers(prev.productMarkers);
    setPlacedProducts(prev.placedProducts);
    setHistory(history.slice(0, history.length - 1));
    setIsDirty(true);
  };

  const handleRedo = () => {
    if (!future.length) return;
    const next = future[0];
    setHistory(h => [...h, { elements, paths, widgets, productMarkers, placedProducts }]);
    setElements(next.elements);
    setPaths(next.paths);
    setWidgets(next.widgets);
    setProductMarkers(next.productMarkers);
    setPlacedProducts(next.placedProducts);
    setFuture(future.slice(1));
    setIsDirty(true);
  };

  // Fetch inventory data
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!showStoreSizeReminder) return;
    const timer = setTimeout(() => setShowStoreSizeReminder(false), 3000);
    return () => clearTimeout(timer);
  }, [showStoreSizeReminder]);

  useEffect(() => {
    if (!showProductModal || !productModalRef.current) return;
    const el = productModalRef.current;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px) scale(0.97)';
    requestAnimationFrame(() => {
      el.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
    });
  }, [showProductModal]);

  useEffect(() => {
    if (!showInventoryModal || !inventoryModalRef.current) return;
    const el = inventoryModalRef.current;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px) scale(0.97)';
    requestAnimationFrame(() => {
      el.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
    });
  }, [showInventoryModal]);

  // Poll for category updates every 2 seconds to ensure sync
  useEffect(() => {
    const interval = setInterval(fetchCategories, 2000);
    return () => clearInterval(interval);
  }, []);

  // When the product list is loaded, remove any saved markers or placed dots
  // that reference products which no longer exist (e.g. deleted in InventoryManager).
  useEffect(() => {
    if (!products || products.length === 0) return;
    setProductMarkers(prev => prev.filter(m => products.some(p => p._id === m.productId)));
    setPlacedProducts(prev => prev.filter(pp => products.some(p => p._id === pp.productId)));
  }, [products]);

  // Listen for inventory updates (other parts of the app dispatch this)
  // and refresh product list so markers stay in sync after deletes/edits.
  useEffect(() => {
    const onInventoryUpdated = () => {
      fetchProducts();
      fetchCategories();
    };
    window.addEventListener('inventoryUpdated', onInventoryUpdated);
    return () => window.removeEventListener('inventoryUpdated', onInventoryUpdated);
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('http://localhost:5000/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('❌ Failed to fetch categories:', err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const currentBranch = localStorage.getItem('currentBranch');
      const url = currentBranch
        ? `http://localhost:5000/products?branch=${encodeURIComponent(currentBranch)}`
        : 'http://localhost:5000/products';

      const res = await axios.get(url);
      const active = (res.data || []).filter(p => !p.deletedAt);
      setProducts(active);
    } catch (err) {
      console.error('❌ Failed to fetch products:', err.message);
      setProducts([]);
    }
  };

  const handleInventoryClick = () => {
    setShowInventoryModal(true);
  };

  const requireStoreSizeBeforeAction = () => {
    if (storeSizeDefined) return false;
    setShowStoreSizeReminder(true);
    setStoreSizeHighlight(true);
    setTimeout(() => setStoreSizeHighlight(false), 800);
    return true;
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
    setShowInventoryModal(false);
    setShowProductModal(true);
    setProductSearch('');
  };

  const handleProductDrop = () => {
    setShowProductModal(false);
    setShowInventoryModal(false);
  };

  // Handle dropping product directly on canvas
  const handleProductDropOnCanvas = (e) => {
    e.preventDefault();
    if (requireStoreSizeBeforeAction()) return;
    const productData = e.dataTransfer.getData('product');
    if (productData) {
      const product = JSON.parse(productData);
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const markerSize = 40;
      const rawX = (e.clientX - rect.left) / zoom - markerSize / 2;
      const rawY = (e.clientY - rect.top) / zoom - markerSize / 2;
      const x = Math.max(0, Math.min(rawX, mapWidth - markerSize));
      const y = Math.max(0, Math.min(rawY, mapHeight - markerSize));
      placeProductOnCanvas(product, x, y);
    }
  };
  const handleCreateLabelForCategory = (category) => {
    if (requireStoreSizeBeforeAction()) return;
    const defaults = DEFAULT_SHAPE_DIMENSIONS.label || DEFAULT_SHAPE_DIMENSIONS.default;
    const width = defaults.width;
    const height = defaults.height;
    const x = (mapWidth - width) / 2;
    const y = (mapHeight - height) / 2;

    const newItem = {
      id: Date.now().toString(),
      type: 'label',
      x,
      y,
      width,
      height,
      rotation: 0,
      content: category?.name || 'Label',
      fontSize: 12,
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
      fontColor: '#111827',
      color: '#fff8cc',
      triangleOffset: { x: 0.5, y: 1 }
    };

    saveState([...elements, newItem], paths, widgets, productMarkers, placedProducts);
  };

  // Handle clicking product to place it on canvas
  const handleProductClick = (product) => {
    if (requireStoreSizeBeforeAction()) return;
    setShowProductModal(false);
    setShowInventoryModal(false);
    const markerSize = 40;
    if (containerRef.current) {
      const cx = containerRef.current.scrollLeft + containerRef.current.clientWidth / 2;
      const cy = containerRef.current.scrollTop + containerRef.current.clientHeight / 2;
      const x = cx / zoom - markerSize / 2;
      const y = cy / zoom - markerSize / 2;
      const clampedX = Math.max(0, Math.min(x, mapWidth - markerSize));
      const clampedY = Math.max(0, Math.min(y, mapHeight - markerSize));
      placeProductOnCanvas(product, clampedX, clampedY);
    } else if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const vx = (window.innerWidth / 2) - rect.left;
      const vy = (window.innerHeight / 2) - rect.top;
      const x = vx / zoom - markerSize / 2;
      const y = vy / zoom - markerSize / 2;
      const clampedX = Math.max(0, Math.min(x, mapWidth - markerSize));
      const clampedY = Math.max(0, Math.min(y, mapHeight - markerSize));
      placeProductOnCanvas(product, clampedX, clampedY);
    }
  };

  // Place product marker (big red dot)
  const placeProductOnCanvas = (product, x, y) => {
    // Calculate total stock
    let totalStock = 0;
    if (typeof product.totalStock === 'number' && product.totalStock >= 0) {
      totalStock = product.totalStock;
    } else {
      if (Array.isArray(product.sizeColorQuantities)) totalStock += product.sizeColorQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
      if (Array.isArray(product.colorQuantities)) totalStock += product.colorQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
      if (Array.isArray(product.sizeQuantities)) totalStock += product.sizeQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
      if (Array.isArray(product.brandUnitQuantities)) totalStock += product.brandUnitQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
      if (Array.isArray(product.brandQuantities)) totalStock += product.brandQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
      if (Array.isArray(product.unitQuantities)) totalStock += product.unitQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
      if (typeof product.stockQty === 'number') totalStock += product.stockQty;
    }

    // Calculate how many are currently on shelves
    const onShelves = placedProducts.filter(p => p.productId === product._id).length;

    const newMarker = {
      id: Date.now().toString(),
      productId: product._id,
      productName: product.name,
      productImage: product.image,
      productBrand: product.brand,
      productPrice: product.price,
      totalStock: totalStock,
      onShelves: onShelves,
      x: x,
      y: y,
      size: 40,
      timestamp: new Date().toISOString(),
      isPlaced: true
    };
    const newMarkers = [...productMarkers, newMarker];
    setProductMarkers(newMarkers);
    if (mapId) {
      axios.put(`http://localhost:5000/maps/${mapId}`, {
        elements,
        paths,
        widgets,
        placedProducts,
        productMarkers: newMarkers,
        canvasWidth: mapWidth,
        canvasHeight: mapHeight,
        name: mapName,
        branch: localStorage.getItem('currentBranch')
      }).catch(err => console.error('❌ Error saving product marker:', err));
    }
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(76, 175, 80, 0.9);
      color: white;
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 12px;
      font-weight: bold;
      z-index: 2000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
      font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      letter-spacing: .2px;
    `;
    successMsg.textContent = `✅ ${product.name} placed on map!`;
    document.body.appendChild(successMsg);
    setTimeout(() => {
      if (successMsg.parentNode) successMsg.parentNode.removeChild(successMsg);
    }, 1200);
  };

  // Product placement logic (drag from product card)
  const handleProductDragStart = (e, product) => {
    e.dataTransfer.setData('product', JSON.stringify(product));
    const img = new window.Image();
    img.src = product.image ? `http://localhost:5000${product.image}` : 'https://via.placeholder.com/40';
    e.dataTransfer.setDragImage(img, 20, 20);
  };

  const handleProductDropOnWidget = (e, widgetId) => {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';
    e.currentTarget.style.opacity = '';
    if (requireStoreSizeBeforeAction()) return;
    
    const productData = e.dataTransfer.getData('product');
    if (productData) {
      const product = JSON.parse(productData);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      const newPlacedProduct = {
        id: Date.now().toString(),
        productId: product._id,
        productName: product.name,
        widgetId: widgetId,
        x: x,
        y: y,
        size: 12,
        timestamp: new Date().toISOString()
      };
      const newPlaced = [...placedProducts, newPlacedProduct];
      setPlacedProducts(newPlaced);
      saveState(elements, paths, widgets, productMarkers, newPlaced);
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        pointer-events: none;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        letter-spacing: .2px;
      `;
      successMsg.textContent = `✅ ${product.name} added to shelf!`;
      document.body.appendChild(successMsg);
      setTimeout(() => {
        if (successMsg.parentNode) successMsg.parentNode.removeChild(successMsg);
      }, 2000);
      
      if (mapId) {
        axios.put(`http://localhost:5000/maps/${mapId}`, {
          elements,
          paths,
          widgets,
          placedProducts: newPlaced,
          canvasWidth: mapWidth,
          canvasHeight: mapHeight,
          name: mapName,
          branch: localStorage.getItem('currentBranch')
        }).catch(err => console.error('❌ Error saving product placement:', err));
      }
    }
  };

  // Drag & drop creation logic
  const handleDragStart = (e, shapeType) => {
    e.dataTransfer.setData('shape', shapeType);
    const img = new window.Image();
    img.src = 'data:image/svg+xml;base64,PHN2ZyBpZD0idXNlciIgdmlld0JveD0iMCAwIDQwIDQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9Im5vbmUiIC8+Cjwvc3ZnPg==';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (requireStoreSizeBeforeAction()) return;
    const type = e.dataTransfer.getData('shape');
    if (!type) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const defaults = DEFAULT_SHAPE_DIMENSIONS[type] || DEFAULT_SHAPE_DIMENSIONS.default;
    let newItem = { id: Date.now().toString(), type, x, y, width: defaults.width, height: defaults.height, rotation: 0 };

    if (type === 'shelf') {
      newItem = { ...newItem, color: '#a0522d', cornerRadiusRatio: 0.06 };
    } else if (type === 'rack') {
      newItem = { ...newItem, color: '#999999', cornerRadiusRatio: 0.06 };
    } else if (type === 'label') {
      newItem = {
        ...newItem,
        content: 'Label Text',
        fontSize: 12,
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        fontColor: '#111827',
        color: '#fff8cc',
        triangleOffset: { x: 0.5, y: 1 },
      };
    } else if (type === 'square') {
      newItem = { ...newItem, type: 'rectangle', color: '#d4a373', cornerRadiusRatio: 0.08 };
    } else if (type === 'lshape' || type === 'ushape' || type === 'tshape') {
      newItem = { 
        ...newItem, 
        color: '#d4a373',
        armWRatio: 0.33,
        armHRatio: 0.33,
        uGapWidthRatio: 0.33,
        uGapHeightRatio: 0.75,
        tBarHeightRatio: 0.33,
        tStemWidthRatio: 0.33
      };
    } else if (type === 'kiosk') {
      newItem = { ...newItem, color: '#1e40af', cornerRadiusRatio: 0.06 };
    } else if (type === 'door') {
      newItem = { ...newItem, color: '#000000', width: 80, height: 80 };
    } else if (type === 'entrance') {
      newItem = { ...newItem, color: '#16a34a' };
    } else if (type === 'exit') {
      newItem = { ...newItem, color: '#b91c1c' };
    } else if (type === 'cashier') {
      newItem = { ...newItem, color: '#1e40af' };
    } else if (type === 'promo') {
      newItem = { ...newItem, color: '#f97316' };
    }
    saveState([...elements, newItem], paths, widgets, productMarkers, placedProducts);
  };

  // Mouse events
  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    if (editingLabelId || draggingTriangle) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    setSelectedId(null);
    setSelectedPlacedProductId(null);

    if (e.target === e.currentTarget) {
      temporarilySuppressOffsetUpdate();
      setSelectedElementIds(new Set());
      setSelectedMarkerIds(new Set());
      setSelectedPlacedProductIds(new Set());

      const shouldPan = e.button === 0 && (spacePressedRef.current || !e.shiftKey);

      if (shouldPan) {
        setIsPanning(true);
        panStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          startPanX: pan.x,
          startPanY: pan.y
        };
      } else {
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionRect({ x, y, w: 0, h: 0 });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (editingLabelId) return;

    if (isPanning && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      setPan({
        x: panStartRef.current.startPanX + dx,
        y: panStartRef.current.startPanY + dy
      });
      return;
    }

    if (!canvasRef.current) return;

    const canvas = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - canvas.left) / zoom;
    const y = (e.clientY - canvas.top) / zoom;

    if (isSelecting && selectionStart) {
      const rx = Math.min(selectionStart.x, x);
      const ry = Math.min(selectionStart.y, y);
      const rw = Math.abs(x - selectionStart.x);
      const rh = Math.abs(y - selectionStart.y);
      setSelectionRect({ x: rx, y: ry, w: rw, h: rh });
      return;
    }

    // Group drag
    if (draggingGroup) {
      const dx = (e.clientX - draggingGroup.startMouseX) / zoom;
      const dy = (e.clientY - draggingGroup.startMouseY) / zoom;

      // Move selected elements
      const updatedElements = elements.map(el => {
        if (!draggingGroup.elementSnapshot.has(el.id)) return el;
        const s = draggingGroup.elementSnapshot.get(el.id);
        return { ...el, x: s.x + dx, y: s.y + dy };
        });
      // Move selected markers
      const updatedMarkers = productMarkers.map(m => {
        if (!draggingGroup.markerSnapshot.has(m.id)) return m;
        const s = draggingGroup.markerSnapshot.get(m.id);
        return { ...m, x: s.x + dx, y: s.y + dy };
      });
      // Move selected placed dots (absolute move by adjusting widget? We only move if their widget is selected)
      let updatedPlaced = placedProducts;
      if (draggingGroup.placedSnapshot.size > 0) {
        // To move placed relative to widget, if widget selected we move widget and dot follows; if dot itself selected without widget, move dot offset
        // Here: when group dragging, we move dots relative to canvas by adjusting their offset when their widget isn't selected
        updatedPlaced = placedProducts.map(p => {
          if (!draggingGroup.placedSnapshot.has(p.id)) return p;
          const s = draggingGroup.placedSnapshot.get(p.id);
          // If widget selected, widget move handles this (we already moved elements); keep relative
          const widgetSelected = selectedElementIds.has(p.widgetId);
          if (widgetSelected) return p;
          return { ...p, x: s.x + dx, y: s.y + dy };
        });
      }

      setElements(updatedElements);
      setProductMarkers(updatedMarkers);
      setPlacedProducts(updatedPlaced);
      return;
    }

    // Element move
    if (draggingShapeId && isMoveMode) {
      const { id, offsetX, offsetY } = draggingShapeId;
      const newLeft = (e.clientX - canvas.left - offsetX) / zoom;
      const newTop = (e.clientY - canvas.top - offsetY) / zoom;

      // If multi-selected and the one being dragged is within selection, start group drag
      if ((selectedElementIds.size + selectedMarkerIds.size + selectedPlacedProductIds.size) > 1) {
        // Initiate group drag on the fly
        startGroupDrag(e);
        return;
      }

      setElements(prev =>
        prev.map(el => el.id === id ? { ...el, x: newLeft, y: newTop } : el)
      );
      return;
    }

    if (partResizing) {
      const { id, part, boxLeft, boxTop, boxWidth, boxHeight } = partResizing;
      const relX = (e.clientX - boxLeft) / Math.max(1, boxWidth);
      const relY = (e.clientY - boxTop) / Math.max(1, boxHeight);
      const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      setElements(prev => prev.map(el => {
        if (el.id !== id) return el;
        if (part === 'cornerRadius') {
          const r = clamp(Math.min(relX, relY), 0, 0.5);
          return { ...el, cornerRadiusRatio: r };
        }
        if (part === 'l_arm_w') {
          return { ...el, armWRatio: clamp(relX, 0.05, 0.95) };
        }
        if (part === 'l_arm_h') {
          return { ...el, armHRatio: clamp(relY, 0.05, 0.95) };
        }
        if (part === 'u_gap_h') {
          return { ...el, uGapHeightRatio: clamp(relY, 0.05, 0.95) };
        }
        if (part === 'u_gap_w') {
          const leftRatio = clamp(relX, 0.05, 0.45);
          const gapW = clamp(1 - 2 * leftRatio, 0.1, 0.9);
          return { ...el, uGapWidthRatio: gapW };
        }
        if (part === 't_bar_h') {
          return { ...el, tBarHeightRatio: clamp(relY, 0.05, 0.95) };
        }
        if (part === 't_stem_w') {
          const leftRatio = clamp(relX, 0.05, 0.45);
          const stemW = clamp(1 - 2 * leftRatio, 0.1, 0.9);
          return { ...el, tStemWidthRatio: stemW };
        }
        return el;
      }));
      return;
    }

    if (resizing) {
      const { id, corner, startX, startY, startWidth, startHeight, startXPos, startYPos, startRotation } = resizing;
      
      const mouseDx = (e.clientX - startX) / zoom;
      const mouseDy = (e.clientY - startY) / zoom;

      // Convert rotation to radians
      const rad = (startRotation || 0) * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Rotate mouse delta into local space (inverse rotation)
      const localDx = mouseDx * cos + mouseDy * sin;
      const localDy = -mouseDx * sin + mouseDy * cos;

      // 1. Calculate new dimensions in local space
      let newWidth = startWidth;
      let newHeight = startHeight;

      switch (corner) {
        case 'tl': newWidth = startWidth - localDx; newHeight = startHeight - localDy; break;
        case 'tr': newWidth = startWidth + localDx; newHeight = startHeight - localDy; break;
        case 'bl': newWidth = startWidth - localDx; newHeight = startHeight + localDy; break;
        case 'br': newWidth = startWidth + localDx; newHeight = startHeight + localDy; break;
        case 't': newHeight = startHeight - localDy; break;
        case 'b': newHeight = startHeight + localDy; break;
        case 'l': newWidth = startWidth - localDx; break;
        case 'r': newWidth = startWidth + localDx; break;
        default: break;
      }

      // 2. Clamp dimensions
      const finalWidth = Math.max(20, newWidth);
      const finalHeight = Math.max(20, newHeight);

      // 3. Recalculate position to keep the anchor point fixed
      
      // Calculate initial center
      const startCx = startXPos + startWidth / 2;
      const startCy = startYPos + startHeight / 2;

      // Calculate anchor offset from center (unrotated)
      // The anchor is the point OPPOSITE to the dragged handle
      let anchorOffsetX = 0;
      let anchorOffsetY = 0;

      if (corner.includes('l')) anchorOffsetX = startWidth / 2; // dragging left -> anchor right
      else if (corner.includes('r')) anchorOffsetX = -startWidth / 2; // dragging right -> anchor left
      
      if (corner.includes('t')) anchorOffsetY = startHeight / 2; // dragging top -> anchor bottom
      else if (corner.includes('b')) anchorOffsetY = -startHeight / 2; // dragging bottom -> anchor top
      
      // Rotate anchor offset to get global vector from center to anchor
      const anchorGlobalDx = anchorOffsetX * cos - anchorOffsetY * sin;
      const anchorGlobalDy = anchorOffsetX * sin + anchorOffsetY * cos;
      
      const anchorX = startCx + anchorGlobalDx;
      const anchorY = startCy + anchorGlobalDy;

      // Now we have the fixed anchor point (anchorX, anchorY) in global space.
      // We need to find the new center (newCx, newCy) such that the anchor point is at the correct offset in the NEW shape.
      
      let newAnchorOffsetX = 0;
      let newAnchorOffsetY = 0;
      
      if (corner.includes('l')) newAnchorOffsetX = finalWidth / 2;
      else if (corner.includes('r')) newAnchorOffsetX = -finalWidth / 2;
      
      if (corner.includes('t')) newAnchorOffsetY = finalHeight / 2;
      else if (corner.includes('b')) newAnchorOffsetY = -finalHeight / 2;
      
      // Rotate new anchor offset
      const newAnchorGlobalDx = newAnchorOffsetX * cos - newAnchorOffsetY * sin;
      const newAnchorGlobalDy = newAnchorOffsetX * sin + newAnchorOffsetY * cos;
      
      // The anchor point matches: NewCenter + NewAnchorVector = AnchorPoint
      // So: NewCenter = AnchorPoint - NewAnchorVector
      
      const newCx = anchorX - newAnchorGlobalDx;
      const newCy = anchorY - newAnchorGlobalDy;
      
      const finalX = newCx - finalWidth / 2;
      const finalY = newCy - finalHeight / 2;

      setElements(prev => prev.map(el => el.id === id ? { ...el, width: finalWidth, height: finalHeight, x: finalX, y: finalY } : el));
      return;
    }

    // Group resizing
    if (resizingGroup) {
      const { corner, startMouseX, startMouseY, initialBounds, elementSnapshot, markerSnapshot, placedSnapshot, anchorX, anchorY } = resizingGroup;
      const dx = (e.clientX - startMouseX) / zoom;
      const dy = (e.clientY - startMouseY) / zoom;

      let newBounds = { ...initialBounds };
      if (corner === 'tl') { newBounds.x = initialBounds.x + dx; newBounds.y = initialBounds.y + dy; newBounds.w = initialBounds.w - dx; newBounds.h = initialBounds.h - dy; }
      if (corner === 'tr') { newBounds.y = initialBounds.y + dy; newBounds.w = initialBounds.w + dx; newBounds.h = initialBounds.h - dy; }
      if (corner === 'bl') { newBounds.x = initialBounds.x + dx; newBounds.w = initialBounds.w - dx; newBounds.h = initialBounds.h + dy; }
      if (corner === 'br') { newBounds.w = initialBounds.w + dx; newBounds.h = initialBounds.h + dy; }
      if (corner === 't')  { newBounds.y = initialBounds.y + dy; newBounds.h = initialBounds.h - dy; }
      if (corner === 'b')  { newBounds.h = initialBounds.h + dy; }
      if (corner === 'l')  { newBounds.x = initialBounds.x + dx; newBounds.w = initialBounds.w - dx; }
      if (corner === 'r')  { newBounds.w = initialBounds.w + dx; }

      const sx = Math.max(0.05, newBounds.w / Math.max(1, initialBounds.w));
      const sy = Math.max(0.05, newBounds.h / Math.max(1, initialBounds.h));
      const ox = anchorX;
      const oy = anchorY;

      // Scale elements
      const nextElements = elements.map(el => {
        if (!elementSnapshot.has(el.id)) return el;
        const s = elementSnapshot.get(el.id);
        const nx = ox + (s.x - ox) * sx;
        const ny = oy + (s.y - oy) * sy;
        const nw = Math.max(10, s.width * sx);
        const nh = Math.max(10, s.height * sy);
        return { ...el, x: nx, y: ny, width: nw, height: nh };
      });

      // Scale markers
      const nextMarkers = productMarkers.map(m => {
        if (!markerSnapshot.has(m.id)) return m;
        const s = markerSnapshot.get(m.id);
        const nx = ox + (s.x - ox) * sx;
        const ny = oy + (s.y - oy) * sy;
        const ns = Math.max(0, s.size * ((sx + sy) / 2));
        return { ...m, x: nx, y: ny, size: ns };
      });

      // Scale placed products (only if their widget is selected; scale offsets with widget)
      let nextPlaced = placedProducts;
      if (placedSnapshot.size > 0) {
        const widgetMap = new Map(elements.map(el => [el.id, el]));
        nextPlaced = placedProducts.map(p => {
          if (!placedSnapshot.has(p.id)) return p;
          const s = placedSnapshot.get(p.id);
          const widgetSelected = selectedElementIds.has(p.widgetId);
          if (widgetSelected) {
            return {
              ...p,
              x: s.x * sx,
              y: s.y * sy,
              size: Math.max(0, (s.size ?? 0) * ((sx + sy) / 2))
            };
          }
          // If widget not selected but dot is selected, scale absolute offset relative to group anchor
          const absX = (widgetMap.get(p.widgetId)?.x ?? 0) + s.x;
          const absY = (widgetMap.get(p.widgetId)?.y ?? 0) + s.y;
          const scaledAbsX = ox + (absX - ox) * sx;
          const scaledAbsY = oy + (absY - oy) * sy;
          const newWidgetX = widgetMap.get(p.widgetId)?.x ?? 0;
          const newWidgetY = widgetMap.get(p.widgetId)?.y ?? 0;
          return {
            ...p,
            x: scaledAbsX - newWidgetX,
            y: scaledAbsY - newWidgetY,
            size: Math.max(0, (s.size ?? 0) * ((sx + sy) / 2))
          };
        });
      }

      setElements(nextElements);
      setProductMarkers(nextMarkers);
      setPlacedProducts(nextPlaced);
      return;
    }

    if (rotating) {
      const { id, centerX, centerY, startAngle } = rotating;
      const dx2 = e.clientX - centerX;
      const dy2 = e.clientY - centerY;
      const angle = Math.atan2(dy2, dx2) * 180 / Math.PI;
      let rotation = angle - startAngle;
      if (rotation < 0) rotation += 360;
      setElements(prev => prev.map(el => el.id === id ? { ...el, rotation } : el));
      return;
    }

    if (draggingTriangle) {
      const { id, labelBox, offsetX, offsetY } = draggingTriangle;
      if (!labelBox) return;
      let relX = (e.clientX - labelBox.left - offsetX) / (labelBox.width || 1);
      let relY = (e.clientY - labelBox.top - offsetY) / (labelBox.height || 1);
      relX = Math.max(0, Math.min(1, relX));
      relY = Math.max(0, Math.min(1, relY));
      setElements(prev => prev.map(el => el.id === id && el.type === 'label' ? { ...el, triangleOffset: { x: relX, y: relY } } : el));
      return;
    }

    if (draggingMarker) {
      const { id, offsetX, offsetY } = draggingMarker;
      const newLeft = (e.clientX - canvas.left - offsetX) / zoom;
      const newTop = (e.clientY - canvas.top - offsetY) / zoom;

      // If multi-selected markers, start group drag
      if ((selectedElementIds.size + selectedMarkerIds.size + selectedPlacedProductIds.size) > 1) {
        startGroupDrag(e);
        return;
      }

      setProductMarkers(prev =>
        prev.map(marker =>
          marker.id === id ? { ...marker, x: newLeft, y: newTop } : marker
        )
      );
      return;
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (isSelecting && selectionRect) {
      finalizeSelection();
    }
    if (draggingShapeId || resizing || rotating || draggingTriangle || draggingMarker || draggingGroup || resizingGroup || partResizing) {
      saveState(elements, paths, widgets, productMarkers, placedProducts);
      if (mapId) {
        const updated = elements.map(el => ({ ...el }));
        axios.put(`http://localhost:5000/maps/${mapId}`, {
          name: mapName,
          elements: updated,
          paths,
          widgets,
          placedProducts,
          productMarkers,
          canvasWidth: mapWidth,
          canvasHeight: mapHeight,
          branch: localStorage.getItem('currentBranch')
        }).catch(err => console.error('❌ Error auto-saving map:', err));
      }
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionRect(null);
    setDraggingShapeId(null);
    setResizing(null);
    setRotating(null);
    setDraggingTriangle(null);
    setDraggingMarker(null);
    setDraggingGroup(null);
    setResizingGroup(null);
    setPartResizing(null);
  };

  const toggleSetId = (set, id, on = undefined) => {
    const next = new Set(set);
    if (on === true) next.add(id);
    else if (on === false) next.delete(id);
    else {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    }
    return next;
  };

  const handleShapeMouseDown = (el) => (e) => {
    e.stopPropagation();

    const isMulti = e.ctrlKey || e.metaKey;

    // When multi-select modifier is pressed, toggle membership
    if (isMulti) {
      setSelectedElementIds(prev => toggleSetId(prev, el.id));
      setSelectedMarkerIds(prev => new Set(prev)); // leave unchanged
      setSelectedPlacedProductIds(prev => new Set(prev));
      setSelectedId(el.id);
      setSelectedPlacedProductId(null);
    } else {
      // Single select
      setSelectedElementIds(new Set([el.id]));
      setSelectedMarkerIds(new Set());
      setSelectedPlacedProductIds(new Set());
      setSelectedId(el.id);
      setSelectedPlacedProductId(null);
    }

    if (isMoveMode && !resizing && !rotating) {
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      setDraggingShapeId({ id: el.id, offsetX, offsetY });
    }
  };

  const handleResizeMouseDown = (el, corner) => (e) => {
    e.stopPropagation();
    setResizing({
      id: el.id,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: el.width,
      startHeight: el.height,
      startXPos: el.x,
      startYPos: el.y,
      startRotation: el.rotation || 0,
    });
  };

  const handleRotateMouseDown = (el) => (e) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const centerX = canvas.left + el.x * zoom + (el.width * zoom) / 2;
    const centerY = canvas.top + el.y * zoom + (el.height * zoom) / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const startAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    setRotating({ id: el.id, centerX, centerY, startAngle });
  };

  const handleLabelDoubleClick = (id) => (e) => {
    e.stopPropagation();
    setEditingLabelId(id);
  };

  const handleLabelChange = (id) => (e) => {
    const val = e.target.value;
    setElements(prev => prev.map(el => el.id === id ? { ...el, content: val } : el));
  };

  const handleTriangleHandleMouseDown = (el, e) => {
    e.stopPropagation();
    const box = labelDivRefs.current[el.id]?.getBoundingClientRect();
    if (!box) return;
    const offsetX = e.clientX - box.left - (el.triangleOffset?.x || 0.5) * (el.width || 1);
    const offsetY = e.clientY - box.top - (el.triangleOffset?.y || 1) * (el.height || 1);
    setDraggingTriangle({ id: el.id, labelBox: box, offsetX, offsetY });
  };

  const handleMarkerMouseDown = (marker) => (e) => {
    e.stopPropagation();

    const isMulti = e.ctrlKey || e.metaKey;
    if (isMulti) {
      setSelectedMarkerIds(prev => toggleSetId(prev, marker.id));
      setSelectedElementIds(prev => new Set(prev));
      setSelectedPlacedProductIds(prev => new Set(prev));
      setSelectedId(marker.id);
      setSelectedPlacedProductId(null);
    } else {
      setSelectedMarkerIds(new Set([marker.id]));
      setSelectedElementIds(new Set());
      setSelectedPlacedProductIds(new Set());
      setSelectedId(marker.id);
      setSelectedPlacedProductId(null);
    }

    if (isMoveMode && !resizing && !rotating) {
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      setDraggingMarker({ id: marker.id, offsetX, offsetY });
    }
  };

  const finishEditingLabel = () => {
    setEditingLabelId(null);
    const updated = elements.map(el => ({ ...el }));
    if (mapId) {
      axios.put(`http://localhost:5000/maps/${mapId}`, { elements: updated, paths, widgets, canvasWidth: mapWidth, canvasHeight: mapHeight, name: mapName })
        .then(() => console.log("✅ Label + styles saved to MongoDB"))
        .catch(err => console.error("❌ Save error:", err));
    }
  };

  const renderResizeHandles = (el) => {
    if (!isMoveMode || !selectedElementIds.has(el.id)) return null;
    const size = 14;
    const corners = ['tl', 'tr', 'bl', 'br'];
    const edges = ['t', 'r', 'b', 'l'];
    const positions = {
      tl: { left: 0, top: 0, cursor: 'nwse-resize' },
      tr: { right: 0, top: 0, cursor: 'nesw-resize' },
      bl: { left: 0, bottom: 0, cursor: 'nesw-resize' },
      br: { right: 0, bottom: 0, cursor: 'nwse-resize' },
    };
    const edgePositions = {
      t: { top: 0, left: '50%', transform: 'translate(-50%,-50%)', cursor: 'ns-resize' },
      b: { bottom: 0, left: '50%', transform: 'translate(-50%,50%)', cursor: 'ns-resize' },
      l: { left: 0, top: '50%', transform: 'translate(-50%,-50%)', cursor: 'ew-resize' },
      r: { right: 0, top: '50%', transform: 'translate(50%,-50%)', cursor: 'ew-resize' },
    };
    return (
      <>
        {corners.map(corner => (
          <div key={corner}
            onMouseDown={handleResizeMouseDown(el, corner)}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              background: 'white',
              border: '2px solid #1f2937',
              boxSizing: 'border-box',
              ...positions[corner],
              zIndex: 10,
              cursor: positions[corner].cursor,
            }} />
        ))}
        {edges.map(edge => (
          <div key={edge}
            onMouseDown={handleResizeMouseDown(el, edge)}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              background: 'white',
              border: '2px solid #1f2937',
              boxSizing: 'border-box',
              ...edgePositions[edge],
              zIndex: 10,
            }} />
        ))}
      </>
    );
  };

  const renderRotateHandle = (el) => {
    if (!isMoveMode || !selectedElementIds.has(el.id)) return null;
    const size = 16;
    return (
      <div
        onMouseDown={handleRotateMouseDown(el)}
        style={{
          position: 'absolute',
          left: '50%',
          top: '-22px',
          transform: 'translateX(-50%)',
          width: size,
          height: size,
          background: '#ecfeff',
          borderRadius: '999px',
          border: '2px solid #0f172a',
          cursor: 'grab',
          zIndex: 20,
        }}
        title="Rotate"
      >
        <FaRedo size={10} style={{ color: '#0f172a', transform: 'rotate(-45deg)' }} />
      </div>
    );
  };

  const handlePartHandleMouseDown = (el, part) => (e) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const canvas = canvasRef.current.getBoundingClientRect();
    const boxLeft = canvas.left + el.x * zoom;
    const boxTop = canvas.top + el.y * zoom;
    const boxWidth = el.width * zoom;
    const boxHeight = el.height * zoom;
    setPartResizing({ id: el.id, part, boxLeft, boxTop, boxWidth, boxHeight });
  };

  const renderPartHandles = (el) => {
    if (!isMoveMode || !selectedElementIds.has(el.id)) return null;
    const width = el.width || 0;
    const height = el.height || 0;
    const handles = [];
    const pushHandle = (key, style) => handles.push(
      <div key={key} onMouseDown={handlePartHandleMouseDown(el, key)} style={{ position: 'absolute', width: 18, height: 18, background: '#1d4ed8', border: '2px solid #fff', borderRadius: '50%', cursor: 'grab', zIndex: 100, boxShadow: '0 0 6px rgba(29,78,216,0.5)', ...style }} />
    );
    if (['rectangle','shelf','rack','bubble','kiosk'].includes(el.type)) {
      const rpx = Math.round((el.cornerRadiusRatio || 0) * Math.min(width, height));
      pushHandle('cornerRadius', { left: Math.max(8, rpx), top: Math.max(8, rpx) });
    }
    if (el.type === 'lshape') {
      const xPos = (el.armWRatio || 0.33) * width;
      const yPos = (el.armHRatio || 0.33) * height;
      pushHandle('l_arm_w', { left: xPos - 9, top: 8 });
      pushHandle('l_arm_h', { left: 8, top: yPos - 9 });
    }
    if (el.type === 'ushape') {
      const gapW = el.uGapWidthRatio || 0.33;
      const leftEdge = width * ((1 - gapW) / 2);
      const rightEdge = width - leftEdge;
      const yPos = (el.uGapHeightRatio || 0.75) * height;
      pushHandle('u_gap_w', { left: rightEdge - 9, top: 8 });
      pushHandle('u_gap_h', { left: 8, top: yPos - 9 });
    }
    if (el.type === 'tshape') {
      const barY = (el.tBarHeightRatio || 0.33) * height;
      const stemW = el.tStemWidthRatio || 0.33;
      const leftEdge = width * ((1 - stemW) / 2);
      const rightEdge = width - leftEdge;
      pushHandle('t_bar_h', { left: 8, top: barY - 9 });
      pushHandle('t_stem_w', { left: rightEdge - 9, top: barY - 9 });
    }
    return handles.length ? <>{handles}</> : null;
  };
  const renderViewerLabelWithTriangle = (el) => {
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
      <>
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
          <path d={`${pathBox} ${pathTriangle}`} fill={el.color || "#fff8cc"} stroke="#6b7280" strokeWidth="1" strokeLinejoin="round" />
          <text
            x={width / 2}
            y={height / 2}
            fontSize={el.fontSize ?? 12}
            fontFamily={el.fontFamily || 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'}
            fill={el.fontColor || "#111827"}
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
            style={{ userSelect: "none", fontWeight: el.fontWeight || 'bold', fontStyle: el.fontStyle || 'normal', letterSpacing: '.1px' }}
          >
            {el.content}
          </text>
        </svg>
        {isMoveMode && selectedElementIds.has(el.id) && (
          <div
            onMouseDown={(e) => handleTriangleHandleMouseDown(el, e)}
            style={{
              position: 'absolute',
              left: (triangleOffset.x * width) - 6,
              top: (triangleOffset.y * height) - 6,
              width: 12,
              height: 12,
              background: '#1d4ed8',
              border: '2px solid #fff',
              borderRadius: '50%',
              cursor: 'grab',
              zIndex: 20
            }}
            title="Drag to move label arrow"
          />
        )}
      </>
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
    if (el.type === 'kiosk') {
      const kioskBase = el.color || '#1e40af';
      return {
        background: kioskBase,
        border: '3px solid #1e3a8a',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      };
    }
    if (el.type === 'door') {
      return {
        background: 'transparent',
        border: 'none'
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
    return { backgroundColor: el.color || '#d4a373', border: 'none' };
  };

  const renderElement = (el, i) => {
    const width = el.width || 0;
    const height = el.height || 0;

    if (el.type === 'label') {
      if (!showLabels) return null;
      return (
        <div
          key={`element-${i}`}
          ref={node => { labelDivRefs.current[el.id] = node; }}
          onMouseDown={handleShapeMouseDown(el)}
          onDoubleClick={handleLabelDoubleClick(el.id)}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width,
            height,
            transform: `rotate(${el.rotation || 0}deg)`,
            transformOrigin: 'center',
            pointerEvents: 'auto',
            cursor: isMoveMode ? 'grab' : 'pointer',
            zIndex: 2,
            outline: (partResizing?.id === el.id) ? '2px solid #2563eb' : (selectedElementIds.has(el.id) ? '2px solid #3b82f6' : 'none'),
          }}
          title={`Label: "${el.content || 'Label Text'}"`}
          onMouseEnter={(e) => {
            const canvas = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
            const elementScreenX = canvas.left + (el.x + width) * zoom + 15;
            const elementScreenY = canvas.top + el.y * zoom - 10;
            setHoveredElement({
              name: `Label: "${el.content || 'Label Text'}"`,
              dimensions: pixelsPerUnit ? `${(width/pixelsPerUnit).toFixed(1)} × ${(height/pixelsPerUnit).toFixed(1)} ${unitType}s` : `${Math.round(width)}×${Math.round(height)}px`
            });
            setHoveredElementPosition({ x: elementScreenX, y: elementScreenY });
          }}
          onMouseLeave={() => setHoveredElement(null)}
        >
          {editingLabelId === el.id ? (
            <textarea
              value={el.content}
              onChange={handleLabelChange(el.id)}
              onBlur={finishEditingLabel}
              style={{
                width: '100%',
                height: '100%',
                resize: 'none',
                border: '1px solid #94a3b8',
                borderRadius: 6,
                padding: 6,
                fontFamily: el.fontFamily || 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                fontSize: el.fontSize || 12,
                color: el.fontColor || '#111827',
                fontWeight: el.fontWeight || 'bold',
                fontStyle: el.fontStyle || 'normal',
                background: '#fffcdf',
                outline: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
              }}
              autoFocus
            />
          ) : (
            <>
              {renderViewerLabelWithTriangle(el)}
              {renderResizeHandles(el)}
              {renderRotateHandle(el)}
            </>
          )}
        </div>
      );
    }

    if (el.type === 'door') {
      return (
        <div
          key={`element-${i}`}
          onMouseDown={handleShapeMouseDown(el)}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width,
            height,
            transform: `rotate(${el.rotation || 0}deg)`,
            transformOrigin: 'center',
            zIndex: 1,
            pointerEvents: 'auto',
            cursor: isMoveMode ? 'grab' : 'pointer',
            outline: (selectedElementIds.has(el.id)) ? '2px solid #3b82f6' : 'none',
          }}
          title={`Door`}
          onMouseEnter={(e) => {
            const canvas = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
            const elementScreenX = canvas.left + (el.x + width) * zoom + 15;
            const elementScreenY = canvas.top + el.y * zoom - 10;
            setHoveredElement({
              name: 'Door',
              dimensions: pixelsPerUnit ? `${(width/pixelsPerUnit).toFixed(1)} × ${(height/pixelsPerUnit).toFixed(1)} ${unitType}s` : `${Math.round(width)}×${Math.round(height)}px`
            });
            setHoveredElementPosition({ x: elementScreenX, y: elementScreenY });
          }}
          onMouseLeave={() => setHoveredElement(null)}
        >
          <svg width={width} height={height} style={{ overflow: 'visible', pointerEvents: 'none' }} viewBox={`0 0 ${width} ${height}`}>
            {/* Swing Area Fill */}
            <path 
              d={`M ${width * 0.1},0 A ${width},${height} 0 0 1 ${width},${height} L ${width * 0.1},${height} Z`} 
              fill={el.color ? el.color + '33' : '#00000033'} 
              stroke="none"
            />
            {/* Door Leaf (Vertical on left) */}
            <rect x="0" y="0" width={width * 0.1} height={height} fill={el.color || "#000000"} stroke="#ffffff" strokeWidth="1" />
            {/* Door Swing Arc */}
            <path 
              d={`M ${width * 0.1},0 A ${width},${height} 0 0 1 ${width},${height}`} 
              fill="none" 
              stroke={el.color || "#000000"} 
              strokeWidth="1.5" 
              strokeDasharray="5,3"
            />
            {/* Threshold line (optional, keeps the door visually grounded) */}
            <line x1="0" y1={height} x2={width} y2={height} stroke={el.color || "#000000"} strokeWidth="2" opacity="0.5" />
          </svg>
          {renderResizeHandles(el)}
          {renderRotateHandle(el)}
        </div>
      );
    }

    if (['lshape', 'ushape', 'tshape'].includes(el.type)) {
      return (
        <div
          key={`element-${i}`}
          onMouseDown={handleShapeMouseDown(el)}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            width,
            height,
            transform: `rotate(${el.rotation || 0}deg)`,
            transformOrigin: 'center',
            zIndex: 1,
            pointerEvents: 'auto',
            cursor: isMoveMode ? 'grab' : 'pointer',
            outline: (partResizing?.id === el.id) ? '4px solid #2563eb' : (selectedElementIds.has(el.id) ? '2px solid #3b82f6' : 'none'),
            boxShadow: (partResizing?.id === el.id) ? '0 0 16px rgba(37, 99, 235, 0.9)' : 'none',
          }}
          title={`${el.type === 'lshape' ? 'L-Shape' : el.type === 'ushape' ? 'U-Shape' : 'T-Shape'} (${Math.round(width)}×${Math.round(height)}px)`}
          onMouseEnter={(e) => {
            const canvas = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
            const elementScreenX = canvas.left + (el.x + width) * zoom + 15;
            const elementScreenY = canvas.top + el.y * zoom - 10;
            setHoveredElement({
              name: el.type === 'lshape' ? 'L-Shape' : el.type === 'ushape' ? 'U-Shape' : 'T-Shape',
              dimensions: pixelsPerUnit ? `${(width/pixelsPerUnit).toFixed(1)} × ${(height/pixelsPerUnit).toFixed(1)} ${unitType}s` : `${Math.round(width)}×${Math.round(height)}px`
            });
            setHoveredElementPosition({ x: elementScreenX, y: elementScreenY });
          }}
          onMouseLeave={() => setHoveredElement(null)}
        >
          <svg width={width} height={height} style={{ overflow: 'visible', pointerEvents: 'none' }}>
            {el.type === 'lshape' && (
              <path
                d={`M0,0 V${height} H${width} V${height - height * (el.armHRatio ?? 0.33)} H${width * (el.armWRatio ?? 0.33)} V0 Z`}
                fill={el.color || "#d4a373"}
                stroke="none"
              />
            )}
            {el.type === 'ushape' && (() => {
              const gapW = el.uGapWidthRatio ?? 0.33;
              const leftEdge = width * ((1 - gapW) / 2);
              const rightEdge = width - leftEdge;
              const gapH = height * (el.uGapHeightRatio ?? 0.75);
              return (
                <path
                  d={`M0,0 V${height} H${width} V0 H${rightEdge} V${gapH} H${leftEdge} V0 Z`}
                  fill={el.color || "#d4a373"}
                  stroke="none"
                />
              );
            })()}
            {el.type === 'tshape' && (() => {
              const barH = height * (el.tBarHeightRatio ?? 0.33);
              const stemW = el.tStemWidthRatio ?? 0.33;
              const leftEdge = width * ((1 - stemW) / 2);
              const rightEdge = width - leftEdge;
              return (
                <path
                  d={`M0,0 H${width} V${barH} H${rightEdge} V${height} H${leftEdge} V${barH} H0 Z`}
                  fill={el.color || "#d4a373"}
                  stroke="none"
                />
              );
            })()}
          </svg>
          {renderResizeHandles(el)}
          {renderRotateHandle(el)}
          {renderPartHandles(el)}
        </div>
      );
    }

    return (
      <div
        key={`element-${i}`}
        onMouseDown={handleShapeMouseDown(el)}
        onDoubleClick={el.type === 'bubble' ? handleLabelDoubleClick(el.id) : undefined}
        onDrop={el.type === 'shelf' || el.type === 'rack' ? (e) => handleProductDropOnWidget(e, el.id) : undefined}
        onDragOver={el.type === 'shelf' || el.type === 'rack' ? (e) => {
          e.preventDefault();
          e.currentTarget.style.backgroundColor = '#e0f2fe';
          e.currentTarget.style.opacity = '0.8';
        } : undefined}
        onDragLeave={el.type === 'shelf' || el.type === 'rack' ? (e) => {
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.opacity = '';
        } : undefined}
        style={{
          position: 'absolute',
          left: el.x,
          top: el.y,
          width,
          height,
          transform: `rotate(${el.rotation || 0}deg)`,
          transformOrigin: 'center',
          zIndex: 1,
          pointerEvents: 'auto',
          cursor: isMoveMode ? 'grab' : 'pointer',
          ...getFurnitureStyle(el),
          borderRadius: Math.round((el.cornerRadiusRatio || 0) * Math.min(width, height)),
          outline: (partResizing?.id === el.id) ? '4px solid #2563eb' : (selectedElementIds.has(el.id) ? '2px solid #3b82f6' : 'none'),
          boxShadow: (partResizing?.id === el.id) ? '0 0 16px rgba(37, 99, 235, 0.9)' : 'none',
        }}
          title={`${el.type === 'rectangle' ? 'Rectangle' : el.type === 'lshape' ? 'L-Shape' : el.type === 'ushape' ? 'U-Shape' : el.type === 'tshape' ? 'T-Shape' : el.type === 'shelf' ? 'Shelf (Drag products here to place on shelves)' : el.type === 'rack' ? 'Rack (Drag products here to place on shelves)' : el.type === 'door' ? 'Door' : el.type === 'kiosk' ? 'Kiosk' : el.type?.toUpperCase()} (${Math.round(width)}×${Math.round(height)}px)`}
        onMouseEnter={(e) => {
          const canvas = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
          const elementScreenX = canvas.left + (el.x + width) * zoom + 15;
          const elementScreenY = canvas.top + el.y * zoom - 10;
          setHoveredElement({
            name: el.type === 'rectangle' ? 'Rectangle' : el.type === 'lshape' ? 'L-Shape' : el.type === 'ushape' ? 'U-Shape' : el.type === 'tshape' ? 'T-Shape' : el.type === 'shelf' ? 'Shelf' : el.type === 'rack' ? 'Rack' : el.type === 'door' ? 'Door' : el.type === 'kiosk' ? 'Kiosk' : el.type?.toUpperCase(),
            dimensions: pixelsPerUnit ? `${(width/pixelsPerUnit).toFixed(1)} × ${(height/pixelsPerUnit).toFixed(1)} ${unitType}s` : `${Math.round(width)}×${Math.round(height)}px`
          });
          setHoveredElementPosition({ x: elementScreenX, y: elementScreenY });
        }}
        onMouseLeave={() => setHoveredElement(null)}
      >
        {el.type === 'bubble' && (
          editingLabelId === el.id ? (
            <textarea
              value={el.content}
              onChange={handleLabelChange(el.id)}
              onBlur={finishEditingLabel}
              style={{
                width: '100%',
                height: '100%',
                resize: 'none',
                border: 'none',
                background: 'transparent',
                padding: 6,
                textAlign: 'center',
                fontFamily: el.fontFamily || 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                fontSize: el.fontSize || 12,
                color: el.fontColor || '#111827',
                fontWeight: el.fontWeight || 'normal',
                fontStyle: el.fontStyle || 'normal',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              autoFocus
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                textAlign: 'center',
                pointerEvents: 'none',
                fontFamily: el.fontFamily || 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                fontSize: el.fontSize || 12,
                color: el.fontColor || '#111827',
                fontWeight: el.fontWeight || 'normal',
                fontStyle: el.fontStyle || 'normal',
              }}
            >
              {el.content || 'Message...'}
            </div>
          )
        )}
        {el.type === 'kiosk' && (
          <div style={{ width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '4px' }}>
            {/* Screen */}
            <div style={{ 
              width: '90%', 
              height: '60%', 
              backgroundColor: '#0ea5e9', 
              borderRadius: '4px', 
              marginBottom: '4px',
              border: '2px solid #0284c7',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)'
            }} />
            {/* Base */}
            <div style={{ 
              width: '100%', 
              height: '30%', 
              backgroundColor: 'rgba(0,0,0,0.3)', 
              borderRadius: '0 0 6px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: '#fff'
            }}>
              <span style={{ opacity: 0.7 }}>KIOSK</span>
            </div>
          </div>
        )}
        {(el.type === 'entrance' || el.type === 'exit' || el.type === 'cashier') && (
          <div
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
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
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#ffffff' }}>
              {el.type === 'entrance' ? 'ENTRANCE' : el.type === 'exit' ? 'EXIT' : 'CASHIER'}
            </span>
          </div>
        )}
        {renderResizeHandles(el)}
        {renderRotateHandle(el)}
        {renderPartHandles(el)}
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
      title={`Widget: ${widget.content || widget.type || 'Unknown'}`}
    >
      {widget.type === 'text' ? (widget.content || 'TEXT') : (widget.content || `${widget.type || 'WIDGET'}`)}
    </div>
  );

  const handleDelete = () => {
    // Delete markers if selected
    if (selectedMarkerIds.size > 0) {
      const remainingMarkers = productMarkers.filter(m => !selectedMarkerIds.has(m.id));
      setProductMarkers(remainingMarkers);
    }
    // Delete placed dots if selected
    if (selectedPlacedProductIds.size > 0) {
      const remainingPlaced = placedProducts.filter(p => !selectedPlacedProductIds.has(p.id));
      setPlacedProducts(remainingPlaced);
    }
    // Delete elements if selected
    if (selectedElementIds.size > 0) {
      saveState(
        elements.filter(el => !selectedElementIds.has(el.id)),
        paths,
        widgets,
        productMarkers,
        placedProducts
      );
      setSelectedElementIds(new Set());
      setSelectedId(null);
      return;
    }

    // Fallback single delete by legacy selection
    if (selectedId) {
      const markerToDelete = productMarkers.find(marker => marker.id === selectedId);
      if (markerToDelete) {
        setProductMarkers(prev => prev.filter(marker => marker.id !== selectedId));
        setSelectedId(null);
        setHoveredMarker(prev => (prev && prev.id === selectedId ? null : prev));
        return;
      }
      saveState(elements.filter(el => el.id !== selectedId), paths, widgets, productMarkers, placedProducts);
      setSelectedId(null);
    }
  };

  const handleSaveToMongo = async (overrideName) => {
    const updated = elements.map(el => ({ ...el }));
    const finalName = (overrideName && overrideName.trim()) || mapName || 'Untitled Map';

    if (mapId) {
      try {
        await axios.put(`http://localhost:5000/maps/${mapId}`, {
          name: finalName,
          elements: updated,
          paths,
          widgets,
          placedProducts,
          productMarkers,
          canvasWidth: mapWidth,
          canvasHeight: mapHeight,
          branch: localStorage.getItem('currentBranch')
        });
        try {
          localStorage.setItem('kioskMapId', mapId);
        } catch (e) {}
        try {
          await axios.patch(`http://localhost:5000/maps/${mapId}/set-kiosk`);
        } catch (err) {
          console.warn('Failed to mark map as kiosk from editor:', err);
        }
        Swal.fire({
          icon: 'success',
          title: 'Map Saved',
          text: 'Map updated and saved to MongoDB!',
          confirmButtonColor: '#16a34a',
          background: '#f8fafc'
        });
        setIsDirty(false);
      } catch (error) {
        const serverMessage =
          (error.response && error.response.data && (error.response.data.message || error.response.data.error)) ||
          error.message ||
          'Error updating map.';
        console.error('Error updating map:', error.response || error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: serverMessage,
          confirmButtonColor: '#dc2626',
          background: '#fef2f2'
        });
      }
    } else {
      const name = finalName;
      const branch = localStorage.getItem('currentBranch');
      try {
        let markAsKiosk = false;
        try {
          const mapsRes = await axios.get('http://localhost:5000/maps', {
            params: { branch }
          });
          const maps = Array.isArray(mapsRes.data) ? mapsRes.data : [];
          markAsKiosk = !maps.some(m => m.isKioskMap);
        } catch (innerErr) {
          console.warn('Could not check existing kiosk maps before save:', innerErr);
        }

        const response = await axios.post('http://localhost:5000/maps', {
          name,
          elements: updated,
          paths,
          widgets,
          placedProducts,
          productMarkers,
          canvasWidth: mapWidth,
          canvasHeight: mapHeight,
          branch,
          isKioskMap: markAsKiosk
        });
        Swal.fire({
          icon: 'success',
          title: 'Map Saved',
          text: 'New map saved to MongoDB!',
          confirmButtonColor: '#16a34a',
          background: '#f8fafc'
        });
        setIsDirty(false);
        if (response.data && response.data._id) {
          const newId = response.data._id;
          try {
            try {
              localStorage.setItem('kioskMapId', newId);
            } catch (e) {}
            await axios.patch(`http://localhost:5000/maps/${newId}/set-kiosk`);
          } catch (err) {
            console.warn('Failed to mark new map as kiosk from editor:', err);
          }
          window.history.replaceState(null, '', `/map2?id=${newId}`);
        }
      } catch (error) {
        const serverMessage =
          (error.response && error.response.data && (error.response.data.message || error.response.data.error)) ||
          error.message ||
          'Error saving new map.';
        console.error('Error saving new map:', error.response || error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: serverMessage,
          confirmButtonColor: '#dc2626',
          background: '#fef2f2'
        });
      }
    }
  };

  const handleSaveWithPrompt = async () => {
    try {
      const { value, isConfirmed } = await Swal.fire({
        title: mapId ? 'Update Map' : 'Save Map',
        input: 'text',
        inputLabel: 'Map Name',
        inputValue: mapName || 'Untitled Map',
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#9ca3af',
        background: '#f8fafc',
        inputValidator: (val) => {
          if (!val || !val.trim()) {
            return 'Please enter a map name';
          }
          return undefined;
        }
      });

      if (!isConfirmed) return;

      const trimmed = value.trim();
      setMapName(trimmed);
      await handleSaveToMongo(trimmed);
    } catch (err) {
      console.error('Error during save dialog:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Something went wrong while saving the map.',
        confirmButtonColor: '#dc2626',
        background: '#fef2f2'
      });
    }
  };

  // Map name handling + initial load
  useEffect(() => {
    if (mapId) {
      axios.get(`http://localhost:5000/maps/${mapId}`)
        .then(res => {
          setMapName(res.data.name || '');
          const fixedElements = (res.data.elements || []).map(el => ({
            ...el,
            id: String(el.id),
            fontSize: el.fontSize || (el.type === 'label' ? 12 : (el.type === 'bubble' ? 12 : undefined)),
            fontFamily: el.fontFamily || ((el.type === 'label' || el.type === 'bubble') ? 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' : undefined),
            fontColor: el.fontColor || ((el.type === 'label' || el.type === 'bubble') ? '#111827' : undefined),
            fontWeight: el.fontWeight || (el.type === 'label' ? 'bold' : undefined),
            fontStyle: el.fontStyle || (el.type === 'label' ? 'normal' : undefined),
            triangleOffset: el.triangleOffset || (el.type === 'label' ? { x: 0.5, y: 1 } : undefined)
          }));
          setElements(fixedElements);
          setPaths(res.data.paths || []);
          setWidgets(res.data.widgets || []);
          setPlacedProducts(res.data.placedProducts || []);
          // Update markers with current stock information
          const updatedMarkers = (res.data.productMarkers || []).map(marker => {
            const product = products.find(p => p._id === marker.productId);
            if (product) {
              // Calculate total stock
              let totalStock = 0;
              if (typeof product.totalStock === 'number' && product.totalStock >= 0) {
                totalStock = product.totalStock;
              } else {
                if (Array.isArray(product.sizeColorQuantities)) totalStock += product.sizeColorQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
                if (Array.isArray(product.colorQuantities)) totalStock += product.colorQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
                if (Array.isArray(product.sizeQuantities)) totalStock += product.sizeQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
                if (Array.isArray(product.brandUnitQuantities)) totalStock += product.brandUnitQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
                if (Array.isArray(product.brandQuantities)) totalStock += product.brandQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
                if (Array.isArray(product.unitQuantities)) totalStock += product.unitQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
                if (typeof product.stockQty === 'number') totalStock += product.stockQty;
              }

              // Calculate how many are currently on shelves
              const onShelves = (res.data.placedProducts || []).filter(p => p.productId === marker.productId).length;

              return {
                ...marker,
                totalStock: totalStock,
                onShelves: onShelves
              };
            }
            return marker;
          });
          setProductMarkers(updatedMarkers);
          const w = parseInt(res.data.canvasWidth || 3000, 10);
          const h = parseInt(res.data.canvasHeight || 3000, 10);
          const finalW = Number.isFinite(w) ? w : 3000;
          const finalH = Number.isFinite(h) ? h : 3000;
          setMapWidth(finalW);
          setMapHeight(finalH);
          setMapWidthInput(String(finalW));
          setMapHeightInput(String(finalH));
          setStoreWidthUnits((finalW / pixelsPerUnit).toFixed(1));
          setStoreHeightUnits((finalH / pixelsPerUnit).toFixed(1));
          setStoreSizeDefined(true);
        })
        .catch(err => console.error('❌ Failed to load map from DB:', err));
    }
  }, [mapId]);

  // Update marker stock information when products or placedProducts change
  useEffect(() => {
    if (productMarkers.length > 0 && products.length > 0) {
      const updatedMarkers = productMarkers.map(marker => {
        const product = products.find(p => p._id === marker.productId);
        if (product) {
          // Calculate total stock
          let totalStock = 0;
          if (typeof product.totalStock === 'number' && product.totalStock >= 0) {
            totalStock = product.totalStock;
          } else {
            if (Array.isArray(product.sizeColorQuantities)) totalStock += product.sizeColorQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
            if (Array.isArray(product.colorQuantities)) totalStock += product.colorQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
            if (Array.isArray(product.sizeQuantities)) totalStock += product.sizeQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
            if (Array.isArray(product.brandUnitQuantities)) totalStock += product.brandUnitQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
            if (Array.isArray(product.brandQuantities)) totalStock += product.brandQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
            if (Array.isArray(product.unitQuantities)) totalStock += product.unitQuantities.reduce((s, v) => s + (v.quantity || 0), 0);
            if (typeof product.stockQty === 'number') totalStock += product.stockQty;
          }

          // Calculate how many are currently on shelves
          const onShelves = placedProducts.filter(p => p.productId === marker.productId).length;

          return {
            ...marker,
            totalStock: totalStock,
            onShelves: onShelves
          };
        }
        return marker;
      });
      setProductMarkers(updatedMarkers);
    }
  }, [products, placedProducts]);

  const handleMapNameSave = async () => {
    if (!mapName.trim()) {
      alert('Please enter a map name.');
      return;
    }

    setMapNameLoading(true);
    try {
      const payload = {
        name: mapName,
        elements,
        paths,
        widgets,
        placedProducts,
        productMarkers,
        canvasWidth: mapWidth,
        canvasHeight: mapHeight,
        branch: localStorage.getItem('currentBranch')
      };

      if (mapId) {
        await axios.put(`http://localhost:5000/maps/${mapId}`, payload);
        alert('✅ Map name updated and saved!');
      } else {
        const response = await axios.post('http://localhost:5000/maps', payload);
        alert('✅ New map saved successfully!');
        
        // Use navigate to update the URL with the new ID WITHOUT full page reload
        // This prevents the App.jsx from re-checking auth/redirecting to login
        if (response.data && response.data._id) {
          const newId = response.data._id;
          // Update URL silently
          window.history.replaceState(null, '', `/map2?id=${newId}`);
          // Force a state refresh if needed or just continue since we are already in the editor
          // We don't want to use navigate() because even that might trigger App.jsx's Route checks
        }
      }
      setEditingMapName(false);
    } catch (err) {
      console.error(err);
      alert('❌ Error saving map.');
    } finally {
      setMapNameLoading(false);
    }
  };

  useEffect(() => {
    const selected = elements.find(el => el.id === selectedId && el.type === 'label');
    if (!selected) setShowLabelTools(false);
  }, [selectedId, elements]);

  useEffect(() => {
    if (hoveredMarker && !productMarkers.some(m => m.id === hoveredMarker.id)) setHoveredMarker(null);
  }, [productMarkers, hoveredMarker]);

  useEffect(() => {
    if (!showProductDots && hoveredMarker) setHoveredMarker(null);
  }, [showProductDots, hoveredMarker]);

  // Consolidated Keyboard Shortcuts
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    function onKeyDown(e) {
      // If typing in an input or textarea, don't trigger shortcuts unless it's Ctrl+S
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // Special case: Ctrl+S should always work to save
      if (ctrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveWithPrompt();
        return;
      }

      // Other shortcuts only work if not typing
      if (isInput || editingLabelId || editingMapName) return;

      if (ctrlOrCmd && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? handleRedo() : handleUndo(); return; }
      if (ctrlOrCmd && e.key.toLowerCase() === 'y') { e.preventDefault(); handleRedo(); return; }
      if (ctrlOrCmd && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (selectedElementIds.size > 0) {
          const copies = elements.filter(el => selectedElementIds.has(el.id)).map(el => ({ ...el, id: Date.now().toString() + Math.random().toString(36).slice(2), x: el.x + 20, y: el.y + 20 }));
          saveState([...elements, ...copies], paths, widgets, productMarkers, placedProducts);
          setSelectedElementIds(new Set(copies.map(c => c.id)));
          setSelectedId(copies[copies.length - 1]?.id || null);
        } else if (selectedId) {
          const elementToCopy = elements.find(el => el.id === selectedId);
          if (elementToCopy) {
            const newElement = { ...elementToCopy, id: Date.now().toString(), x: elementToCopy.x + 20, y: elementToCopy.y + 20 };
            saveState([...elements, newElement], paths, widgets, productMarkers, placedProducts);
            setSelectedId(newElement.id);
            setSelectedElementIds(new Set([newElement.id]));
          }
        }
        return;
      }
      if (e.key === 'Delete') { e.preventDefault(); handleDelete(); return; }
      if (e.key.toLowerCase() === 'm' && !ctrlOrCmd && !e.altKey) { e.preventDefault(); setIsMoveMode(m => !m); setSelectedId(null); setEditingLabelId(null); return; }
      if (e.key.toLowerCase() === 'g' && !ctrlOrCmd && !e.altKey) { e.preventDefault(); setShowGrid(g => !g); return; }
      if (e.key.toLowerCase() === 'p' && !ctrlOrCmd && !e.altKey) { e.preventDefault(); handleInventoryClick(); return; }
      if (e.key.toLowerCase() === 'd' && !ctrlOrCmd && !e.altKey) { e.preventDefault(); setShowProductDots(d => !d); return; }
      if ((e.key === '+' || e.key === '=') && !ctrlOrCmd && !e.altKey) { e.preventDefault(); setZoom(z => Math.min(z + 0.1, 2)); return; }
      if (e.key === '-' && !ctrlOrCmd && !e.altKey) { e.preventDefault(); setZoom(z => Math.max(z - 0.1, 0.5)); return; }

      if ((e.key === '[' || e.key === ']') && !ctrlOrCmd && !e.altKey) {
        const delta = e.key === ']' ? 2 : -2;
        if (selectedPlacedProductId) {
          setPlacedProducts(prev => prev.map(p => p.id === selectedPlacedProductId ? { ...p, size: Math.max(0, (p.size || 12) + delta) } : p));
          return;
        }
        if (selectedId) {
          setProductMarkers(prev => prev.map(m => m.id === selectedId ? { ...m, size: Math.max(0, (m.size || 40) + delta) } : m));
          return;
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, selectedPlacedProductId, selectedElementIds, elements, paths, widgets, editingLabelId, editingMapName, history, future, isMoveMode, showGrid, zoom, showProductDots, handleSaveToMongo, handleDelete, handleUndo, handleRedo, setIsMoveMode, setShowGrid, setShowProductDots, setZoom]);

  useEffect(() => {
    function onKeyDownSpace(e) {
      const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      if (e.code === 'Space') {
        if (isInput || editingLabelId || editingMapName) return;
        e.preventDefault();
        spacePressedRef.current = true;
        setIsSpacePanning(true);
      }
    }
    function onKeyUpSpace(e) {
      if (e.code === 'Space') {
        spacePressedRef.current = false;
        setIsSpacePanning(false);
      }
    }
    window.addEventListener('keydown', onKeyDownSpace);
    window.addEventListener('keyup', onKeyUpSpace);
    return () => {
      window.removeEventListener('keydown', onKeyDownSpace);
      window.removeEventListener('keyup', onKeyUpSpace);
    };
  }, [editingLabelId, editingMapName]);

  useEffect(() => {
    const fitCanvas = () => {
      if (!containerRef.current) return;
      if (mapWidth <= 0 || mapHeight <= 0) return;

      const rect = containerRef.current.getBoundingClientRect();

      const innerPadding = 24;
      const availableWidth = rect.width - innerPadding * 2;
      const availableHeight = rect.height - innerPadding * 2;
      if (availableWidth <= 0 || availableHeight <= 0) return;

      const scaleX = availableWidth / mapWidth;
      const scaleY = availableHeight / mapHeight;
      const nextZoom = Math.max(0.1, Math.min(scaleX, scaleY));

      const totalWidth = mapWidth * nextZoom;
      const totalHeight = mapHeight * nextZoom;

      const offsetX = (rect.width - totalWidth) / 2;
      const offsetY = (rect.height - totalHeight) / 2;

      setZoom(nextZoom);
      setPan({ x: offsetX, y: offsetY });
    };

    fitCanvas();
    const handleResize = () => fitCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mapWidth, mapHeight]);

  const handleWheel = (e) => {
    if (!containerRef.current) return;
    if (sidebarRef.current && sidebarRef.current.contains(e.target)) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!isCanvasHovered) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
    setZoom(prevZoom => {
      const safePrev = prevZoom || 1;
      const nextZoom = Math.max(0.1, Math.min(safePrev * zoomFactor, 4));
      setPan(prevPan => {
        const scaleRatio = nextZoom / safePrev;
        const offsetToCursorX = cx - prevPan.x;
        const offsetToCursorY = cy - prevPan.y;
        const newOffsetX = offsetToCursorX * scaleRatio;
        const newOffsetY = offsetToCursorY * scaleRatio;
        return {
          x: cx - newOffsetX,
          y: cy - newOffsetY
        };
      });
      return nextZoom;
    });
  };

  const shortcutLabel = (label, shortcut) => (
    <span style={{ fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', fontSize: 11 }}>
      {label}
      <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 6, fontWeight: 600 }}>{shortcut}</span>
    </span>
  );

  const renderSidebarIcon = (shape) => {
    if (shape === 'square') {
      return (
        <svg width="40" height="40">
          <rect x="5" y="5" width="30" height="30" fill="#000000" />
        </svg>
      );
    }
    if (shape === 'lshape') {
      return (
        <svg width="40" height="40">
          <path d="M0,0 V40 H40 V27 H13 V0 Z" fill="#000000" transform="translate(5,5) scale(0.75)" />
        </svg>
      );
    }
    if (shape === 'ushape') {
      return (
        <svg width="40" height="40">
          <path d="M0,0 V40 H40 V0 H27 V30 H13 V0 Z" fill="#000000" transform="translate(5,5) scale(0.75)" />
        </svg>
      );
    }
    if (shape === 'tshape') {
      return (
        <svg width="40" height="40">
          <path d="M0,0 H40 V13 H27 V40 H13 V13 H0 Z" fill="#000000" transform="translate(5,5) scale(0.75)" />
        </svg>
      );
    }
    if (shape === 'shelf') return 'SHELF';
    if (shape === 'rack') return 'RACK';
    if (shape === 'label') return 'LABEL';
    if (shape === 'kiosk') return 'KIOSK';
    if (shape === 'bubble') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="32" height="20" viewBox="0 0 32 20">
            <rect x="2" y="4" width="24" height="12" rx="4" fill="#e0f2fe" stroke="#0284c7" />
            <circle cx="8" cy="10" r="1" fill="#0f172a" />
            <circle cx="12" cy="10" r="1" fill="#0f172a" />
            <circle cx="16" cy="10" r="1" fill="#0f172a" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>TEXT</span>
        </div>
      );
    }
    if (shape === 'entrance') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="32" height="20" viewBox="0 0 32 20">
            <rect x="2" y="4" width="20" height="12" fill="#10b981" />
            <path d="M24 10 L30 4 M24 10 L30 16" stroke="#10b981" strokeWidth="2" fill="none" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>ENTRANCE</span>
        </div>
      );
    }
    if (shape === 'exit') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="32" height="20" viewBox="0 0 32 20">
            <rect x="10" y="4" width="20" height="12" fill="#ef4444" />
            <path d="M2 10 L8 4 M2 10 L8 16" stroke="#ef4444" strokeWidth="2" fill="none" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>EXIT</span>
        </div>
      );
    }
    if (shape === 'cashier') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="32" height="20" viewBox="0 0 32 20">
            <rect x="6" y="6" width="8" height="5" fill="#0f172a" />
            <circle cx="22" cy="8" r="2" fill="#facc15" />
            <line x1="2" y1="15" x2="30" y2="15" stroke="#9ca3af" strokeWidth="2" />
          </svg>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>CASHIER</span>
        </div>
      );
    }
    if (shape === 'promo') return 'PROMO';
    return shape.toUpperCase();
  };

  // Label helpers
  const applyLabelFontSize = (size) => {
    if (!selectedId) return;
    setElements(prev => prev.map(el => el.id === selectedId && el.type === 'label' ? { ...el, fontSize: size } : el));
  };
  const applyLabelFontColor = (color) => {
    if (!selectedId) return;
    setElements(prev => prev.map(el => el.id === selectedId && el.type === 'label' ? { ...el, fontColor: color } : el));
  };

  // Element color
  const applyElementColor = (color) => {
    if (selectedElementIds.size === 0) return;
    setElements(prev => prev.map(el => selectedElementIds.has(el.id) ? { ...el, color } : el));
  };
  const applyElementColorToAll = () => {
    // Take color of a selected element and apply to all elements
    const anySelected = elements.find(el => selectedElementIds.has(el.id));
    const color = anySelected?.color || '#d4a373';
    setElements(prev => prev.map(el => ({ ...el, color })));
  };

  // Map size actions
  const handleApplyMapSize = async () => {
    if (mapId) {
      await axios.put(`http://localhost:5000/maps/${mapId}`, {
        name: mapName,
        elements,
        paths,
        widgets,
        placedProducts,
        productMarkers,
        canvasWidth: mapWidth,
        canvasHeight: mapHeight
      });
    }
  };
  const handleFitToKiosk = async () => {
    setMapWidth(1000);
    setMapHeight(1000);
    await handleApplyMapSize();
  };
  const handleApplyPreset = async (preset) => {
    if (!preset) return;
    setMapWidth(preset.width);
    setMapHeight(preset.height);
    await handleApplyMapSize();
  };

  // Red dot sizes
  const applyDotSize = (n) => {
    if (selectedPlacedProductId) {
      setPlacedProducts(prev => prev.map(p => p.id === selectedPlacedProductId ? { ...p, size: n } : p));
      return;
    }
    if (selectedId) {
      setProductMarkers(prev => prev.map(m => m.id === selectedId ? { ...m, size: n } : m));
      return;
    }
    // If multi-selected markers
    if (selectedMarkerIds.size > 0) {
      setProductMarkers(prev => prev.map(m => selectedMarkerIds.has(m.id) ? { ...m, size: n } : m));
    }
    if (selectedPlacedProductIds.size > 0) {
      setPlacedProducts(prev => prev.map(p => selectedPlacedProductIds.has(p.id) ? { ...p, size: n } : p));
    }
  };

  const applyDotSizeToAll = () => {
    // If a marker is selected, apply to all markers
    const anyMarker = selectedId && productMarkers.some(m => m.id === selectedId);
    const anyPlaced = selectedPlacedProductId && placedProducts.some(p => p.id === selectedPlacedProductId);

    if (anyMarker) {
      const size = productMarkers.find(m => m.id === selectedId)?.size ?? 0;
      setProductMarkers(prev => prev.map(m => ({ ...m, size })));
      return;
    }
    if (anyPlaced) {
      const size = placedProducts.find(p => p.id === selectedPlacedProductId)?.size ?? 0;
      setPlacedProducts(prev => prev.map(p => ({ ...p, size })));
      return;
    }
    // If multiple selected, take first
    if (selectedMarkerIds.size > 0) {
      const firstId = selectedMarkerIds.values().next().value;
      const size = productMarkers.find(m => m.id === firstId)?.size ?? 0;
      setProductMarkers(prev => prev.map(m => ({ ...m, size })));
    }
    if (selectedPlacedProductIds.size > 0) {
      const firstId = selectedPlacedProductIds.values().next().value;
      const size = placedProducts.find(p => p.id === firstId)?.size ?? 0;
      setPlacedProducts(prev => prev.map(p => ({ ...p, size })));
    }
  };

  // Selection helpers
  const normalizeRect = (r) => {
    if (!r) return null;
    const x = r.w >= 0 ? r.x : r.x + r.w;
    const y = r.h >= 0 ? r.y : r.y + r.h;
    const w = Math.abs(r.w);
    const h = Math.abs(r.h);
    return { x, y, w, h };
  };

  const rectIntersects = (ax, ay, aw, ah, bx, by, bw, bh) => {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  };

  const getGroupBounds = () => {
    const selectedEls = elements.filter(el => selectedElementIds.has(el.id));
    const selectedMs = productMarkers.filter(m => selectedMarkerIds.has(m.id));
    const selectedPs = placedProducts.filter(p => selectedPlacedProductIds.has(p.id));

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    selectedEls.forEach(el => {
      const x = el.x;
      const y = el.y;
      const w = el.width || 0;
      const h = el.height || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    selectedMs.forEach(m => {
      const x = m.x;
      const y = m.y;
      const s = m.size || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + s);
      maxY = Math.max(maxY, y + s);
    });

    selectedPs.forEach(p => {
      const widget = elements.find(el => el.id === p.widgetId);
      const wx = widget?.x ?? 0;
      const wy = widget?.y ?? 0;
      const s = p.size ?? 0;
      const x = wx + p.x;
      const y = wy + p.y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + s);
      maxY = Math.max(maxY, y + s);
    });

    if (minX === Infinity) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  };

  const finalizeSelection = () => {
    const r = normalizeRect(selectionRect);
    if (!r) return;
    // Select elements
    const selEls = elements.filter(el => {
      const bx = el.x, by = el.y, bw = el.width || 0, bh = el.height || 0;
      return rectIntersects(r.x, r.y, r.w, r.h, bx, by, bw, bh);
    }).map(el => el.id);

    // Select markers
    const selMarkers = productMarkers.filter(m => {
      const bx = m.x, by = m.y, bs = m.size || 0;
      return rectIntersects(r.x, r.y, r.w, r.h, bx, by, bs, bs);
    }).map(m => m.id);

    // Select placed dots (relative to widget)
    const selPlaced = placedProducts.filter(p => {
      const widget = elements.find(el => el.id === p.widgetId);
      const wx = widget?.x ?? 0;
      const wy = widget?.y ?? 0;
      const bx = wx + p.x;
      const by = wy + p.y;
      const bs = p.size || 0;
      return rectIntersects(r.x, r.y, r.w, r.h, bx, by, bs, bs);
    }).map(p => p.id);

    setSelectedElementIds(new Set(selEls));
    setSelectedMarkerIds(new Set(selMarkers));
    setSelectedPlacedProductIds(new Set(selPlaced));
    setSelectedId(null);
    setSelectedPlacedProductId(null);
  };

  const startGroupDrag = (e) => {
    if (!canvasRef.current) return;
    const elementSnapshot = new Map();
    const markerSnapshot = new Map();
    const placedSnapshot = new Map();

    elements.forEach(el => { if (selectedElementIds.has(el.id)) elementSnapshot.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height }); });
    productMarkers.forEach(m => { if (selectedMarkerIds.has(m.id)) markerSnapshot.set(m.id, { x: m.x, y: m.y, size: m.size ?? 0 }); });
    placedProducts.forEach(p => { if (selectedPlacedProductIds.has(p.id)) placedSnapshot.set(p.id, { x: p.x, y: p.y, size: p.size ?? 0 }); });

    setDraggingGroup({
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      elementSnapshot,
      markerSnapshot,
      placedSnapshot
    });
  };

  const handleGroupResizeMouseDown = (corner) => (e) => {
    e.stopPropagation();
    const bounds = getGroupBounds();
    if (!bounds) return;

    const elementSnapshot = new Map();
    const markerSnapshot = new Map();
    const placedSnapshot = new Map();

    elements.forEach(el => { if (selectedElementIds.has(el.id)) elementSnapshot.set(el.id, { x: el.x, y: el.y, width: el.width, height: el.height }); });
    productMarkers.forEach(m => { if (selectedMarkerIds.has(m.id)) markerSnapshot.set(m.id, { x: m.x, y: m.y, size: m.size ?? 0 }); });
    placedProducts.forEach(p => { if (selectedPlacedProductIds.has(p.id)) placedSnapshot.set(p.id, { x: p.x, y: p.y, size: p.size ?? 0 }); });

    // Anchor point opposite the corner
    let anchorX = bounds.x, anchorY = bounds.y;
    if (corner === 'tl') { anchorX = bounds.x + bounds.w; anchorY = bounds.y + bounds.h; }
    if (corner === 'tr') { anchorX = bounds.x; anchorY = bounds.y + bounds.h; }
    if (corner === 'bl') { anchorX = bounds.x + bounds.w; anchorY = bounds.y; }
    if (corner === 'br') { anchorX = bounds.x; anchorY = bounds.y; }
    if (corner === 't')  { anchorX = bounds.x + bounds.w / 2; anchorY = bounds.y + bounds.h; }
    if (corner === 'b')  { anchorX = bounds.x + bounds.w / 2; anchorY = bounds.y; }
    if (corner === 'l')  { anchorX = bounds.x + bounds.w; anchorY = bounds.y + bounds.h / 2; }
    if (corner === 'r')  { anchorX = bounds.x; anchorY = bounds.y + bounds.h / 2; }

    setResizingGroup({
      corner,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      initialBounds: bounds,
      elementSnapshot,
      markerSnapshot,
      placedSnapshot,
      anchorX,
      anchorY
    });
  };

  const labelSelected = elements.find(el => selectedElementIds.has(el.id) && el.type === 'label');
  const anyElementSelected = elements.find(el => selectedElementIds.has(el.id) && el.type !== 'label');
  const currentFontSize = labelSelected ? (labelSelected.fontSize ?? 12) : 12;
  const currentFontFamily = labelSelected ? (labelSelected.fontFamily || 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif') : 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  const currentFontColor = labelSelected ? (labelSelected.fontColor || '#111827') : '#111827';
  const currentFontWeight = labelSelected ? (labelSelected.fontWeight || (labelSelected.type === 'label' ? 'bold' : 'normal')) : 'normal';
  const currentFontStyle = labelSelected ? (labelSelected.fontStyle || 'normal') : 'normal';
  const currentElementColor = anyElementSelected ? (anyElementSelected.color || '#d4a373') : '#d4a373';

  const dotValue = (() => {
    if (selectedPlacedProductId) return placedProducts.find(p => p.id === selectedPlacedProductId)?.size ?? 0;
    if (selectedId) return productMarkers.find(m => m.id === selectedId)?.size ?? 0;
    if (selectedMarkerIds.size > 0) {
      const firstId = selectedMarkerIds.values().next().value;
      return productMarkers.find(m => m.id === firstId)?.size ?? 0;
    }
    if (selectedPlacedProductIds.size > 0) {
      const firstId = selectedPlacedProductIds.values().next().value;
      return placedProducts.find(p => p.id === firstId)?.size ?? 0;
    }
    return 0;
  })();
  const dotDisabled = (selectedMarkerIds.size + selectedPlacedProductIds.size + (selectedId ? 1 : 0) + (selectedPlacedProductId ? 1 : 0)) === 0;

  const [sidebarOffset, setSidebarOffset] = useState(120);

  useEffect(() => {
    const updateSidebarOffset = () => {
      if (suppressOffsetRef.current) return;
      if (!editorRef.current || !headerRef.current) return;

      const editorRect = editorRef.current.getBoundingClientRect();
      const headerRect = headerRef.current.getBoundingClientRect();

      const raw = headerRect.bottom - editorRect.top;
      if (!Number.isFinite(raw)) return;
      const offset = Math.max(0, Math.round(raw));
      if (Math.abs(offset - (lastSidebarOffsetRef.current || 0)) >= 1) {
        lastSidebarOffsetRef.current = offset;
        setSidebarOffset(offset);
      }
    };

    updateSidebarOffset();
    window.addEventListener('resize', updateSidebarOffset);
    return () => window.removeEventListener('resize', updateSidebarOffset);
  }, [showRibbon]);

  useEffect(() => {
    const update = () => {
      if (suppressOffsetRef.current) return;
      if (!editorRef.current || !headerRef.current) return;
      const editorRect = editorRef.current.getBoundingClientRect();
      const headerRect = headerRef.current.getBoundingClientRect();
      const raw = headerRect.bottom - editorRect.top;
      if (!Number.isFinite(raw)) return;
      const offset = Math.max(0, Math.round(raw));
      if (Math.abs(offset - (lastSidebarOffsetRef.current || 0)) >= 1) {
        lastSidebarOffsetRef.current = offset;
        setSidebarOffset(offset);
      }
    };
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      if (headerRef.current) ro.observe(headerRef.current);
    } else {
      const id = setInterval(update, 200);
      return () => clearInterval(id);
    }
    update();
    return () => {
      if (ro) ro.disconnect();
    };
  }, []);

  // --- Navigation Protection ---
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Do you want to save them before leaving?',
        icon: 'warning',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Save & Exit',
        denyButtonText: "Don't Save",
        cancelButtonText: 'Stay Here',
        confirmButtonColor: '#16a34a',
        denyButtonColor: '#dc2626',
        cancelButtonColor: '#9ca3af',
        background: '#f8fafc',
      }).then(async (result) => {
        if (result.isConfirmed) {
          // Save and exit
          await handleSaveToMongo();
          blocker.proceed();
        } else if (result.isDenied) {
          // Exit without saving
          blocker.proceed();
        } else {
          // Stay
          blocker.reset();
        }
      });
    }
  }, [blocker, isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const hasSelection = (selectedElementIds.size + selectedMarkerIds.size + selectedPlacedProductIds.size) > 0;
  const sidebarTop = sidebarOffset + 64;
  const hasMapSize = Number.isFinite(mapWidth) && Number.isFinite(mapHeight) && mapWidth > 0 && mapHeight > 0;
  const storeSizeTextPx = hasMapSize ? `${mapWidth} × ${mapHeight} px` : '';
  const storeSizeTextUnits = hasMapSize && pixelsPerUnit
    ? `${(mapWidth / pixelsPerUnit).toFixed(1)} × ${(mapHeight / pixelsPerUnit).toFixed(1)} meters`
    : '';
  const gridSize = pixelsPerUnit || 30;

  const filteredProductsInCategory = products.filter((p) => {
    if (!selectedCategory) return false;
    const productCategory = (p.category || '').toLowerCase().trim();
    const categoryName = (selectedCategory.name || '').toLowerCase().trim();
    if (productCategory !== categoryName) return false;
    const search = productSearch.trim().toLowerCase();
    if (!search) return true;
    return (
      (p.name || '').toLowerCase().includes(search) ||
      (p.brand || '').toLowerCase().includes(search) ||
      (p.sku || '').toLowerCase().includes(search)
    );
  });

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        color: '#111827',
        letterSpacing: '.05px',
        fontSize: 12
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      ref={editorRef}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
            50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.4); }
          }
          
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          
          .ribbon-button:hover {
            animation: pulse 0.3s ease;
          }
          
          .tool-item:hover {
            animation: pulse 0.2s ease;
          }
          
          .selected-element {
            animation: glow 1.5s ease-in-out infinite;
          }
        `}
      </style>
      {/* Compact Ribbon Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderBottom: '1px solid #e1e5e9', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', backdropFilter: 'blur(8px)' }}>
        <div ref={headerRef} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 12, fontSize: 13 }}>
          <div onClick={(e) => { e.stopPropagation(); navigate(-1); }}
            style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)';
              e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
              e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <FaArrowLeft size={18} color="#374151" />
          </div>

          {/* Map Name */}
          <div 
            onClick={() => !editingMapName && setEditingMapName(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              border: editingMapName ? '1px solid #3b82f6' : '1px solid #e1e5e9',
              borderRadius: '10px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              cursor: !editingMapName ? 'pointer' : 'default',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!editingMapName) {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.background = '#f0f9ff';
              }
            }}
            onMouseOut={(e) => {
              if (!editingMapName) {
                e.currentTarget.style.borderColor = '#e1e5e9';
                e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
              }
            }}
          >
            {editingMapName ? (
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  value={mapName}
                  onChange={e => {
                    setMapName(e.target.value);
                    setIsDirty(true);
                  }}
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    minWidth: 200,
                    background: '#ffffff',
                    color: '#111827',
                    outline: 'none',
                    boxShadow: '0 0 0 2px rgba(59,130,246,0.1)'
                  }}
                  disabled={mapNameLoading}
                  autoFocus
                  onKeyDown={e => { 
                    if (e.key === 'Enter') handleMapNameSave();
                    if (e.key === 'Escape') setEditingMapName(false);
                  }}
                  onBlur={(e) => {
                    // Prevent blur if we are clicking the save button
                    if (e.relatedTarget && e.relatedTarget.id === 'save-map-name-btn') return;
                    
                    if (mapName.trim() !== '') {
                      handleMapNameSave();
                    } else {
                      setEditingMapName(false);
                    }
                  }}
                />
                <button
                  id="save-map-name-btn"
                  onMouseDown={(e) => {
                    // onMouseDown fires before onBlur
                    e.preventDefault(); // Prevents focus loss before we handle it
                    handleMapNameSave();
                  }}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: mapNameLoading ? 'wait' : 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  disabled={mapNameLoading}
                >
                  <FaCheck size={12} /> Save
                </button>
              </div>
            ) : (
              <>
                <span style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0f172a',
                  minWidth: 110,
                  whiteSpace: 'nowrap',
                  letterSpacing: '.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span style={{ opacity: 0.7 }}>📄</span> {mapName || 'Untitled Map'}
                </span>
                <FaEdit size={13} style={{ color: '#94a3b8', marginLeft: 4 }} />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveWithPrompt();
                  }}
                  style={{
                    marginLeft: 6,
                    background: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 999,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: '0 3px 8px rgba(15,118,110,0.2)'
                  }}
                >
                  <FaSave size={12} /> Save Map
                </button>
              </>
            )}
          </div>

          {showRibbon && (
            <div style={{ 
              display: 'flex', 
              marginLeft: 'auto', 
              overflowX: 'auto', 
              overflowY: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: 'calc(100vw - 320px)',
              padding: '0 4px',
              scrollbarWidth: 'thin'
            }}>
              {/* Store size group (moved to top ribbon) */}
              <RibbonGroup title="Store Size">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    padding: 4,
                    borderRadius: 8,
                    boxShadow: storeSizeHighlight ? '0 0 0 2px rgba(250,204,21,0.9)' : 'none',
                    backgroundColor: storeSizeHighlight ? '#fffbeb' : 'transparent',
                    transition: 'box-shadow 0.2s ease, background-color 0.2s ease'
                  }}
                >
                  <select
                    value={sizePreset}
                    onChange={(e) => {
                      const preset = e.target.value;
                      setSizePreset(preset);
                      let w = mapWidth;
                      let h = mapHeight;
                      if (preset === 'small') {
                        w = 800;
                        h = 800;
                      } else if (preset === 'medium') {
                        w = 1200;
                        h = 1200;
                      } else if (preset === 'large') {
                        w = 1600;
                        h = 1600;
                      } else {
                        return;
                      }
                      setMapWidth(w);
                      setMapHeight(h);
                      setMapWidthInput(String(w));
                      setMapHeightInput(String(h));
                      // Update meters
                      setStoreWidthUnits((w / pixelsPerUnit).toFixed(1));
                      setStoreHeightUnits((h / pixelsPerUnit).toFixed(1));
                      setStoreSizeDefined(true);
                      setIsDirty(true);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 600,
                      background: '#ffffff',
                      minWidth: 90
                    }}
                    title="Quick store size presets"
                  >
                    <option value="">Preset...</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Width:</span>
                    <input
                      type="text"
                      value={mapWidthInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Allow free typing
                        setMapWidthInput(raw);
                        
                        const n = parseInt(raw || '0', 10);
                        if (!isNaN(n)) {
                          const clamped = Math.max(100, Math.min(10000, n));
                          setMapWidth(clamped);
                        // Update meter
                        setStoreWidthUnits((clamped / pixelsPerUnit).toFixed(1));
                        setIsDirty(true);
                      }
                        
                        setSizePreset('');
                        setStoreSizeDefined(true);
                      }}
                      onBlur={() => {
                        // On blur, normalize the input to the current valid mapWidth
                        setMapWidthInput(String(mapWidth));
                      }}
                      style={{
                        width: 70,
                        padding: '3px 6px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 11
                      }}
                      title="Store width in pixels"
                    />
                  </div>

                  <span style={{ fontSize: 11 }}>×</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Height:</span>
                    <input
                      type="text"
                      value={mapHeightInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Allow free typing
                        setMapHeightInput(raw);

                        const n = parseInt(raw || '0', 10);
                        if (!isNaN(n)) {
                          const clamped = Math.max(100, Math.min(10000, n));
                          setMapHeight(clamped);
                        // Update meter
                        setStoreHeightUnits((clamped / pixelsPerUnit).toFixed(1));
                        setIsDirty(true);
                      }
                        
                        setSizePreset('');
                        setStoreSizeDefined(true);
                      }}
                      onBlur={() => {
                        // On blur, normalize the input to the current valid mapHeight
                        setMapHeightInput(String(mapHeight));
                      }}
                      style={{
                        width: 70,
                        padding: '3px 6px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 11
                      }}
                      title="Store height in pixels"
                    />
                  </div>

                  <span style={{ fontSize: 11 }}>px</span>
                  <span style={{ fontSize: 11, marginLeft: 8, color: '#6b7280' }}>=</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Width:</span>
                    <input
                      type="text"
                      value={storeWidthUnits}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setStoreWidthUnits(raw);
                        const val = parseFloat(raw || '0');
                        if (!isNaN(val) && val > 0) {
                          if (pixelsPerUnit && pixelsPerUnit > 0) {
                            const newWidthPx = Math.round(val * pixelsPerUnit);
                            setMapWidth(newWidthPx);
                          setMapWidthInput(String(newWidthPx));
                          setIsDirty(true);
                        }
                        }
                        setStoreSizeDefined(true);
                      }}
                      onBlur={() => {
                        // Normalize meters on blur
                        setStoreWidthUnits((mapWidth / pixelsPerUnit).toFixed(1));
                      }}
                      style={{
                        width: 70,
                        padding: '3px 6px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 11
                      }}
                      title="Store width in selected unit"
                    />
                  </div>

                  <span style={{ fontSize: 11 }}>×</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Height:</span>
                    <input
                      type="text"
                      value={storeHeightUnits}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setStoreHeightUnits(raw);
                        const val = parseFloat(raw || '0');
                        if (!isNaN(val) && val > 0) {
                          if (pixelsPerUnit && pixelsPerUnit > 0) {
                            const newHeightPx = Math.round(val * pixelsPerUnit);
                            setMapHeight(newHeightPx);
                          setMapHeightInput(String(newHeightPx));
                          setIsDirty(true);
                        }
                        }
                        setStoreSizeDefined(true);
                      }}
                      onBlur={() => {
                        // Normalize meters on blur
                        setStoreHeightUnits((mapHeight / pixelsPerUnit).toFixed(1));
                      }}
                      style={{
                        width: 70,
                        padding: '3px 6px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: 11
                      }}
                      title="Store height in selected unit"
                    />
                  </div>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 11,
                      fontWeight: 600,
                      background: '#ffffff',
                      marginLeft: 4
                    }}
                    title="Unit type"
                  >
                    meter
                  </span>
                </div>
              </RibbonGroup>
              <RibbonGroup title="Products">
                <button
                  type="button"
                  onClick={handleInventoryClick}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid #16a34a',
                    background: '#ecfdf5',
                    color: '#166534',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    boxShadow: '0 1px 4px rgba(22,163,74,0.25)'
                  }}
                  title="Open product inventory to place items on the map"
                >
                  <FaBox size={14} />
                  <span>Inventory</span>
                </button>
              </RibbonGroup>
              <RibbonGroup title="Font (Label)">
                <select
                  disabled={!labelSelected}
                  value={currentFontFamily}
                  onChange={(e) => setElements(prev => prev.map(el => selectedElementIds.has(el.id) && (el.type === 'label' || el.type === 'bubble') ? { ...el, fontFamily: e.target.value } : el))}
                  style={{ padding: '6px', borderRadius: 6, border: '1px solid #cbd5e1', minWidth: 100, fontWeight: 600, opacity: labelSelected ? 1 : 0.6, fontSize: 12 }}
                  title="Font family for selected label"
                >
                  <option value="Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                </select>
                <select
                  disabled={!labelSelected}
                  value={currentFontSize}
                  onChange={(e) => applyLabelFontSize(parseInt(e.target.value || '12', 10))}
                  style={{ padding: '6px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 600, opacity: labelSelected ? 1 : 0.6, fontSize: 12, minWidth: 50 }}
                  title="Font size preset"
                >
                  {[8,9,10,11,12,14,16,18,20,24,28,32,36,48,64,72].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  type="color"
                  disabled={!labelSelected}
                  value={currentFontColor}
                  onChange={(e) => applyLabelFontColor(e.target.value)}
                  style={{ width: 32, height: 28, border: '1px solid #cbd5e1', background: 'white', padding: 2, cursor: 'pointer', borderRadius: 6, opacity: labelSelected ? 1 : 0.6 }}
                  title="Font color"
                />
                <button
                  disabled={!labelSelected}
                  onClick={() => {
                    if (!labelSelected) return;
                    const nextWeight = currentFontWeight === 'bold' || currentFontWeight === 700 ? 'normal' : 'bold';
                    setElements(prev => prev.map(el =>
                      selectedElementIds.has(el.id) && (el.type === 'label' || el.type === 'bubble')
                        ? { ...el, fontWeight: nextWeight }
                        : el
                    ));
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: currentFontWeight === 'bold' || currentFontWeight === 700 ? '#e5f3ff' : '#ffffff',
                    fontWeight: 800,
                    cursor: labelSelected ? 'pointer' : 'not-allowed',
                    opacity: labelSelected ? 1 : 0.6,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Toggle bold for selected label"
                >
                  B
                </button>
                <button
                  disabled={!labelSelected}
                  onClick={() => {
                    if (!labelSelected) return;
                    const nextStyle = currentFontStyle === 'italic' ? 'normal' : 'italic';
                    setElements(prev => prev.map(el =>
                      selectedElementIds.has(el.id) && (el.type === 'label' || el.type === 'bubble')
                        ? { ...el, fontStyle: nextStyle }
                        : el
                    ));
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: currentFontStyle === 'italic' ? '#e5f3ff' : '#ffffff',
                    fontStyle: 'italic',
                    fontWeight: 600,
                    cursor: labelSelected ? 'pointer' : 'not-allowed',
                    opacity: labelSelected ? 1 : 0.6,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Toggle italic for selected label"
                >
                  I
                </button>
              </RibbonGroup>

              {/* Element color group */}
              <RibbonGroup title="Element Color">
                <input
                  type="color"
                  disabled={!anyElementSelected}
                  value={currentElementColor}
                  onChange={(e) => applyElementColor(e.target.value)}
                  style={{ width: 32, height: 28, border: '1px solid #cbd5e1', background: 'white', padding: 2, cursor: 'pointer', borderRadius: 6, opacity: anyElementSelected ? 1 : 0.6 }}
                  title="Fill color for selected element"
                />
                <button
                  disabled={!anyElementSelected}
                  onClick={applyElementColorToAll}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #16a34a', background: '#ecfdf5', color: '#065f46', fontWeight: 800, cursor: anyElementSelected ? 'pointer' : 'not-allowed', fontSize: 11 }}
                  title="Apply selected element color to all shapes"
                >
                  Apply All
                </button>
              </RibbonGroup>

              {/* Dots group */}
              <RibbonGroup title="Red Dot Size">
                <select
                  disabled={dotDisabled}
                  value={dotSizeSelect}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDotSizeSelect(val);
                    if (val === 'custom') return;
                    const n = parseInt(val, 10);
                    if (Number.isFinite(n)) applyDotSize(n);
                  }}
                  style={{ padding: '6px', borderRadius: 6, border: '1px solid #cbd5e1', minWidth: 80, fontWeight: 600, opacity: dotDisabled ? 0.6 : 1, fontSize: 12 }}
                  title="Choose a preset size"
                >
                  <option value="" disabled>Size...</option>
                  {dotSizePresets.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="custom">Custom...</option>
                </select>
                {dotSizeSelect === 'custom' && (
                  <>
                    <input
                      placeholder="Size"
                      value={customDotSize}
                      onChange={(e) => setCustomDotSize(e.target.value)}
                      style={{ width: 50, padding: '6px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                    />
                    <button
                      onClick={() => {
                        const n = parseInt(customDotSize || '0', 10);
                        if (!Number.isFinite(n)) return;
                        applyDotSize(Math.max(0, Math.min(200, n)));
                      }}
                      style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #0284c7', background: '#e0f2fe', color: '#0369a1', fontWeight: 800, cursor: 'pointer', fontSize: 11 }}
                      title="Apply custom size"
                    >
                      Apply
                    </button>
                  </>
                )}
                <button
                  disabled={dotDisabled}
                  onClick={applyDotSizeToAll}
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #16a34a', background: '#ecfdf5', color: '#065f46', fontWeight: 800, cursor: dotDisabled ? 'not-allowed' : 'pointer', opacity: dotDisabled ? 0.6 : 1, fontSize: 11 }}
                  title="Apply current size to all dots of the same type"
                >
                  Apply All
                </button>
              </RibbonGroup>

            </div>
          )}
        </div>
      </div>

      {showStoreSizeReminder && !storeSizeDefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 16px',
            background: '#fef3c7',
            color: '#92400e',
            borderBottom: '1px solid #facc15',
            fontSize: 12,
            fontWeight: 600
          }}
        >
          Please set the store size before placing items.
        </div>
      )}

      <div style={{
        position: 'sticky',
        top: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: toolsCollapsed ? 'transparent' : '#f8fafc',
        padding: toolsCollapsed ? '4px 0' : '6px 16px',
        borderBottom: toolsCollapsed ? 'none' : '1px solid #e2e8f0',
        zIndex: 20,
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        minHeight: toolsCollapsed ? 0 : 56,
        boxShadow: toolsCollapsed ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: toolsCollapsed ? 0 : 12
          }}
        >
          {!toolsCollapsed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                overflowX: 'hidden',
                paddingRight: 0
              }}
            >
        <ToolButton icon={<FaUndo />} label={shortcutLabel("UNDO", "Ctrl+Z")} onClick={handleUndo} />
        <ToolButton icon={<FaRedo />} label={shortcutLabel("REDO", "Ctrl+Y/Shift+Z")} onClick={handleRedo} />
        <ToolButton icon={<FaCopy />} label={shortcutLabel("COPY", "Ctrl+C")} onClick={() => {
          if (selectedElementIds.size > 0) {
            const copies = elements.filter(el => selectedElementIds.has(el.id)).map(el => ({ ...el, id: Date.now().toString() + Math.random().toString(36).slice(2), x: el.x + 20, y: el.y + 20 }));
            saveState([...elements, ...copies], paths, widgets, productMarkers, placedProducts);
            setSelectedElementIds(new Set(copies.map(c => c.id)));
            setSelectedId(copies[copies.length - 1]?.id || null);
          } else if (selectedId) {
            const elementToCopy = elements.find(el => el.id === selectedId);
            if (elementToCopy) {
              const newElement = { ...elementToCopy, id: Date.now().toString(), x: elementToCopy.x + 20, y: elementToCopy.y + 20 };
              saveState([...elements, newElement], paths, widgets, productMarkers, placedProducts);
              setSelectedId(newElement.id);
              setSelectedElementIds(new Set([newElement.id]));
            }
          }
        }} />
        <ToolButton icon={<FaTrash />} label={shortcutLabel("DELETE", "Del")} onClick={handleDelete} />
        <ToolButton
          icon={<FaArrowsAlt />}
          label={shortcutLabel(isMoveMode ? "MOVE: ON" : "MOVE: OFF", "M")}
          onClick={() => { setIsMoveMode(m => !m); setSelectedId(null); setEditingLabelId(null); }}
        />
        <ToolButton icon={<FaThLarge />} label={shortcutLabel("GRID", "G")} onClick={() => setShowGrid(g => !g)} />
        <ToolButton icon={<FaSearchPlus />} label={shortcutLabel("ZOOM IN", "+ / =")} onClick={() => setZoom(z => Math.min(z + 0.1, 2))} />
        <ToolButton icon={<FaSearchMinus />} label={shortcutLabel("ZOOM OUT", "-")} onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} />
        <ToolButton icon={showProductDots ? <FaEye /> : <FaEyeSlash />} label={shortcutLabel(showProductDots ? "HIDE DOTS" : "SHOW DOTS", "D")} onClick={() => setShowProductDots(d => !d)} />
        <ToolButton icon={showLabels ? <FaEye /> : <FaEyeSlash />} label={shortcutLabel(showLabels ? "HIDE LABELS" : "SHOW LABELS", "L")} onClick={() => setShowLabels(s => !s)} />
        <ToolButton icon={<FaCheck />} label={shortcutLabel("SELECT ALL", "")} onClick={() => {
          setSelectedElementIds(new Set(elements.map(el => el.id)));
          setSelectedMarkerIds(new Set(productMarkers.map(m => m.id)));
          setSelectedPlacedProductIds(new Set(placedProducts.map(p => p.id)));
          setSelectedId(null);
          setSelectedPlacedProductId(null);
        }} />
        <ToolButton icon={<FaTimes />} label={shortcutLabel("CLEAR SEL", "")} onClick={() => {
          setSelectedElementIds(new Set());
          setSelectedMarkerIds(new Set());
          setSelectedPlacedProductIds(new Set());
          setSelectedId(null);
          setSelectedPlacedProductId(null);
        }} />
            </div>
          )}
          <button
            onClick={() => setToolsCollapsed(c => !c)}
            style={{
              border: '1px solid #cbd5e1',
              background: toolsCollapsed
                ? 'linear-gradient(135deg, #e5f2ff 0%, #ffffff 100%)'
                : '#ffffff',
              borderRadius: 999,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {toolsCollapsed ? <FaChevronDown size={12} color="#0f172a" /> : <FaChevronUp size={12} color="#0f172a" />}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', padding: '12px 12px 0 12px' }}>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            border: '2px solid #e1e5e9',
            overflow: 'hidden',
            position: 'relative',
            transition: 'all 0.3s ease',
            background: '#ffffff',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(8px)',
            cursor: isPanning || isSpacePanning ? 'grabbing' : 'default'
          }}
          onWheel={handleWheel}
          onDrop={(e) => { handleDrop(e); handleProductDropOnCanvas(e); }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#16a34a';
            e.currentTarget.style.boxShadow = '0 10px 32px rgba(22,163,74,0.15)';
            e.currentTarget.style.transform = 'scale(1.01)';
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.borderColor = '#e1e5e9';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {showSidebar && (
            <div
              ref={sidebarRef}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                bottom: 12,
                width: 260,
                background: '#ffffff',
                borderLeft: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 30,
                boxShadow: '-4px 0 15px rgba(0,0,0,0.05)',
                animation: 'slideInRight 0.25s ease-out'
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '8px 10px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  minHeight: 0
                }}
              >
                <button
                  onClick={() => setShowSidebar(false)}
                  style={{
                    alignSelf: 'flex-end',
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#1f2933',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Hide tools panel"
                >
                  <FaBars size={14} />
                  <span>Hide Panel</span>
                </button>

                {showBasicShapesGroup && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.08em' }}>
                      Basic Shapes
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 8
                      }}
                    >
                      {['square', 'lshape', 'ushape', 'tshape'].map((shape) => (
                        <div
                          key={shape}
                          draggable
                          onDragStart={(e) => handleDragStart(e, shape)}
                          title={shape.toUpperCase()}
                          style={{
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            cursor: 'grab',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#16a34a';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 3px 8px rgba(22,163,74,0.18)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {renderSidebarIcon(shape)}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {showFixturesGroup && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.08em', marginTop: 4 }}>
                      Fixtures
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 8
                      }}
                    >
                      {['shelf', 'rack', 'kiosk'].map((shape) => (
                        <div
                          key={shape}
                          draggable
                          onDragStart={(e) => handleDragStart(e, shape)}
                          title={shape.toUpperCase()}
                          style={{
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            cursor: 'grab',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#16a34a';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 3px 8px rgba(22,163,74,0.18)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {renderSidebarIcon(shape)}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {showLabelsGroup && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.08em', marginTop: 4 }}>
                      Labels
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 8
                      }}
                    >
                      {['label', 'bubble'].map((shape) => (
                        <div
                          key={shape}
                          draggable
                          onDragStart={(e) => handleDragStart(e, shape)}
                          title={shape.toUpperCase()}
                          style={{
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            cursor: 'grab',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#16a34a';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 3px 8px rgba(22,163,74,0.18)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {renderSidebarIcon(shape)}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {showIconsGroup && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.08em', marginTop: 4 }}>
                      Icons
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: 8
                      }}
                    >
                      {['entrance', 'exit', 'cashier'].map((shape) => (
                        <div
                          key={shape}
                          draggable
                          onDragStart={(e) => handleDragStart(e, shape)}
                          title={shape.toUpperCase()}
                          style={{
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            cursor: 'grab',
                            transition: 'all 0.2s ease',
                            position: 'relative'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.borderColor = '#16a34a';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 3px 8px rgba(22,163,74,0.18)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {renderSidebarIcon(shape)}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              style={{
                position: 'absolute',
                top: 16,
                right: 12,
                zIndex: 35,
                width: 32,
                height: 32,
                borderRadius: 999,
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.08)'
              }}
              title="Show tools panel"
            >
              <FaBars size={16} />
            </button>
          )}
          <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsCanvasHovered(true)}
            onMouseLeave={() => setIsCanvasHovered(false)}
            style={{
              width: `${mapWidth}px`,
              height: `${mapHeight}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              position: 'relative',
            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
              borderRadius: '12px',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)',
              overflow: 'hidden'
            }}
          >
          {storeSizeDefined && (
            <svg width={mapWidth} height={mapHeight} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
              <g>
                {showGrid && (
                  <>
                    {Array.from({ length: Math.floor(mapWidth / gridSize) + 1 }, (_, i) => (
                      <line
                        key={`v-${i}`}
                        x1={i * gridSize}
                        y1={0}
                        x2={i * gridSize}
                        y2={mapHeight}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    ))}
                    {Array.from({ length: Math.floor(mapHeight / gridSize) + 1 }, (_, i) => (
                      <line
                        key={`h-${i}`}
                        x1={0}
                        y1={i * gridSize}
                        x2={mapWidth}
                        y2={i * gridSize}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    ))}
                  </>
                )}
                <rect
                  x={0}
                  y={0}
                  width={mapWidth}
                  height={mapHeight}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                <circle
                  cx={mapWidth}
                  cy={0}
                  r={6}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                {paths.map((path, i) => (
                  <polyline key={i} points={path.map(p => `${p.x},${p.y}`).join(' ')} stroke="#334155" strokeWidth="2" fill="none" />
                ))}
              </g>
            </svg>
          )}

          {elements.map(renderElement)}
          {widgets.map((w, i) => renderWidget(w, i))}

          {/* Placed small red dots on widgets */}
          {showProductDots && placedProducts.map(placedProduct => {
            const widget = elements.find(el => el.id === placedProduct.widgetId) || widgets.find(w => w.id === placedProduct.widgetId);
            if (!widget) return null;
            const isSelected = selectedPlacedProductIds.has(placedProduct.id) || selectedPlacedProductId === placedProduct.id;
            const size = placedProduct.size ?? 0;
            return (
              <div
                key={placedProduct.id}
                onClick={(e) => {
                  e.stopPropagation();
                  const isMulti = e.ctrlKey || e.metaKey;
                  if (isMulti) {
                    setSelectedPlacedProductIds(prev => toggleSetId(prev, placedProduct.id));
                  } else {
                    setSelectedPlacedProductIds(new Set([placedProduct.id]));
                    setSelectedElementIds(new Set());
                    setSelectedMarkerIds(new Set());
                  }
                  setSelectedPlacedProductId(placedProduct.id);
                  setSelectedId(null);
                }}
                style={{
                  position: 'absolute',
                  left: widget.x + placedProduct.x,
                  top: widget.y + placedProduct.y,
                  width: Math.max(0, size),
                  height: Math.max(0, size),
                  backgroundColor: '#ff0000',
                  borderRadius: '50%',
                  border: isSelected ? '3px solid #0077cc' : '2px solid #fff',
                  boxShadow: isSelected ? '0 0 8px rgba(0,119,204,0.45)' : '0 1px 3px rgba(0,0,0,0.25)',
                  zIndex: 20,
                  cursor: 'pointer'
                }}
                title={`${placedProduct.productName} - Placed on ${new Date(placedProduct.timestamp).toLocaleString()}`}
              />
            );
          })}

          {/* Big red product markers on canvas */}
          {showProductDots && productMarkers.map(marker => {
            const isSelected = selectedMarkerIds.has(marker.id) || selectedId === marker.id;
            const size = marker.size ?? 0;
            return (
              <div
                key={marker.id}
                onMouseDown={handleMarkerMouseDown(marker)}
                onClick={(e) => {
                  e.stopPropagation();
                  const isMulti = e.ctrlKey || e.metaKey;
                  if (isMulti) {
                    setSelectedMarkerIds(prev => toggleSetId(prev, marker.id));
                    setSelectedElementIds(prev => new Set(prev));
                    setSelectedPlacedProductIds(prev => new Set(prev));
                  } else {
                    setSelectedMarkerIds(new Set([marker.id]));
                    setSelectedElementIds(new Set());
                    setSelectedPlacedProductIds(new Set());
                  }
                  setSelectedId(marker.id);
                  setSelectedPlacedProductId(null);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = `scale(${zoom * 1.1})`;
                  e.currentTarget.style.zIndex = 30;
                  setHoveredMarker(marker);
                  setTooltipPosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = `scale(${zoom})`;
                  e.currentTarget.style.zIndex = 25;
                  setHoveredMarker(null);
                }}
                style={{
                  position: 'absolute',
                  left: marker.x,
                  top: marker.y,
                  width: Math.max(0, size),
                  height: Math.max(0, size),
                  backgroundColor: '#ff0000',
                  border: isSelected ? '3px solid #0077cc' : '2px solid #333',
                  borderRadius: '50%',
                  boxShadow: isSelected ? '0 0 10px rgba(0,119,204,0.45)' : '0 2px 8px rgba(0,0,0,0.2)',
                  zIndex: 25,
                  cursor: isMoveMode ? 'grab' : 'pointer',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  transition: 'all 0.15s ease'
                }}
                title={`${marker.productName} - ${marker.productBrand} - ₱${parseFloat(marker.productPrice || 0).toFixed(2)} - Click to select, drag to move`}
              />
            );
          })}

          {/* Selection Rect */}
          {isSelecting && selectionRect && (
            <div
              style={{
                position: 'absolute',
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.w,
                height: selectionRect.h,
                border: '2px dashed #3b82f6',
                background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.08) 100%)',
                borderRadius: '4px',
                boxShadow: '0 0 20px rgba(59,130,246,0.3), inset 0 0 20px rgba(59,130,246,0.1)',
                zIndex: 40,
                pointerEvents: 'none',
                backdropFilter: 'blur(1px)',
                animation: 'pulse 1s ease-in-out infinite'
              }}
            />
          )}

          {/* Group Bounds with handles */}
          {(selectedElementIds.size + selectedMarkerIds.size + selectedPlacedProductIds.size) > 1 && (() => {
            const bounds = getGroupBounds();
            if (!bounds) return null;
            const handle = (corner, styleExtra = {}) => (
              <div
                key={corner}
                onMouseDown={handleGroupResizeMouseDown(corner)}
                style={{
                  position: 'absolute', width: 10, height: 10, background: '#fff',
                  border: '2px solid #1f2937', borderRadius: 2, cursor:
                    corner === 't' || corner === 'b' ? 'ns-resize'
                      : corner === 'l' || corner === 'r' ? 'ew-resize'
                        : (corner === 'tl' || corner === 'br') ? 'nwse-resize' : 'nesw-resize',
                  ...styleExtra
                }}
                title="Resize group"
              />
            );
            return (
              <div
                style={{
                  position: 'absolute',
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.w,
                  height: bounds.h,
                  border: '2px dashed #0ea5e9',
                  background: 'transparent',
                  zIndex: 35
                }}
                onMouseDown={(e) => {
                  if (!isMoveMode) return;
                  startGroupDrag(e);
                }}
                title={isMoveMode ? 'Drag to move selection' : 'Enable Move (M) to drag'}
              >
                {handle('tl', { left: -6, top: -6 })}
                {handle('tr', { right: -6, top: -6 })}
                {handle('bl', { left: -6, bottom: -6 })}
                {handle('br', { right: -6, bottom: -6 })}
                {handle('t', { left: '50%', top: -6, transform: 'translateX(-50%)' })}
                {handle('b', { left: '50%', bottom: -6, transform: 'translateX(-50%)' })}
                {handle('l', { left: -6, top: '50%', transform: 'translateY(-50%)' })}
                {handle('r', { right: -6, top: '50%', transform: 'translateY(-50%)' })}
              </div>
            );
          })()}
        </div>
      </div>
      </div>

      {/* Product Tooltip */}
      {hoveredMarker && (
        <div style={{
          position: 'fixed',
          left: tooltipPosition.x + 8,
          top: tooltipPosition.y - 8,
          background: 'rgba(17,24,39,0.95)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          maxWidth: '240px',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
          border: '1px solid rgba(148,163,184,0.35)',
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <img
              src={hoveredMarker.productImage ? `http://localhost:5000${hoveredMarker.productImage}` : 'https://via.placeholder.com/40'}
              alt={hoveredMarker.productName}
              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }}
              onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '2px', letterSpacing: '.1px' }}>{hoveredMarker.productName}</div>
              <div style={{ color: '#cbd5e1', fontSize: '11px', fontWeight: 600 }}>{hoveredMarker.productBrand}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(148,163,184,0.35)' }}>
            <span style={{ color: '#4ade80', fontWeight: 800, fontSize: '13px', letterSpacing: '.1px' }}>
              ₱{parseFloat(hoveredMarker.productPrice || 0).toFixed(2)}
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 600 }}>
                Stock: {hoveredMarker.totalStock || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.55)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          padding: 16
        }}>
          <div
            ref={inventoryModalRef}
            style={{
              background: 'linear-gradient(180deg,#E0F2F1 0%,#ffffff 45%,#ECFDF5 100%)',
              padding: 18,
              borderRadius: 18,
              width: '100%',
              maxWidth: 920,
              height: '80vh',
              maxHeight: 600,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 26px 70px rgba(15,23,42,0.55)',
              border: '1px solid #B2DFDB',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#022c22', letterSpacing: '.25px' }}>Inventory</h2>
              <button
                onClick={() => { setShowInventoryModal(false); setInventorySearch(''); }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #B2DFDB',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#0f766e',
                  borderRadius: 999,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(15,118,110,0.15)',
                  transition: 'background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#0f766e';
                  e.currentTarget.style.color = '#ECFDF5';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 18px rgba(15,118,110,0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#0f766e';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(15,118,110,0.15)';
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #B2DFDB', borderRadius: 999, padding: '10px 16px', background: '#E0F2F1', marginBottom: 10, flex: '0 0 auto' }}>
              <FaSearch style={{ color: '#075985', fontSize: 16 }} />
              <input
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search category or product..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#022c22' }}
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {inventorySearch.trim() ? (
                <>
                  <div>
                    <div style={{ marginBottom: 6, color: '#0369a1', fontWeight: 800, fontSize: 12 }}>Products</div>
                    {products.filter(p => {
                      const q = inventorySearch.trim().toLowerCase();
                      return (p.name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
                    }).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: '#6b7280', fontWeight: 700, fontSize: 12 }}>No matching products.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                        {products.filter(p => {
                          const q = inventorySearch.trim().toLowerCase();
                          return (p.name || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
                        }).map(product => (
                          <div
                            key={product._id}
                            draggable
                            onDragStart={(e) => handleProductDragStart(e, product)}
                            onClick={() => handleProductClick(product)}
                            style={{
                              padding: 12,
                              border: '1px solid #B2DFDB',
                              borderRadius: 16,
                              cursor: 'pointer',
                              transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 3px 10px rgba(15,23,42,0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#16a34a';
                              e.currentTarget.style.backgroundColor = '#ECFDF5';
                              e.currentTarget.style.transform = 'translateY(-3px)';
                              e.currentTarget.style.boxShadow = '0 12px 24px rgba(22,163,74,0.35)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#B2DFDB';
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,0.1)';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <img
                                src={product.image ? `http://localhost:5000${product.image}` : 'https://via.placeholder.com/40'}
                                alt={product.name}
                                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 10, border: '1px solid #B2DFDB', background: '#E0F2F1' }}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                              />
                              <div>
                                <h4 style={{ margin: '0 0 2px 0', color: '#022c22', fontWeight: 900, fontSize: 13, letterSpacing: '.14px' }}>{product.name}</h4>
                                <p style={{ margin: 0, color: '#047857', fontSize: 11, fontWeight: 600 }}>{product.brand} — <span style={{ color: '#0ea5e9' }}>{product.category}</span></p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                              <span style={{ color: '#0f172a', fontWeight: 700 }}>Stock: {product.stockQty}</span>
                              <span style={{ fontWeight: 900, color: '#16a34a' }}>₱{parseFloat(product.price || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ marginBottom: 6, color: '#0369a1', fontWeight: 800, fontSize: 12 }}>Categories</div>
                    {categories.filter(c => {
                      const q = inventorySearch.trim().toLowerCase();
                      return (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
                    }).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: '#6b7280', fontWeight: 700, fontSize: 12 }}>No matching categories.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {categories.filter(c => {
                          const q = inventorySearch.trim().toLowerCase();
                          return (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
                        }).map(category => (
                          <div
                            key={category._id}
                            onClick={() => handleCategorySelect(category)}
                            style={{
                              padding: 12,
                              border: '1px solid #B2DFDB',
                              borderRadius: 16,
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease',
                              backgroundColor: '#ffffff',
                              boxShadow: '0 3px 10px rgba(15,23,42,0.1)',
                              fontSize: 12,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#16a34a';
                              e.currentTarget.style.backgroundColor = '#ECFDF5';
                              e.currentTarget.style.transform = 'translateY(-3px)';
                              e.currentTarget.style.boxShadow = '0 12px 24px rgba(22,163,74,0.35)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#B2DFDB';
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,0.1)';
                            }}
                          >
                            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800, fontSize: 13 }}>{category.name}</h3>
                            <p style={{ margin: 0, color: '#475569', fontSize: '12px', lineHeight: 1.5, flex: 1 }}>{category.description || 'No description'}</p>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCreateLabelForCategory(category); }}
                              style={{
                                marginTop: 6,
                                alignSelf: 'flex-end',
                                padding: '4px 10px',
                                borderRadius: 999,
                                border: '1px solid #16a34a',
                                background: '#16a34a',
                                color: '#ffffff',
                                fontSize: 10,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                cursor: 'pointer'
                              }}
                            >
                              Create Label
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {categories.map(category => (
                    <div
                      key={category._id}
                      onClick={() => handleCategorySelect(category)}
                      style={{
                        padding: 12,
                        border: '1px solid #B2DFDB',
                        borderRadius: 16,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 3px 10px rgba(15,23,42,0.1)',
                        fontSize: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#16a34a';
                        e.currentTarget.style.backgroundColor = '#ECFDF5';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(22,163,74,0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#B2DFDB';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,0.1)';
                      }}
                    >
                      <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: 800, fontSize: 13 }}>{category.name}</h3>
                      <p style={{ margin: 0, color: '#475569', fontSize: '12px', lineHeight: 1.5, flex: 1 }}>{category.description || 'No description'}</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCreateLabelForCategory(category); }}
                        style={{
                          marginTop: 6,
                          alignSelf: 'flex-end',
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: '1px solid #16a34a',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          cursor: 'pointer'
                        }}
                      >
                        Create Label
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: '#6b7280', fontWeight: 700, fontSize: 12 }}>
                      No categories available.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && selectedCategory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.55)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div
            ref={productModalRef}
            style={{
              background: 'linear-gradient(180deg,#E0F2F1 0%,#ffffff 45%,#ECFDF5 100%)',
              padding: 18,
              borderRadius: 18,
              maxWidth: 960,
              width: '92%',
              maxHeight: '82vh',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 26px 70px rgba(15,23,42,0.55)',
              border: '1px solid #B2DFDB',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#022c22', letterSpacing: '.25px' }}>
                Products in {selectedCategory.name}
              </h2>
              <button
                onClick={() => { setShowProductModal(false); setSelectedCategory(null); setShowInventoryModal(true); }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #B2DFDB',
                  fontSize: 18,
                  cursor: 'pointer',
                  color: '#0f766e',
                  borderRadius: 999,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(15,118,110,0.15)',
                  transition: 'background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#0f766e';
                  e.currentTarget.style.color = '#ECFDF5';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 18px rgba(15,118,110,0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#0f766e';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(15,118,110,0.15)';
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #B2DFDB',
              borderRadius: 999,
              padding: '10px 16px',
              background: '#E0F2F1',
              marginBottom: 10
            }}>
              <FaSearch style={{ color: '#075985', fontSize: 16 }} />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products in this category (name, brand, SKU)..."
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#022c22' }}
              />
            </div>

            <div style={{
              marginBottom: 10,
              padding: '8px 12px',
              background: '#ECFDF5',
              borderRadius: 999,
              border: '1px solid #bbf7d0',
              textAlign: 'center',
              fontSize: 12,
              color: '#047857',
              fontWeight: 800,
              letterSpacing: '.12px'
            }}>
              Click a product to place it on the map, or drag to position precisely
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, paddingBottom: 16, overflowY: 'auto', flex: 1 }}>
                {filteredProductsInCategory.map(product => (
                  <div
                    key={product._id}
                    draggable
                    onDragStart={(e) => handleProductDragStart(e, product)}
                    onClick={() => handleProductClick(product)}
                    style={{
                      padding: 12,
                      border: '1px solid #B2DFDB',
                      borderRadius: 16,
                      cursor: 'pointer',
                      transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 3px 10px rgba(15,23,42,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#16a34a';
                      e.currentTarget.style.backgroundColor = '#ECFDF5';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(22,163,74,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#B2DFDB';
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,23,42,0.1)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <img
                        src={product.image ? `http://localhost:5000${product.image}` : 'https://via.placeholder.com/40'}
                        alt={product.name}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 10, border: '1px solid #B2DFDB', background: '#E0F2F1' }}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                      />
                      <div>
                        <h4 style={{ margin: '0 0 2px 0', color: '#022c22', fontWeight: 900, fontSize: 13, letterSpacing: '.14px' }}>{product.name}</h4>
                        <p style={{ margin: 0, color: '#047857', fontSize: 11, fontWeight: 600 }}>{product.brand}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>Stock: {product.stockQty}</span>
                      <span style={{ fontWeight: 900, color: '#16a34a' }}>₱{parseFloat(product.price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              {filteredProductsInCategory.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontWeight: 700, fontSize: 12 }}>
                  No matching products in this category.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
