import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AppSidebar from './AppSidebar';
import { FaUserCircle, FaClock, FaShieldAlt, FaBuilding, FaSignOutAlt, FaTimes, FaEdit, FaCashRegister } from 'react-icons/fa';
import Swal from 'sweetalert2';
import '../assets/scss/black-dashboard-react.scss'; // Import Custom Theme

export default function AdminLayout({ children }) {
  const [user, setUser] = useState({ 
    name: 'User', 
    role: 'Staff', 
    username: '', 
    branch: '', 
    joinedAt: '', 
    photo: null
  });
  const [cashierHeader, setCashierHeader] = useState({ name: 'Cashier', branch: '' });
  const location = useLocation();
  const isKiosk = location.pathname.includes('/kiosk');
  const isCashier = location.pathname.includes('/cashier');
  const isMapEditorPage = location.pathname.includes('/map2');
  const navigate = useNavigate();
  const [isBlurred, setIsBlurred] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(localStorage.getItem('sidebarHidden') === 'true');

  useEffect(() => {
    const fetchFullUserData = async () => {
      const storedUsername = localStorage.getItem('currentUserUsername');
      if (!storedUsername) return;

      try {
        const res = await axios.get('http://localhost:5000/users');
        const userData = (res.data || []).find(u => u.username === storedUsername);
        
        if (userData) {
          const fullName = userData.firstName && userData.lastName 
            ? `${userData.firstName} ${userData.lastName}`
            : userData.name || localStorage.getItem('currentUserName') || 'User';

          setUser({
            name: fullName,
            role: userData.role || localStorage.getItem('currentUserRole') || 'Staff',
            username: userData.username || '',
            branch: userData.assignedBranch || 'Unassigned',
            joinedAt: userData.createdAt ? new Date(userData.createdAt).toLocaleString() : 'N/A',
            photo: userData.photo || userData.profileImage || null
          });
        }
      } catch (err) {
        console.error('Error fetching full user data:', err);
        // Fallback to localStorage if fetch fails
        setUser(prev => ({
          ...prev,
          name: localStorage.getItem('currentUserName') || 'User',
          role: localStorage.getItem('currentUserRole') || 'Staff'
        }));
      }
    };

    fetchFullUserData();

    const handleProfileUpdate = () => {
      fetchFullUserData();
    };

    window.addEventListener('user:profileUpdated', handleProfileUpdate);
    return () => {
      window.removeEventListener('user:profileUpdated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (!location.pathname.includes('/cashier')) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const uname = params.get('username');
      if (!uname) {
        setCashierHeader({ name: 'Cashier', branch: '' });
        return;
      }
      (async () => {
        try {
          const res = await axios.get('http://localhost:5000/users');
          const list = Array.isArray(res.data) ? res.data : [];
          const found = list.find(u => String(u.username).toLowerCase() === String(uname).toLowerCase());
          if (found) {
            const fullName =
              (found.firstName && found.lastName)
                ? `${found.firstName} ${found.lastName}`
                : found.name || found.username || uname;
            setCashierHeader({
              name: fullName,
              branch: found.assignedBranch || 'Cashier'
            });
          } else {
            setCashierHeader({ name: uname, branch: 'Cashier' });
          }
        } catch {
          setCashierHeader({ name: uname, branch: 'Cashier' });
        }
      })();
    } catch {
      setCashierHeader({ name: 'Cashier', branch: '' });
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    const toggleHandler = () => {
      const next = !(localStorage.getItem('sidebarHidden') === 'true');
      localStorage.setItem('sidebarHidden', next ? 'true' : 'false');
      setSidebarHidden(next);
    };
    const setHandler = (e) => {
      const v = !!(e.detail && e.detail.hidden);
      localStorage.setItem('sidebarHidden', v ? 'true' : 'false');
      setSidebarHidden(v);
    };
    window.addEventListener('layout:toggleSidebar', toggleHandler);
    window.addEventListener('layout:setSidebarHidden', setHandler);
    return () => {
      window.removeEventListener('layout:toggleSidebar', toggleHandler);
      window.removeEventListener('layout:setSidebarHidden', setHandler);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const open = !!(e.detail && e.detail.open);
      setIsBlurred(open);
    };
    window.addEventListener('app:modal', handler);
    return () => window.removeEventListener('app:modal', handler);
  }, []);

  const handleLogout = () => {
    setShowProfileModal(false);
    window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: true } }));
    Swal.fire({
      title: 'Logout',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
      backdrop: false
    }).then((result) => {
      window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: false } }));
      if (result.isConfirmed) {
        localStorage.removeItem('user');
        localStorage.removeItem('currentUserName');
        localStorage.removeItem('currentUserRole');
        localStorage.removeItem('currentUserUsername');
        localStorage.removeItem('token');
        navigate('/login');
      }
    }).catch(() => {
      window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: false } }));
    });
  };

  const getPageTitle = (pathname) => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/invent')) return 'Product Inventory';
    if (pathname.includes('/map')) return 'Map Display';
    if (pathname.includes('/users') || pathname.includes('/usermenu')) return 'System Users';
    if (pathname.includes('/staff-dashboard')) return 'Staff Dashboard';
    if (pathname.includes('/kiosk')) return 'Store Map Kiosk';
    if (pathname.includes('/category')) return 'Category Management';
    if (pathname.includes('/unit')) return 'Unit Management';
    if (pathname.includes('/branches')) return 'Branch Management';
    if (pathname.includes('/addproduct')) return 'Add Product';
    if (pathname.includes('/update')) return 'Update Product';
    if (pathname.includes('/cashier')) return 'Cashier';
    return 'Dashboard'; // Default
  };

  const pageTitle = getPageTitle(location.pathname);
  const roleTitle =
    user.role === 'admin'
      ? 'Store Admin'
      : user.role === 'manager'
      ? 'Store Manager'
      : 'Store Staff';

  return (
    <div className="app-container" style={{ height: '100vh', overflow: 'hidden', width: '100%', maxWidth: '100%' }}>
      <div className="wrapper" style={{ height: '100%', display: 'flex', width: '100%', maxWidth: '100%' }}>
        {!isKiosk && !isCashier && <AppSidebar collapsed={sidebarHidden} />}
        <div
          className="main-panel"
          style={{
            marginLeft: (isKiosk || isCashier) ? 0 : (sidebarHidden ? '80px' : '260px'),
            width: (isKiosk || isCashier) ? '100%' : (sidebarHidden ? 'calc(100% - 80px)' : 'calc(100% - 260px)'),
            height: '100vh',
            overflowY: isMapEditorPage ? 'hidden' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            background: 'transparent',
            padding: 0
          }}
        >
          {/* Top Header Bar (hidden on cashier and kiosk pages) */}
          {!isCashier && !isKiosk && (
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 800,
                width: '100%',
                padding: '14px 26px',
                background: 'linear-gradient(90deg, #26A69A 0%, #B2DFDB 100%)',
                borderBottom: '1px solid #26A69A',
                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 18,
                fontFamily: 'Segoe UI, system-ui, -apple-system, BlinkMacSystemFont, Inter, sans-serif',
                height: '74px'
              }}
            >
              {/* Left: Brand + Page Context */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #004D40 0%, #00695C 50%, #00796B 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: 20,
                    boxShadow: '0 8px 18px rgba(0,77,64,0.35)'
                  }}
                >
                  M
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#004D40',
                      letterSpacing: 0.2
                    }}
                  >
                    {isKiosk ? 'Store Map Kiosk' : roleTitle}
                  </span>
                  {!isKiosk && (
                    <span
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#00695C'
                      }}
                    >
                      Dashboard / {pageTitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: profile, or kiosk shortcut */}
              {isKiosk ? (
                <button
                  onClick={() => {
                    const uname = localStorage.getItem('currentUserUsername') || '';
                    const url = `${window.location.origin}/cashier${uname ? `?username=${encodeURIComponent(uname)}` : ''}`;
                    window.open(url, '_blank', 'noopener');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#ffffff',
                    color: '#004D40',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  title="Open cashier in a new tab"
                >
                  <FaCashRegister />
                  <span>Open Cashier</span>
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: '#ffffff',
                      border: '1px solid #B2DFDB',
                      boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#4b5563'
                    }}
                  >
                    <FaShieldAlt style={{ color: '#00695C' }} />
                    <span style={{ textTransform: 'capitalize' }}>{user.role || 'User'}</span>
                    <span style={{ width: 4, height: 4, borderRadius: '999px', background: '#22c55e' }} />
                    <span style={{ color: '#16a34a' }}>Active</span>
                  </div>

                  <div
                    onClick={() => setShowProfileModal(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 999,
                      transition: 'background 0.18s ease, box-shadow 0.18s ease',
                      background: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(15,23,42,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 13,
                          fontWeight: 700,
                          color: '#111827'
                        }}
                      >
                        {user.name}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 11,
                          color: '#6b7280',
                          textTransform: 'capitalize'
                        }}
                      >
                        {user.branch || 'Branch'}
                      </span>
                    </div>
                    {user.photo ? (
                      <img
                        src={`http://localhost:5000${user.photo}`}
                        alt="Profile"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '999px',
                          objectFit: 'cover',
                          border: '2px solid #e5e7eb'
                        }}
                      />
                    ) : (
                      <FaUserCircle size={32} color="#00695C" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            className="content"
            style={{
              padding: 0,
              minHeight: 'calc(100vh - 70px)',
              transition: 'filter 0.2s ease'
            }}
          >
            {children}
          </div>
        </div>
      </div>
      {isBlurred && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backdropFilter: 'blur(3px)',
            background: 'transparent',
            zIndex: 900,
            pointerEvents: 'none'
          }}
        />
      )}
      
      {/* User Profile Modal (Right Side) */}
      {showProfileModal && !isKiosk && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 1099,
              backdropFilter: 'none'
            }}
            onClick={() => setShowProfileModal(false)}
          />
          <div style={{
            position: 'fixed',
            top: '75px', // Below header
            right: '20px',
            width: '320px',
            background: '#CBDCEB',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            zIndex: 1100,
            overflow: 'hidden',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
             {/* Header */}
             <div style={{ padding: '15px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>User Information <span style={{ fontSize: '11px', background: '#e0f2f1', color: '#00695c', padding: '2px 8px', borderRadius: '10px', marginLeft: '8px' }}>Active</span></h4>
                <FaEdit style={{ color: '#999', cursor: 'pointer' }} />
             </div>
             
             {/* Body */}
             <div style={{ padding: '25px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                   {user.photo ? (
                      <img src={`http://localhost:5000${user.photo}`} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px', border: '3px solid #f0f0f0' }} />
                   ) : (
                      <FaUserCircle size={100} color="#e0e0e0" style={{ marginBottom: '15px' }} />
                   )}
                   <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#333' }}>{user.name}</h3>
                   <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>@{user.username || 'username'}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <FaClock style={{ color: '#999', marginTop: '3px' }} />
                      <div>
                         <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333' }}>Joined:</span>
                         <span style={{ fontSize: '13px', color: '#666' }}>{user.joinedAt}</span>
                      </div>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <FaShieldAlt style={{ color: '#999', marginTop: '3px' }} />
                      <div style={{ flex: 1 }}>
                         <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '5px' }}>Role</span>
                         <div style={{ background: '#e3f2fd', color: '#1976d2', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', display: 'inline-block' }}>{user.role}</div>
                      </div>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <FaBuilding style={{ color: '#999', marginTop: '3px' }} />
                      <div style={{ flex: 1 }}>
                         <span style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '5px' }}>Branch</span>
                         <div style={{ background: '#f3e5f5', color: '#7b1fa2', padding: '4px 12px', borderRadius: '4px', fontSize: '12px', display: 'inline-block' }}>{user.branch}</div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer - Logout */}
             <div style={{ padding: '20px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
                <button 
                  onClick={handleLogout}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: '#fff0f3', 
                    color: '#e91e63', 
                    border: '1px solid #ffcdd2', 
                    borderRadius: '8px', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#e91e63'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff0f3'; e.currentTarget.style.color = '#e91e63'; }}
                >
                   <FaSignOutAlt /> Log Out
                </button>
             </div>
          </div>
          <style>{`
            @keyframes slideInRight {
              from { opacity: 0; transform: translateX(20px); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
