import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

import { FaBox, FaMap, FaUserCircle, FaHome, FaTabletAlt, FaWifi, FaCheckCircle, FaCog, FaTimes, FaMagic, FaSync } from 'react-icons/fa';
import NewProductsCarousel from './NewProductsCarousel';

// IMPORT ALL STYLES HERE
import * as styles from './DashboardStyles';




function Dashboard() {
  const [mapData, setMapData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [productStatusTotals, setProductStatusTotals] = useState({
    outOfStock: 0,
    lowStock: 0,
    inStock: 0,
  });
  const [savedMapsStats, setSavedMapsStats] = useState({ total: 0, active: 0 });
  const [categoriesCount, setCategoriesCount] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchKioskMap(),
          fetchProductStatusTotals(),
          fetchSavedMapsTotal(),
        ]);

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
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, []);

  const fetchKioskMap = async () => {
    try {
      const branch = localStorage.getItem('currentBranch');
      const res = await axios.get('http://localhost:5000/maps', {
        params: { branch }
      });
      const kioskMap = res.data?.find((m) => m.isKioskMap) || null;
      setMapData(kioskMap);
    } catch (err) {
      console.error('Failed to fetch kiosk map:', err);
      setMapData(null);
    }
  };

  const effectiveStockOf = (p) => {
    if (!p) return 0;
    if (p.totalStock !== undefined && p.totalStock !== null && !isNaN(Number(p.totalStock))) {
      return Number(p.totalStock);
    }

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
    return Number(p.stockQty) || 0;
  };

  const fetchProductStatusTotals = async () => {
    try {
      const role = localStorage.getItem('currentUserRole');
      const branch = localStorage.getItem('currentBranch');
      let url = 'http://localhost:5000/products';

      if (branch && role && role !== 'admin') {
        url = `http://localhost:5000/products?branch=${encodeURIComponent(branch)}`;
      }

      const res = await axios.get(url);
      const products = res.data || [];

      let outOfStock = 0;
      let lowStock = 0;
      let inStock = 0;

      for (const p of products) {
        const eff = effectiveStockOf(p);
        if (eff <= 0) outOfStock += 1;
        else if (eff < 100) lowStock += 1;
        else inStock += 1;
      }

      setProductStatusTotals({ outOfStock, lowStock, inStock });
      
      const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean)).size;
      setCategoriesCount(uniqueCategories);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProductStatusTotals({ outOfStock: 0, lowStock: 0, inStock: 0 });
      setCategoriesCount(0);
    }
  };

  const fetchSavedMapsTotal = async () => {
    try {
      const role = localStorage.getItem('currentUserRole');
      const branch = localStorage.getItem('currentBranch');
      let url = 'http://localhost:5000/maps';

      if (branch && role && role !== 'admin') {
        url = `http://localhost:5000/maps?branch=${encodeURIComponent(branch)}`;
      }

      const res = await axios.get(url);
      const maps = res.data || [];
      const active = maps.filter(m => m.isKioskMap).length;
      setSavedMapsStats({ total: maps.length, active });
    } catch (err) {
      console.error('Error fetching maps:', err);
      setSavedMapsStats({ total: 0, active: 0 });
    }
  };
  
  const currentPath = location.pathname;

  // Sidebar item UI
  const softStyles = {
    container: {
      padding: '0', // Changed to 0 for Ribbon
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      background: 'transparent',
      minHeight: 'calc(100vh - 70px)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    },
    contentWrapper: {
        padding: '20px',
        flex: 1,
    },
    row: {
      display: 'flex',
      flexWrap: 'wrap',
      margin: '0 -12px',
    },
    colHalf: {
      flex: '0 0 50%',
      maxWidth: '50%',
      padding: '0 12px',
      marginBottom: '24px',
      boxSizing: 'border-box',
    },
    colThird: {
      flex: '0 0 33.333%',
      maxWidth: '33.333%',
      padding: '0 12px',
      marginBottom: '24px',
      boxSizing: 'border-box',
    },
    colFull: {
      flex: '0 0 100%',
      maxWidth: '100%',
      padding: '0 12px',
      marginBottom: '24px',
      boxSizing: 'border-box',
    },
    colQuarter: {
      flex: '0 0 25%',
      maxWidth: '25%',
      padding: '0 12px',
      marginBottom: '24px',
      boxSizing: 'border-box',
    },
    card: {
      background: 'transparent',
      borderRadius: '20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      padding: '24px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      minWidth: '0',
      wordWrap: 'break-word',
      border: '1px solid rgba(255,255,255,0.12)',
      height: '100%',
      transition: 'transform 0.2s',
    },
    miniCardContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    miniCardText: {
      flex: 1,
    },
    miniCardTitle: {
      color: '#67748e',
      fontSize: '14px',
      fontWeight: '600',
      margin: 0,
      marginBottom: '4px',
    },
    miniCardValue: {
      color: '#344767',
      fontSize: '24px',
      fontWeight: '700',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    iconBox: (gradient) => ({
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: gradient,
      color: '#fff',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    }),
    bigCardBody: {
      display: 'flex',
      flexDirection: 'row',
      height: '100%',
      gap: '24px',
    },
    bigCardTextSection: {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    bigCardImageSection: {
        flex: '0 0 45%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(310deg, #7928ca 0%, #ff0080 100%)',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '220px',
    },
  };

  const HoverCard = ({ children, style, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
      <div
        style={{
          ...softStyles.card,
          ...style,
          transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
          boxShadow: isHovered ? '0 15px 30px rgba(0,0,0,0.12)' : '0 8px 24px rgba(0,0,0,0.08)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          cursor: onClick ? 'pointer' : 'default'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {children}
      </div>
    );
  };

  

  return (
    <div style={softStyles.container}>
      {/* Ribbon Header Removed */}

      <div style={softStyles.contentWrapper}>
        <div style={softStyles.row}>
          <div style={softStyles.colThird}>
            <HoverCard>
              <div style={softStyles.miniCardContent}>
                <div style={softStyles.miniCardText}>
                  <p style={softStyles.miniCardTitle}>Categories</p>
                  <h5 style={softStyles.miniCardValue}>
                    {categoriesCount}
                    <span style={{ fontSize: '14px', color: '#82d616', fontWeight: 'bold' }}>Types</span>
                  </h5>
                </div>
                <div style={softStyles.iconBox('linear-gradient(310deg, #f53939 0%, #fbcf33 100%)')}>
                  <FaTabletAlt size={22} />
                </div>
              </div>
            </HoverCard>
          </div>

          <div style={softStyles.colThird}>
            <HoverCard>
              <div style={softStyles.miniCardContent}>
                <div style={softStyles.miniCardText}>
                  <p style={softStyles.miniCardTitle}>Saved Maps</p>
                  <h5 style={softStyles.miniCardValue}>
                    {savedMapsStats.total}
                    <span style={{ fontSize: '14px', color: '#82d616', fontWeight: 'bold' }}>Total | {savedMapsStats.active} Active</span>
                  </h5>
                </div>
                <div 
                  style={{ 
                    ...softStyles.iconBox('linear-gradient(310deg, #7928ca 0%, #ff0080 100%)'), 
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate('/saved-maps')}
                  title="Customize Map"
                >
                  <FaMap size={22} />
                </div>
              </div>
            </HoverCard>
          </div>

          <div style={softStyles.colThird}>
            <HoverCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <p style={softStyles.miniCardTitle}>Product Stock Status</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '14px', height: '110px' }}>
                    {(() => {
                      const { outOfStock, lowStock, inStock } = productStatusTotals;
                      const total = outOfStock + lowStock + inStock;
                      if (total === 0) {
                        return (
                          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888' }}>
                            No Data
                          </div>
                        );
                      }
                      const outDeg = (outOfStock / total) * 360;
                      const lowDeg = (lowStock / total) * 360;
                      const gradient = `conic-gradient(#ef4444 0deg ${outDeg}deg, #f59e0b ${outDeg}deg ${outDeg + lowDeg}deg, #10b981 ${outDeg + lowDeg}deg 360deg)`;
                      return (
                        <>
                          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: gradient, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', position: 'relative', flexShrink: 0 }}></div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                              <span style={{ fontSize: '12px', color: '#67748e' }}>Out: <strong>{outOfStock}</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div>
                              <span style={{ fontSize: '12px', color: '#67748e' }}>Low: <strong>{lowStock}</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                              <span style={{ fontSize: '12px', color: '#67748e' }}>In: <strong>{inStock}</strong></span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div 
                  style={{ 
                    ...softStyles.iconBox('linear-gradient(310deg, #2152ff 0%, #21d4fd 100%)'), 
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate('/invent')}
                  title="Go to Inventory"
                >
                  <FaBox size={22} />
                </div>
              </div>
            </HoverCard>
          </div>
        </div>

        

        {/* Manager Control Center */}
        <div style={softStyles.row}>
          <div style={softStyles.colFull}>
            <HoverCard>
              <div
                style={{
                  background: 'linear-gradient(135deg, #004D40 0%, #00695C 50%, #00796B 100%)',
                  borderRadius: '24px',
                  padding: '30px',
                  color: '#fff',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '6px 10px', fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>
                    <FaCog size={14} style={{ opacity: 0.9 }} />
                    <span style={{ opacity: 0.9 }}>CONTROL CENTER</span>
                  </div>
                  <h1 style={{ fontSize: 32, margin: '8px 0 10px 0', fontWeight: 800 }}>
                    Welcome back, <span style={{ 
                      background: 'linear-gradient(90deg, #00f2fe 0%, #28a745 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>{currentUser?.name || 'Manager'}</span>!
                  </h1>
                  <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 12 }}>Role: Manager</div>
                  <p style={{ fontSize: 14, maxWidth: 620, opacity: 0.9 }}>
                    Review stock and maps. Your access focuses on inventory and store mapping tools.
                  </p>
                  <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                    <button 
                      onClick={() => navigate('/invent')} 
                      style={{ background: '#fff', color: '#1A2CA3', border: 'none', borderRadius: 50, padding: '10px 18px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                    >
                      Manage Inventory
                    </button>
                    <button 
                      onClick={() => navigate('/saved-maps')} 
                      style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 50, padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Customize Map
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{categoriesCount}</div>
                      <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1 }}>CATEGORIES</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{savedMapsStats.total}</div>
                      <div style={{ fontSize: 11, opacity: 0.8, letterSpacing: 1 }}>MAPS</div>
                    </div>
                  </div>
                </div>
              </div>
            </HoverCard>
          </div>
        </div>

        {/* New Products Carousel */}
        <NewProductsCarousel />
      </div>

    </div>
  );
}

export default Dashboard;
