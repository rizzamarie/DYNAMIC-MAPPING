import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaEye, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const NewProductsCarousel = () => {
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const role = localStorage.getItem('currentUserRole');
      const branch = localStorage.getItem('currentBranch');
      let url = 'http://localhost:5000/products';

      if (branch && role && role !== 'admin') {
        url = `http://localhost:5000/products?branch=${encodeURIComponent(branch)}`;
      }

      const res = await axios.get(url);
      // Sort by createdAt desc if available, otherwise just take the last ones reversed
      // Assuming products have createdAt or just taking the latest added (end of list)
      const allProducts = res.data || [];
      const sorted = allProducts.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return 0; // Maintain original order if no date (usually last added are at the end if DB is simple)
      });
      // Limit to e.g., 9 newest products
      setProducts(sorted.slice(0, 9));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching new products:', err);
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex + 3 >= products.length ? 0 : prevIndex + 3
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex - 3 < 0 ? Math.max(0, products.length - 3) : prevIndex - 3
    );
  };

  const visibleProducts = products.slice(currentIndex, currentIndex + 3);
  
  // Pad with empty items if less than 3 visible (edge case for end of list)
  // But with the nextSlide logic resetting to 0, it might be fine. 
  // Ideally we want to show 3 always if possible.

  const totalPages = Math.ceil(products.length / 3);
  const currentPage = Math.floor(currentIndex / 3);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading products...</div>;
  if (products.length === 0) return null;

  return (
    <div style={{ marginTop: '20px', marginBottom: '20px', fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', position: 'relative' }}>
        <h3 style={{ 
          color: '#344767', 
          fontWeight: '400', 
          fontSize: '28px',
          margin: 0,
          position: 'relative',
          paddingBottom: '10px'
        }}>
          Recently Added Products
          <span style={{ 
            position: 'absolute', 
            bottom: 0, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '60px', 
            height: '3px', 
            backgroundColor: '#cb0c9f',
            borderRadius: '2px'
          }}></span>
        </h3>
      </div>

      <div style={{ position: 'relative', padding: '0 40px' }}>
        {/* Navigation Buttons */}
        <button 
          onClick={prevSlide}
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#344767',
            fontSize: '24px',
            zIndex: 10
          }}
        >
          <FaChevronLeft />
        </button>

        <button 
          onClick={nextSlide}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#344767',
            fontSize: '24px',
            zIndex: 10
          }}
        >
          <FaChevronRight />
        </button>

        {/* Product Cards Grid */}
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
          {visibleProducts.map((product) => (
            <ProductCard 
              key={product._id} 
              product={product} 
              onClick={() => navigate('/invent', { state: { highlightId: product._id } })} 
            />
          ))}
        </div>

        {/* Pagination Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px' }}>
          {Array.from({ length: totalPages }).map((_, idx) => (
            <div 
              key={idx}
              onClick={() => setCurrentIndex(idx * 3)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: idx === currentPage ? '#344767' : '#d1d7e0',
                cursor: 'pointer',
                transition: 'background-color 0.3s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ product, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatPrice = (price) => {
    const value = Number(price) || 0;
    try {
      return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value);
    } catch {
      return `₱${value.toFixed(2)}`;
    }
  };

  // Helper to get image URL
  const getImageUrl = (img) => {
    if (!img) return 'https://via.placeholder.com/300?text=No+Image';
    if (img.startsWith('http')) return img;
    return `http://localhost:5000${img}`;
  };

  return (
    <div 
      style={{ 
        flex: '1', 
        maxWidth: '300px',
        minWidth: '250px',
        background: '#fff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        transition: 'transform 0.3s ease',
        transform: isHovered ? 'translateY(-5px)' : 'translateY(0)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ position: 'relative', height: '250px', backgroundColor: '#f8f9fa' }}>
        <img 
          src={getImageUrl(product.image)} 
          alt={product.name}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }} 
        />
        
        {/* Overlay on hover */}
        <div 
          onClick={onClick}
          style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(203, 12, 159, 0.4)', // Pink tint
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
          cursor: 'pointer'
        }}>
          <FaEye size={30} color="#fff" style={{ marginBottom: '10px' }} />
          <span style={{ color: '#fff', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>
            View product
          </span>
        </div>
      </div>
      
      <div style={{ padding: '20px' }}>
        <h4 style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          color: '#344767', 
          margin: '0 0 10px 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {product.name}
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#67748e' }}>{product.category || 'Product'}</span>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#344767' }}>
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NewProductsCarousel;
