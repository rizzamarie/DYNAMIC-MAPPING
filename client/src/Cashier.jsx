import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { FaUserCircle, FaBuilding, FaPlus, FaMinus, FaTrashAlt } from "react-icons/fa";

const CashierLogo = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
    <svg
      width="52"
      height="52"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 6px rgba(0,0,0,0.3))" }}
    >
      <defs>
        <linearGradient id="cashierGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00695C" stopOpacity="1" />
          <stop offset="100%" stopColor="#00796B" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d="M50 95C50 95 20 65 20 40C20 23.4315 33.4315 10 50 10C66.5685 10 80 23.4315 80 40C80 65 50 95 50 95Z"
        fill="url(#cashierGrad1)"
      />
      <path
        d="M50 95C50 95 20 65 20 40C20 23.4315 33.4315 10 50 10"
        stroke="white"
        strokeWidth="2"
        strokeOpacity="0.2"
      />
      <path d="M50 10V40H80C80 23.4315 66.5685 10 50 10Z" fill="#26A69A" />
      <path d="M20 40C20 23.4315 33.4315 10 50 10V40H20Z" fill="#004D40" />
      <path d="M20 40H50V70C35 60 20 40 20 40Z" fill="#fd7e14" />
      <path d="M50 40H80C80 40 65 60 50 70V40Z" fill="#ffc107" />
      <circle cx="50" cy="40" r="12" fill="white" />
    </svg>
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontSize: 26,
          fontWeight: 800,
          lineHeight: 1,
          color: "#FFFFFF",
          letterSpacing: -0.5,
          textShadow: "0 2px 4px rgba(0,0,0,0.45)"
        }}
      >
        Map<span style={{ color: "#E0F2F1" }}>timize</span>
      </span>
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.9)",
          letterSpacing: 0.5,
          marginTop: 2
        }}
      >
        Map it right. Sell it fast.
      </span>
    </div>
  </div>
);

