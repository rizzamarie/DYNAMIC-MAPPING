import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaSearch, FaHome, FaPlus, FaTimes, FaMapMarkerAlt } from 'react-icons/fa';

// System Theme & Palette (Teal palette)
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
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    shadow: '0 4px 6px -1px rgba(0, 77, 64, 0.25), 0 2px 4px -1px rgba(0, 77, 64, 0.18)',
    bg: '#E0F2F1'
  }
};

// Maptimize Logo Component (SVG)
const MaptimizeLogo = ({ size = 60 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00695C', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#004D40', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="#E0F2F1" />
      <path d="M50 85C50 85 25 60 25 40C25 26.1929 36.1929 15 50 15C63.8071 15 75 26.1929 75 40C75 60 50 85 50 85Z" fill="url(#logoGrad)" />
      <circle cx="50" cy="40" r="10" fill="white" />
    </svg>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ 
        fontSize: size * 0.55, 
        fontWeight: '900', 
        lineHeight: '0.9', 
        color: '#102A27', 
        letterSpacing: '-1.5px' 
      }}>
        Map<span style={{ color: '#00695C' }}>timize</span>
      </span>
      <span style={{ 
        fontSize: size * 0.2, 
        color: '#4B635E', 
        letterSpacing: '1px', 
        marginTop: '4px',
        fontWeight: 600,
        textTransform: 'uppercase'
      }}>
        Kiosk Mode
      </span>
    </div>
  </div>
);

