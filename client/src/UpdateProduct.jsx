import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchableDropdown from './components/SearchableDropdown';
import Swal from 'sweetalert2';

function UpdateProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState({
    name: '',
    brand: '',
    category: '',
    stockQty: 0,
    unit: '',
    price: 0,
  });

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [unitRecords, setUnitRecords] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catsRes, unitsRes] = await Promise.all([
          axios.get(`http://localhost:5000/products/${id}`),
          axios.get('http://localhost:5000/categories'),
          axios.get('http://localhost:5000/units')
        ]);

        setProduct(prodRes.data);
        setCategories(catsRes.data.sort((a, b) => a.name.localeCompare(b.name)));
        
        const unitList = (unitsRes.data || []).map(u => ({
          _id: u._id || u.id || u.name,
          name: u.name || ''
        })).filter(u => u.name);
        setUnitRecords(unitList);
        setUnits(unitList.map(u => u.name).sort((a, b) => a.localeCompare(b)));
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch data', err);
        setError('Failed to fetch product data');
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      const res = await axios.post('http://localhost:5000/categories', { name: trimmed });
      const newCat = res.data;
      setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setProduct(prev => ({ ...prev, category: newCat.name }));
      setNewCategoryName('');
      setShowAddCategoryModal(false);
    } catch (err) {
      alert('Failed to add category');
    }
  };

  const handleDeleteCategory = async (catName) => {
    const target = categories.find(c => c.name === catName);
    if (!target) return;
    const result = await Swal.fire({
      title: 'Delete category?',
      text: `Are you sure you want to delete "${catName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete'
    });
    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/categories/${target._id}`);
        setCategories(prev => prev.filter(c => c._id !== target._id));
        if (product.category === catName) setProduct(prev => ({ ...prev, category: '' }));
      } catch (err) {
        alert('Failed to delete category');
      }
    }
  };

  const handleAddUnit = async () => {
    const trimmed = newUnitName.trim();
    if (!trimmed) return;
    try {
      const res = await axios.post('http://localhost:5000/units', { name: trimmed });
      const newUnit = res.data;
      setUnitRecords(prev => [...prev, newUnit]);
      setUnits(prev => [...prev, newUnit.name].sort());
      setProduct(prev => ({ ...prev, unit: newUnit.name }));
      setNewUnitName('');
      setShowAddUnitModal(false);
    } catch (err) {
      alert('Failed to add unit');
    }
  };

  const handleDeleteUnit = async (unitName) => {
    const target = unitRecords.find(u => u.name === unitName);
    if (!target) return;
    const result = await Swal.fire({
      title: 'Delete unit?',
      text: `Are you sure you want to delete "${unitName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete'
    });
    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/units/${encodeURIComponent(target._id)}?permanent=true&confirm=true`);
        setUnitRecords(prev => prev.filter(u => u._id !== target._id));
        setUnits(prev => prev.filter(u => u !== unitName));
        if (product.unit === unitName) setProduct(prev => ({ ...prev, unit: '' }));
      } catch (err) {
        alert('Failed to delete unit');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const role = localStorage.getItem('currentUserRole') || '';
      const name = localStorage.getItem('currentUserName') || '';
      await axios.put(
        `http://localhost:5000/products/${id}?actorRole=${encodeURIComponent(role)}&actorName=${encodeURIComponent(name)}`,
        product
      );
      navigate('/invent');
    } catch (err) {
      console.error('Failed to update product', err);
      setError('Failed to update product');
    }
  };

  if (loading) return <div style={containerStyle}><p>Loading...</p></div>;
  if (error) return <div style={containerStyle}><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={headerStyle}>Update Product</h2>
        <form onSubmit={handleSubmit}>
          <div style={formGridStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Name</label>
              <input type="text" name="name" value={product.name} onChange={handleChange} required style={inputStyle} />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Brand</label>
              <input type="text" name="brand" value={product.brand} onChange={handleChange} required style={inputStyle} />
            </div>
            
            <div style={{ ...formGroupStyle, gridColumn: 'span 1' }}>
              <SearchableDropdown
                label="Category"
                options={categories.map(c => ({ value: c.name, label: c.name }))}
                value={product.category}
                onChange={handleChange}
                onAdd={() => setShowAddCategoryModal(true)}
                onDelete={handleDeleteCategory}
                placeholder="Select category"
              />
            </div>

            <div style={{ ...formGroupStyle, gridColumn: 'span 1' }}>
              <SearchableDropdown
                label="Unit"
                options={units.map(u => ({ value: u, label: u }))}
                value={product.unit}
                onChange={handleChange}
                onAdd={() => setShowAddUnitModal(true)}
                onDelete={handleDeleteUnit}
                placeholder="Select unit"
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Price</label>
              <input type="number" name="price" value={product.price} onChange={handleChange} required style={inputStyle} />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Stock Quantity</label>
              <input type="number" name="stockQty" value={product.stockQty} onChange={handleChange} required style={inputStyle} />
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: '20px' }}>
            <button type="submit" style={submitBtnStyle}>Update Product</button>
          </div>
        </form>
      </div>

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 16px 0' }}>Add New Category</h3>
            <input
              type="text"
              placeholder="Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleAddCategory} style={submitBtnStyle}>Add</button>
              <button onClick={() => setShowAddCategoryModal(false)} style={{ ...submitBtnStyle, backgroundColor: '#6b7280' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnitModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ margin: '0 0 16px 0' }}>Add New Unit</h3>
            <input
              type="text"
              placeholder="Unit Name (e.g. Kg, Pcs)"
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleAddUnit} style={submitBtnStyle}>Add</button>
              <button onClick={() => setShowAddUnitModal(false)} style={{ ...submitBtnStyle, backgroundColor: '#6b7280' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UpdateProduct;

/* ---------- Minimalist No-Scroll Styles ---------- */

const containerStyle = {
  maxWidth: '800px',
  margin: '20px auto',
  padding: '0 16px',
  fontFamily: 'Arial, sans-serif',
};

const cardStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: '10px',
  padding: '24px',
  boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
};

const headerStyle = {
  fontSize: '20px',
  color: '#333',
  marginBottom: '16px',
  fontWeight: 800
};

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
};

const formGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const labelStyle = {
  fontSize: '13px',
  marginBottom: '4px',
  color: '#555',
  fontWeight: 800
};

const inputStyle = {
  padding: '10px',
  fontSize: '13px',
  border: '1px solid #ccc',
  borderRadius: '5px',
  backgroundColor: '#f9f9f9',
  width: '100%',
  boxSizing: 'border-box'
};

const submitBtnStyle = {
  padding: '10px 18px',
  backgroundColor: '#1ec14c',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '14px',
  cursor: 'pointer',
  fontWeight: 600
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: '#fff',
  padding: '24px',
  borderRadius: '12px',
  width: '320px',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
};
