import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FaBox, FaLayerGroup, FaArrowLeft, FaCloudUploadAlt, FaCheck, FaTimes, FaPlus, FaTh, FaList, FaImage, FaSearch, FaPen, FaTrash } from 'react-icons/fa';
import Swal from 'sweetalert2';
import SearchableDropdown from './components/SearchableDropdown';

function AddProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const modeParam = new URLSearchParams(location.search).get('mode');
  
  // --- Data State ---
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitRecords, setUnitRecords] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandRecords, setBrandRecords] = useState([]);
  const [attributeTypes, setAttributeTypes] = useState(['Size', 'Color', 'Material', 'Style', 'Brand', 'Unit']);
  const [attributeTypeRecords, setAttributeTypeRecords] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Cache of all products
  
  // --- UI/Flow State ---
  const [step, setStep] = useState(modeParam === 'edit' ? 'form' : 'category'); // category -> category-products -> form -> review
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  
  // --- Category / Unit / Brand UI State ---
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState(''); 
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitDescription, setNewUnitDescription] = useState('');
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDescription, setNewBrandDescription] = useState('');
  const [showAddAttributeTypeModal, setShowAddAttributeTypeModal] = useState(false);
  const [newAttributeTypeName, setNewAttributeTypeName] = useState('');
  const [newAttributeTypeDescription, setNewAttributeTypeDescription] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categorySort, setCategorySort] = useState('asc');
  const [viewMode, setViewMode] = useState('grid');
  const [newlyAddedCategoryId, setNewlyAddedCategoryId] = useState(null); 
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  // --- Helper Functions ---
  const generateItemCode = (category, existingProducts) => {
    const cleanCategory = String(category || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '');
    const prefix = cleanCategory.slice(0, 3) || 'PRD';
    const list = Array.isArray(existingProducts) ? existingProducts : [];
    const sameCategory = list.filter(p => {
      const c = String(p.category || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '');
      return c === cleanCategory;
    });
    const existingNums = sameCategory
      .map(p => {
        const sku = String(p.sku || '');
        const match = sku.match(/(\d+)\s*$/);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter(n => Number.isFinite(n));
    const nextNum = (existingNums.length ? Math.max(...existingNums) + 1 : 1);
    const numStr = String(nextNum).padStart(3, '0');
    return `${prefix}-${numStr}`;
  };
  
  // --- Form State ---
  const [productType, setProductType] = useState('standard'); // 'standard' | 'variant'
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    brand: '',
    category: '',
    stockQty: 0,
    unit: '',
    price: '', // Retail Price
    supplyPrice: 0, // New
    markup: 0, // New
    sku: '', // New
    supplier: '', // New
    image: null,
    // Variant Arrays
    sizeOptions: [],
    colorOptions: [],
    materialOptions: [], // New
    styleOptions: [], // New
    brandOptions: [],
    unitOptions: [],
    sizeColorQuantities: [], // Matrix
    // ... other quantities omitted for simplicity in this version
  });

  // Helper States for Variant Builders
  const [newAttributeValue, setNewAttributeValue] = useState('');
  const [activeAttribute, setActiveAttribute] = useState('Size'); // Size, Color, Material, Style
  const [variantMatrix, setVariantMatrix] = useState({}); // { "Size-Color": { sku, supplyPrice, price, stockQty } }
  const [enableSizeColorCombos, setEnableSizeColorCombos] = useState(true);
  
  // --- Initial Data Load ---
  useEffect(() => {
    axios.get('http://localhost:5000/categories')
      .then(res => {
        const sorted = res.data.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
        setCategories(sorted);
      })
      .catch(err => console.error('Error fetching categories:', err));

    axios.get('http://localhost:5000/units')
      .then(res => {
        const list = (res.data || []).map(u => {
          if (typeof u === 'string') {
            return { _id: u, name: u };
          }
          return {
            _id: u._id || u.id || u.name,
            name: u.name || ''
          };
        }).filter(u => u.name);
        setUnitRecords(list);
        const names = list
          .map(u => u.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
        setUnits(names);
      })
      .catch(err => console.error('Error fetching units:', err));

    axios.get('http://localhost:5000/brands')
      .then(res => {
        const list = (res.data || []).map(b => {
          if (typeof b === 'string') {
            return { _id: b, name: b };
          }
          return {
            _id: b._id || b.id || b.name,
            name: b.name || ''
          };
        }).filter(b => b.name);
        setBrandRecords(list);
        const names = list
          .map(b => b.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
        setBrands(names);
      })
      .catch(err => console.error('Error fetching brands:', err));

    axios.get('http://localhost:5000/attribute-types')
      .then(res => {
        const serverTypes = (res.data || []).map(t => ({
          _id: t._id || t.id || t.name,
          name: t.name || ''
        })).filter(t => t.name);
        
        setAttributeTypeRecords(serverTypes);
        
        const serverNames = serverTypes.map(t => t.name);
        const defaultNames = ['Size', 'Color', 'Material', 'Style', 'Brand', 'Unit'];
        const combined = [...new Set([...defaultNames, ...serverNames])].sort((a, b) => a.localeCompare(b));
        setAttributeTypes(combined);
      })
      .catch(err => console.error('Error fetching attribute types:', err));

    // Fetch products for the list view (respect branch for non-admin users)
    const role = localStorage.getItem('currentUserRole');
    const branch = localStorage.getItem('currentBranch');
    let url = 'http://localhost:5000/products';
    if (branch && role && role !== 'admin') {
      url = `http://localhost:5000/products?branch=${encodeURIComponent(branch)}`;
    }

    axios.get(url)
      .then(res => {
        setAllProducts(res.data);
      })
      .catch(err => console.error('Error fetching products:', err));

    // Edit Mode Init
    if (modeParam === 'edit') {
      const productFromState = location.state?.editProduct;
      const storedEdit = localStorage.getItem('productToEdit');
      const product = productFromState || (storedEdit ? JSON.parse(storedEdit) : null);
      if (product) {
        loadProductForEdit(product);
      }
    }
  }, [modeParam, location]);

  const loadProductForEdit = (product) => {
    setEditingId(product._id);
    setProductType(product.hasVariants ? 'variant' : 'standard');
    setStep('form');
    setFormData({
      name: product.name || '',
      details: product.details || '',
      brand: product.brand || '',
      category: product.category || '',
      stockQty: product.stockQty || 0,
      unit: product.unit || '',
      price: product.price || 0,
      supplyPrice: product.supplyPrice || 0,
      markup: product.markup || 0,
      sku: product.sku || '',
      supplier: product.supplier || '',
      image: product.image || null,
      sizeOptions: product.sizeOptions || [],
      colorOptions: product.colorOptions || [],
      materialOptions: product.materialOptions || [],
      styleOptions: product.styleOptions || [],
      brandOptions: product.brandOptions || [],
      unitOptions: product.unitOptions || [],
      // ... keep existing options
    });

    // Populate variant matrix
    const matrix = {};
    if (product.sizeColorQuantities) {
      product.sizeColorQuantities.forEach(item => {
        matrix[`${item.size}|${item.color}`] = item;
      });
    }
    if (product.sizeQuantities) {
      product.sizeQuantities.forEach(item => {
        matrix[`${item.size}|`] = item;
      });
    }
    if (product.colorQuantities) {
      product.colorQuantities.forEach(item => {
        matrix[`|${item.color}`] = item;
      });
    }
    if (product.brandUnitQuantities) {
      product.brandUnitQuantities.forEach(item => {
        matrix[`BR:${item.brand}|UN:${item.unit}`] = item;
      });
    }
    if (product.brandQuantities) {
      product.brandQuantities.forEach(item => {
        matrix[`BR:${item.brand}|UN:`] = item;
      });
    }
    if (product.unitQuantities) {
      product.unitQuantities.forEach(item => {
        matrix[`BR:|UN:${item.unit}`] = item;
      });
    }
    setVariantMatrix(matrix);
  };

  // --- Flow Handlers ---

  const handleCategorySelect = (catName) => {
    setSelectedCategory(catName);
    const filtered = allProducts.filter(p => p.category === catName);
    setCategoryProducts(filtered);
    setStep('category-products');
  };

  const handleStartAddProduct = () => {
    setStep('form');
    setEditingId(null);
    setProductType('standard');
    setVariantMatrix({});
    setFormData(prev => ({
      ...prev,
      category: selectedCategory, // Pre-fill category
      name: '',
      details: '',
      brand: '',
      stockQty: 0,
      unit: '',
      price: '',
      supplyPrice: '',
      markup: '',
      sku: generateItemCode(selectedCategory || '', allProducts),
      supplier: '',
      image: null,
      sizeOptions: [],
      colorOptions: [],
      materialOptions: [],
      styleOptions: [],
      brandOptions: [],
      unitOptions: [],
    }));
  };

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    const isDuplicate = categories.some(cat =>
      cat.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
      cat._id !== editingCategoryId
    );
    if (isDuplicate) {
      alert('Category already exists');
      return;
    }

    try {
      if (editingCategoryId) {
        const res = await axios.put(`http://localhost:5000/categories/${editingCategoryId}`, { 
          name: trimmedName,
          description: newCategoryDescription 
        });
        const updated = res.data && res.data._id 
          ? res.data 
          : { _id: editingCategoryId, name: trimmedName, description: newCategoryDescription };
        setCategories(prev =>
          prev
            .map(c => (c._id === editingCategoryId ? updated : c))
            .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
        );
        setNewlyAddedCategoryId(updated._id);
      } else {
        const res = await axios.post('http://localhost:5000/categories', { 
          name: trimmedName,
          description: newCategoryDescription 
        });
        const newCat = res.data._id 
          ? res.data 
          : { _id: Date.now().toString(), name: trimmedName, description: newCategoryDescription };
        setCategories(prev =>
          [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
        );
        setNewlyAddedCategoryId(newCat._id);
      }

      setNewCategoryName('');
      setNewCategoryDescription('');
      setEditingCategoryId(null);
      setShowAddCategoryModal(false);
      setTimeout(() => setNewlyAddedCategoryId(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to save category');
    }
  };

  const handleAddUnit = async () => {
    const trimmed = newUnitName.trim();
    if (!trimmed) return;

    try {
      const res = await axios.post('http://localhost:5000/units', {
        name: trimmed,
        description: newUnitDescription
      });
      const saved = res.data && res.data.name ? res.data : { name: trimmed };
      const savedName = saved.name;
      setUnitRecords(prev => {
        const map = new Map(prev.map(u => [u.name, u]));
        map.set(savedName, { _id: saved._id || savedName, name: savedName });
        return Array.from(map.values());
      });
      setUnits(prev => {
        const set = new Set(prev);
        set.add(savedName);
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      });
      setFormData(prev => ({ ...prev, unit: savedName }));
      setNewUnitName('');
      setNewUnitDescription('');
      setShowAddUnitModal(false);
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      if (status === 409) {
        // Unit already exists – just select it and close modal
        setUnitRecords(prev => {
          const map = new Map(prev.map(u => [u.name, u]));
          if (!map.has(trimmed)) {
            map.set(trimmed, { _id: trimmed, name: trimmed });
          }
          return Array.from(map.values());
        });
        setUnits(prev => {
          const set = new Set(prev);
          set.add(trimmed);
          return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
        });
        setFormData(prev => ({ ...prev, unit: trimmed }));
        setNewUnitName('');
        setNewUnitDescription('');
        setShowAddUnitModal(false);
      } else {
        const msg = serverMsg || 'Failed to save unit';
        alert(msg);
      }
    }
  };

  const handleAddBrand = async () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;

    try {
      const res = await axios.post('http://localhost:5000/brands', {
        name: trimmed,
        description: newBrandDescription
      });
      const saved = res.data && res.data.name ? res.data : { name: trimmed };
      const savedName = saved.name;
      setBrandRecords(prev => {
        const map = new Map(prev.map(b => [b.name, b]));
        map.set(savedName, { _id: saved._id || savedName, name: savedName });
        return Array.from(map.values());
      });
      setBrands(prev => {
        const set = new Set(prev);
        set.add(savedName);
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
      });
      setFormData(prev => ({ ...prev, brand: savedName }));
      setNewBrandName('');
      setNewBrandDescription('');
      setShowAddBrandModal(false);
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      if (status === 409) {
        // Brand already exists
        setBrandRecords(prev => {
          const map = new Map(prev.map(b => [b.name, b]));
          if (!map.has(trimmed)) {
            map.set(trimmed, { _id: trimmed, name: trimmed });
          }
          return Array.from(map.values());
        });
        setBrands(prev => {
          const set = new Set(prev);
          set.add(trimmed);
          return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
        });
        setFormData(prev => ({ ...prev, brand: trimmed }));
        setNewBrandName('');
        setNewBrandDescription('');
        setShowAddBrandModal(false);
      } else {
        const msg = serverMsg || 'Failed to save brand';
        alert(msg);
      }
    }
  };

  const handleAddAttributeType = async () => {
    const trimmed = newAttributeTypeName.trim();
    if (!trimmed) return;

    // Check if it's a default type
    const defaultTypes = ['Size', 'Color', 'Material', 'Style', 'Brand', 'Unit'];
    if (defaultTypes.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      alert('This is a built-in attribute type.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/attribute-types', {
        name: trimmed,
        description: newAttributeTypeDescription
      });
      const saved = res.data;
      const savedName = saved.name;

      setAttributeTypeRecords(prev => [...prev, saved]);
      setAttributeTypes(prev => [...new Set([...prev, savedName])].sort());
      setActiveAttribute(savedName);
      setNewAttributeTypeName('');
      setNewAttributeTypeDescription('');
      setShowAddAttributeTypeModal(false);
    } catch (err) {
      if (err?.response?.status === 409) {
        alert('Attribute type already exists.');
      } else {
        alert('Failed to save attribute type.');
      }
    }
  };

  const handleDeleteAttributeType = async () => {
    const defaultTypes = ['Size', 'Color', 'Material', 'Style', 'Brand', 'Unit'];
    if (defaultTypes.includes(activeAttribute)) {
      Swal.fire('Notice', 'Built-in attribute types cannot be deleted.', 'info');
      return;
    }

    const target = attributeTypeRecords.find(t => t.name === activeAttribute);
    if (!target) return;

    const confirmResult = await Swal.fire({
      title: 'Delete attribute type?',
      text: `Are you sure you want to delete "${activeAttribute}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });
    if (!confirmResult.isConfirmed) return;

    try {
      await axios.delete(`http://localhost:5000/attribute-types/${target._id}?permanent=true`);
      setAttributeTypeRecords(prev => prev.filter(t => t._id !== target._id));
      setAttributeTypes(prev => prev.filter(t => t !== activeAttribute));
      setActiveAttribute('Size');
      Swal.fire('Deleted', 'Attribute type deleted successfully.', 'success');
    } catch (err) {
      Swal.fire('Error', 'Failed to delete attribute type.', 'error');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category._id);
    setNewCategoryName(category.name || '');
    setNewCategoryDescription(category.description || '');
    setShowAddCategoryModal(true);
  };

  const handleDeleteCategory = async (category) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Are you sure you want to delete "${category.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await axios.delete(`http://localhost:5000/categories/${category._id}`);
        setCategories(prev => prev.filter(c => c._id !== category._id));
        if (selectedCategory === category.name) {
          setSelectedCategory('');
        }
      } catch (err) {
        Swal.fire('Error', 'Failed to delete category.', 'error');
      }
    });
  };

  // --- Form Handlers ---

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData(prev => ({
        ...prev,
        image: files[0]
      }));
      return;
    }
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        sku: generateItemCode(value, allProducts)
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDeleteUnit = async () => {
    const currentUnit = formData.unit;
    if (!currentUnit) {
      Swal.fire('Notice', 'Please select a unit to delete.', 'info');
      return;
    }
    const target = unitRecords.find(u => u.name === currentUnit);
    const confirmResult = await Swal.fire({
      title: 'Delete unit?',
      text: `Are you sure you want to delete "${currentUnit}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });
    if (!confirmResult.isConfirmed) return;

    try {
      if (target && target._id) {
        await axios.delete(`http://localhost:5000/units/${encodeURIComponent(target._id)}?permanent=true&confirm=true`);
      }
      setUnitRecords(prev => prev.filter(u => u.name !== currentUnit));
      setUnits(prev => prev.filter(n => n !== currentUnit));
      setFormData(prev => ({ ...prev, unit: '' }));
      Swal.fire('Deleted', 'Unit deleted successfully.', 'success');
    } catch (err) {
      console.error('Error deleting unit:', err);
      Swal.fire('Error', 'Failed to delete unit.', 'error');
    }
  };

  const handleDeleteBrand = async () => {
    const currentBrand = formData.brand;
    if (!currentBrand) {
      Swal.fire('Notice', 'Please select a brand to delete.', 'info');
      return;
    }
    const target = brandRecords.find(b => b.name === currentBrand);
    const confirmResult = await Swal.fire({
      title: 'Delete brand?',
      text: `Are you sure you want to delete "${currentBrand}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });
    if (!confirmResult.isConfirmed) return;

    try {
      if (target && target._id) {
        await axios.delete(`http://localhost:5000/brands/${encodeURIComponent(target._id)}?permanent=true&confirm=true`);
      }
      setBrandRecords(prev => prev.filter(b => b.name !== currentBrand));
      setBrands(prev => prev.filter(n => n !== currentBrand));
      setFormData(prev => ({ ...prev, brand: '' }));
      Swal.fire('Deleted', 'Brand deleted successfully.', 'success');
    } catch (err) {
      console.error('Error deleting brand:', err);
      Swal.fire('Error', 'Failed to delete brand.', 'error');
    }
  };

  const handleVariantChange = (key, field, value) => {
    setVariantMatrix(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // --- Variant Logic ---
  
  const addAttributeValue = () => {
    if (!newAttributeValue.trim()) return;
    const val = newAttributeValue.trim();
    setFormData(prev => {
      if (activeAttribute === 'Size') {
        if (prev.sizeOptions.includes(val)) return prev;
        return { ...prev, sizeOptions: [...prev.sizeOptions, val] };
      } else if (activeAttribute === 'Color') {
        if (prev.colorOptions.includes(val)) return prev;
        return { ...prev, colorOptions: [...prev.colorOptions, val] };
      } else if (activeAttribute === 'Material') {
        if (prev.materialOptions?.includes(val)) return prev;
        return { ...prev, materialOptions: [...(prev.materialOptions || []), val] };
      } else if (activeAttribute === 'Style') {
        if (prev.styleOptions?.includes(val)) return prev;
        return { ...prev, styleOptions: [...(prev.styleOptions || []), val] };
      } else if (activeAttribute === 'Brand') {
        if (prev.brandOptions?.includes(val)) return prev;
        return { ...prev, brandOptions: [...(prev.brandOptions || []), val] };
      } else if (activeAttribute === 'Unit') {
        if (prev.unitOptions?.includes(val)) return prev;
        return { ...prev, unitOptions: [...(prev.unitOptions || []), val] };
      }
      return prev;
    });
    setNewAttributeValue('');
  };

  const removeAttributeValue = (type, val) => {
    setFormData(prev => {
      if (type === 'Size') return { ...prev, sizeOptions: prev.sizeOptions.filter(x => x !== val) };
      if (type === 'Color') return { ...prev, colorOptions: prev.colorOptions.filter(x => x !== val) };
      if (type === 'Material') return { ...prev, materialOptions: prev.materialOptions.filter(x => x !== val) };
      if (type === 'Style') return { ...prev, styleOptions: prev.styleOptions.filter(x => x !== val) };
      if (type === 'Brand') return { ...prev, brandOptions: (prev.brandOptions || []).filter(x => x !== val) };
      if (type === 'Unit') return { ...prev, unitOptions: (prev.unitOptions || []).filter(x => x !== val) };
      return prev;
    });
  };

  // --- Submission Steps ---
  
  const handleReview = (e) => {
    e.preventDefault();
    setStep('review');
  };

  const handleFinalSubmit = async () => {
    try {
      const uploadData = new FormData();
      const nowIso = new Date().toISOString();
      const currentBranch = localStorage.getItem('currentBranch');
      
      // Meta
      if (editingId) {
        uploadData.append('updatedAt', nowIso);
        uploadData.append('lastAction', 'edited');
      } else {
        uploadData.append('createdAt', nowIso);
        uploadData.append('lastAction', 'new');
      }

      // Basic Fields
      uploadData.append('name', formData.name);
      uploadData.append('category', formData.category);
      uploadData.append('details', formData.details);
      uploadData.append('brand', formData.brand);
      uploadData.append('unit', formData.unit);
      uploadData.append('price', formData.price);
      uploadData.append('supplyPrice', formData.supplyPrice);
      uploadData.append('markup', formData.markup);
      uploadData.append('sku', formData.sku);
      uploadData.append('supplier', formData.supplier);
      uploadData.append('stockQty', formData.stockQty);
      uploadData.append('hasVariants', productType === 'variant' ? 'true' : 'false');
      if (!editingId && currentBranch) {
        uploadData.append('branch', currentBranch);
      }
      
      if (formData.image) uploadData.append('image', formData.image);

      // Variant Arrays
      if (productType === 'variant') {
        const effectiveSizeOptions =
          formData.sizeOptions.length ? formData.sizeOptions
          : formData.materialOptions.length ? formData.materialOptions
          : formData.styleOptions.length ? formData.styleOptions
          : [];

        const effectiveColorOptions =
          formData.colorOptions.length ? formData.colorOptions : [];

        uploadData.append('sizeOptions', effectiveSizeOptions.join(','));
        uploadData.append('colorOptions', effectiveColorOptions.join(','));
        uploadData.append('brandOptions', (formData.brandOptions || []).join(','));
        uploadData.append('unitOptions', (formData.unitOptions || []).join(','));
        uploadData.append('materialOptions',(formData.materialOptions || []).join(','));
        
        // Construct Quantities Arrays
        const sizeColorQuantities = [];
        const sizeQuantities = [];
        const colorQuantities = [];
        const brandUnitQuantities = [];
        const brandQuantities = [];
        const unitQuantities = [];
        const materialQuantities = [];
        
        const sizes = effectiveSizeOptions.length ? effectiveSizeOptions : [null];
        const colors = effectiveColorOptions.length ? effectiveColorOptions : [null];
        const autoSku = (base, s, c, b, u) => {
          const clean = (x) => String(x || '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6);
          const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
          const parts = [clean(base)];
          if (s) parts.push(clean(s));
          if (c) parts.push(clean(c));
          if (b) parts.push(clean(b));
          if (u) parts.push(clean(u));
          return `${parts.join('-')}-${seq}`;
        };
        
        if (enableSizeColorCombos) {
          sizes.forEach(s => {
            colors.forEach(c => {
              if (!s && !c) return;
              const matrixKey = `${s || ''}|${c || ''}`;
              const data = variantMatrix[matrixKey] || {};
              const baseSku = formData.sku || autoSku(formData.name, s, c);
              const item = {
                quantity: data.quantity ? parseInt(data.quantity) : 0,
                price: data.price ? parseFloat(data.price) : 0,
                supplyPrice: data.supplyPrice ? parseFloat(data.supplyPrice) : 0,
                sku: baseSku
              };
              if (s && c) sizeColorQuantities.push({ size: s, color: c, ...item });
            });
          });
        }

        effectiveSizeOptions.forEach(s => {
          if (!s) return;
          const keyS = `${s}|`;
          const dataS = variantMatrix[keyS] || {};
          const baseSku = formData.sku || autoSku(formData.name, s, null);
          const itemS = {
            quantity: dataS.quantity ? parseInt(dataS.quantity) : 0,
            price: dataS.price ? parseFloat(dataS.price) : 0,
            supplyPrice: dataS.supplyPrice ? parseFloat(dataS.supplyPrice) : 0,
            sku: baseSku
          };
          sizeQuantities.push({ size: s, ...itemS });
        });

        formData.colorOptions.forEach(c => {
          if (!c) return;
          const keyC = `|${c}`;
          const dataC = variantMatrix[keyC] || {};
          const baseSku = formData.sku || autoSku(formData.name, null, c);
          const itemC = {
            quantity: dataC.quantity ? parseInt(dataC.quantity) : 0,
            price: dataC.price ? parseFloat(dataC.price) : 0,
            supplyPrice: dataC.supplyPrice ? parseFloat(dataC.supplyPrice) : 0,
            sku: baseSku
          };
          colorQuantities.push({ color: c, ...itemC });
        });
        
        formData.materialOptions.forEach(c => {
          if (!c) return;
          const keyC = `|${c}`;
          const dataC = variantMatrix[keyC] || {};
          const baseSku = formData.sku || autoSku(formData.name, null, c);
          const itemC = {
            quantity: dataC.quantity ? parseInt(dataC.quantity) : 0,
            price: dataC.price ? parseFloat(dataC.price) : 0,
            supplyPrice: dataC.supplyPrice ? parseFloat(dataC.supplyPrice) : 0,
            sku: baseSku
          };
          materialQuantities.push({ material: c, ...itemC });
        });
        // Brand / Unit variants
        const brands = (formData.brandOptions && formData.brandOptions.length) ? formData.brandOptions : [null];
        const units = (formData.unitOptions && formData.unitOptions.length) ? formData.unitOptions : [null];
        brands.forEach(b => {
          units.forEach(u => {
            if (!b && !u) return;
            const keyBu = `BR:${b || ''}|UN:${u || ''}`;
            const dataBu = variantMatrix[keyBu] || {};
            const baseSku = formData.sku || autoSku(formData.name, null, null, b, u);
            const itemBu = {
              quantity: dataBu.quantity ? parseInt(dataBu.quantity) : 0,
              price: dataBu.price ? parseFloat(dataBu.price) : 0,
              supplyPrice: dataBu.supplyPrice ? parseFloat(dataBu.supplyPrice) : 0,
              sku: baseSku
            };
            if (b && u) brandUnitQuantities.push({ brand: b, unit: u, ...itemBu });
            else if (b) brandQuantities.push({ brand: b, ...itemBu });
            else if (u) unitQuantities.push({ unit: u, ...itemBu });
          });
        });

        uploadData.append('sizeColorQuantities', JSON.stringify(sizeColorQuantities));
        uploadData.append('sizeQuantities', JSON.stringify(sizeQuantities));
        uploadData.append('colorQuantities', JSON.stringify(colorQuantities));
        uploadData.append('brandUnitQuantities', JSON.stringify(brandUnitQuantities));
        uploadData.append('brandQuantities', JSON.stringify(brandQuantities));
        uploadData.append('unitQuantities', JSON.stringify(unitQuantities));
      }

      const role = localStorage.getItem('currentUserRole') || '';
      const name = localStorage.getItem('currentUserName') || '';
      const baseUrl = editingId ? `http://localhost:5000/products/${editingId}` : 'http://localhost:5000/products';
      const url = `${baseUrl}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`;
      const method = editingId ? 'put' : 'post';
      
      const res = await axios[method](url, uploadData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      if (!editingId && res.data && res.data._id) {
        // Store ID for highlighting in inventory
        const existing = localStorage.getItem('inventoryHighlightNew');
        const ids = existing ? JSON.parse(existing) : [];
        ids.push(res.data._id);
        localStorage.setItem('inventoryHighlightNew', JSON.stringify(ids));
      }

      alert(editingId ? '✅ Product updated!' : '✅ Product saved to inventory!');
      navigate('/invent');
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    }
  };

  // --- Render Steps ---

  const renderCategorySelection = () => (
    <>
      <div style={{ background: '#E0F2F1', paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#004D40', margin: 0 }}>Select Category</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                style={primaryBtnStyle}
              >
                <FaPlus /> Add Category
              </button>
              <Link
                to="/invent"
                style={{
                  color: '#004D40',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(0,77,64,0.2)',
                  background: 'rgba(255,255,255,0.8)'
                }}
              >
                <FaTimes /> Cancel
              </Link>
            </div>
          </div>

          <SearchableDropdown
            label="Category"
            options={categories.map(c => ({ value: c.name, label: c.name }))}
            value={selectedCategory}
            onChange={(e) => handleCategorySelect(e.target.value)}
            onAdd={() => setShowAddCategoryModal(true)}
            onDelete={(catNameToDelete) => {
              const catToDelete = categories.find(c => c.name === catNameToDelete);
              if (catToDelete) {
                handleDeleteCategory(catToDelete);
              }
            }}
            placeholder="Search or select a category"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16
            }}
          >
            {categories
              .filter(c =>
                c.name.toLowerCase().includes(categorySearch.toLowerCase())
              )
              .sort((a, b) =>
                categorySort === 'desc'
                  ? b.name.localeCompare(a.name, 'en', { sensitivity: 'base' })
                  : a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
              )
              .map(cat => {
                const isNew = cat._id === newlyAddedCategoryId;
                return (
                  <div
                    key={cat._id}
                    onClick={() => handleCategorySelect(cat.name)}
                    style={{
                      background: '#ffffff',
                      borderRadius: 16,
                      padding: 16,
                      border: isNew ? '2px solid #10b981' : '1px solid #B2DFDB',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow =
                        '0 8px 16px rgba(0,77,64,0.16)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow =
                        '0 4px 10px rgba(0,0,0,0.04)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 999,
                          background: '#00695C',
                          color: '#ECFDF5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          fontWeight: 800
                        }}
                      >
                        <FaBox />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                          title="Edit category"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            width: 26,
                            height: 26,
                            borderRadius: 999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0f766e'
                          }}
                        >
                          <FaPen size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                          title="Delete category"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            width: 26,
                            height: 26,
                            borderRadius: 999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#b91c1c'
                          }}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 15,
                          color: '#022c22'
                        }}
                      >
                        {cat.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#4b5563'
                        }}
                      >
                        {cat.description || 'Browse items in this category'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {showAddCategoryModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Add Category</h3>
            <input
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="Category Name"
              style={{ ...inputStyle, width: '100%', marginBottom: 12 }}
            />
            <textarea
              value={newCategoryDescription}
              onChange={e => setNewCategoryDescription(e.target.value)}
              placeholder="Description (Optional)"
              style={{
                ...inputStyle,
                width: '100%',
                marginBottom: 16,
                minHeight: 60,
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                style={secondaryBtnStyle}
              >
                Cancel
              </button>
              <button onClick={handleAddCategory} style={primaryBtnStyle}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddUnitModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3>Add Unit</h3>
            <input
              value={newUnitName}
              onChange={e => setNewUnitName(e.target.value)}
              placeholder="Unit name (e.g., pcs, box)"
              style={{ ...inputStyle, width: '100%', marginBottom: 12 }}
            />
            <textarea
              value={newUnitDescription}
              onChange={e => setNewUnitDescription(e.target.value)}
              placeholder="Description (optional)"
              style={{
                ...inputStyle,
                width: '100%',
                marginBottom: 16,
                minHeight: 60,
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setShowAddUnitModal(false)}
                style={secondaryBtnStyle}
              >
                Cancel
              </button>
              <button onClick={handleAddUnit} style={primaryBtnStyle}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderCategoryProducts = () => (
    <>
      <div style={{ position: 'sticky', top: 70, background: '#f8fafc', zIndex: 10, padding: '16px 24px 0 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
               <button 
                  onClick={() => setStep('category')} 
                  style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
               >
                 <FaArrowLeft size={16} />
               </button>
               <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#1e293b' }}>{selectedCategory} Products</h2>
             </div>
          </div>
          
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
                <FaSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  placeholder="Search products..." 
                  value={productSearch} 
                  onChange={e => setProductSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 40 }}
                />
            </div>
             <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
               <button onClick={() => setViewMode('grid')} style={{ padding: '8px 12px', background: viewMode === 'grid' ? '#eff6ff' : 'white', border: 'none', cursor: 'pointer', color: viewMode === 'grid' ? '#1A2CA3' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaTh size={16} /></button>
               <button onClick={() => setViewMode('list')} style={{ padding: '8px 12px', background: viewMode === 'list' ? '#eff6ff' : 'white', border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', color: viewMode === 'list' ? '#1A2CA3' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaList size={16} /></button>
             </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <div style={viewMode === 'grid' ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 } : { display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div 
            onClick={handleStartAddProduct}
            style={viewMode === 'grid' ? { ...cardStyle, border: '2px dashed #1A2CA3', background: '#eff6ff', color: '#1A2CA3', justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column' } : { ...listCardStyle, border: '2px dashed #1A2CA3', background: '#eff6ff', color: '#1A2CA3', justifyContent: 'center' }}
          >
            {viewMode === 'grid' ? (
                <>
                    <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 8 }}><FaPlus /></div>
                    <div style={{ fontWeight: 700 }}>Add Product</div>
                </>
            ) : (
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><FaPlus /> Add Product</div>
            )}
          </div>

          {categoryProducts
            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
            .map(p => (
            <div key={p._id} onClick={() => loadProductForEdit(p)} style={viewMode === 'grid' ? cardStyle : listCardStyle}>
              {p.image ? (
                <img src={`http://localhost:5000/uploads/${p.image.split('/').pop()}`} alt={p.name} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ width: 60, height: 60, background: '#f1f5f9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><FaImage size={24} /></div>
              )}
              {viewMode === 'grid' ? (
                  <>
                    <div style={{ fontWeight: 700, marginTop: 12, color: '#1e293b' }}>{p.name}</div>
                    <div style={{ color: '#64748b', fontSize: 14 }}>₱{p.price}</div>
                  </>
              ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{p.name}</div>
                    <div style={{ color: '#64748b', fontSize: 14 }}>₱{p.price}</div>
                  </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderForm = () => (
    <>
      <div style={{ position: 'sticky', top: 70, background: '#f8fafc', zIndex: 10, padding: '24px 24px 0 24px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <button 
                onClick={() => setStep('category-products')} 
                style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
             >
               <FaArrowLeft size={16} />
             </button>
             <div>
               <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#1e293b' }}>{editingId ? 'Edit Product' : 'Add New Product'}</h1>
               <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>Fill in the details to add a product to inventory</div>
             </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 100px 24px' }}>
        <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          {/* Name & Image Section */}
          <div style={sectionCardStyle}>
            <div style={{ display: 'flex', gap: 32 }}>
                <div style={{ width: 140, flexShrink: 0 }}>
                    <label style={labelStyle}>Product Image</label>
                    <div 
                        onClick={() => document.getElementById('fileInput').click()}
                        style={{ 
                            border: '2px dashed #cbd5e1', 
                            borderRadius: 12, 
                            height: 140, 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer', 
                            background: '#f8fafc',
                            transition: 'border-color 0.2s',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#1A2CA3'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                        {formData.image ? (
                            typeof formData.image === 'string' ? 
                            <img src={`http://localhost:5000${formData.image}`} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                            <img src={URL.createObjectURL(formData.image)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <>
                                <FaCloudUploadAlt size={32} color="#94a3b8" />
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 8 }}>Upload</div>
                            </>
                        )}
                        <input 
                            id="fileInput"
                            type="file" 
                            name="image"
                            onChange={handleInputChange}
                            accept="image/*"
                            style={{ display: 'none' }} 
                        />
                    </div>
                </div>
                
                <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Product Name</label>
                    <input 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      placeholder="e.g. Cotton T-Shirt" 
                      style={{ ...inputStyle, fontSize: 16, padding: '16px' }} 
                      required
                    />
                    <div style={{ marginTop: 24 }}>
                        <label style={labelStyle}>Category</label>
                        <div style={{ padding: '12px 16px', background: '#f1f5f9', borderRadius: 8, color: '#475569', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                            {formData.category}
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Type Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div 
            onClick={() => setProductType('standard')}
            style={{ 
              ...selectionCardStyle, 
              borderColor: productType === 'standard' ? '#1A2CA3' : '#e2e8f0',
              background: productType === 'standard' ? '#f0f4ff' : 'white',
              boxShadow: productType === 'standard' ? '0 4px 12px rgba(26, 44, 163, 0.15)' : 'none'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: productType === 'standard' ? '#1A2CA3' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: productType === 'standard' ? 'white' : '#64748b', marginBottom: 12 }}>
                <FaBox size={24} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: productType === 'standard' ? '#1A2CA3' : '#1e293b' }}>Standard Product</div>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>Single SKU item with one price and stock count (e.g. Can of Coke)</div>
          </div>
          
          <div 
            onClick={() => setProductType('variant')}
            style={{ 
              ...selectionCardStyle, 
              borderColor: productType === 'variant' ? '#1A2CA3' : '#e2e8f0',
              background: productType === 'variant' ? '#f0f4ff' : 'white',
              boxShadow: productType === 'variant' ? '0 4px 12px rgba(26, 44, 163, 0.15)' : 'none'
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: productType === 'variant' ? '#1A2CA3' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: productType === 'variant' ? 'white' : '#64748b', marginBottom: 12 }}>
                <FaLayerGroup size={24} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: productType === 'variant' ? '#1A2CA3' : '#1e293b' }}>Product with Variants</div>
            <div style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>Item with multiple options like sizes or colors (e.g. T-Shirt)</div>
          </div>
        </div>

        {/* Basic Details */}
        <div style={sectionCardStyle}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 4, height: 24, background: '#1A2CA3', borderRadius: 2 }}></span>
            Basic Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Brand</label>
              <input 
                name="brand" 
                value={formData.brand} 
                onChange={handleInputChange} 
                placeholder="Brand name" 
                style={{ ...inputStyle, width: '100%' }} 
                required
              />
            </div>
            <SearchableDropdown
              label="Unit"
              options={units.map(u => ({ value: u, label: u }))}
              value={formData.unit}
              onChange={handleInputChange}
              onAdd={() => setShowAddUnitModal(true)}
              onDelete={handleDeleteUnit}
              placeholder="Select or add unit"
            />
          </div>

          <div>
            <label style={labelStyle}>Product Details / Description</label>
            <textarea 
              name="details" 
              value={formData.details} 
              onChange={handleInputChange} 
              placeholder="Enter product description..." 
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', width: '100%', lineHeight: 1.5 }} 
              required
            />
          </div>
        </div>

        {/* Standard Product Details */}
        {productType === 'standard' && (
          <div style={sectionCardStyle}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 4, height: 24, background: '#1A2CA3', borderRadius: 2 }}></span>
              Price & Stock
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
              <div style={{ gridColumn: 'span 1' }}>
                <label style={labelStyle}>Item Code (SKU)</label>
                <div style={{ position: 'relative' }}>
                    <FaBox style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      name="sku" 
                      value={formData.sku} 
                      onChange={handleInputChange} 
                      placeholder="Auto-generated" 
                      style={{ ...inputStyle, paddingLeft: 36 }} 
                    />
                </div>
              </div>
              
              <div>
                <label style={labelStyle}>Price</label>
                <div style={currencyWrap}>
                  <span style={{ position: 'absolute', left: 12, color: '#1A2CA3', fontWeight: 700 }}>₱</span>
                  <input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))} 
                    style={{ ...inputStyle, paddingLeft: 32, borderColor: '#1A2CA3', fontWeight: 700, color: '#1A2CA3' }} 
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
                 <label style={labelStyle}>Current Stock Quantity</label>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <input 
                      name="stockQty" 
                      type="number" 
                      value={formData.stockQty} 
                      onChange={handleInputChange} 
                      style={{ ...inputStyle, width: 200 }} 
                      placeholder="0"
                    />
                    <div style={{ fontSize: 14, color: '#64748b' }}>units available in inventory</div>
                 </div>
            </div>
          </div>
        )}

        {/* Variant Builder */}
        {productType === 'variant' && (
          <div style={sectionCardStyle}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 4, height: 24, background: '#1A2CA3', borderRadius: 2 }}></span>
              Variant Configuration
            </h3>

            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select 
                                value={activeAttribute} 
                                onChange={e => setActiveAttribute(e.target.value)} 
                                style={{ ...selectStyle, width: 140, background: 'white' }}
                            >
                                {attributeTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={handleDeleteAttributeType}
                                style={{ ...secondaryBtnStyle, background: '#fee2e2', color: '#b91c1c', padding: '0 10px' }}
                                title="Delete attribute type"
                            >
                                <FaTrash size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddAttributeTypeModal(true)}
                                style={{ ...secondaryBtnStyle, padding: '0 10px' }}
                                title="Add new attribute type"
                            >
                                <FaPlus size={12} />
                            </button>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input 
                                list="attribute-suggestions"
                                value={newAttributeValue}
                                onChange={e => setNewAttributeValue(e.target.value)}
                                placeholder={`Enter or select ${activeAttribute} value`}
                                style={{ ...inputStyle, background: 'white' }}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAttributeValue())}
                            />
                            <datalist id="attribute-suggestions">
                                {[...new Set(allProducts.flatMap(p => {
                                    // 1. Check top-level legacy options (sizeOptions, colorOptions, etc)
                                    const legacyKey = `${activeAttribute.toLowerCase()}Options`;
                                    const legacyValues = p[legacyKey] || [];
                                    
                                    // 2. Check variants
                                    const variantValues = (p.variants || []).map(v => v.attributes?.[activeAttribute]).filter(Boolean);
                                    
                                    // 3. Check top-level brand/unit
                                    const topLevelValue = p[activeAttribute.toLowerCase()];
                                    
                                    return [...legacyValues, ...variantValues, ...(topLevelValue ? [topLevelValue] : [])];
                                }))].map(v => <option key={v} value={v} />)}
                            </datalist>
                        </div>
                    </div>
                    <button type="button" onClick={addAttributeValue} style={{ ...secondaryBtnStyle, background: '#1A2CA3', color: 'white', border: 'none', padding: '0 24px' }}>
                        <FaPlus size={14} style={{ marginRight: 8 }} /> Add
                    </button>
                </div>

                {/* Chips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Size', 'Color', 'Material', 'Style', 'Brand', 'Unit'].map(attr => {
                    const options = formData[`${attr.toLowerCase()}Options`];
                    if (!options || options.length === 0) return null;
                    return (
                    <div key={attr} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <span style={{ width: 70, fontWeight: 700, color: '#475569', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>{attr}</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {options.map(opt => (
                            <span key={opt} style={{ ...chipStyle, background: '#eff6ff', color: '#1e40af', border: '1px solid #dbeafe' }}>
                            {opt} 
                            <button 
                                type="button" 
                                onClick={() => removeAttributeValue(attr, opt)} 
                                style={{ ...chipCloseStyle, color: '#93c5fd', hover: { color: '#3b82f6' } }}
                            >×</button>
                            </span>
                        ))}
                        </div>
                    </div>
                    );
                })}
                </div>
            </div>

            <div style={{ marginTop: 12, marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ 
                    width: 20, height: 20, borderRadius: 4, border: enableSizeColorCombos ? 'none' : '2px solid #cbd5e1', 
                    background: enableSizeColorCombos ? '#1A2CA3' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                }}>
                    {enableSizeColorCombos && <FaCheck size={12} color="white" />}
                </div>
                <input type="checkbox" checked={enableSizeColorCombos} onChange={e => setEnableSizeColorCombos(e.target.checked)} style={{ display: 'none' }} />
                <span style={{ fontWeight: 600, color: '#334155' }}>Enable Size + Color matrix combinations</span>
              </label>
            </div>

            {/* Variants Table */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: '#00695C' }}>
                  <tr style={{ borderBottom: '1px solid #004c3f', textAlign: 'left' }}>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Variant Combination</th>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Item Code</th>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Price</th>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Stock</th>
                  </tr>
                </thead>
                <tbody style={{ background: 'white' }}>
                  {/* Generate Simple Matrix Rows based on primary/secondary attributes */}
                  {(() => {
                    const effectiveSizeOptions =
                      formData.sizeOptions.length ? formData.sizeOptions
                      : formData.materialOptions.length ? formData.materialOptions
                      : formData.styleOptions.length ? formData.styleOptions
                      : [];

                    const effectiveColorOptions =
                      formData.colorOptions.length ? formData.colorOptions : [];

                    const sizes = effectiveSizeOptions.length ? effectiveSizeOptions : [null];
                    const colors = effectiveColorOptions.length ? effectiveColorOptions : [null];
                    
                    let rows = [];
                    if (enableSizeColorCombos) {
                      sizes.forEach(s => {
                        colors.forEach(c => {
                          if (!s && !c) return;
                          const name = [s, c].filter(Boolean).join(' / ');
                          const matrixKey = `${s || ''}|${c || ''}`;
                          const data = variantMatrix[matrixKey] || {};
                          rows.push(
                            <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{name}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <input
                                  readOnly
                                  value={formData.sku || ''}
                                  placeholder="Auto"
                                  style={{ ...miniInputStyle, background: '#f8fafc' }}
                                />
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={currencyWrap}>
                                  <span style={{ position: 'absolute', left: 8, fontSize: 12, color: '#1A2CA3', fontWeight: 700 }}>₱</span>
                                  <input 
                                    type="number"
                                    value={data.price || ''}
                                    onChange={e => handleVariantChange(matrixKey, 'price', e.target.value)}
                                    style={{ ...miniInputStyle, paddingLeft: 20, borderColor: '#e2e8f0', color: '#1A2CA3', fontWeight: 700 }} 
                                  />
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <input 
                                  type="number"
                                  value={data.quantity || ''}
                                  onChange={e => handleVariantChange(matrixKey, 'quantity', e.target.value)}
                                  style={miniInputStyle} 
                                />
                              </td>
                            </tr>
                          );
                        });
                      });
                    } else {
                      sizes.forEach(s => {
                        if (!s) return;
                        const keyS = `${s}|`;
                        const dataS = variantMatrix[keyS] || {};
                        rows.push(
                          <tr key={`size-${s}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <input
                                readOnly
                                value={formData.sku || ''}
                                placeholder="Auto"
                                style={{ ...miniInputStyle, background: '#f8fafc' }}
                              />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={currencyWrap}><span style={{ position: 'absolute', left: 8, fontSize: 12, color: '#1A2CA3', fontWeight: 700 }}>₱</span><input type="number" value={dataS.price || ''} onChange={e => handleVariantChange(keyS, 'price', e.target.value)} style={{ ...miniInputStyle, paddingLeft: 20, color: '#1A2CA3', fontWeight: 700 }} /></div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <input type="number" value={dataS.quantity || ''} onChange={e => handleVariantChange(keyS, 'quantity', e.target.value)} style={miniInputStyle} />
                            </td>
                          </tr>
                        );
                      });
                      colors.forEach(c => {
                        if (!c) return;
                        const keyC = `|${c}`;
                        const dataC = variantMatrix[keyC] || {};
                        rows.push(
                          <tr key={`color-${c}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <input
                                readOnly
                                value={formData.sku || ''}
                                placeholder="Auto"
                                style={{ ...miniInputStyle, background: '#f8fafc' }}
                              />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={currencyWrap}><span style={{ position: 'absolute', left: 8, fontSize: 12, color: '#1A2CA3', fontWeight: 700 }}>₱</span><input type="number" value={dataC.price || ''} onChange={e => handleVariantChange(keyC, 'price', e.target.value)} style={{ ...miniInputStyle, paddingLeft: 20, color: '#1A2CA3', fontWeight: 700 }} /></div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <input type="number" value={dataC.quantity || ''} onChange={e => handleVariantChange(keyC, 'quantity', e.target.value)} style={miniInputStyle} />
                            </td>
                          </tr>
                        );
                      });
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>

            {/* Brand / Unit Variants */}
            {(formData.brandOptions?.length > 0 || formData.unitOptions?.length > 0) && (
            <div style={{ marginTop: 24, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: '#00695C' }}>
                  <tr style={{ borderBottom: '1px solid #004c3f', textAlign: 'left' }}>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Brand</th>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Unit</th>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Item Code</th>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Price</th>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff' }}>Stock</th>
                    <th style={{ padding: '16px', fontWeight: 700, color: '#ffffff', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody style={{ background: 'white' }}>
                  {(() => {
                    const brands = (formData.brandOptions && formData.brandOptions.length) ? formData.brandOptions : [null];
                    const units = (formData.unitOptions && formData.unitOptions.length) ? formData.unitOptions : [null];
                    const rows = [];
                    brands.forEach(b => {
                      units.forEach(u => {
                        if (!b && !u) return;
                        const matrixKey = `BR:${b || ''}|UN:${u || ''}`;
                        const data = variantMatrix[matrixKey] || {};
                        rows.push(
                          <tr key={`${b || ''}-${u || ''}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{b || '-'}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{u || '-'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <input
                                readOnly
                                value={formData.sku || ''}
                                placeholder="Auto"
                                style={{ ...miniInputStyle, background: '#f8fafc' }}
                              />
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={currencyWrap}>
                                <span style={{ position: 'absolute', left: 8, fontSize: 12, color: '#1A2CA3', fontWeight: 700 }}>₱</span>
                                <input
                                  type="number"
                                  value={data.price || ''}
                                  onChange={e => handleVariantChange(matrixKey, 'price', e.target.value)}
                                  style={{ ...miniInputStyle, paddingLeft: 20, borderColor: '#e2e8f0', color: '#1A2CA3', fontWeight: 700 }}
                                />
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <input
                                type="number"
                                value={data.quantity || ''}
                                onChange={e => handleVariantChange(matrixKey, 'quantity', e.target.value)}
                                style={miniInputStyle}
                              />
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setVariantMatrix(prev => {
                                    const next = { ...prev };
                                    delete next[matrixKey];
                                    return next;
                                  });
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                  border: 'none',
                                  background: '#ef4444',
                                  color: '#fff',
                                  fontSize: 12,
                                  cursor: 'pointer'
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    });
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, zIndex: 10 }}>
           <button type="button" onClick={() => navigate('/invent')} style={secondaryBtnStyle}>Cancel</button>
          <button type="submit" style={primaryBtnStyle}>Review Product</button>
        </div>
      </form>
    </div>

    {showAddUnitModal && (
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle}>
          <h3>Add Unit</h3>
          <input
            value={newUnitName}
            onChange={e => setNewUnitName(e.target.value)}
            placeholder="Unit name (e.g., pcs, box)"
            style={{ ...inputStyle, width: '100%', marginBottom: 12 }}
          />
          <textarea
            value={newUnitDescription}
            onChange={e => setNewUnitDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{
              ...inputStyle,
              width: '100%',
              marginBottom: 16,
              minHeight: 60,
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={() => setShowAddUnitModal(false)}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
            <button type="button" onClick={handleAddUnit} style={primaryBtnStyle}>
              Add
            </button>
          </div>
        </div>
      </div>
    )}

    {showAddBrandModal && (
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle}>
          <h3>Add Brand</h3>
          <input
            value={newBrandName}
            onChange={e => setNewBrandName(e.target.value)}
            placeholder="Brand name (e.g., Nike, Apple)"
            style={{ ...inputStyle, width: '100%', marginBottom: 12 }}
          />
          <textarea
            value={newBrandDescription}
            onChange={e => setNewBrandDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{
              ...inputStyle,
              width: '100%',
              marginBottom: 16,
              minHeight: 60,
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={() => setShowAddBrandModal(false)}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
            <button type="button" onClick={handleAddBrand} style={primaryBtnStyle}>
              Add
            </button>
          </div>
        </div>
      </div>
    )}

    {showAddAttributeTypeModal && (
      <div style={modalOverlayStyle}>
        <div style={modalContentStyle}>
          <h3>Add Attribute Type</h3>
          <input
            value={newAttributeTypeName}
            onChange={e => setNewAttributeTypeName(e.target.value)}
            placeholder="Attribute name (e.g., Weight, Voltage)"
            style={{ ...inputStyle, width: '100%', marginBottom: 12 }}
          />
          <textarea
            value={newAttributeTypeDescription}
            onChange={e => setNewAttributeTypeDescription(e.target.value)}
            placeholder="Description (optional)"
            style={{
              ...inputStyle,
              width: '100%',
              marginBottom: 16,
              minHeight: 60,
              resize: 'vertical'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={() => setShowAddAttributeTypeModal(false)}
              style={secondaryBtnStyle}
            >
              Cancel
            </button>
            <button type="button" onClick={handleAddAttributeType} style={primaryBtnStyle}>
              Add
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );

  const renderReview = () => (
    <>
      <div style={{ position: 'sticky', top: 70, left: 0, right: 0, background: '#f8fafc', zIndex: 10, padding: '24px 24px 0 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: 800, width: '100%', paddingBottom: 24, textAlign: 'center' }}>
           <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px 0', color: '#1e293b' }}>Review Product</h1>
           <p style={{ color: '#64748b', margin: 0 }}>Please verify the details below before saving to inventory.</p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 80px 24px', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div style={{ ...sectionCardStyle }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 4, height: 24, background: '#1A2CA3', borderRadius: 2 }}></span>
          Basic Information
        </h3>
        <table style={{ width: '100%', fontSize: 14 }}>
          <tbody>
            <tr>
              <td style={tdLabel}>Image</td>
              <td style={tdValue}>
                {formData.image ? (
                  typeof formData.image === 'string' ? 
                    <img src={`http://localhost:5000${formData.image}`} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} /> :
                    <img src={URL.createObjectURL(formData.image)} alt="Preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Image Selected</span>}
              </td>
            </tr>
            <tr><td style={tdLabel}>Name</td><td style={tdValue}>{formData.name}</td></tr>
            <tr><td style={tdLabel}>Category</td><td style={tdValue}>{formData.category}</td></tr>
            <tr><td style={tdLabel}>Type</td><td style={tdValue}>{productType === 'standard' ? 'Standard Product' : 'Variant Product'}</td></tr>
          </tbody>
        </table>
      </div>

      {productType === 'standard' && (
        <div style={{ ...sectionCardStyle }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 4, height: 24, background: '#1A2CA3', borderRadius: 2 }}></span>
            Pricing & Inventory
          </h3>
          <table style={{ width: '100%', fontSize: 14 }}>
            <tbody>
              <tr><td style={tdLabel}>Item Code</td><td style={tdValue}>{formData.sku || 'Auto-generated'}</td></tr>
              <tr><td style={tdLabel}>Price</td><td style={tdValue}><strong>₱{formData.price}</strong></td></tr>
              <tr><td style={tdLabel}>Stock</td><td style={tdValue}>{formData.stockQty} {formData.unit}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {productType === 'variant' && (
        <div style={{ ...sectionCardStyle }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 4, height: 24, background: '#1A2CA3', borderRadius: 2 }}></span>
            Variants Configured
          </h3>
          
          <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: '#00695C' }}>
                  <tr style={{ borderBottom: '1px solid #004c3f', textAlign: 'left' }}>
                    <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Variant</th>
                    <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Item Code</th>
                    <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Price</th>
                    <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Stock</th>
                  </tr>
                </thead>
                <tbody style={{ background: 'white' }}>
                  {(() => {
                    const effectiveSizeOptions =
                      formData.sizeOptions.length ? formData.sizeOptions
                      : formData.materialOptions.length ? formData.materialOptions
                      : formData.styleOptions.length ? formData.styleOptions
                      : [];

                    const effectiveColorOptions =
                      formData.colorOptions.length ? formData.colorOptions : [];

                    const sizes = effectiveSizeOptions.length ? effectiveSizeOptions : [null];
                    const colors = effectiveColorOptions.length ? effectiveColorOptions : [null];
                    
                    let rows = [];
                    if (enableSizeColorCombos) {
                      sizes.forEach(s => {
                        colors.forEach(c => {
                          if (!s && !c) return;
                          const name = [s, c].filter(Boolean).join(' / ');
                          const matrixKey = `${s || ''}|${c || ''}`;
                          const data = variantMatrix[matrixKey] || {};
                          rows.push(
                            <tr key={name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: 12, fontWeight: 600, color: '#1e293b' }}>{name}</td>
                              <td style={{ padding: 12, color: '#64748b' }}>{formData.sku || 'Auto'}</td>
                              <td style={{ padding: 12 }}>₱{data.price || 0}</td>
                              <td style={{ padding: 12 }}>{data.quantity || 0}</td>
                            </tr>
                          );
                        });
                      });
                    } else {
                      sizes.forEach(s => {
                        if (!s) return;
                        const keyS = `${s}|`;
                        const dataS = variantMatrix[keyS] || {};
                        rows.push(
                          <tr key={`size-${s}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: 12, fontWeight: 600 }}>{s}</td>
                            <td style={{ padding: 12, color: '#64748b' }}>{formData.sku || 'Auto'}</td>
                            <td style={{ padding: 12 }}>₱{dataS.price || 0}</td>
                            <td style={{ padding: 12 }}>{dataS.quantity || 0}</td>
                          </tr>
                        );
                      });
                      colors.forEach(c => {
                        if (!c) return;
                        const keyC = `|${c}`;
                        const dataC = variantMatrix[keyC] || {};
                        rows.push(
                          <tr key={`color-${c}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: 12, fontWeight: 600 }}>{c}</td>
                            <td style={{ padding: 12, color: '#64748b' }}>{formData.sku || 'Auto'}</td>
                            <td style={{ padding: 12 }}>₱{dataC.price || 0}</td>
                            <td style={{ padding: 12 }}>{dataC.quantity || 0}</td>
                          </tr>
                        );
                      });
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
          </div>

          {(formData.brandOptions?.length > 0 || formData.unitOptions?.length > 0) && (
            <div style={{ overflowX: 'auto', marginTop: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead style={{ background: '#00695C' }}>
                    <tr style={{ borderBottom: '1px solid #004c3f', textAlign: 'left' }}>
                      <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Brand</th>
                      <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Unit</th>
                      <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Item Code</th>
                      <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Price</th>
                      <th style={{ padding: 12, color: '#ffffff', fontWeight: 700 }}>Stock</th>
                    </tr>
                  </thead>
                  <tbody style={{ background: 'white' }}>
                    {(() => {
                      const brands = (formData.brandOptions && formData.brandOptions.length) ? formData.brandOptions : [null];
                      const units = (formData.unitOptions && formData.unitOptions.length) ? formData.unitOptions : [null];
                      const rows = [];
                      brands.forEach(b => {
                        units.forEach(u => {
                          if (!b && !u) return;
                          const name = [b, u].filter(Boolean).join(' / ');
                          const matrixKey = `BR:${b || ''}|UN:${u || ''}`;
                          const data = variantMatrix[matrixKey] || {};
                          rows.push(
                            <tr key={`bu-${name}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: 12, fontWeight: 600 }}>{b || '-'}</td>
                              <td style={{ padding: 12, fontWeight: 600 }}>{u || '-'}</td>
                              <td style={{ padding: 12, color: '#64748b' }}>{formData.sku || 'Auto'}</td>
                              <td style={{ padding: 12 }}>₱{data.price || 0}</td>
                              <td style={{ padding: 12 }}>{data.quantity || 0}</td>
                            </tr>
                          );
                        });
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12, zIndex: 10 }}>
         <button onClick={() => setStep('form')} style={secondaryBtnStyle}>Back to Edit</button>
         <button onClick={handleFinalSubmit} style={primaryBtnStyle}>Confirm & Save to Inventory</button>
      </div>
    </div>
    </>
  );

  // --- Main Render ---
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f8fafc', minHeight: '100vh', paddingBottom: 60 }}>
       {step === 'category' && renderCategorySelection()}
       {step === 'category-products' && renderCategoryProducts()}
       {step === 'form' && renderForm()}
       {step === 'review' && renderReview()}
    </div>
  );
}

// --- Styles ---
const inputStyle = { padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box' };
const selectStyle = { padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: 'white', outline: 'none', width: '100%' };
const cardStyle = { background: 'white', padding: 24, borderRadius: 16, border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' };
const listCardStyle = { background: 'white', padding: '16px 24px', borderRadius: 12, border: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 20, transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };
const primaryBtnStyle = { padding: '12px 24px', borderRadius: 10, background: '#1A2CA3', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 };
const secondaryBtnStyle = { padding: '12px 24px', borderRadius: 10, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', fontSize: 14 };
const sectionCardStyle = { background: 'white', padding: 32, borderRadius: 16, border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', marginBottom: 24 };
const selectionCardStyle = { padding: 24, borderRadius: 16, border: '2px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 };
const labelStyle = { display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.02em' };
const chipStyle = { background: '#e0e7ff', color: '#4338ca', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 };
const chipCloseStyle = { border: 'none', background: 'none', color: '#4338ca', cursor: 'pointer', fontWeight: 700, fontSize: 14, padding: 0 };
const currencyWrap = { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' };
const miniInputStyle = { padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, width: '100%', outline: 'none' };
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 };
const modalContentStyle = { background: 'white', padding: 32, borderRadius: 20, width: 440, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' };
const tdLabel = { padding: '12px 0', color: '#6b7280', fontWeight: 500, width: '40%', fontSize: 14 };
const tdValue = { padding: '12px 0', fontWeight: 600, color: '#1f2937', fontSize: 14 };

export default AddProduct;