function Kiosk() {
  const [mapData, setMapData] = useState(null);
  const [products, setProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalProducts, setModalProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productDetails, setProductDetails] = useState(null);
  const [focusedCategory, setFocusedCategory] = useState(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [highlightedProduct, setHighlightedProduct] = useState(null);
  const [mapScale, setMapScale] = useState(1);
  const [mapContainer, setMapContainer] = useState(null);
  const [showProductLocation, setShowProductLocation] = useState(false);
  const [productLocation, setProductLocation] = useState(null);
  const [kioskLocation, setKioskLocation] = useState(null);
  const [pathToProduct, setPathToProduct] = useState(null);
  const [directionMessage, setDirectionMessage] = useState('');
  const [pixelsPerUnit, setPixelsPerUnit] = useState(100);

  // Zoom and Pan states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [autoFit, setAutoFit] = useState(true);

  const [categories, setCategories] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('');
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [sidePanelCategory, setSidePanelCategory] = useState(null);
  const [sidePanelProduct, setSidePanelProduct] = useState(null);
  const setSidePanelProductWithReset = (p) => {
    setSidePanelProduct(p);
    setSelectedSize('');
    setSelectedColor('');
    setSelectedBrand('');
    setSelectedUnit('');
  };

  // Kiosk-specific map dimensions - aligned with Map Editor kiosk size
  const KIOSK_MAP_WIDTH = 1000;
  const KIOSK_MAP_HEIGHT = 1000;
  const MAP_PADDING_TOP = 100;
  const MAP_PADDING_SIDE = 40;

  // Effective map size based on actual content
  const [baseMapSize, setBaseMapSize] = useState({ width: KIOSK_MAP_WIDTH, height: KIOSK_MAP_HEIGHT });
  const [avatarError, setAvatarError] = useState(false);

  const normalizeCategory = (value) => {
    if (!value) return '';
    return String(value).replace(/[\[\]"]+/g, '').trim();
  };

  useEffect(() => {
    const storedUsername = localStorage.getItem('currentUserUsername');
    const storedName = localStorage.getItem('currentUserName');
    const storedRole = localStorage.getItem('currentUserRole');
    const storedProfileImage = localStorage.getItem('currentUserProfileImage');
    const storedBranch = localStorage.getItem('currentBranch');
    if (storedBranch) {
      setCurrentBranch(storedBranch);
    }
    if (storedUsername) {
      setCurrentUser({ 
        username: storedUsername,
        name: storedName,
        role: storedRole,
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
                role: user.role || storedRole,
                profileImage: user.profileImage || null,
              });
              setAvatarError(false);
            }
          })
          .catch(() => {});
      }
    }
    fetchKioskMap();
    fetchProducts();

    // Poll for map updates every 5 seconds so changes from Map Editor appear automatically
    const mapPollInterval = setInterval(fetchKioskMap, 5000);

    return () => clearInterval(mapPollInterval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      calculateMapScale();
    };

    window.addEventListener('resize', handleResize);
    calculateMapScale();

    return () => window.removeEventListener('resize', handleResize);
  }, [mapContainer, fullScreen, baseMapSize]);

  useEffect(() => {
    calculateMapScale();
  }, [mapData, baseMapSize]);

  // Global mouse event handlers for panning and touch
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e) => handleMouseMove(e);
      const handleGlobalMouseUp = (e) => handleMouseUp(e);

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, panOffset, dragStart]);

  // Touch Support for Panning and Pinch-to-Zoom
  useEffect(() => {
    if (!mapContainer) return;

    let lastTouchDistance = 0;
    let lastTouchCenter = { x: 0, y: 0 };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (!touch.target.closest('button, a, input, select')) {
          setIsDragging(true);
          setDragStart({
            x: touch.clientX,
            y: touch.clientY,
            panX: panOffset.x,
            panY: panOffset.y
          });
        }
      } else if (e.touches.length === 2) {
        setIsDragging(false);
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        lastTouchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        lastTouchCenter = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        setPanOffset(clampPanOffset(dragStart.panX + deltaX, dragStart.panY + deltaY));
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const center = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
        };

        if (lastTouchDistance > 0) {
          const ratio = distance / lastTouchDistance;
          const newZoom = Math.max(0.1, Math.min(5, zoomLevel * ratio));
          
          const rect = mapContainer.getBoundingClientRect();
          const focalX = center.x - rect.left - MAP_PADDING_SIDE;
          const focalY = center.y - rect.top - MAP_PADDING_TOP;

          setZoomLevel(newZoom);
          setMapScale(newZoom);
          setPanOffset(computePanForZoom(newZoom, focalX, focalY));
        }

        lastTouchDistance = distance;
        lastTouchCenter = center;
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      lastTouchDistance = 0;
    };

    mapContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    mapContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    mapContainer.addEventListener('touchend', handleTouchEnd);

    return () => {
      mapContainer.removeEventListener('touchstart', handleTouchStart);
      mapContainer.removeEventListener('touchmove', handleTouchMove);
      mapContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mapContainer, isDragging, zoomLevel, panOffset, dragStart]);

  useEffect(() => {
    if (!mapData) return;
    // compute effective content bounds and honor editor canvas size
    const computeBaseSize = (data) => {
      let maxX = 0, maxY = 0;

      const pushPoint = (x, y) => {
        if (Number.isFinite(x)) maxX = Math.max(maxX, x);
        if (Number.isFinite(y)) maxY = Math.max(maxY, y);
      };

      if (Array.isArray(data.elements)) {
        data.elements.forEach(el => {
          const w = Number(el.width) || 0;
          const h = Number(el.height) || 0;
          pushPoint((Number(el.x) || 0) + w, (Number(el.y) || 0) + h);
        });
      }

      if (Array.isArray(data.widgets)) {
        data.widgets.forEach(w => {
          const ww = Number(w.width) || 0;
          const hh = Number(w.height) || 0;
          pushPoint((Number(w.x) || 0) + ww, (Number(w.y) || 0) + hh);
        });
      }

      if (Array.isArray(data.paths)) {
        data.paths.forEach(path => {
          path.forEach(p => pushPoint(Number(p.x) || 0, Number(p.y) || 0));
        });
      }

      if (Array.isArray(data.placedProducts)) {
        data.placedProducts.forEach(p => pushPoint(Number(p.x) || 0, Number(p.y) || 0));
      }

      if (Array.isArray(data.productMarkers)) {
        data.productMarkers.forEach(m => pushPoint(Number(m.x) || 0, Number(m.y) || 0));
      }

      // Start from actual content bounds with kiosk minimums
      let width = Math.max(KIOSK_MAP_WIDTH, Math.ceil(maxX));
      let height = Math.max(KIOSK_MAP_HEIGHT, Math.ceil(maxY));

      // If editor saved an explicit canvas size (from presets or manual input),
      // use that as the authoritative size so kiosk exactly matches Map Editor.
      const canvasWidth = Number(data.canvasWidth);
      const canvasHeight = Number(data.canvasHeight);
      if (Number.isFinite(canvasWidth) && canvasWidth > 0) width = canvasWidth;
      if (Number.isFinite(canvasHeight) && canvasHeight > 0) height = canvasHeight;

      // Update pixelsPerUnit from map data if available (sync with Map Editor)
      // If canvasWidth is set, we can deduce pixelsPerUnit if the ratio was saved, 
      // but usually the ratio is fixed at 100 or 10. 
      // We'll default to 100 but check if we can find it in map metadata.
      if (data.pixelsPerUnit) setPixelsPerUnit(Number(data.pixelsPerUnit));
      else if (width >= 3000) setPixelsPerUnit(100); // Likely standard ratio
      else if (width > 0 && width < 1000) setPixelsPerUnit(10); // Likely 10:1 ratio

      return { width, height };
    };

    setBaseMapSize(computeBaseSize(mapData));
  }, [mapData]);

  const getContentDimensions = () => {
    if (!mapContainer) return { width: 0, height: 0 };
    const rect = mapContainer.getBoundingClientRect();
    return {
      width: Math.max(rect.width - MAP_PADDING_SIDE * 2, 0),
      height: Math.max(rect.height - (MAP_PADDING_TOP + MAP_PADDING_SIDE), 0)
    };
  };

  const clampPanOffset = (x, y, scale = zoomLevel) => {
    if (!mapContainer) return { x, y };
    const { width: contentWidth, height: contentHeight } = getContentDimensions();
    const mapPixelWidth = baseMapSize.width * scale;
    const mapPixelHeight = baseMapSize.height * scale;

    let minX, maxX;
    if (mapPixelWidth <= contentWidth) {
      minX = maxX = (contentWidth - mapPixelWidth) / 2;
    } else {
      minX = contentWidth - mapPixelWidth;
      maxX = 0;
    }

    let minY, maxY;
    if (mapPixelHeight <= contentHeight) {
      minY = maxY = (contentHeight - mapPixelHeight) / 2;
    } else {
      minY = contentHeight - mapPixelHeight;
      maxY = 0;
    }

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  };

  const computePanForZoom = (newZoom, focalX, focalY) => {
    const currentZoom = zoomLevel || 1;
    const worldX = (focalX - panOffset.x) / currentZoom;
    const worldY = (focalY - panOffset.y) / currentZoom;
    const targetPanX = focalX - worldX * newZoom;
    const targetPanY = focalY - worldY * newZoom;
    return clampPanOffset(targetPanX, targetPanY, newZoom);
  };

  const calculateMapScale = (force = false) => {
    if (!mapContainer || (!autoFit && !force)) return;

    const containerRect = mapContainer.getBoundingClientRect();
    const containerWidth = Math.max(containerRect.width - MAP_PADDING_SIDE * 2, 0);
    const containerHeight = Math.max(containerRect.height - (MAP_PADDING_TOP + MAP_PADDING_SIDE), 0);

    // Calculate scale to fit container while maintaining aspect ratio
    const scaleX = containerWidth / baseMapSize.width;
    const scaleY = containerHeight / baseMapSize.height;
    const scale = Math.min(scaleX, scaleY, 2.0); // Increased max scale for larger display

    const finalScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    setMapScale(finalScale);
    setZoomLevel(finalScale);
    const { width: contentWidth, height: contentHeight } = getContentDimensions();
    const centeredX = (contentWidth - baseMapSize.width * finalScale) / 2;
    const centeredY = (contentHeight - baseMapSize.height * finalScale) / 2;
    setPanOffset(clampPanOffset(centeredX, centeredY, finalScale));
  };

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();

    if (term === '') {
      setSearchResults([]);
      return;
    }

    const matched = products.filter((p) => {
      const name = p.name?.toLowerCase() || '';
      const brand = p.brand?.toLowerCase() || '';
      const details = p.details?.toLowerCase() || '';
      return name.includes(term) || brand.includes(term) || details.includes(term);
    });

    setSearchResults(matched);
  }, [searchTerm, products]);

  const fetchKioskMap = async () => {
    try {
      const branch = localStorage.getItem('currentBranch');
      if (branch) {
        setCurrentBranch(branch);
      }
      const res = await axios.get('http://localhost:5000/maps', {
        params: { branch }
      });
      const kioskMap = res.data.find((m) => m.isKioskMap);
      if (kioskMap && kioskMap.productMarkers) {
        kioskMap.productMarkers = kioskMap.productMarkers.map(m => {
          let img = m.productImage || '';
          if (img && !img.startsWith('http') && !img.startsWith('data:')) {
            img = `http://localhost:5000${img}`;
          }
          return { ...m, productImage: img };
        });
      }
      setMapData(kioskMap);
    } catch (err) {
      console.error('Failed to fetch kiosk map:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const currentBranch = localStorage.getItem('currentBranch');
      let productsSource = [];

      if (currentBranch) {
        const branchUrl = `http://localhost:5000/products?branch=${encodeURIComponent(
          currentBranch
        )}`;
        try {
          const resBranch = await axios.get(branchUrl);
          productsSource = (resBranch.data || []).filter((p) => !p.deletedAt);
        } catch {
          productsSource = [];
        }
      }

      if (!currentBranch || productsSource.length === 0) {
        const resAll = await axios.get('http://localhost:5000/products');
        productsSource = (resAll.data || []).filter((p) => !p.deletedAt);
      }

      const cleaned = productsSource.map((p) => {
        let img = p.imageUrl || p.image || '';
        if (img && !img.startsWith('http') && !img.startsWith('data:')) {
          img = `http://localhost:5000${img}`;
        }
        return {
          ...p,
          name: p.name || '',
          brand: p.brand || '',
          details: p.details || '',
          imageUrl: img,
          category: normalizeCategory(p.category),
        };
      });
      setProducts(cleaned);
      const uniqueCats = [
        ...new Set(
          cleaned
            .map((p) => normalizeCategory(p.category))
            .filter((c) => c && typeof c === 'string')
        ),
      ];
      setCategories(uniqueCats);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const openProductModal = (category) => {
    const labelKey = normalizeCategory(category).toLowerCase();

    // Try to align label text with known inventory categories
    const matchedCategory = categories.find((cat) => {
      const catKey = normalizeCategory(cat).toLowerCase();
      return catKey === labelKey || catKey.includes(labelKey) || labelKey.includes(catKey);
    });

    const actualCategory = matchedCategory || category;

    // Show all inventory products that belong to this category for the current branch,
    // same logic as MapEditor category product list
    const filtered = products.filter((p) => {
      const catKey = normalizeCategory(p.category).toLowerCase();
      if (!catKey) return false;
      return catKey === labelKey || catKey.includes(labelKey) || labelKey.includes(catKey);
    });

    setSelectedCategory(normalizeCategory(actualCategory));
    setModalProducts(filtered);
    setSidePanelCategory(normalizeCategory(actualCategory));
    setIsSidePanelOpen(true);
    setSidePanelProduct(null);
    setFocusedCategory(null);
    setHighlightedProduct(null);
    setShowProductLocation(false);
    setProductLocation(null);
    setDirectionMessage('');
  };

  const openDetailsModal = (product) => {
    setProductDetails(product);
    setSelectedSize('');
    setSelectedColor('');
  };

  const closeModals = () => {
    setModalProducts([]);
    setProductDetails(null);
    setModalVisible(false);
    setShowProductModal(false);
    setFocusedCategory(null);
    setSelectedSize('');
    setSelectedColor('');
    setHighlightedProduct(null);
    setShowProductLocation(false);
    setProductLocation(null);
  };

  const getMapProducts = () => {
    if (!mapData) return [];
    const allProducts = [];
    const seenProductIds = new Set();

    if (mapData.productMarkers) {
      mapData.productMarkers.forEach((marker) => {
        const key = `${marker.productId}-${marker.x}-${marker.y}`;
        if (!seenProductIds.has(key)) {
          allProducts.push({
            ...marker,
            type: 'marker',
          });
          seenProductIds.add(key);
        }
      });
    }

    if (mapData.placedProducts) {
      mapData.placedProducts.forEach((product) => {
        let absX = product.x;
        let absY = product.y;

        // If product is placed on a widget (e.g., shelf), its coordinates are relative to the widget
        if (product.widgetId && mapData.widgets) {
          const widget = mapData.widgets.find(w => w.id === product.widgetId);
          if (widget) {
            absX += widget.x;
            absY += widget.y;
          }
        }

        const key = `${product.productId}-${absX}-${absY}`;
        if (!seenProductIds.has(key)) {
          allProducts.push({
            ...product,
            x: absX,
            y: absY,
            type: 'placed',
          });
          seenProductIds.add(key);
        }
      });
    }

    return allProducts;
  };

  const findProductLocation = (productId) => {
    if (!productId) return null;
    const mapProducts = getMapProducts();
    const pid = String(productId);

    // 1. Try exact ID match first
    let location = mapProducts.find(p => {
      const pId = p.productId || p._id || p.id;
      return pId && String(pId) === pid;
    });

    // 2. If not found by ID, try finding the product object and matching by name
    if (!location) {
      const product = products.find(p => String(p._id) === pid);
      if (product) {
        const productName = (product.name || '').trim().toLowerCase();
        location = mapProducts.find(p => {
          const mapProdName = (p.productName || p.name || '').trim().toLowerCase();
          return (
            (mapProdName && mapProdName === productName) ||
            (p.productId && String(p.productId) === pid) ||
            (p._id && String(p._id) === pid) ||
            (p.id && String(p.id) === pid)
          );
        });
      }
    }

    return location;
  };

  const showProductLocationOnMap = (product) => {
    const location = findProductLocation(product._id);
    if (location) {
      setProductLocation(location);
      setShowProductLocation(true);
      setModalVisible(false);
      setProductDetails(null);
      setFocusedCategory(null);
      setHighlightedProduct(null);
      
      // Find kiosk and calculate path
      const kioskPos = findKioskElement();
      if (kioskPos) {
        // Calculate accurate direction message based on kiosk orientation
        const relX = location.x - kioskPos.x;
        const relY = location.y - kioskPos.y;
        
        // Rotate the relative vector back into the kiosk's local space
        // CSS rotation is clockwise, so we rotate by -rotation
        const angleRad = -(kioskPos.rotation || 0) * (Math.PI / 180);
        const localX = relX * Math.cos(angleRad) - relY * Math.sin(angleRad);
        const localY = relX * Math.sin(angleRad) + relY * Math.cos(angleRad);
        
        // Calculate the angle in degrees relative to the kiosk's forward direction (local Y-)
        // Math.atan2(y, x) returns the angle in radians
        const angleDeg = Math.atan2(localY, localX) * (180 / Math.PI);
        
        let direction = '';
        
        // Detailed 8-sector direction logic for better accuracy
        // Assuming the kiosk's "Front" is facing local Y- (up in its own coordinate space)
        if (angleDeg >= -112.5 && angleDeg < -67.5) {
          direction = 'straight ahead';
        } else if (angleDeg >= -67.5 && angleDeg < -22.5) {
          direction = 'in the right side ahead';
        } else if (angleDeg >= -157.5 && angleDeg < -112.5) {
          direction = 'in the left side ahead';
        } else if (angleDeg >= -22.5 && angleDeg < 22.5) {
          direction = 'on your right';
        } else if (angleDeg >= 157.5 || angleDeg < -157.5) {
          direction = 'on your left';
        } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
          direction = 'behind you on the right';
        } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
          direction = 'behind you on the left';
        } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
          direction = 'directly behind you';
        } else {
          direction = 'straight ahead';
        }
        
        setDirectionMessage(`The product is ${direction}.`);

        const obstacles = getObstacles();
        const productPos = { x: location.x, y: location.y };
        
        // 1. Try direct line of sight first (most matadlong way)
        if (hasLineOfSight(kioskPos, productPos, obstacles)) {
          setPathToProduct([kioskPos, productPos]);
          setKioskLocation(kioskPos);
          return;
        }

        // 2. If blocked, use A* pathfinding
        let path = aStarPathfind(kioskPos, productPos, obstacles);
        if (path) {
          // 3. Simplify the path (string pulling) to remove unnecessary turns
          let finalPath = simplifyPath(path, obstacles);
          
          // Ensure it starts exactly at kiosk and ends exactly at product
          if (finalPath.length > 0) {
            // Check if we can connect kioskPos directly to the second point
            if (finalPath.length > 1 && hasLineOfSight(kioskPos, finalPath[1], obstacles)) {
              finalPath[0] = kioskPos;
            } else {
              finalPath.unshift(kioskPos);
            }
            
            // Check if we can connect the second-to-last point directly to productPos
            const lastIdx = finalPath.length - 1;
            if (finalPath.length > 1 && hasLineOfSight(finalPath[lastIdx - 1], productPos, obstacles)) {
              finalPath[lastIdx] = productPos;
            } else {
              const lastPoint = finalPath[lastIdx];
              const dist = Math.sqrt(Math.pow(lastPoint.x - productPos.x, 2) + Math.pow(lastPoint.y - productPos.y, 2));
              if (dist > 1) {
                finalPath.push(productPos);
              } else {
                finalPath[lastIdx] = productPos;
              }
            }
          }
          
          setPathToProduct(finalPath);
          setKioskLocation(kioskPos);
        } else {
          console.warn('No path found to product');
          setPathToProduct(null);
        }
      } else {
        console.warn('No kiosk found on map');
        setPathToProduct(null);
      }
    } else {
      alert('Product location not found on this map. Make sure the product has been placed on the map using the map editor.');
    }
  };

  const clearProductLocation = () => {
    setProductLocation(null);
    setShowProductLocation(false);
    setHighlightedProduct(null);
    setPathToProduct(null);
    setDirectionMessage('');
  };

  // Find kiosk element on map
  const findKioskElement = () => {
    if (!mapData || !mapData.elements) return null;
    const kiosk = mapData.elements.find(el => el.type === 'kiosk');
    if (kiosk) {
      // Return the center of the kiosk
      return {
        x: kiosk.x + (kiosk.width / 2),
        y: kiosk.y + (kiosk.height / 2),
        rotation: kiosk.rotation || 0
      };
    }
    return null;
  };

  // Check if point collides with any obstacle
  const isObstacle = (x, y, obstacles) => {
    for (const obstacle of obstacles) {
      if (x >= obstacle.x && x <= obstacle.x + obstacle.width &&
          y >= obstacle.y && y <= obstacle.y + obstacle.height) {
        return true;
      }
    }
    return false;
  };

  // Build obstacle list from map elements
  const getObstacles = () => {
    if (!mapData || !mapData.elements) return [];
    const obstacles = [];
    const PADDING = 8; // Slightly reduced padding to allow for straighter paths in tight spaces
    
    mapData.elements.forEach(el => {
      // Skip kiosk itself, labels, and doors (so path can go through doors)
      if (el.type !== 'kiosk' && el.type !== 'label' && el.type !== 'bubble' && el.type !== 'door') {
        obstacles.push({
          x: el.x - PADDING,
          y: el.y - PADDING,
          width: (el.width || 0) + (PADDING * 2),
          height: (el.height || 0) + (PADDING * 2)
        });
      }
    });
    if (mapData.widgets) {
      mapData.widgets.forEach(w => {
        obstacles.push({
          x: w.x - PADDING,
          y: w.y - PADDING,
          width: (w.width || 0) + (PADDING * 2),
          height: (w.height || 0) + (PADDING * 2)
        });
      });
    }
    return obstacles;
  };

  const isWithinBounds = (x, y) => {
    return x >= 0 && y >= 0 && x <= baseMapSize.width && y <= baseMapSize.height;
  };

  const hasLineOfSight = (start, end, obstacles) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 5) return true;
    
    // Use a more optimized check density
    const steps = Math.ceil(distance / 5); 
    const margin = 3; // Reduced safety margin to allow passing through tight but clear spaces
    
    // We skip the first 10% and last 10% of the distance for the obstacle check
    // This prevents the path from being "blocked" by the shelf the product is sitting on
    // or the kiosk itself.
    const startIdx = Math.ceil(steps * 0.1);
    const endIdx = Math.floor(steps * 0.9);

    for (let i = startIdx; i <= endIdx; i++) {
      const x = start.x + (dx * i) / steps;
      const y = start.y + (dy * i) / steps;
      
      // Basic center point check
      if (isObstacle(x, y, obstacles)) return false;
      
      // Reduced safety margin checks
      if (isObstacle(x + margin, y, obstacles) ||
          isObstacle(x - margin, y, obstacles) ||
          isObstacle(x, y + margin, obstacles) ||
          isObstacle(x, y - margin, obstacles)) {
        return false;
      }
    }
    return true;
  };

  const simplifyPath = (path, obstacles) => {
    if (!path || path.length <= 2) return path;
    const simplified = [path[0]];
    let currentIdx = 0;
    
    while (currentIdx < path.length - 1) {
      let furthestIdx = path.length - 1;
      while (furthestIdx > currentIdx + 1) {
        if (hasLineOfSight(path[currentIdx], path[furthestIdx], obstacles)) {
          break;
        }
        furthestIdx--;
      }
      simplified.push(path[furthestIdx]);
      currentIdx = furthestIdx;
    }
    return simplified;
  };

  const findNearestWalkable = (point, obstacles) => {
    const GRID_SIZE = 10;
    if (!isObstacle(point.x, point.y, obstacles) && isWithinBounds(point.x, point.y)) {
      return point;
    }
    const maxRadius = 200;
    for (let r = GRID_SIZE; r <= maxRadius; r += GRID_SIZE) {
      for (let dx = -r; dx <= r; dx += GRID_SIZE) {
        const candidates = [
          { x: point.x + dx, y: point.y - r },
          { x: point.x + dx, y: point.y + r }
        ];
        for (const c of candidates) {
          const cx = Math.round(c.x / GRID_SIZE) * GRID_SIZE;
          const cy = Math.round(c.y / GRID_SIZE) * GRID_SIZE;
          if (isWithinBounds(cx, cy) && !isObstacle(cx, cy, obstacles)) {
            return { x: cx, y: cy };
          }
        }
      }
      for (let dy = -r; dy <= r; dy += GRID_SIZE) {
        const candidates = [
          { x: point.x - r, y: point.y + dy },
          { x: point.x + r, y: point.y + dy }
        ];
        for (const c of candidates) {
          const cx = Math.round(c.x / GRID_SIZE) * GRID_SIZE;
          const cy = Math.round(c.y / GRID_SIZE) * GRID_SIZE;
          if (isWithinBounds(cx, cy) && !isObstacle(cx, cy, obstacles)) {
            return { x: cx, y: cy };
          }
        }
      }
    }
    return point;
  };

  // A* Pathfinding Algorithm
  const aStarPathfind = (start, end, obstacles) => {
    const GRID_SIZE = 10;

    let roundedStart = {
      x: Math.round(start.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(start.y / GRID_SIZE) * GRID_SIZE
    };
    let roundedEnd = {
      x: Math.round(end.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(end.y / GRID_SIZE) * GRID_SIZE
    };

    if (isObstacle(roundedStart.x, roundedStart.y, obstacles) || !isWithinBounds(roundedStart.x, roundedStart.y)) {
      roundedStart = findNearestWalkable(roundedStart, obstacles);
    }
    if (isObstacle(roundedEnd.x, roundedEnd.y, obstacles) || !isWithinBounds(roundedEnd.x, roundedEnd.y)) {
      roundedEnd = findNearestWalkable(roundedEnd, obstacles);
    }

    const heuristic = (a, b) => {
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      return dx + dy + (Math.sqrt(2) - 2) * Math.min(dx, dy); // Octile distance for 8-way movement
    };

    const getNeighbors = (node, obstacles) => {
      const neighbors = [];
      const directions = [
        { dx: GRID_SIZE, dy: 0 },
        { dx: -GRID_SIZE, dy: 0 },
        { dx: 0, dy: GRID_SIZE },
        { dx: 0, dy: -GRID_SIZE },
        { dx: GRID_SIZE, dy: GRID_SIZE },
        { dx: -GRID_SIZE, dy: -GRID_SIZE },
        { dx: GRID_SIZE, dy: -GRID_SIZE },
        { dx: -GRID_SIZE, dy: GRID_SIZE }
      ];

      directions.forEach(dir => {
        const nx = node.x + dir.dx;
        const ny = node.y + dir.dy;
        if (!isWithinBounds(nx, ny)) return;
        const isDiagonal = Math.abs(dir.dx) + Math.abs(dir.dy) === GRID_SIZE * 2;
        if (isDiagonal) {
          const adj1x = node.x + dir.dx;
          const adj1y = node.y;
          const adj2x = node.x;
          const adj2y = node.y + dir.dy;
          if (isObstacle(adj1x, adj1y, obstacles) || isObstacle(adj2x, adj2y, obstacles)) return;
        }
        if (!isObstacle(nx, ny, obstacles)) {
          neighbors.push({ x: nx, y: ny });
        }
      });

      return neighbors;
    };

    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const nodeKey = (node) => `${node.x},${node.y}`;

    gScore.set(nodeKey(roundedStart), 0);
    fScore.set(nodeKey(roundedStart), heuristic(roundedStart, roundedEnd));
    openSet.push(roundedStart);

    while (openSet.length > 0) {
      let current = openSet[0];
      let currentIdx = 0;
      for (let i = 1; i < openSet.length; i++) {
        const f1 = fScore.get(nodeKey(current)) || Infinity;
        const f2 = fScore.get(nodeKey(openSet[i])) || Infinity;
        if (f2 < f1) {
          current = openSet[i];
          currentIdx = i;
        }
      }

      if (nodeKey(current) === nodeKey(roundedEnd)) {
        const path = [current];
        while (cameFrom.has(nodeKey(current))) {
          current = cameFrom.get(nodeKey(current));
          path.push(current);
        }
        return path.reverse();
      }

      openSet.splice(currentIdx, 1);
      closedSet.add(nodeKey(current));

      const neighbors = getNeighbors(current, obstacles);
      for (const neighbor of neighbors) {
        if (closedSet.has(nodeKey(neighbor))) {
          continue;
        }

        const isDiagonal = Math.abs(neighbor.x - current.x) === GRID_SIZE && Math.abs(neighbor.y - current.y) === GRID_SIZE;
        const movementCost = isDiagonal ? Math.sqrt(2) : 1;
        const tentativeGScore = (gScore.get(nodeKey(current)) || 0) + movementCost;

        if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor);
        } else if (tentativeGScore >= (gScore.get(nodeKey(neighbor)) || Infinity)) {
          continue;
        }

        cameFrom.set(nodeKey(neighbor), current);
        gScore.set(nodeKey(neighbor), tentativeGScore);
        fScore.set(nodeKey(neighbor), tentativeGScore + heuristic(neighbor, roundedEnd));
      }
    }

    return null;
  };

  // Zoom and Pan Functions
  const handleZoomIn = () => {
    if (!mapContainer) return;
    setAutoFit(false);
    const newZoom = Math.min(zoomLevel * 1.4, 5); // Faster zoom and higher max (5x)
    const { width: contentWidth, height: contentHeight } = getContentDimensions();
    const focalX = contentWidth / 2;
    const focalY = contentHeight / 2;
    setZoomLevel(newZoom);
    setMapScale(newZoom);
    setPanOffset(computePanForZoom(newZoom, focalX, focalY));
  };

  const handleZoomOut = () => {
    if (!mapContainer) return;
    setAutoFit(false);
    const newZoom = Math.max(zoomLevel / 1.4, 0.1); // Faster zoom
    const { width: contentWidth, height: contentHeight } = getContentDimensions();
    const focalX = contentWidth / 2;
    const focalY = contentHeight / 2;
    setZoomLevel(newZoom);
    setMapScale(newZoom);
    setPanOffset(computePanForZoom(newZoom, focalX, focalY));
  };

  const handleResetZoom = () => {
    setAutoFit(true);
    calculateMapScale(true);
  };

  // Helper function to check if event is over a label or interactive element
  const isEventOverLabel = (e) => {
    const target = e.target;
    
    // First check the target directly
    if (target?.classList?.contains('map-label') || 
        target?.hasAttribute?.('data-label-clickable')) {
      return true;
    }
    
    // Check if target is inside a label element
    if (target?.closest?.('.map-label, [data-label-clickable]')) {
      return true;
    }
    
    // Check the event path (composedPath for modern browsers, path for older)
    const path = e.composedPath ? e.composedPath() : (e.path || []);
    for (const element of path) {
      if (element === mapContainer) break; // Stop at map container
      if (element?.classList?.contains('map-label') || 
          element?.hasAttribute?.('data-label-clickable')) {
        return true;
      }
      // Also check for standard interactive elements
      if (element?.tagName === 'BUTTON' || 
          element?.tagName === 'A' || 
          element?.tagName === 'INPUT' || 
          element?.tagName === 'SELECT') {
        return true;
      }
    }
    return false;
  };

  const handleWheelZoom = (e) => {
    if (!mapContainer) return;
    
    // Check if event is over a label BEFORE preventing default
    if (isEventOverLabel(e)) {
      return; // Don't zoom, let the label handle it
    }
    
    e.preventDefault();
    setAutoFit(false);

    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - MAP_PADDING_SIDE;
    const mouseY = e.clientY - rect.top - MAP_PADDING_TOP;
    const focalX = mouseX;
    const focalY = mouseY;

    // Get current mouse position relative to map
    const worldX = (focalX - panOffset.x) / zoomLevel;
    const worldY = (focalY - panOffset.y) / zoomLevel;

    // Zoom in or out (Increased max zoom to 5x for kiosk accessibility)
    const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15; // Slightly faster scroll zoom
    const newZoom = Math.max(0.1, Math.min(5, zoomLevel * zoomFactor));
    setZoomLevel(newZoom);
    setMapScale(newZoom);

    const newPanX = focalX - worldX * newZoom;
    const newPanY = focalY - worldY * newZoom;
    setPanOffset(clampPanOffset(newPanX, newPanY, newZoom));
  };

  const handleMouseDown = (e) => {
    // Allow left-click drag for panning (kiosk-friendly), but not if clicking on interactive elements
    if (e.button === 0 && !e.target.closest('button, a, input, select')) {
      // Check if we're clicking on a label or interactive element
      if (isEventOverLabel(e)) {
        return; // Don't start dragging, let the label handle the click
      }
      
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        panX: panOffset.x,
        panY: panOffset.y
      });
      // Change cursor immediately
      if (mapContainer) {
        mapContainer.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const nextPan = clampPanOffset(dragStart.panX + deltaX, dragStart.panY + deltaY);
      setPanOffset(nextPan);
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      e.preventDefault();
      setIsDragging(false);
      // Reset cursor
      if (mapContainer) {
        mapContainer.style.cursor = 'default';
      }
    }
  };

  // Enhanced label rendering with triangle (scales with zoom)
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
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
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
        <path d={`${pathBox} ${pathTriangle}`} fill={el.color || "#fff8cc"} stroke="none" />
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

  // Furniture (shelf/rack) CSS background same as MapDisplay
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

    // Hide labels and bubbles when a route is being displayed to focus on product location
    const isRouteActive = !!pathToProduct;
    if (isRouteActive && (el.type === 'label' || el.type === 'bubble')) {
      return null;
    }

    // Label (with triangle) - Hidden per user request, moved to side panel
    if (el.type === 'label') {
      return null;
    }

    if (el.type === 'door') {
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
          title="Door"
        >
          <svg width={width} height={height} style={{ overflow: 'visible', pointerEvents: 'none' }} viewBox={`0 0 ${width} ${height}`}>
             {/* Left Jamb */}
            <rect x="0" y={height * 0.85} width={width * 0.15} height={height * 0.15} fill={el.color || "#000000"} />
            {/* Right Jamb */}
            <rect x={width * 0.85} y={height * 0.85} width={width * 0.15} height={height * 0.15} fill={el.color || "#000000"} />
            
            {/* Door Leaf (Vertical from left jamb) */}
            <rect x={width * 0.15} y={height * 0.15} width={width * 0.05} height={height * 0.7} fill={el.color || "#000000"} />
            
            {/* Swing Arc */}
            <path 
              d={`M ${width * 0.2},${height * 0.15} A ${width * 0.7},${width * 0.7} 0 0 1 ${width * 0.85},${height * 0.85}`} 
              fill="none" 
              stroke={el.color || "#000000"} 
              strokeWidth="2" 
              strokeDasharray="5,5"
            />
            
            {/* Swing Area Fill (Optional) */}
            <path 
              d={`M ${width * 0.2},${height * 0.15} A ${width * 0.7},${width * 0.7} 0 0 1 ${width * 0.85},${height * 0.85} L ${width * 0.15},${height * 0.85} L ${width * 0.15},${height * 0.15} Z`} 
              fill={el.color ? el.color + '22' : '#00000022'} 
              stroke="none" 
            />
          </svg>
        </div>
      );
    }

    // Entrance / Exit / Cashier icons with names
    if (['entrance', 'exit', 'cashier'].includes(el.type)) {
      const label =
        el.type === 'entrance' ? 'ENTRANCE' : el.type === 'exit' ? 'EXIT' : 'CASHIER';

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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            ...getFurnitureStyle(el),
          }}
          title={label}
        >
          {el.type === 'entrance' && (
            <svg
              width={Math.min(width, 40)}
              height={Math.min(height, 20)}
              viewBox="0 0 32 20"
              style={{ overflow: 'visible' }}
            >
              <rect x="2" y="4" width="20" height="12" fill="#10b981" />
              <path d="M24 10 L30 4 M24 10 L30 16" stroke="#10b981" strokeWidth="2" fill="none" />
            </svg>
          )}
          {el.type === 'exit' && (
            <svg
              width={Math.min(width, 40)}
              height={Math.min(height, 20)}
              viewBox="0 0 32 20"
              style={{ overflow: 'visible' }}
            >
              <rect x="10" y="4" width="20" height="12" fill="#ef4444" />
              <path d="M2 10 L8 4 M2 10 L8 16" stroke="#ef4444" strokeWidth="2" fill="none" />
            </svg>
          )}
          {el.type === 'cashier' && (
            <svg
              width={Math.min(width, 40)}
              height={Math.min(height, 20)}
              viewBox="0 0 32 20"
              style={{ overflow: 'visible' }}
            >
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
              textShadow: '0 1px 2px rgba(0,0,0,0.35)',
            }}
          >
            {label}
          </span>
        </div>
      );
    }

    // L / U / T shapes (SVG paths match MapDisplay exactly)
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
          title={`${el.type.toUpperCase()} Shape`}
        >
          <svg width={width} height={height} style={{ overflow: 'visible', pointerEvents: 'none' }}>
            {el.type === 'lshape' && (
              <path
                d={`M0,0 V${height} H${width} V${height - height / 3} H${width / 3} V0 Z`}
                fill={el.color || "#d4a373"}
                stroke="none"
              />
            )}
            {el.type === 'ushape' && (
              <path
                d={`M0,0 V${height} H${width} V0 H${(width * 2) / 3} V${height * 0.75} H${width / 3} V0 Z`}
                fill={el.color || "#d4a373"}
                stroke="none"
              />
            )}
            {el.type === 'tshape' && (
              <path
                d={`M0,0 H${width} V${height / 3} H${(width * 2) / 3} V${height} H${width / 3} V${height / 3} H0 Z`}
                fill={el.color || "#d4a373"}
                stroke="none"
              />
            )}
          </svg>
        </div>
      );
    }

    // Other blocks (rectangle/shelf/rack/etc.)
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
        title={el.type?.toUpperCase()}
      >
        {el.type === 'bubble' && (
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
              fontWeight: 700
            }}
          >
            {el.content || 'Message...'}
          </div>
        )}
        {el.type === 'kiosk' && (
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              pointerEvents: 'none', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'flex-start', 
              padding: '4px',
              cursor: 'default'
            }}
          >
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
      </div>
    );
  };

  // Widgets renderer (matching MapDisplay)
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

  const renderProductLocation = () => {
    if (!showProductLocation || !productLocation) return null;

    return (
      <div style={{ position: 'absolute', left: productLocation.x, top: productLocation.y, zIndex: 2000, pointerEvents: 'none' }}>
        {/* Red Dot (Exact location as placed in Editor) */}
        <div
          style={{
            position: 'absolute',
            left: -10,
            top: -10,
            width: 20,
            height: 20,
            backgroundColor: '#dc2626',
            borderRadius: '50%',
            border: '3px solid #ffffff',
            boxShadow: '0 0 0 3px #dc2626, 0 4px 12px rgba(220, 38, 38, 0.4)',
            animation: 'pulse 2s infinite',
          }}
          title={`${productLocation.productName || productLocation.name} location`}
        />
      </div>
    );
  };

  const cleanLabel = (label) => {
    if (!label) return '';
    return String(label).replace(/[\[\]"]+/g, '').trim();
  };

  const getSizesWithQuantities = (product) => {
    const result = [];
    if (product.sizeQuantities && product.sizeQuantities.length > 0) {
      product.sizeQuantities.forEach(variant => {
        const size = cleanLabel(variant.size);
        if (size && variant.quantity > 0) {
          result.push({ size, quantity: variant.quantity });
        }
      });
    } else if (product.sizeOptions && product.sizeOptions.length > 0) {
      product.sizeOptions.forEach(size => {
        const s = cleanLabel(size);
        if (s) {
          result.push({ size: s, quantity: product.stockQty });
        }
      });
    }
    return result;
  };

  const getColorsWithQuantities = (product) => {
    const result = [];
    if (product.colorQuantities && product.colorQuantities.length > 0) {
      product.colorQuantities.forEach(variant => {
        const color = cleanLabel(variant.color);
        if (color && variant.quantity > 0) {
          result.push({ color, quantity: variant.quantity });
        }
      });
    } else if (product.colorOptions && product.colorOptions.length > 0) {
      product.colorOptions.forEach(color => {
        const c = cleanLabel(color);
        if (c) {
          result.push({ color: c, quantity: product.stockQty });
        }
      });
    }
    return result;
  };

  const getSelectedQuantity = (product) => {
    if (selectedBrand && selectedUnit) {
      const bu = product.brandUnitQuantities?.find(v => cleanLabel(v.brand) === selectedBrand && cleanLabel(v.unit) === selectedUnit);
      if (bu) return bu.quantity;
    }
    if (selectedBrand && !selectedUnit) {
      const b = product.brandQuantities?.find(v => cleanLabel(v.brand) === selectedBrand);
      if (b) return b.quantity;
    }
    if (selectedUnit && !selectedBrand) {
      const u = product.unitQuantities?.find(v => cleanLabel(v.unit) === selectedUnit);
      if (u) return u.quantity;
    }
    if (selectedSize && selectedColor) {
      const sc = product.sizeColorQuantities?.find(v => cleanLabel(v.size) === selectedSize && cleanLabel(v.color) === selectedColor);
      if (sc) return sc.quantity;
    }
    if (selectedSize && !selectedColor) {
      const s = product.sizeQuantities?.find(v => cleanLabel(v.size) === selectedSize);
      if (s) return s.quantity;
    }
    if (selectedColor && !selectedSize) {
      const c = product.colorQuantities?.find(v => cleanLabel(v.color) === selectedColor);
      if (c) return c.quantity;
    }
    return product.stockQty || 0;
  };

  const getTotalVariantStock = (product) => {
    if (typeof product.availableStock === 'number' && product.availableStock >= 0) return product.availableStock;
    if (typeof product.totalStock === 'number' && product.totalStock >= 0) return product.totalStock;
    let total = 0;
    if (product.brandUnitQuantities) total += product.brandUnitQuantities.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
    if (product.sizeColorQuantities) total += product.sizeColorQuantities.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
    if (product.colorQuantities) total += product.colorQuantities.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
    if (product.sizeQuantities) total += product.sizeQuantities.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
    if (product.brandQuantities) total += product.brandQuantities.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
    if (product.unitQuantities) total += product.unitQuantities.reduce((sum, variant) => sum + (variant.quantity || 0), 0);
    return total > 0 ? total : (product.stockQty || 0);
  };

  const readVariantPrice = (obj) => {
    if (!obj) return undefined;
    const keys = ['price', 'sellingPrice', 'unitPrice', 'variantPrice'];
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null && !Number.isNaN(Number(v))) return Number(v);
    }
    return undefined;
  };

  const getSelectedPrice = (product) => {
    if (!product) return 0;
    if (selectedBrand && selectedUnit) {
      const bu = product.brandUnitQuantities?.find(v => cleanLabel(v.brand) === selectedBrand && cleanLabel(v.unit) === selectedUnit);
      const p = readVariantPrice(bu);
      if (p !== undefined) return p;
    }
    if (selectedBrand && !selectedUnit) {
      const b = product.brandQuantities?.find(v => cleanLabel(v.brand) === selectedBrand);
      const p = readVariantPrice(b);
      if (p !== undefined) return p;
    }
    if (selectedUnit && !selectedBrand) {
      const u = product.unitQuantities?.find(v => cleanLabel(v.unit) === selectedUnit);
      const p = readVariantPrice(u);
      if (p !== undefined) return p;
    }
    if (selectedSize && selectedColor) {
      const sc = product.sizeColorQuantities?.find(v => cleanLabel(v.size) === selectedSize && cleanLabel(v.color) === selectedColor);
      const p = readVariantPrice(sc);
      if (p !== undefined) return p;
    }
    if (selectedSize && !selectedColor) {
      const s = product.sizeQuantities?.find(v => cleanLabel(v.size) === selectedSize);
      const p = readVariantPrice(s);
      if (p !== undefined) return p;
    }
    if (selectedColor && !selectedSize) {
      const c = product.colorQuantities?.find(v => cleanLabel(v.color) === selectedColor);
      const p = readVariantPrice(c);
      if (p !== undefined) return p;
    }
    const base = readVariantPrice(product);
    return base !== undefined ? base : 0;
  };

  const getSelectedUnitDisplay = (product) => {
    if (!product) return '';
    if (selectedUnit) return selectedUnit;
    if (product.unit) return product.unit;
    return '';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', background: 'linear-gradient(180deg,#f8fbff 0%,#eef4ff 100%)', color: theme.colors.text, overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeInSlideDown {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
          
          @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        .search-input:focus, .dropdown:focus {
          outline: none;
          border-color: ${theme.colors.primary} !important;
          box-shadow: 0 0 0 3px rgba(13, 71, 161, 0.12);
        }
        .modal-item:hover {
          background-color: rgba(13, 71, 161, 0.04);
          border-color: ${theme.colors.primary};
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 77, 64, 0.08);
        }
        .locate-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(0, 105, 92, 0.3) !important;
          filter: brightness(1.1);
        }
        .modal-x:hover {
          color: ${theme.colors.surface};
        }
        .side-panel {
          width: 380px;
          height: 100%;
          background-color: ${theme.colors.surface};
          border-left: 2px solid ${theme.colors.border};
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 30px rgba(0, 77, 64, 0.05);
          position: relative;
          z-index: 6000;
          flex-shrink: 0;
        }
        /* Custom Scrollbar for a professional look */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={headerStyle}>
          <MaptimizeLogo size={45} />
          {currentBranch && (
            <div style={branchIndicatorStyle}>
              <span style={branchLabelStyle}>Branch:</span>
              <span style={branchNameStyle}>{currentBranch}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
          {/* Main Map Content Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {/* Search Area */}
            <div style={searchContainer}>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <FaSearch style={{ position: 'absolute', left: '16px', color: theme.colors.primary, zIndex: 1, fontSize: '16px' }} />
                  <input
                    type="text"
                    placeholder="Search product, brand, or details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ ...searchInput, paddingLeft: '44px' }}
                    className="search-input"
                  />
                  
                  {/* Search Results Dropdown */}
                  {searchTerm.trim() !== '' && searchResults.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 12px 35px rgba(0,0,0,0.15)',
                      border: `1px solid rgba(0,0,0,0.05)`,
                      maxHeight: '400px',
                      overflowY: 'auto',
                      zIndex: 8000,
                      padding: '8px'
                    }}>
                    {searchResults.map((p) => (
                      <div
                        key={p._id}
                        onClick={() => {
                          setSidePanelProductWithReset(p);
                          setIsSidePanelOpen(true);
                          setSearchTerm('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        className="modal-item"
                      >
                        <div style={{ width: '40px', height: '40px', backgroundColor: '#f8fafc', borderRadius: '6px', overflow: 'hidden', border: '1px solid #f1f5f9', flexShrink: 0 }}>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📦</div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontWeight: 600 }}>{p.brand || 'No Brand'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* No Results Message */}
                {searchTerm.trim() !== '' && searchResults.length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 12px 35px rgba(0,0,0,0.15)',
                    border: `1px solid rgba(0,0,0,0.05)`,
                    padding: '16px',
                    textAlign: 'center',
                    color: theme.colors.textMuted,
                    fontSize: '14px',
                    fontWeight: 600,
                    zIndex: 8000,
                    backdropFilter: 'blur(10px)'
                  }}>
                    No products found matching your search.
                  </div>
                )}
              </div>
            </div>

            {/* Map Area */}
            <div
              ref={setMapContainer}
              style={{
                position: 'relative',
                flexGrow: 1,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                backgroundColor: theme.colors.surfaceAlt,
                overflow: 'hidden',
                padding: `${MAP_PADDING_TOP}px ${MAP_PADDING_SIDE}px ${MAP_PADDING_SIDE}px ${MAP_PADDING_SIDE}px`,
                overscrollBehavior: 'contain',
                cursor: isDragging ? 'grabbing' : 'default',
              }}
              onClick={(e) => {
                if (!isDragging) {
                  if (showProductLocation) clearProductLocation();
                }
              }}
              onWheel={handleWheelZoom}
              onMouseDown={handleMouseDown}
              onContextMenu={(e) => e.preventDefault()}
            >
              {/* Pan Instructions */}
              <div style={panInstructionsStyle}>
                <span style={{ fontSize: '16px' }}>🖱️</span>
                {isDragging ? 'Dragging map...' : 'Drag to pan • Scroll to zoom'}
              </div>

              {/* Direction Message Indicator */}
              {directionMessage && (
                <div style={{
                  position: 'absolute',
                  top: '75px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(13, 71, 161, 0.95)',
                  color: '#fff',
                  padding: '10px 24px',
                  borderRadius: '16px',
                  fontSize: '15px',
                  fontWeight: '700',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                  zIndex: 7500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: '1.5px solid rgba(255,255,255,0.8)',
                  animation: 'slide-down 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  maxWidth: '90%',
                  textAlign: 'center',
                  backdropFilter: 'blur(4px)'
                }}>
                  <div style={{ fontSize: '18px' }}>📍</div>
                  {directionMessage}
                  <FaTimes 
                    style={{ cursor: 'pointer', marginLeft: '10px', opacity: 0.7 }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      clearProductLocation();
                    }}
                  />
                </div>
              )}

              {/* Map Canvas */}
              <div
                style={{
                  position: 'absolute',
                  left: `${panOffset.x + MAP_PADDING_SIDE}px`,
                  top: `${panOffset.y + MAP_PADDING_TOP}px`,
                  width: `${baseMapSize.width}px`,
                  height: `${baseMapSize.height}px`,
                  boxSizing: 'border-box',
                  backgroundColor: '#f9fafb',
                  border: '2px solid rgba(15,23,42,0.22)',
                  borderRadius: '0',
                  overflow: 'hidden',
                  transition: isDragging ? 'none' : 'left 0.1s ease-out, top 0.1s ease-out',
                  transform: `scale(${mapScale})`,
                  transformOrigin: 'top left'
                }}
              >
                {/* Map Elements Layer */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                  {mapData && mapData.elements?.map((el, idx) => renderElement(el, idx))}
                  {mapData && mapData.widgets?.map((widget, idx) => renderWidget(widget, idx))}
                  
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {mapData && mapData.paths?.map((path, i) => (
                      <polyline key={`path-${i}`} points={path.map(p => `${p.x},${p.y}`).join(' ')} stroke="#374151" strokeWidth={3} fill="none" />
                    ))}
                  </svg>
                </div>

                {/* Markers & Paths Layer */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3000, pointerEvents: 'none' }}>
                  {renderProductLocation()}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                    <defs>
                      <filter id="path-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
                      <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 L2,4 Z" fill="#22c55e" /></marker>
                    </defs>
                    {pathToProduct && pathToProduct.length > 0 && (
                      <g>
                        <polyline points={pathToProduct.map(p => `${p.x},${p.y}`).join(' ')} stroke="#22c55e" strokeWidth={8} fill="none" opacity={0.2} strokeLinecap="round" strokeLinejoin="round" filter="url(#path-glow)" />
                        <polyline points={pathToProduct.map(p => `${p.x},${p.y}`).join(' ')} stroke="#22c55e" strokeWidth={4} fill="none" strokeDasharray="12,6" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} markerEnd="url(#arrowhead)" style={{ animation: 'dash-animation 30s linear infinite' }} />
                      </g>
                    )}
                  </svg>
                  {showProductLocation && productLocation && (
                    <div style={{ position: 'absolute', left: productLocation.x, top: productLocation.y, zIndex: 4500, pointerEvents: 'none' }}>
                      <div style={{ position: 'absolute', bottom: '25px', left: '50%', transform: 'translateX(-50%)', backgroundColor: theme.colors.danger, color: '#ffffff', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '800', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(220, 38, 38, 0.35)', border: '2px solid #ffffff', zIndex: 4600 }}>THE PRODUCT IS HERE</div>
                      <div style={{ position: 'absolute', left: -10, top: -10, width: 20, height: 20, backgroundColor: '#dc2626', borderRadius: '50%', border: '3px solid #ffffff', boxShadow: '0 0 0 3px #dc2626, 0 4px 12px rgba(220, 38, 38, 0.4)', animation: 'pulse 2s infinite' }} />
                    </div>
                  )}
                                    {productLocation && kioskLocation && (
                    <div style={{ position: 'absolute', left: kioskLocation.x, top: kioskLocation.y, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: pixelsPerUnit * 1.5, height: pixelsPerUnit * 1.5, border: `4px solid ${theme.colors.primary}`, borderRadius: '50%', transform: 'translate(-50%, -50%)', animation: 'pulse-ring 2s infinite', pointerEvents: 'none' }} />
                      <div style={{ backgroundColor: theme.colors.primary, color: '#ffffff', padding: '6px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', whiteSpace: 'nowrap', boxShadow: `0 6px 15px ${theme.colors.primary}73`, animation: 'pulse 1.5s infinite', border: '2px solid #ffffff', transform: 'translateY(-50%)' }}>YOU ARE HERE</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Shopping Panel */}
          <div className="side-panel">
            {/* Side Panel Header */}
            <div style={{
              padding: '16px',
              borderBottom: `1px solid ${theme.colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.colors.surfaceAlt,
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🛒</span>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: theme.colors.primary, letterSpacing: '-0.5px' }}>
                  {sidePanelProduct ? 'Product Details' : sidePanelCategory ? sidePanelCategory : 'Kiosk Assistant'}
                </h2>
              </div>
              {(sidePanelProduct || sidePanelCategory) && (
                <button
                  onClick={() => {
                    setSidePanelProduct(null);
                    setSidePanelCategory(null);
                  }}
                  style={{
                    background: theme.colors.primary,
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#ffffff',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(0, 105, 92, 0.2)'
                  }}
                  title="Home"
                >
                  <FaHome size={16} />
                </button>
              )}
            </div>

            {/* Side Panel Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {!sidePanelCategory && !sidePanelProduct ? (
                // Categories List (Home View)
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ 
                    backgroundColor: '#f1f5f9', 
                    padding: '12px', 
                    borderRadius: '10px', 
                    border: '1px solid #e2e8f0',
                    marginBottom: '4px'
                  }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: theme.colors.text }}>Welcome!</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: theme.colors.textMuted, lineHeight: '1.4' }}>
                      Browse categories or use search to find products.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '11px', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 2px 2px', fontWeight: 700 }}>Browse Categories</h3>
                    {categories.map((cat) => (
                      <div
                        key={cat}
                        onClick={() => {
                          setSidePanelCategory(cat);
                          const filtered = products.filter(p => normalizeCategory(p.category).toLowerCase() === cat.toLowerCase());
                          setModalProducts(filtered);
                        }}
                        style={{
                          padding: '12px',
                          backgroundColor: '#ffffff',
                          borderRadius: '10px',
                          border: '1.5px solid #e2e8f0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        className="modal-item"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', backgroundColor: theme.colors.surfaceAlt, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                            📦
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: theme.colors.text }}>{cat}</span>
                        </div>
                        <FaPlus size={12} color={theme.colors.primary} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : sidePanelCategory && !sidePanelProduct ? (
                // Products in Category
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div 
                    onClick={() => setSidePanelCategory(null)}
                    style={{ color: theme.colors.primary, fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    ← Back to Categories
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modalProducts.length > 0 ? (
                      modalProducts.map((p) => (
                        <div
                          key={p._id}
                          onClick={() => setSidePanelProductWithReset(p)}
                          style={{
                            padding: '12px',
                            backgroundColor: '#ffffff',
                            borderRadius: '10px',
                            border: '1.5px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                          className="modal-item"
                        >
                          <div style={{ width: '50px', height: '50px', backgroundColor: '#f8fafc', borderRadius: '8px', overflow: 'hidden', border: '1px solid #f1f5f9', flexShrink: 0 }}>
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📦</div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                            <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontWeight: 600 }}>{p.brand || 'No Brand'}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                        <div style={{ color: theme.colors.text, fontWeight: 700, fontSize: '16px' }}>No products found</div>
                        <div style={{ color: theme.colors.textMuted, fontSize: '14px', marginTop: '4px' }}>Try another category or search term.</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Product Details
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div 
                    onClick={() => setSidePanelProduct(null)}
                    style={{ color: theme.colors.primary, fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 0' }}
                  >
                    ← Back
                  </div>
                  
                  <div style={{ 
                    width: '100%', 
                    height: '180px', 
                    backgroundColor: '#ffffff', 
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {sidePanelProduct.imageUrl || sidePanelProduct.image ? (
                      <img 
                        src={sidePanelProduct.imageUrl || (sidePanelProduct.image?.startsWith('http') ? sidePanelProduct.image : `http://localhost:5000${sidePanelProduct.image}`)} 
                        alt={sidePanelProduct.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} 
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300?text=No+Image';
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '40px' }}>📦</div>
                        <div style={{ fontSize: '10px', color: theme.colors.textMuted, fontWeight: 600 }}>No Image</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                      <span style={{ 
                        padding: '2px 6px', 
                        backgroundColor: theme.colors.surfaceAlt, 
                        color: theme.colors.primary, 
                        borderRadius: '4px', 
                        fontSize: '9px', 
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {normalizeCategory(sidePanelProduct.category) || 'General'}
                      </span>
                      {getSelectedQuantity(sidePanelProduct) > 0 ? (
                        <span style={{ padding: '2px 6px', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: '4px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }}>In Stock</span>
                      ) : (
                        <span style={{ padding: '2px 6px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '4px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }}>Out of Stock</span>
                      )}
                    </div>
                    <h2 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 900, color: theme.colors.text, lineHeight: '1.2' }}>{sidePanelProduct.name}</h2>
                    <div style={{ color: theme.colors.textMuted, fontWeight: 700, fontSize: '12px' }}>{sidePanelProduct.brand || 'No Brand'}</div>
                  </div>

                  {/* Variant Selection UI */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {getSizesWithQuantities(sidePanelProduct).length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textMuted, marginBottom: '2px', textTransform: 'uppercase' }}>Select Size</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {getSizesWithQuantities(sidePanelProduct).map(v => (
                            <button
                              key={v.size}
                              onClick={() => setSelectedSize(v.size)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: `1.5px solid ${selectedSize === v.size ? theme.colors.primary : '#e2e8f0'}`,
                                backgroundColor: selectedSize === v.size ? theme.colors.surfaceAlt : '#ffffff',
                                color: selectedSize === v.size ? theme.colors.primary : theme.colors.text,
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {v.size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {getColorsWithQuantities(sidePanelProduct).length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textMuted, marginBottom: '2px', textTransform: 'uppercase' }}>Select Color</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {getColorsWithQuantities(sidePanelProduct).map(v => (
                            <button
                              key={v.color}
                              onClick={() => setSelectedColor(v.color)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: `1.5px solid ${selectedColor === v.color ? theme.colors.primary : '#e2e8f0'}`,
                                backgroundColor: selectedColor === v.color ? theme.colors.surfaceAlt : '#ffffff',
                                color: selectedColor === v.color ? theme.colors.primary : theme.colors.text,
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {v.color}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {sidePanelProduct.brandQuantities?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textMuted, marginBottom: '2px', textTransform: 'uppercase' }}>Select Brand</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {sidePanelProduct.brandQuantities.map(v => {
                            const brand = cleanLabel(v.brand);
                            return (
                              <button
                                key={brand}
                                onClick={() => setSelectedBrand(brand)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: `1.5px solid ${selectedBrand === brand ? theme.colors.primary : '#e2e8f0'}`,
                                  backgroundColor: selectedBrand === brand ? theme.colors.surfaceAlt : '#ffffff',
                                  color: selectedBrand === brand ? theme.colors.primary : theme.colors.text,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {brand}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {sidePanelProduct.unitQuantities?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: theme.colors.textMuted, marginBottom: '2px', textTransform: 'uppercase' }}>Select Unit</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {sidePanelProduct.unitQuantities.map(v => {
                            const unit = cleanLabel(v.unit);
                            return (
                              <button
                                key={unit}
                                onClick={() => setSelectedUnit(unit)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: `1.5px solid ${selectedUnit === unit ? theme.colors.primary : '#e2e8f0'}`,
                                  backgroundColor: selectedUnit === unit ? theme.colors.surfaceAlt : '#ffffff',
                                  color: selectedUnit === unit ? theme.colors.primary : theme.colors.text,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {unit}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    backgroundColor: theme.colors.surfaceAlt, 
                    padding: '10px 14px', 
                    borderRadius: '10px', 
                    border: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginBottom: '2px', fontWeight: 600 }}>Current Stock</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: theme.colors.text }}>
                        {getSelectedQuantity(sidePanelProduct)} {getSelectedUnitDisplay(sidePanelProduct)}
                      </div>
                    </div>
                  </div>

                  {sidePanelProduct.details && (
                    <div style={{ padding: '2px' }}>
                      <div style={{ fontWeight: 800, fontSize: '11px', marginBottom: '4px', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</div>
                      <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.5', color: '#4b5563', whiteSpace: 'pre-wrap' }}>{sidePanelProduct.details}</p>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', padding: '6px 0' }}>
                    <button
                      onClick={() => {
                        showProductLocationOnMap(sidePanelProduct);
                      }}
                      style={{
                        width: '100%',
                        padding: '14px',
                        backgroundColor: theme.colors.primary,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 6px 16px rgba(0, 105, 92, 0.15)',
                        transition: 'all 0.2s'
                      }}
                      className="locate-btn"
                    >
                      <FaMapMarkerAlt /> LOCATE ON MAP
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '18px 32px',
  background: 'transparent',
  zIndex: 7000,
};

const branchIndicatorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 18px',
  backgroundColor: '#f0f9ff',
  borderRadius: '24px',
  border: '1.5px solid #e0f2fe',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
};

const branchLabelStyle = {
  fontSize: '13px',
  color: '#64748b',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const branchNameStyle = {
  fontSize: '14px',
  color: theme.colors.primary,
  fontWeight: 800,
};

const searchContainer = {
  display: 'flex',
  alignItems: 'center',
  padding: '0',
  background: 'transparent',
  gap: '12px',
  position: 'absolute',
  top: '12px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 7000,
  width: 'calc(100% - 80px)',
  maxWidth: '1200px'
};

const searchInput = {
  flex: 1,
  border: `1px solid rgba(0, 0, 0, 0.05)`,
  borderRadius: '12px',
  padding: '10px 16px',
  fontSize: '14px',
  backgroundColor: '#ffffff',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 8px 25px rgba(0, 77, 64, 0.1)',
  fontWeight: 500,
  color: theme.colors.text
};

const panInstructionsStyle = {
  position: 'absolute',
  bottom: 20,
  left: '20px',
  backgroundColor: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(4px)',
  color: theme.colors.textMuted,
  padding: '10px 18px',
  borderRadius: '12px',
  fontSize: '13px',
  fontWeight: 600,
  zIndex: 100,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  border: `1.5px solid ${theme.colors.border}`,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

export default Kiosk;