const Cashier = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [variantModal, setVariantModal] = useState({
    open: false,
    product: null,
    chosenSize: "",
    chosenColor: "",
    chosenBrand: "",
    chosenUnit: "",
    chosenQty: 1,
    editing: false,
    originalSize: "",
    originalColor: "",
    originalBrand: "",
    originalUnit: "",
    originalQty: 0,
  });
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [inlineSelection, setInlineSelection] = useState({});
  const [cashierUser, setCashierUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [categoryView, setCategoryView] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [gratuity, setGratuity] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [viewMode, setViewMode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const tutorialChips = ['Ice Coffee', 'Hot Coffee', 'Artisan Tea', 'Ice Mojito', 'Beverage'];

  const orderId = useMemo(() => {
    const now = Date.now().toString();
    return `ORD-${now.slice(-6)}`;
  }, []);

  // Load products from inventory
  useEffect(() => {
    fetchProducts();

    // Auto-refresh inventory when updated from Inventory Manager or Staff Dashboard
    const checkForUpdates = () => {
      const lastUpdate = localStorage.getItem('inventoryLastUpdate');
      if (lastUpdate) {
        const lastKnownUpdate = localStorage.getItem('cashierLastKnownUpdate');
        if (!lastKnownUpdate || lastUpdate !== lastKnownUpdate) {
          fetchProducts();
          localStorage.setItem('cashierLastKnownUpdate', lastUpdate);
        }
      }
    };

    // Listen for immediate inventory updates
    const handleInventoryUpdate = () => {
      fetchProducts();
      const lastUpdate = localStorage.getItem('inventoryLastUpdate');
      if (lastUpdate) {
        localStorage.setItem('cashierLastKnownUpdate', lastUpdate);
      }
    };
    window.addEventListener('inventoryUpdated', handleInventoryUpdate);

    // Poll for updates every 2 seconds
    const updateInterval = setInterval(checkForUpdates, 2000);
    checkForUpdates(); // Check immediately

    return () => {
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
      clearInterval(updateInterval);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uname = params.get('username');
    const mode = params.get('view') || params.get('mode') || '';
    setViewMode(mode);
    const init = async () => {
      try {
        const res = await axios.get('http://localhost:5000/users');
        const list = Array.isArray(res.data) ? res.data : [];
        const found = uname ? list.find(u => String(u.username).toLowerCase() === String(uname).toLowerCase()) : null;
        setCashierUser(found || null);
      } catch {
        setCashierUser(null);
      }
    };
    init();
  }, []);

  const handlePrint = () => {
    if (viewMode === 'tutorial') {
      alert('Demo mode: This shows how printing works. No inventory changes.');
      return;
    }
    checkout();
  };

  const fetchProducts = async () => {
    try {
      const role = localStorage.getItem('currentUserRole');
      const branch = localStorage.getItem('currentBranch');
      let url = "http://localhost:5000/products";

      if (branch && role && role !== 'admin') {
        url = `http://localhost:5000/products?branch=${encodeURIComponent(branch)}`;
      }

      const res = await axios.get(url);
      const active = (res.data || [])
        .filter(p => !p.deletedAt)
        .filter(p => p.branch && String(p.branch).trim().length > 0);
      setProducts(active);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  // Helper function to normalize variant values for comparison (treat null, undefined, and empty string as equivalent)
  const normalizeVariant = (val) => {
    if (val === null || val === undefined || val === '') return '';
    return String(val);
  };

  // Helper to check if a value is truthy (not null, undefined, or empty string)
  const hasValue = (val) => val !== null && val !== undefined && val !== '';

  // Get raw available stock from product data (no cart reservations applied)
  const getAvailableStock = (product, size = null, color = null, brand = null, unit = null) => {
    if (!product) return 0;
    
    // Normalize input values
    const nSize = normalizeVariant(size);
    const nColor = normalizeVariant(color);
    const nBrand = normalizeVariant(brand);
    const nUnit = normalizeVariant(unit);
    
    // Determine which variant types are specified
    const hasSize = hasValue(nSize);
    const hasColor = hasValue(nColor);
    const hasBrand = hasValue(nBrand);
    const hasUnit = hasValue(nUnit);
    
    // Priority 1: Brand-Unit combination (when both brand and unit are specified)
    if (hasBrand && hasUnit && product.brandUnitQuantities?.length > 0) {
      const v = product.brandUnitQuantities.find((q) => {
        const qBrand = String(q.brand || '').trim();
        const qUnit = String(q.unit || '').trim();
        return qBrand === String(nBrand).trim() && qUnit === String(nUnit).trim();
      });
      if (v) {
        const qty = Number(v.quantity);
        if (!isNaN(qty)) return qty;
      }
    }
    
    // Priority 2: Size-Color combination (when both size and color are specified)
    if (hasSize && hasColor && product.sizeColorQuantities?.length > 0) {
      const variant = product.sizeColorQuantities.find((v) => {
        const vSize = String(v.size || '').trim();
        const vColor = String(v.color || '').trim();
        return vSize === String(nSize).trim() && vColor === String(nColor).trim();
      });
      if (variant) {
        const qty = Number(variant.quantity);
        if (!isNaN(qty)) return qty;
      }
    }
    
    // Priority 3: Brand-only (when brand is specified but unit is not)
    if (hasBrand && !hasUnit && product.brandQuantities?.length > 0) {
      const v = product.brandQuantities.find((q) => {
        const qBrand = String(q.brand || '').trim();
        return qBrand === String(nBrand).trim();
      });
      if (v) {
        const qty = Number(v.quantity);
        if (!isNaN(qty)) return qty;
      }
    }
    
    // Priority 4: Unit-only (when unit is specified but brand is not)
    if (hasUnit && !hasBrand && product.unitQuantities?.length > 0) {
      const v = product.unitQuantities.find((q) => {
        const qUnit = String(q.unit || '').trim();
        return qUnit === String(nUnit).trim();
      });
      if (v) {
        const qty = Number(v.quantity);
        if (!isNaN(qty)) return qty;
      }
    }
    
    // Priority 5: Color-only (when color is specified but size is not)
    if (hasColor && !hasSize && product.colorQuantities?.length > 0) {
      const variant = product.colorQuantities.find((v) => {
        const vColor = String(v.color || '').trim();
        return vColor === String(nColor).trim();
      });
      if (variant) {
        const qty = Number(variant.quantity);
        if (!isNaN(qty)) return qty;
      }
    }
    
    // Priority 6: Size-only (when size is specified but color is not)
    if (hasSize && !hasColor && product.sizeQuantities?.length > 0) {
      const variant = product.sizeQuantities.find((v) => {
        const vSize = String(v.size || '').trim();
        return vSize === String(nSize).trim();
      });
      if (variant) {
        const qty = Number(variant.quantity);
        if (!isNaN(qty)) return qty;
      }
    }
    
    // Fallback: Check if product has any variants at all
    const hasAnyVariants = (product.sizeColorQuantities && product.sizeColorQuantities.length > 0) ||
                          (product.colorQuantities && product.colorQuantities.length > 0) ||
                          (product.sizeQuantities && product.sizeQuantities.length > 0) ||
                          (product.brandUnitQuantities && product.brandUnitQuantities.length > 0) ||
                          (product.brandQuantities && product.brandQuantities.length > 0) ||
                          (product.unitQuantities && product.unitQuantities.length > 0);
    
    // If product has variants but no match found, return 0 (variant doesn't exist)
    if (hasAnyVariants && (hasSize || hasColor || hasBrand || hasUnit)) {
      return 0;
    }
    
    // Fallback to total stock if no variants or no variant specified
    const totalStock = Number(product.totalStock) || Number(product.stockQty) || 0;
    return totalStock;
  };

const addToCart = (product) => {
  const hasVariants =
    (product.sizeOptions && product.sizeOptions.length > 0) ||
    (product.colorOptions && product.colorOptions.length > 0) ||
    (product.brandOptions && product.brandOptions.length > 0) ||
    (product.unitOptions && product.unitOptions.length > 0) ||
    (product.brandUnitQuantities && product.brandUnitQuantities.length > 0) ||
    (product.brandQuantities && product.brandQuantities.length > 0) ||
    (product.unitQuantities && product.unitQuantities.length > 0);

  if (hasVariants) {
    setVariantModal({
      open: true,
      product,
      chosenSize: "",
      chosenColor: "",
      chosenBrand: "",
      chosenUnit: "",
      chosenQty: 1,
      editing: false,
      originalSize: "",
      originalColor: "",
      originalBrand: "",
      originalUnit: "",
      originalQty: 0,
    });
  } else {
    const available = getLiveAvailableStock(product);
    if (available <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Out of Stock',
        text: 'This product is currently out of stock.',
        confirmButtonColor: '#00695C'
      });
      return;
    }

    Swal.fire({
      title: 'Confirm Purchase',
      text: `Do you want to add "${product.name}" to your cart?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00695C',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, add it!'
    }).then((result) => {
      if (result.isConfirmed) {
        setCart((prev) => {
          const existing = prev.find(
            (item) =>
              item._id === product._id &&
              !item.variantSize &&
              !item.variantColor &&
              !item.variantBrand &&
              !item.variantUnit
          );

          if (existing) {
            if (available <= 0) {
              Swal.fire('Error', 'No more stock available!', 'error');
              return prev;
            }
            return prev.map((item) =>
              item === existing
                ? { ...item, qty: item.qty + 1 }
                : item
            );
          }

          return [...prev, { ...product, qty: 1 }];
        });
      }
    });
  }
};

const addInlineToCart = (product) => {
  const sel = inlineSelection[product._id] || {};
  const qty = sel.qty || 1;
  const availableStock = getLiveAvailableStock(product, sel.size, sel.color, sel.brand, sel.unit);
  if (availableStock <= 0) {
    Swal.fire({
      icon: 'error',
      title: 'Out of Stock',
      text: 'This selection is currently out of stock.',
      confirmButtonColor: '#00695C'
    });
    return;
  }
  if (qty < 1) {
    Swal.fire({
      icon: 'warning',
      title: 'Invalid Quantity',
      text: 'Quantity must be at least 1',
      confirmButtonColor: '#00695C'
    });
    return;
  }
  if (qty > availableStock) {
    Swal.fire({
      icon: 'warning',
      title: 'Insufficient Stock',
      text: `Only ${availableStock} units available for this selection.`,
      confirmButtonColor: '#00695C'
    });
    return;
  }

  Swal.fire({
    title: 'Confirm Purchase',
    text: `Do you want to add ${qty} unit(s) of "${product.name}" to your cart?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#00695C',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, add it!'
  }).then((result) => {
    if (result.isConfirmed) {
      const existing = cart.find((c) => {
        if (c._id !== product._id) return false;
        // Normalize all variant values for comparison
        const cartSize = normalizeVariant(c.variantSize);
        const cartColor = normalizeVariant(c.variantColor);
        const cartBrand = normalizeVariant(c.variantBrand);
        const cartUnit = normalizeVariant(c.variantUnit);
        const selSize = normalizeVariant(sel.size);
        const selColor = normalizeVariant(sel.color);
        const selBrand = normalizeVariant(sel.brand);
        const selUnit = normalizeVariant(sel.unit);
        return cartSize === selSize &&
               cartColor === selColor &&
               cartBrand === selBrand &&
               cartUnit === selUnit;
      });

      if (existing) {
        const newQty = existing.qty + qty;
        if (newQty <= availableStock) {
          updateCartQty(existing._id, newQty, sel.size, sel.color, sel.brand, sel.unit);
        } else {
          Swal.fire('Error', 'No more stock available for this selection!', 'error');
          return;
        }
      } else {
        setCart((prev) => [
          ...prev,
          {
            ...product,
            qty,
            variantSize: sel.size,
            variantColor: sel.color,
            variantBrand: sel.brand,
            variantUnit: sel.unit,
          },
        ]);
      }
    }
  });
};


  // Open modal for variants OR add directly
  { /* const addToCart = (product) => {
    if} (product.hasVariants) {
      setVariantModal({ open: true, product, chosenSize: "", chosenColor: "" });
    } else {
      if (getAvailableStock(product) <= 0) {
        alert("Out of stock!");
        return;
      }
      setCart((prev) => [...prev, { ...product, qty: 1 }]);
    }
  }; */}
  const addVariantToCart = () => {
    const {
      product,
      chosenSize,
      chosenColor,
      chosenBrand,
      chosenUnit,
      chosenQty,
      editing,
      originalSize,
      originalColor,
      originalBrand,
      originalUnit,
      originalQty,
    } = variantModal;

    const baseStock = getAvailableStock(product, chosenSize, chosenColor, chosenBrand, chosenUnit);
    const chosenSizeNorm = normalizeVariant(chosenSize);
    const chosenColorNorm = normalizeVariant(chosenColor);
    const chosenBrandNorm = normalizeVariant(chosenBrand);
    const chosenUnitNorm = normalizeVariant(chosenUnit);

    let reservedFromOthers = 0;

    if (editing) {
      const originalSizeNorm = normalizeVariant(originalSize);
      const originalColorNorm = normalizeVariant(originalColor);
      const originalBrandNorm = normalizeVariant(originalBrand);
      const originalUnitNorm = normalizeVariant(originalUnit);

      reservedFromOthers = sumReserved(
        cart.filter((c) => {
          if (c._id !== product._id) return false;

          const cartSize = normalizeVariant(c.variantSize);
          const cartColor = normalizeVariant(c.variantColor);
          const cartBrand = normalizeVariant(c.variantBrand);
          const cartUnit = normalizeVariant(c.variantUnit);

          const isSameVariantAsNew =
            cartSize === chosenSizeNorm &&
            cartColor === chosenColorNorm &&
            cartBrand === chosenBrandNorm &&
            cartUnit === chosenUnitNorm;

          const isOriginalVariant =
            cartSize === originalSizeNorm &&
            cartColor === originalColorNorm &&
            cartBrand === originalBrandNorm &&
            cartUnit === originalUnitNorm &&
            Number(c.qty) === Number(originalQty);

          return isSameVariantAsNew && !isOriginalVariant;
        })
      );
    } else {
      reservedFromOthers = sumReserved(
        cart.filter((c) => {
          if (c._id !== product._id) return false;
          const cartSize = normalizeVariant(c.variantSize);
          const cartColor = normalizeVariant(c.variantColor);
          const cartBrand = normalizeVariant(c.variantBrand);
          const cartUnit = normalizeVariant(c.variantUnit);
          return (
            cartSize === chosenSizeNorm &&
            cartColor === chosenColorNorm &&
            cartBrand === chosenBrandNorm &&
            cartUnit === chosenUnitNorm
          );
        })
      );
    }

    const availableStock = Math.max(0, baseStock - reservedFromOthers);

    if (availableStock <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Out of Stock',
        text: 'This variant is currently out of stock.',
        confirmButtonColor: '#00695C'
      });
      return;
    }
    if (!chosenQty || chosenQty < 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Quantity',
        text: 'Quantity must be at least 1',
        confirmButtonColor: '#00695C'
      });
      return;
    }
    if (chosenQty > availableStock) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Stock',
        text: `Only ${availableStock} units available for this selection.`,
        confirmButtonColor: '#00695C'
      });
      return;
    }

    Swal.fire({
      title: 'Confirm Purchase',
      text: `Do you want to add ${chosenQty} unit(s) of "${product.name}" to your cart?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00695C',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, add it!'
    }).then((result) => {
      if (result.isConfirmed) {
        if (editing) {
          setCart((prev) => {
            const originalSizeNorm = normalizeVariant(originalSize);
            const originalColorNorm = normalizeVariant(originalColor);
            const originalBrandNorm = normalizeVariant(originalBrand);
            const originalUnitNorm = normalizeVariant(originalUnit);

            const withoutOriginal = prev.filter((item) => {
              if (item._id !== product._id) return true;
              const itemSize = normalizeVariant(item.variantSize);
              const itemColor = normalizeVariant(item.variantColor);
              const itemBrand = normalizeVariant(item.variantBrand);
              const itemUnit = normalizeVariant(item.variantUnit);
              const isOriginal =
                itemSize === originalSizeNorm &&
                itemColor === originalColorNorm &&
                itemBrand === originalBrandNorm &&
                itemUnit === originalUnitNorm &&
                Number(item.qty) === Number(originalQty);
              return !isOriginal;
            });

            const existingIndex = withoutOriginal.findIndex((c) => {
              if (c._id !== product._id) return false;
              const cartSize = normalizeVariant(c.variantSize);
              const cartColor = normalizeVariant(c.variantColor);
              const cartBrand = normalizeVariant(c.variantBrand);
              const cartUnit = normalizeVariant(c.variantUnit);
              return (
                cartSize === chosenSizeNorm &&
                cartColor === chosenColorNorm &&
                cartBrand === chosenBrandNorm &&
                cartUnit === chosenUnitNorm
              );
            });

            if (existingIndex !== -1) {
              const clone = [...withoutOriginal];
              const existing = clone[existingIndex];
              const newQty = Number(existing.qty) + Number(chosenQty);
              if (newQty > availableStock) {
                Swal.fire('Error', 'No more stock available for this variant!', 'error');
                return prev;
              }
              clone[existingIndex] = { ...existing, qty: newQty };
              return clone;
            }

            return [
              ...withoutOriginal,
              {
                ...product,
                qty: chosenQty,
                variantSize: chosenSize,
                variantColor: chosenColor,
                variantBrand: chosenBrand,
                variantUnit: chosenUnit,
              },
            ];
          });
        } else {
          const existing = cart.find((c) => {
            if (c._id !== product._id) return false;
            const cartSize = normalizeVariant(c.variantSize);
            const cartColor = normalizeVariant(c.variantColor);
            const cartBrand = normalizeVariant(c.variantBrand);
            const cartUnit = normalizeVariant(c.variantUnit);
            return (
              cartSize === chosenSizeNorm &&
              cartColor === chosenColorNorm &&
              cartBrand === chosenBrandNorm &&
              cartUnit === chosenUnitNorm
            );
          });

          if (existing) {
            const newQty = existing.qty + chosenQty;
            if (newQty <= availableStock) {
              updateCartQty(existing._id, newQty, chosenSize, chosenColor, chosenBrand, chosenUnit);
            } else {
              Swal.fire('Error', 'No more stock available for this variant!', 'error');
              return;
            }
          } else {
            setCart((prev) => [
              ...prev,
              {
                ...product,
                qty: chosenQty,
                variantSize: chosenSize,
                variantColor: chosenColor,
                variantBrand: chosenBrand,
                variantUnit: chosenUnit,
              },
            ]);
          }
        }

        setVariantModal({
          open: false,
          product: null,
          chosenSize: "",
          chosenColor: "",
          chosenBrand: "",
          chosenUnit: "",
          chosenQty: 1,
          editing: false,
          originalSize: "",
          originalColor: "",
          originalBrand: "",
          originalUnit: "",
          originalQty: 0,
        });
      }
    });
  };

  const updateCartQty = (id, newQty, size = null, color = null, brand = null, unit = null) => {
    setCart((prev) =>
      prev.map((item) => {
        // Normalize all variant values for comparison
        const itemSize = normalizeVariant(item.variantSize);
        const itemColor = normalizeVariant(item.variantColor);
        const itemBrand = normalizeVariant(item.variantBrand);
        const itemUnit = normalizeVariant(item.variantUnit);
        const targetSize = normalizeVariant(size);
        const targetColor = normalizeVariant(color);
        const targetBrand = normalizeVariant(brand);
        const targetUnit = normalizeVariant(unit);
        
        // Check if this is the item we want to update
        if (item._id === id &&
            itemSize === targetSize &&
            itemColor === targetColor &&
            itemBrand === targetBrand &&
            itemUnit === targetUnit) {
          return { ...item, qty: newQty };
        }
        return item;
      })
    );
  };

  const removeCartItem = (id, size = null, color = null, brand = null, unit = null) => {
    setCart((prev) =>
      prev.filter((item) => {
        // Normalize all variant values for comparison
        const itemSize = normalizeVariant(item.variantSize);
        const itemColor = normalizeVariant(item.variantColor);
        const itemBrand = normalizeVariant(item.variantBrand);
        const itemUnit = normalizeVariant(item.variantUnit);
        const targetSize = normalizeVariant(size);
        const targetColor = normalizeVariant(color);
        const targetBrand = normalizeVariant(brand);
        const targetUnit = normalizeVariant(unit);
        
        // Keep items that DON'T match
        return !(item._id === id &&
                 itemSize === targetSize &&
                 itemColor === targetColor &&
                 itemBrand === targetBrand &&
                 itemUnit === targetUnit);
      })
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

  // Helper function to match variant values (with normalization and trimming)
  const variantMatches = (variantValue, itemValue) => {
    const normalizedVariant = String(variantValue || '').trim();
    const normalizedItem = normalizeVariant(itemValue);
    return normalizedVariant === normalizedItem;
  };

  const checkout = async () => {
    try {
      if (cart.length === 0) {
        alert("Cart is empty!");
        return;
      }

      // Fetch latest products to ensure we have current stock data
      const productsRes = await axios.get("http://localhost:5000/products");
      const latestProducts = productsRes.data.filter(p => !p.deletedAt);
      
      // First, validate stock availability for all items before processing
      // We need to check base stock and account for all items in cart for the same variant
      const validationErrors = [];
      const variantReservations = {}; // Track reservations by variant key
      const variantProducts = {}; // Track product info by variant key
      
      // Create a key for variant identification
      const getVariantKey = (productId, size, color, brand, unit) => {
        return `${productId}-${normalizeVariant(size)}-${normalizeVariant(color)}-${normalizeVariant(brand)}-${normalizeVariant(unit)}`;
      };
      
      // First pass: calculate total reservations per variant and store product info
      for (let item of cart) {
        const currentProduct = latestProducts.find(p => p._id === item._id);
        if (!currentProduct) {
          validationErrors.push(`${item.name} is no longer available in inventory`);
          continue;
        }
        
        const key = getVariantKey(item._id, item.variantSize, item.variantColor, item.variantBrand, item.variantUnit);
        variantReservations[key] = (variantReservations[key] || 0) + item.qty;
        if (!variantProducts[key]) {
          variantProducts[key] = {
            product: currentProduct,
            name: item.name,
            variantSize: item.variantSize,
            variantColor: item.variantColor,
            variantBrand: item.variantBrand,
            variantUnit: item.variantUnit
          };
        }
      }
      
      // Second pass: validate stock availability per variant (not per item)
      for (const [key, totalReserved] of Object.entries(variantReservations)) {
        const variantInfo = variantProducts[key];
        if (!variantInfo) continue;
        
        // Get base stock (without cart reservations)
        const baseStock = getAvailableStock(
          variantInfo.product,
          variantInfo.variantSize,
          variantInfo.variantColor,
          variantInfo.variantBrand,
          variantInfo.variantUnit
        );
        
        // Validate that base stock is sufficient for total reserved
        if (baseStock < totalReserved) {
          const variantDetails = [
            variantInfo.variantBrand && `Brand: ${variantInfo.variantBrand}`,
            variantInfo.variantUnit && `Unit: ${variantInfo.variantUnit}`,
            variantInfo.variantSize && `Size: ${variantInfo.variantSize}`,
            variantInfo.variantColor && `Color: ${variantInfo.variantColor}`
          ].filter(Boolean).join(', ');
          
          validationErrors.push(
            `${variantInfo.name}${variantDetails ? ` (${variantDetails})` : ''}: Only ${baseStock} in stock, but ${totalReserved} requested`
          );
        }
      }
      
      if (validationErrors.length > 0) {
        alert("Cannot checkout:\n\n" + validationErrors.join("\n"));
        return;
      }
      
      // Process checkout - update stock for each item
      const updateErrors = [];
      for (let item of cart) {
        try {
          // Find the current product data from the latest fetch
          const currentProduct = latestProducts.find(p => p._id === item._id);
          if (!currentProduct) {
            updateErrors.push(`${item.name} not found in inventory`);
            continue;
          }
          
          // Create updated product object with all fields
          let updatedProduct = { ...currentProduct };
          
          // Normalize item variant values
          const itemSize = normalizeVariant(item.variantSize);
          const itemColor = normalizeVariant(item.variantColor);
          const itemBrand = normalizeVariant(item.variantBrand);
          const itemUnit = normalizeVariant(item.variantUnit);
          
          // Check if product has variants
          const hasVariants = (currentProduct.sizeColorQuantities && currentProduct.sizeColorQuantities.length > 0) ||
                             (currentProduct.colorQuantities && currentProduct.colorQuantities.length > 0) ||
                             (currentProduct.sizeQuantities && currentProduct.sizeQuantities.length > 0) ||
                             (currentProduct.brandUnitQuantities && currentProduct.brandUnitQuantities.length > 0) ||
                             (currentProduct.brandQuantities && currentProduct.brandQuantities.length > 0) ||
                             (currentProduct.unitQuantities && currentProduct.unitQuantities.length > 0);
          
          let stockUpdated = false;
          
          if (hasVariants) {
            // Check for brand-unit combination (highest priority when both are specified)
            if (hasValue(itemBrand) && hasValue(itemUnit) && currentProduct.brandUnitQuantities?.length > 0) {
              updatedProduct.brandUnitQuantities = currentProduct.brandUnitQuantities.map((buq) => {
                if (variantMatches(buq.brand, itemBrand) && variantMatches(buq.unit, itemUnit)) {
                  stockUpdated = true;
                  const newQty = Math.max(0, (Number(buq.quantity) || 0) - item.qty);
                  return { ...buq, quantity: newQty };
                }
                return buq;
              });
            }
            // Check for size-color combination (when both are specified)
            else if (hasValue(itemSize) && hasValue(itemColor) && currentProduct.sizeColorQuantities?.length > 0) {
              updatedProduct.sizeColorQuantities = currentProduct.sizeColorQuantities.map((scq) => {
                if (variantMatches(scq.size, itemSize) && variantMatches(scq.color, itemColor)) {
                  stockUpdated = true;
                  const newQty = Math.max(0, (Number(scq.quantity) || 0) - item.qty);
                  return { ...scq, quantity: newQty };
                }
                return scq;
              });
            }
            // Check for brand-only (when brand is specified but unit is not)
            else if (hasValue(itemBrand) && !hasValue(itemUnit) && currentProduct.brandQuantities?.length > 0) {
              updatedProduct.brandQuantities = currentProduct.brandQuantities.map((bq) => {
                if (variantMatches(bq.brand, itemBrand)) {
                  stockUpdated = true;
                  const newQty = Math.max(0, (Number(bq.quantity) || 0) - item.qty);
                  return { ...bq, quantity: newQty };
                }
                return bq;
              });
            }
            // Check for unit-only (when unit is specified but brand is not)
            else if (hasValue(itemUnit) && !hasValue(itemBrand) && currentProduct.unitQuantities?.length > 0) {
              updatedProduct.unitQuantities = currentProduct.unitQuantities.map((uq) => {
                if (variantMatches(uq.unit, itemUnit)) {
                  stockUpdated = true;
                  const newQty = Math.max(0, (Number(uq.quantity) || 0) - item.qty);
                  return { ...uq, quantity: newQty };
                }
                return uq;
              });
            }
            // Check for color-only (when color is specified but size is not)
            else if (hasValue(itemColor) && !hasValue(itemSize) && currentProduct.colorQuantities?.length > 0) {
              updatedProduct.colorQuantities = currentProduct.colorQuantities.map((cq) => {
                if (variantMatches(cq.color, itemColor)) {
                  stockUpdated = true;
                  const newQty = Math.max(0, (Number(cq.quantity) || 0) - item.qty);
                  return { ...cq, quantity: newQty };
                }
                return cq;
              });
            }
            // Check for size-only (when size is specified but color is not)
            else if (hasValue(itemSize) && !hasValue(itemColor) && currentProduct.sizeQuantities?.length > 0) {
              updatedProduct.sizeQuantities = currentProduct.sizeQuantities.map((sq) => {
                if (variantMatches(sq.size, itemSize)) {
                  stockUpdated = true;
                  const newQty = Math.max(0, (Number(sq.quantity) || 0) - item.qty);
                  return { ...sq, quantity: newQty };
                }
                return sq;
              });
            }
            
            if (!stockUpdated) {
              const variantInfo = [
                itemBrand && `Brand: ${itemBrand}`,
                itemUnit && `Unit: ${itemUnit}`,
                itemSize && `Size: ${itemSize}`,
                itemColor && `Color: ${itemColor}`
              ].filter(Boolean).join(', ');
              updateErrors.push(`${item.name}${variantInfo ? ` (${variantInfo})` : ''}: Could not find matching variant`);
              continue;
            }
            
            // Recalculate totalStock from all variant quantities
            updatedProduct.totalStock = calculateTotalStock(updatedProduct);
            updatedProduct.stockQty = updatedProduct.totalStock;
            updatedProduct.hasVariants = true;
          } else {
            // Update regular stock quantity (no variants)
            updatedProduct.stockQty = Math.max(0, (Number(currentProduct.stockQty) || 0) - item.qty);
            updatedProduct.totalStock = updatedProduct.stockQty;
            updatedProduct.hasVariants = false;
            stockUpdated = true;
          }

          // Send complete product object to update stock
          try {
            const role = 'cashier';
            const name =
              cashierUser?.name ||
              localStorage.getItem('currentUserName') ||
              cashierUser?.username ||
              'Cashier';
            await axios.put(
              `http://localhost:5000/products/${item._id}?source=cashier&actorRole=${encodeURIComponent(
                role
              )}&actorName=${encodeURIComponent(name)}`,
              updatedProduct
            );
          } catch (updateErr) {
            console.error(`Failed to update product ${item._id}:`, updateErr);
            updateErrors.push(`Failed to update stock for ${item.name}`);
          }
        } catch (itemErr) {
          console.error(`Error processing item ${item._id}:`, itemErr);
          updateErrors.push(`Error processing ${item.name}`);
        }
      }
      
      if (updateErrors.length > 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Checkout Completed with Errors',
          text: updateErrors.join("\n"),
          confirmButtonColor: '#00695C'
        });
      }

      // Signal inventory update to other components
      localStorage.setItem('inventoryLastUpdate', Date.now().toString());
      window.dispatchEvent(new Event('inventoryUpdated'));
      
      if (updateErrors.length === 0) {
        Swal.fire({
          icon: 'success',
          title: 'Purchase Successful!',
          text: 'Stock has been updated.',
          confirmButtonColor: '#00695C'
        });
      }
      setCart([]);
      fetchProducts(); // Refresh product list after checkout
    } catch (err) {
      console.error("Error in checkout:", err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      Swal.fire({
        icon: 'error',
        title: 'Checkout Failed',
        text: `${errorMessage}\n\nPlease try again.`,
        confirmButtonColor: '#00695C'
      });
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const getTotalBrandStock = (p) => {
    if (!p || typeof p !== 'object') return 0;
    
    // Helper function to safely sum variant quantities
    const sum = (arr) => {
      if (!Array.isArray(arr)) return 0;
      return arr.reduce((s, v) => {
        const qty = Number(v?.quantity);
        return s + (isNaN(qty) ? 0 : qty);
      }, 0);
    };
    
    // Check if product has any variant quantities
    const hasVariants = (p.sizeColorQuantities && p.sizeColorQuantities.length > 0) ||
                       (p.colorQuantities && p.colorQuantities.length > 0) ||
                       (p.sizeQuantities && p.sizeQuantities.length > 0) ||
                       (p.brandUnitQuantities && p.brandUnitQuantities.length > 0) ||
                       (p.brandQuantities && p.brandQuantities.length > 0) ||
                       (p.unitQuantities && p.unitQuantities.length > 0);
    
    if (hasVariants) {
      // Sum all variant quantities
      const totalVariants =
        sum(p.sizeColorQuantities) +
        sum(p.colorQuantities) +
        sum(p.sizeQuantities) +
        sum(p.brandUnitQuantities) +
        sum(p.brandQuantities) +
        sum(p.unitQuantities);
      
      // Return total variants if greater than 0, otherwise check totalStock
      if (totalVariants > 0) return totalVariants;
    }
    
    // Fallback to totalStock or stockQty for non-variant products
    const totalStock = Number(p.totalStock);
    const stockQty = Number(p.stockQty);
    
    if (!isNaN(totalStock) && totalStock > 0) return totalStock;
    if (!isNaN(stockQty) && stockQty >= 0) return stockQty;
    return 0;
  };

  const sumReserved = (list) => (Array.isArray(list) ? list.reduce((s, v) => s + (Number(v.qty) || 0), 0) : 0);
  const getReservedForVariant = (productId, size = null, color = null, brand = null, unit = null) => {
    // Normalize the target variant values
    const targetSize = normalizeVariant(size);
    const targetColor = normalizeVariant(color);
    const targetBrand = normalizeVariant(brand);
    const targetUnit = normalizeVariant(unit);
    
    return sumReserved(
      cart.filter((c) => {
        if (c._id !== productId) return false;
        
        // Normalize cart item variant values for comparison
        const cartSize = normalizeVariant(c.variantSize);
        const cartColor = normalizeVariant(c.variantColor);
        const cartBrand = normalizeVariant(c.variantBrand);
        const cartUnit = normalizeVariant(c.variantUnit);
        
        // Check if all variant properties match
        return cartSize === targetSize &&
               cartColor === targetColor &&
               cartBrand === targetBrand &&
               cartUnit === targetUnit;
      })
    );
  };
  const getLiveAvailableStock = (product, size = null, color = null, brand = null, unit = null) => {
    if (!product || !product._id) return 0;
    
    // Get base stock from product data
    const base = getAvailableStock(product, size, color, brand, unit);
    
    // Get reserved stock for this specific variant from cart
    const reserved = getReservedForVariant(product._id, size, color, brand, unit);
    
    // Calculate available stock (base - reserved, never negative)
    const available = Math.max(0, base - reserved);
    
    return available;
  };
  const getReservedTotalForProduct = (productId) => sumReserved(cart.filter((c) => c._id === productId));
  const getLiveTotalStock = (product) => Math.max(0, getTotalBrandStock(product) - getReservedTotalForProduct(product._id));

  const getVariantStockLabel = (product, size = null, color = null, brand = null, unit = null) => {
    const stock = getLiveAvailableStock(product, size, color, brand, unit);
    return stock > 0 ? `(${stock} left)` : `(Out of stock)`;
  };

  if (viewMode === 'tutorial') {
    return (
      <div style={styles.container}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 18px',
          background: 'linear-gradient(180deg, #004D40 0%, #00695C 50%, #00796B 100%)',
          borderRadius: 16,
          color: '#ffffff',
          marginBottom: 14,
          boxShadow: '0 12px 24px rgba(0,77,64,0.35)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {cashierUser?.profileImage ? (
              <img src={`http://localhost:5000${cashierUser.profileImage}`} alt="Cashier" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.7)' }} />
            ) : (
              <FaUserCircle size={44} color="#ffffff" />
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{cashierUser?.name || 'Cashier'}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Tutorial Mode</div>
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', padding: '8px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
            <FaBuilding /> {cashierUser?.assignedBranch || 'Unassigned'}
          </div>
        </div>
        <div style={styles.guideLayout}>
          <div style={styles.guideLeft}>
            <h3 style={styles.sectionTitle}>How Cashiering Works</h3>
            <div style={styles.stepCard}><div style={styles.stepIcon}>1</div><div><strong>Search products</strong><div style={styles.subText}>Use the search bar or category chips.</div></div></div>
            <div style={styles.stepCard}><div style={styles.stepIcon}>2</div><div><strong>Select product</strong><div style={styles.subText}>Click a card to add to cart.</div></div></div>
            <div style={styles.stepCard}><div style={styles.stepIcon}>3</div><div><strong>Choose variants</strong><div style={styles.subText}>Pick size/color/brand/unit if shown.</div></div></div>
            <div style={styles.stepCard}><div style={styles.stepIcon}>4</div><div><strong>Adjust quantities</strong><div style={styles.subText}>Change qty or remove in the cart.</div></div></div>
            <div style={styles.stepCard}><div style={styles.stepIcon}>5</div><div><strong>Apply discount & gratuity</strong><div style={styles.subText}>Enter amounts; totals update.</div></div></div>
            <div style={styles.stepCard}><div style={styles.stepIcon}>6</div><div><strong>Print receipt</strong><div style={styles.subText}>Demo mode does not update stock.</div></div></div>
            <div style={styles.guideFooter}>This tutorial mirrors the live cashier behavior.</div>
          </div>
          <div style={styles.guideRight}>
            <div style={styles.searchBar}>
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search all product here..." style={styles.searchInput} />
              <button style={styles.searchBtn}>Search</button>
              <div style={styles.toolsBox}><div style={styles.toolDot} /><div style={styles.toolDot} /><div style={styles.toolDot} /></div>
            </div>
            <div style={styles.filtersRow}>
              {tutorialChips.map((f, i) => (
                <button key={`${f}-${i}`} onClick={() => setSelectedFilter(prev => prev === f ? '' : f)} style={selectedFilter === f ? styles.chipActive : styles.chip}>{f}</button>
              ))}
            </div>
            <div style={styles.productGrid}>
              {products
                .filter(p => {
                  const matchSearch = String(p.name || '').toLowerCase().includes(searchTerm.toLowerCase());
                  const matchFilter = selectedFilter ? String(p.category || '').toLowerCase() === String(selectedFilter).toLowerCase() : true;
                  return matchSearch && matchFilter;
                })
                .slice(0, 8)
                .map((p) => (
                <div key={p._id} style={styles.productCard} onClick={() => addToCart(p)} title="Add to cart">
                  {p.image && (<img src={`http://localhost:5000${p.image}`} alt={p.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid #e3e8ff', marginBottom: 8 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>{p.name}</span>
                      <span style={styles.subText}>Stock: {getLiveTotalStock(p)}</span>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0d47a1' }}>₱{p.price}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <ul style={styles.cartList}>
                {cart.map((item, i) => {
                  const currentProduct = products.find((p) => p._id === item._id) || item;
                  const remainingStock = getLiveAvailableStock(currentProduct, item.variantSize, item.variantColor, item.variantBrand, item.variantUnit);
                  const itemKey = `${item._id}-${item.variantSize || ''}-${item.variantColor || ''}-${item.variantBrand || ''}-${item.variantUnit || ''}-${i}`;
                  return (
                    <li key={itemKey} style={styles.cartItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                            <strong>{item.name}</strong>
                            <span style={styles.subText}>x{item.qty}</span>
                          </div>
                          {item.variantBrand && <div style={styles.subText}>Brand: {item.variantBrand}</div>}
                          {item.variantUnit && <div style={styles.subText}>Unit: {item.variantUnit}</div>}
                          {item.variantSize && <div style={styles.subText}>Size: {item.variantSize}</div>}
                          {item.variantColor && <div style={styles.subText}>Color: {item.variantColor}</div>}
                          <div style={{ ...styles.subText, marginTop: 4 }}>{remainingStock > 0 ? `(${remainingStock} left)` : `(Out of stock)`}</div>
                        </div>
                        <div style={{ fontWeight: 800 }}>₱{(item.price * item.qty).toFixed(2)}</div>
                      </div>
                      <div style={styles.cartControls}>
                        <button style={styles.qtyBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (item.qty > 1) { updateCartQty(item._id, item.qty - 1, item.variantSize || null, item.variantColor || null, item.variantBrand || null, item.variantUnit || null); } else { removeCartItem(item._id, item.variantSize || null, item.variantColor || null, item.variantBrand || null, item.variantUnit || null); } }}>-</button>
                        <span style={styles.qtyText}>{item.qty}</span>
                        <button style={{ ...styles.qtyBtn, opacity: remainingStock <= 0 ? 0.5 : 1, cursor: remainingStock <= 0 ? 'not-allowed' : 'pointer' }} disabled={remainingStock <= 0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (remainingStock <= 0) { alert("No more stock available!"); return; } updateCartQty(item._id, item.qty + 1, item.variantSize || null, item.variantColor || null, item.variantBrand || null, item.variantUnit || null); }}>+</button>
                        <button style={styles.removeBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeCartItem(item._id, item.variantSize || null, item.variantColor || null, item.variantBrand || null, item.variantUnit || null); }}>✕</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {cart.length > 0 && (
                <div style={styles.summaryBox}>
                  {(() => {
                    const subtotal = totalPrice;
                    const discountValue = Math.max(0, (subtotal * (discountPercent || 0)) / 100);
                    const total = Math.max(0, subtotal - discountValue + gratuity);
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span>Subtotal</span><strong>₱{subtotal.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span>Discount ({discountPercent}%)</span>
                          <input type="number" min={0} max={100} value={discountPercent} onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} style={styles.sumInput} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={styles.subText}>Discount Value</span><strong>₱{discountValue.toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                          <span>Gratuity</span>
                          <input type="number" min={0} value={gratuity} onChange={(e) => setGratuity(Math.max(0, parseFloat(e.target.value) || 0))} style={styles.sumInput} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                          <span>Total</span><strong>₱{total.toFixed(2)}</strong>
                        </div>
                      </>
                    );
                  })()}
                  <input value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} placeholder="Add Voucher Code" style={styles.voucherInput} />
                  <button style={styles.printBtn} onClick={handlePrint}>Print Receipt</button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={styles.bottomBar}>
          <div style={styles.bottomIcon}>◼</div>
          <div style={styles.bottomIcon}>🛎</div>
          <div style={styles.bottomIcon}>🧾</div>
          <div style={styles.bottomIcon}>⚙️</div>
        </div>
      </div>
    );
  }
  const scrollbarStyles = `
    .cashier-products-scroll {
      scrollbar-width: thin;
      scrollbar-color: #0d47a1 #E0F2F1;
    }
    .cashier-products-scroll::-webkit-scrollbar {
      width: 8px;
    }
    .cashier-products-scroll::-webkit-scrollbar-track {
      background: #E0F2F1;
      border-radius: 999px;
    }
    .cashier-products-scroll::-webkit-scrollbar-thumb {
      background: #0d47a1;
      border-radius: 999px;
    }
    .cashier-cart-scroll {
      scrollbar-width: thin;
      scrollbar-color: #00695C #E0F2F1;
    }
    .cashier-cart-scroll::-webkit-scrollbar {
      width: 10px;
    }
    .cashier-cart-scroll::-webkit-scrollbar-track {
      background: #E0F2F1;
      border-radius: 999px;
    }
    .cashier-cart-scroll::-webkit-scrollbar-thumb {
      background: #00695C;
      border-radius: 999px;
    }
  `;

  return (
    <div style={styles.container}>
      <style>{scrollbarStyles}</style>
      <div style={styles.topBar}>
        <div style={styles.topWelcome}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Welcome</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {cashierUser?.assignedBranch || 'Store'} · {cashierUser?.name || 'Cashier'}
          </div>
        </div>
        <div style={styles.topSearch}>
          <CashierLogo />
        </div>
        <div style={styles.topProfile}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {cashierUser?.profileImage ? (
              <img
                src={`http://localhost:5000${cashierUser.profileImage}`}
                alt="Cashier"
                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.7)' }}
              />
            ) : (
              <FaUserCircle size={40} color="#ffffff" />
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{cashierUser?.name || 'Cashier'}</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>@{cashierUser?.username || 'username'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.16)', padding: '6px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
              <FaBuilding /> {cashierUser?.assignedBranch || 'Unassigned'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.16)', padding: '6px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
              <span style={{ width: 10, height: 10, background: '#22c55e', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.7)' }}></span>
              Active
            </div>
          </div>
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.products}>
          {categoryView ? (
            <>
              <div style={styles.categoryHeaderRow}>
                <div style={styles.categoryTitle}>Select Category</div>
              </div>
              <input
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  if (val && val.trim().length > 0) {
                    setCategoryView(false);
                    setSelectedFilter('');
                  }
                }}
                placeholder="Search categories or products..."
                style={styles.categorySearch}
              />
              <div style={styles.productsScroll} className="cashier-products-scroll">
                <div style={styles.categoryGrid}>
                  {Array.from(new Set(products.map(p => p.category).filter(Boolean)))
                    .filter((c) =>
                      String(c || '')
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    )
                    .sort((a, b) => String(a).localeCompare(String(b)))
                    .map((c) => (
                      <div
                        key={c}
                        style={styles.categoryCard}
                        onClick={() => {
                          setSelectedFilter(String(c));
                          setCategoryView(false);
                        }}
                      >
                        <div style={styles.categoryIcon}>▤</div>
                        <div style={styles.categoryTextWrap}>
                          <div style={styles.categoryName}>{c}</div>
                          <div style={styles.categoryDesc}>Browse items in this category</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={styles.filtersRow}>
                <button
                  style={styles.backChip}
                  onClick={() => {
                    setCategoryView(true);
                    setSelectedFilter('');
                    setSearchTerm('');
                  }}
                >
                  ← All categories
                </button>
                {selectedFilter && (
                  <span style={styles.currentCategoryLabel}>{selectedFilter}</span>
                )}
              </div>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search categories or products..."
                style={styles.productSearchInput}
              />
              <div style={styles.productsScroll} className="cashier-products-scroll">
                <div style={styles.productGrid}>
                  {products
                    .filter((p) => {
                      const lower = searchTerm.toLowerCase();
                      const matchSearch =
                        !lower ||
                        String(p.name || '')
                          .toLowerCase()
                          .includes(lower) ||
                        String(p.category || '')
                          .toLowerCase()
                          .includes(lower);
                      const matchFilter = selectedFilter
                        ? String(p.category || '').toLowerCase() ===
                          String(selectedFilter).toLowerCase()
                        : true;
                      return matchSearch && matchFilter;
                    })
                    .map((p) => {
                      const isInCart = cart.some((c) => c._id === p._id);
                      return (
                        <div
                          key={p._id}
                          style={{
                            ...styles.productCard,
                            ...(isInCart ? styles.productCardActive : {})
                          }}
                          onClick={() => addToCart(p)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow =
                              '0 10px 20px rgba(0,0,0,0.12)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow =
                              '0 4px 12px rgba(0,0,0,0.08)';
                          }}
                          title="Add to cart"
                        >
                          {p.image && (
                            <img
                              src={`http://localhost:5000${p.image}`}
                              alt={p.name}
                              style={{
                                width: '100%',
                                height: 120,
                                objectFit: 'cover',
                                borderRadius: 10,
                                border: '1px solid #e3e8ff',
                                marginBottom: 8
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 8
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: 13,
                                  color: '#0f172a'
                                }}
                              >
                                {p.name}
                              </span>
                              <span style={styles.subText}>
                                Stock: {getLiveTotalStock(p)}
                              </span>
                            </div>
                            <span style={{ fontWeight: 800, color: '#0d47a1' }}>
                              ₱{p.price}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={styles.cart}>
          <div style={styles.cartHeader}>
            <div>
              <div style={styles.orderTitle}>Purchase Summary</div>
              <div style={styles.orderSub}>Order ID {orderId}</div>
            </div>
          </div>
          <div style={styles.ordersHeader}>
            <span style={styles.ordersLabel}>Your orders</span>
            <span style={styles.ordersCount}>({cart.length})</span>
          </div>

          <div style={styles.ordersScroll} className="cashier-cart-scroll">
            <ul style={styles.cartList}>
              {cart.map((item, i) => {
                const currentProduct = products.find((p) => p._id === item._id) || item;
                const remainingStock = getLiveAvailableStock(
                  currentProduct,
                  item.variantSize,
                  item.variantColor,
                  item.variantBrand,
                  item.variantUnit
                );
                const itemKey = `${item._id}-${item.variantSize || ''}-${item.variantColor || ''}-${item.variantBrand || ''}-${item.variantUnit || ''}-${i}`;
                const thumbSrc = currentProduct.image ? `http://localhost:5000${currentProduct.image}` : null;
                return (
                  <li key={itemKey} style={styles.cartItem}>
                    <div style={styles.cartLeft}>
                      {thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt={item.name}
                          style={styles.cartThumb}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div style={styles.cartThumbPlaceholder} />
                      )}
                      <div style={styles.cartInfo}>
                        <div style={styles.cartName}>
                          {item.name}
                          {(item.variantSize || item.variantColor || item.variantBrand || item.variantUnit) && currentProduct && (
                            <button
                              style={styles.editVariantBtn}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setVariantModal({
                                  open: true,
                                  product: currentProduct,
                                  chosenSize: item.variantSize || "",
                                  chosenColor: item.variantColor || "",
                                  chosenBrand: item.variantBrand || "",
                                  chosenUnit: item.variantUnit || "",
                                  chosenQty: item.qty,
                                  editing: true,
                                  originalSize: item.variantSize || "",
                                  originalColor: item.variantColor || "",
                                  originalBrand: item.variantBrand || "",
                                  originalUnit: item.variantUnit || "",
                                  originalQty: item.qty,
                                });
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        <div style={styles.cartMeta}>
                          <span>x{item.qty}</span>
                          {item.variantBrand && <span>· Brand: {item.variantBrand}</span>}
                          {item.variantUnit && <span>· Unit: {item.variantUnit}</span>}
                          {item.variantSize && <span>· Size: {item.variantSize}</span>}
                          {item.variantColor && <span>· Color: {item.variantColor}</span>}
                        </div>
                        <div style={styles.cartStock}>
                          {remainingStock > 0 ? `(${remainingStock} left)` : `(Out of stock)`}
                        </div>
                      </div>
                    </div>
                    <div style={styles.cartRight}>
                      <div style={styles.cartControls}>
                        <button
                          style={styles.qtyBtn}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (item.qty > 1) {
                              updateCartQty(
                                item._id,
                                item.qty - 1,
                                item.variantSize || null,
                                item.variantColor || null,
                                item.variantBrand || null,
                                item.variantUnit || null
                              );
                            } else {
                              removeCartItem(
                                item._id,
                                item.variantSize || null,
                                item.variantColor || null,
                                item.variantBrand || null,
                                item.variantUnit || null
                              );
                            }
                          }}
                        >
                          <FaMinus />
                        </button>
                        <span style={styles.qtyText}>{item.qty}</span>
                        <button
                          style={{
                            ...styles.qtyBtn,
                            opacity: remainingStock <= 0 ? 0.5 : 1,
                            cursor: remainingStock <= 0 ? "not-allowed" : "pointer",
                          }}
                          disabled={remainingStock <= 0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (remainingStock <= 0) {
                              alert("No more stock available!");
                              return;
                            }
                            updateCartQty(
                              item._id,
                              item.qty + 1,
                              item.variantSize || null,
                              item.variantColor || null,
                              item.variantBrand || null,
                              item.variantUnit || null
                            );
                          }}
                        >
                          <FaPlus />
                        </button>
                        <button
                          style={styles.removeBtn}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeCartItem(
                              item._id,
                              item.variantSize || null,
                              item.variantColor || null,
                              item.variantBrand || null,
                              item.variantUnit || null
                            );
                          }}
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                      <div style={styles.cartPrice}>₱{(item.price * item.qty).toFixed(2)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {cart.length > 0 && (
            <div style={styles.summaryBox}>
              <div style={styles.paymentTitle}>Payment Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span>Total Payment</span>
                <strong>₱{totalPrice.toFixed(2)}</strong>
              </div>
              <button style={styles.printBtn} onClick={handlePrint}>Confirm Order</button>
            </div>
          )}
        </div>
      </div>

      {/* Variant Modal */}
    {variantModal.open && (
      <div style={styles.modalOverlay}>
        <div style={styles.modalBox}>
          <h3 style={styles.modalHeader}>Select Variant</h3>

          <div style={styles.modalLayout}>
            <div style={styles.modalLeft}>
              {variantModal.product?.name && (
                <div style={styles.modalProductName}>
                  {variantModal.product.name}
                </div>
              )}
              {variantModal.product?.image && (
                <img
                  src={`http://localhost:5000${variantModal.product.image}`}
                  alt={variantModal.product.name}
                  style={styles.modalImage}
                />
              )}
            </div>

            <div style={styles.modalRight}>
          {(() => {
            const brands = variantModal.product.brandOptions || [];
            const units = variantModal.product.unitOptions || [];
            const buq = variantModal.product.brandUnitQuantities || [];
            const bq = variantModal.product.brandQuantities || [];
            const uq = variantModal.product.unitQuantities || [];
            if (buq.length > 0 && brands.length > 0 && units.length > 0) {
              return (
                <div style={styles.modalField}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #eee' }}>Brand \\ Unit</th>
                        {units.map((u, i) => (
                          <th key={`u-${i}`} style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{u}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {brands.map((b, bi) => (
                        <tr key={`br-${bi}`}>
                          <td style={{ padding: '8px', fontWeight: 700 }}>{b}</td>
                          {units.map((u, ui) => {
                            const v = buq.find(q => q.brand === b && q.unit === u);
                            const qty = v ? (v.quantity || 0) : 0;
                            const disabled = qty <= 0;
                            return (
                              <td key={`cell-${bi}-${ui}`} style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  disabled={disabled}
                                  onClick={() => setVariantModal(prev => ({ ...prev, chosenBrand: b, chosenUnit: u }))}
                                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', background: disabled ? '#f3f4f6' : '#e0f2fe', cursor: disabled ? 'not-allowed' : 'pointer' }}
                                >
                                  {u} {qty > 0 ? `(${qty})` : ''}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            } else if (bq.length > 0 && brands.length > 0) {
              return (
                <div style={styles.modalField}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #eee' }}>Brand</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brands.map((b, bi) => {
                        const v = bq.find(q => q.brand === b);
                        const qty = v ? (v.quantity || 0) : 0;
                        const disabled = qty <= 0;
                        return (
                          <tr key={`br-only-${bi}`}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>{b}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                disabled={disabled}
                                onClick={() => setVariantModal(prev => ({ ...prev, chosenBrand: b }))}
                                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', background: disabled ? '#f3f4f6' : '#e0f2fe', cursor: disabled ? 'not-allowed' : 'pointer' }}
                              >
                                {qty}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            } else if (uq.length > 0 && units.length > 0) {
              return (
                <div style={styles.modalField}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #eee' }}>Unit</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((u, ui) => {
                        const v = uq.find(q => q.unit === u);
                        const qty = v ? (v.quantity || 0) : 0;
                        const disabled = qty <= 0;
                        return (
                          <tr key={`un-only-${ui}`}>
                            <td style={{ padding: '8px', fontWeight: 700 }}>{u}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                disabled={disabled}
                                onClick={() => setVariantModal(prev => ({ ...prev, chosenUnit: u }))}
                                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', background: disabled ? '#f3f4f6' : '#e0f2fe', cursor: disabled ? 'not-allowed' : 'pointer' }}
                              >
                                {qty}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null;
          })()}

          {variantModal.product.sizeOptions?.length > 0 && (
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Size</label>
              <div style={styles.modalOptionsRow}>
                {variantModal.product.sizeOptions
                  .filter((s) => getLiveAvailableStock(
                    variantModal.product,
                    s,
                    variantModal.chosenColor,
                    variantModal.chosenBrand,
                    variantModal.chosenUnit
                  ) > 0)
                  .map((s, idx) => {
                    const selected = variantModal.chosenSize === s;
                    const stockLabel = getVariantStockLabel(
                      variantModal.product,
                      s,
                      variantModal.chosenColor,
                      variantModal.chosenBrand,
                      variantModal.chosenUnit
                    );
                    return (
                      <button
                        key={idx}
                        type="button"
                        style={{
                          ...styles.modalOptionChip,
                          ...(selected ? styles.modalOptionChipActive : {})
                        }}
                        onClick={() =>
                          setVariantModal((prev) => ({
                            ...prev,
                            chosenSize: s,
                          }))
                        }
                      >
                        <span>{s}</span>
                        <span style={styles.modalOptionStock}>{stockLabel}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {variantModal.product.colorOptions &&
            variantModal.product.colorOptions.some((c) => String(c || "").trim() !== "") && (
            <div style={styles.modalField}>
              <label style={styles.modalLabel}>Color</label>
              <div style={styles.modalOptionsRow}>
                {variantModal.product.colorOptions
                  .filter(
                    (c) =>
                      String(c || "").trim() !== "" &&
                      getLiveAvailableStock(
                        variantModal.product,
                        variantModal.chosenSize,
                        c,
                        variantModal.chosenBrand,
                        variantModal.chosenUnit
                      ) > 0
                  )
                  .map((c, idx) => {
                    const selected = variantModal.chosenColor === c;
                    const stockLabel = getVariantStockLabel(
                      variantModal.product,
                      variantModal.chosenSize,
                      c,
                      variantModal.chosenBrand,
                      variantModal.chosenUnit
                    );
                    return (
                      <button
                        key={idx}
                        type="button"
                        style={{
                          ...styles.modalOptionChip,
                          ...(selected ? styles.modalOptionChipActive : {})
                        }}
                        onClick={() =>
                          setVariantModal((prev) => ({
                            ...prev,
                            chosenColor: c,
                          }))
                        }
                      >
                        <span>{c}</span>
                        <span style={styles.modalOptionStock}>{stockLabel}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div style={styles.modalField}>
            <label style={styles.modalLabel}>Quantity</label>
            <input
              type="number"
              min={1}
              value={variantModal.chosenQty}
              onChange={(e) =>
                setVariantModal((prev) => ({
                  ...prev,
                  chosenQty:
                    Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              style={styles.modalInput}
            />
          </div>

          <div style={styles.modalActions}>
            <button style={styles.addBtn} onClick={addVariantToCart}>
              Add
            </button>
            <button
              style={styles.modalCancelBtn}
              onClick={() =>
                setVariantModal({
                  open: false,
                  product: null,
                  chosenSize: "",
                  chosenColor: "",
                  chosenBrand: "",
                  chosenUnit: "",
                  chosenQty: 1,
                })
              }
            >
              Cancel
            </button>
          </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

// ================== Styles ==================
const styles = {
  container: {
    padding: "20px",
    fontFamily: "Segoe UI, sans-serif",
    background: "#ffffff",
    height: "100vh",
    boxSizing: "border-box",
    overflow: "hidden"
  },
  topBar: {
    display: "grid",
    gridTemplateColumns: "1.6fr 2.2fr 1.6fr",
    alignItems: "center",
    gap: "16px",
    padding: "14px 18px",
    background: "linear-gradient(180deg, #004D40 0%, #00695C 50%, #00796B 100%)",
    borderRadius: 16,
    color: "#ffffff",
    marginBottom: 18,
    boxShadow: "0 12px 24px rgba(0,77,64,0.35)"
  },
  topWelcome: { display: "flex", flexDirection: "column", gap: 2 },
  topSearch: { width: "100%", display: "flex", justifyContent: "center" },
  topProfile: { display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" },
  title: { textAlign: "center", color: "#2c3e50", marginBottom: "20px", fontSize: "28px" },
  layout: {
    display: "grid",
    gridTemplateColumns: "3fr 2fr",
    gap: "20px",
    height: "calc(100vh - 170px)",
    minHeight: 0
  },
  products: {
    padding: "15px",
    background: "#E0F2F1",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 0
  },
  productsScroll: {
    flexGrow: 1,
    overflowY: "auto",
    paddingRight: 4,
    minHeight: 0
  },
  cart: {
    padding: "15px",
    background: "#E0F2F1",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minHeight: 0
  },
  sectionTitle: { marginBottom: "10px", borderBottom: "2px solid #3498db", paddingBottom: "5px", color: "#34495e" },
  searchBar: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: "10px", marginBottom: "12px" },
  searchInput: { padding: "10px 12px", borderRadius: "8px", border: "1px solid #B2DFDB", fontSize: "14px", background: "#E0F2F1" },
  searchBtn: { padding: "10px 16px", borderRadius: "8px", background: "#f97316", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" },
  toolsBox: { display: "inline-flex", alignItems: "center", gap: "6px", background: "#eef2f7", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "8px 10px" },
  toolDot: { width: 6, height: 6, borderRadius: "50%", background: "#9aa4b2" },
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px"
  },
  backChip: {
    padding: "6px 12px",
    borderRadius: 999,
    background: "#ffffff",
    border: "1px solid #B2DFDB",
    fontSize: 12,
    cursor: "pointer",
    color: "#00695C",
    fontWeight: 700
  },
  currentCategoryLabel: { fontSize: 13, fontWeight: 800, color: "#004D40" },
  productSearchInput: {
    width: "100%",
    marginBottom: 12,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #B2DFDB",
    fontSize: 13,
    background: "#ffffff"
  },
  chip: { padding: "8px 12px", borderRadius: "999px", background: "#f1f5f9", border: "1px solid #e5e7eb", fontSize: 12, cursor: "pointer", color: "#334155" },
  chipActive: { padding: "8px 12px", borderRadius: "999px", background: "#0d47a1", border: "1px solid #0d47a1", fontSize: 12, cursor: "pointer", color: "#ffffff", boxShadow: "0 4px 12px rgba(13,71,161,0.25)" },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "12px",
    flex: 1,
    alignContent: "flex-start"
  },
  productCard: {
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e3e8ff",
    padding: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  productCardActive: {
    border: "2px solid #0d47a1",
    boxShadow: "0 6px 16px rgba(13,71,161,0.25)",
    background: "#e0f2fe"
  },
  subText: { fontSize: "12px", color: "#7f8c8d" },
  categoryHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  categoryTitle: { fontSize: 18, fontWeight: 800, color: "#004D40" },
  categorySearch: {
    width: "100%",
    marginBottom: 14,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #B2DFDB",
    fontSize: 13,
    background: "#ffffff"
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12
  },
  categoryCard: {
    background: "#ffffff",
    borderRadius: 14,
    padding: "14px 12px",
    border: "1px solid #B2DFDB",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,0.04)"
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: "#00695C",
    color: "#ECFDF5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 800
  },
  categoryTextWrap: { display: "flex", flexDirection: "column", gap: 4 },
  categoryName: { fontSize: 14, fontWeight: 800, color: "#022c22" },
  categoryDesc: { fontSize: 11, color: "#4b5563" },
  cartList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  ordersScroll: {
    flexGrow: 1,
    overflowY: "auto",
    paddingRight: 4,
    minHeight: 0
  },
  cartHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  orderTitle: { fontSize: 16, fontWeight: 800, color: "#111827" },
  orderSub: { fontSize: 11, color: "#6b7280" },
  cartHeaderBadge: {
    display: "none"
  },
  ordersHeader: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
    fontSize: 12,
    color: "#6b7280"
  },
  ordersLabel: { fontWeight: 600 },
  ordersCount: { fontWeight: 600 },
  cartItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px",
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
  },
  cartLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  cartThumb: { width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 },
  cartThumbPlaceholder: { width: 44, height: 44, borderRadius: 10, background: "#e5e7eb", flexShrink: 0 },
  cartInfo: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  cartName: { fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", display: "flex", alignItems: "center", gap: 6 },
  cartMeta: { display: "flex", flexWrap: "wrap", gap: 4, fontSize: 11, color: "#6b7280" },
  cartStock: { fontSize: 11, color: "#6b7280" },
  cartRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 },
  cartControls: { display: "flex", alignItems: "center", gap: "5px" },
  editVariantBtn: {
    marginLeft: 6,
    padding: "2px 6px",
    fontSize: 10,
    borderRadius: 999,
    border: "1px solid #0d47a1",
    background: "#e3f2fd",
    color: "#0d47a1",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  addBtn: {
    padding: "10px 0",
    background: "#0d47a1",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    boxShadow: "0 4px 10px rgba(13,71,161,0.35)"
  },
  qtyBtn: {
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#2980b9",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.12)"
  },
  removeBtn: {
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 12,
    boxShadow: "0 2px 4px rgba(0,0,0,0.12)"
  },
  qtyText: { fontWeight: "bold", fontSize: "14px" },
  modalOptionsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  modalOptionChip: {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 90,
    cursor: "pointer"
  },
  modalOptionChipActive: {
    border: "1px solid #0d47a1",
    background: "#e0f2fe",
    boxShadow: "0 3px 8px rgba(13,71,161,0.35)"
  },
  modalOptionStock: {
    fontSize: 10,
    color: "#6b7280"
  },
  modalCancelBtn: {
    padding: "10px 0",
    background: "#ffffff",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14
  },
  price: { color: "#2c3e50", fontWeight: "bold" },
  cartPrice: { fontSize: 13, fontWeight: 800, color: "#111827" },
  summaryBox: { marginTop: "10px", padding: "12px", background: "#E0F2F1", border: "1px solid #B2DFDB", borderRadius: "12px" },
  paymentTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#111827" },
  sumInput: { width: 120, padding: "8px 10px", borderRadius: "8px", border: "1px solid #B2DFDB", textAlign: "right", background: "#E0F2F1" },
  voucherInput: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #B2DFDB", marginBottom: "10px", background: "#E0F2F1" },
  printBtn: { padding: "12px", width: "100%", background: "#f97316", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px", fontWeight: 800 },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15,23,42,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50
  },
  modalBox: {
    background: "#ffffff",
    padding: "22px 26px",
    borderRadius: 18,
    width: 720,
    maxWidth: "95vw",
    boxShadow: "0 18px 45px rgba(15,23,42,0.45)",
    display: "flex",
    flexDirection: "column"
  },
  modalProductName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#4b5563",
    marginBottom: 10
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 10,
    color: "#111827"
  },
  modalLayout: {
    display: "grid",
    gridTemplateColumns: "1.3fr 1.7fr",
    gap: 18,
    alignItems: "flex-start",
    marginTop: 6
  },
  modalLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  modalImage: {
    width: "100%",
    maxHeight: 260,
    objectFit: "cover",
    borderRadius: 12
  },
  modalRight: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: "60vh",
    overflowY: "auto",
    paddingRight: 4
  },
  modalField: {
    margin: "8px 0",
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  modalLabel: { fontSize: 13, fontWeight: 600, color: "#374151" },
  modalSelect: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #B2DFDB",
    fontSize: 13,
    background: "#E0F2F1"
  },
  modalInput: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #B2DFDB",
    fontSize: 13,
    background: "#E0F2F1"
  },
  modalActions: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10
  },
  brandTag: { padding: "5px 10px", borderRadius: "12px", border: "1px solid #e3e8ff", background: "#e8f5e9", fontSize: 12, fontWeight: 700, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  unitTag: { padding: "5px 10px", borderRadius: "12px", border: "1px solid #e3e8ff", background: "#fff8e1", fontSize: 12, fontWeight: 700, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  guideLayout: { display: "grid", gridTemplateColumns: "2fr 3fr", gap: "20px", minHeight: "calc(100vh - 220px)" },
  guideLeft: { padding: "15px", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  guideRight: { padding: "15px", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  stepCard: { display: "flex", gap: "12px", alignItems: "center", padding: "10px", border: "1px solid #e5e7eb", borderRadius: "10px", marginBottom: "10px", background: "#fafafa" },
  stepIcon: { width: 28, height: 28, borderRadius: "50%", background: "#0d47a1", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 },
  guideFooter: { marginTop: "12px", fontSize: "12px", color: "#64748b" },
  bottomBar: { position: "fixed", left: 0, right: 0, bottom: 0, background: "#111827", color: "#fff", display: "flex", justifyContent: "center", gap: "24px", padding: "10px 0", boxShadow: "0 -6px 16px rgba(0,0,0,0.25)" },
  bottomIcon: { width: 28, height: 28, borderRadius: 6, background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
};

export default Cashier;
