import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaBox, FaUsers, FaMap, FaSignOutAlt, FaBuilding, FaEdit, FaCashRegister, FaHistory, FaChevronLeft, FaChevronRight, FaMapMarkerAlt, FaMapMarkedAlt, FaAward } from 'react-icons/fa';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function AppSidebar({ collapsed = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');
  const [showCashiers, setShowCashiers] = useState(false);
  const [cashiers, setCashiers] = useState([]);
  const [internalCollapsed, setInternalCollapsed] = useState(collapsed);

  useEffect(() => {
    const role = localStorage.getItem('currentUserRole');
    setUserRole(role || '');
  }, []);

  useEffect(() => {
    const fetchCashiers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/users');
        const list = (res.data || []).filter(u => String(u.role || '').toLowerCase() === 'cashier');
        setCashiers(list);
      } catch {
        // silent
      }
    };
    fetchCashiers();
  }, []);

  useEffect(() => {
    setInternalCollapsed(collapsed);
  }, [collapsed]);

  // Helper to check if route is active
  const isActive = (path) => {
    if (path === '/map-display') return ['/map-display'].includes(location.pathname);
    if (path === '/saved-maps') return ['/saved-maps', '/map2'].includes(location.pathname);
    if (path === '/invent') return ['/invent', '/addproduct', '/category', '/unit', '/branches'].includes(location.pathname) || location.pathname.startsWith('/update');
    if (path === '/inventory-history') return location.pathname === '/inventory-history';
    return location.pathname === path;
  };

  const handleLogout = () => {
    window.dispatchEvent(new CustomEvent('app:modal', { detail: { open: true } }));
    Swal.fire({
      title: 'Logout',
      text: 'Are you sure you want to log out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1A2CA3',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
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
    });
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('layout:toggleSidebar'));
  };

  return (
    <>
      <div
        className="sidebar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: internalCollapsed ? '80px' : '260px',
          background: 'linear-gradient(180deg, #004D40 0%, #00695C 50%, #00796B 100%)',
          boxShadow: '0 14px 32px rgba(0,0,0,0.35)',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 800,
          transition: 'width 0.2s ease'
        }}
      >
        <div
          className="sidebar-wrapper"
          style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: internalCollapsed ? '10px 6px' : '10px 10px' }}
        >
          <div
            className="logo"
            style={{
              marginBottom: '10px',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            {!internalCollapsed && (
              <a href="/" className="simple-text" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                MAPTIMIZE
              </a>
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              style={{
                width: 36,
                height: 26,
                borderRadius: 13,
                border: 'none',
                background: '#ffffff',
                padding: 0,
                cursor: 'pointer',
                boxShadow: '0 3px 8px rgba(15,23,42,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={internalCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {internalCollapsed ? (
                <FaChevronRight style={{ color: '#0f172a' }} size={16} />
              ) : (
                <FaChevronLeft style={{ color: '#0f172a' }} size={16} />
              )}
            </button>
          </div>
          <ul
            className="nav"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              overflowY: 'auto',
              flex: 1
            }}
          >
            {/* Admin Menu */}
            {userRole === 'admin' && (
              <>
                <li className={isActive('/admin-dashboard') ? 'active' : ''}>
                  <NavLink to="/admin-dashboard" className="nav-link">
                    <i className="tim-icons"><FaHome /></i>
                    {!internalCollapsed && <p>Dashboard</p>}
                  </NavLink>
                </li>
                <li className={isActive('/branches') ? 'active' : ''}>
                  <NavLink to="/branches" className="nav-link">
                    <i className="tim-icons"><FaBuilding /></i>
                    {!internalCollapsed && <p>Manage Branch</p>}
                  </NavLink>
                </li>
                <li className={isActive('/users') ? 'active' : ''}>
                  <NavLink to="/users" className="nav-link">
                    <i className="tim-icons"><FaUsers /></i>
                    {!internalCollapsed && <p>Manage Account</p>}
                  </NavLink>
                </li>
                <li className={isActive('/map-display') ? 'active' : ''}>
                  <NavLink to="/map-display" className="nav-link">
                    <i className="tim-icons"><FaMapMarkerAlt /></i>
                    {!internalCollapsed && <p>View Map</p>}
                  </NavLink>
                </li>
                <li className={isActive('/inventory-history') ? 'active' : ''}>
                  <NavLink to="/inventory-history" className="nav-link">
                    <i className="tim-icons"><FaHistory /></i>
                    {!internalCollapsed && <p>Inventory History</p>}
                  </NavLink>
                </li>
              </>
            )}

            {/* Manager Menu */}
            {userRole === 'manager' && (
              <>
                <li className={isActive('/dashboard') ? 'active' : ''}>
                  <NavLink to="/dashboard" className="nav-link">
                    <i className="tim-icons"><FaHome /></i>
                    {!internalCollapsed && <p>Dashboard</p>}
                  </NavLink>
                </li>
                <li className={isActive('/invent') ? 'active' : ''}>
                  <NavLink to="/invent" className="nav-link">
                    <i className="tim-icons"><FaBox /></i>
                    {!internalCollapsed && <p>Manage Inventory</p>}
                  </NavLink>
                </li>
                <li className={isActive('/saved-maps') ? 'active' : ''}>
                  <NavLink to="/saved-maps" className="nav-link">
                    <i className="tim-icons"><FaMapMarkedAlt /></i>
                    {!internalCollapsed && <p>Customize Map</p>}
                  </NavLink>
                </li>
              </>
            )}

            {/* Staff Menu */}
            {userRole === 'staff' && (
              <>
                <li className={isActive('/staff-dashboard') ? 'active' : ''}>
                  <NavLink to="/staff-dashboard" className="nav-link">
                    <i className="tim-icons"><FaUsers /></i>
                    {!internalCollapsed && <p>Staff Dashboard</p>}
                  </NavLink>
                </li>
                <li className={isActive('/invent') ? 'active' : ''}>
                  <NavLink to="/invent" className="nav-link">
                    <i className="tim-icons"><FaBox /></i>
                    {!internalCollapsed && <p>Manage Stock</p>}
                  </NavLink>
                </li>
                <li>
                  <button
                    onClick={() => {
                      if (internalCollapsed) {
                        window.dispatchEvent(new CustomEvent('layout:setSidebarHidden', { detail: { hidden: false } }));
                      }
                      setShowCashiers(prev => !prev);
                    }}
                    className="nav-link"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '10px 15px', width: '100%', textAlign: 'left' }}
                  >
                    <i className="tim-icons"><FaCashRegister /></i>
                    {!internalCollapsed && <p style={{ margin: 0 }}>Cashiers</p>}
                    {!internalCollapsed && <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{showCashiers ? '▾' : '▸'}</span>}
                  </button>
                  {showCashiers && !internalCollapsed && (
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, margin: '0 8px 8px', padding: '6px', maxHeight: 280, overflowY: 'auto' }}>
                      {cashiers.length === 0 ? (
                        <div style={{ color: '#cbd5e1', fontSize: 12, padding: '6px 10px' }}>No cashiers found</div>
                      ) : (
                        cashiers.map((c) => (
                          <div
                            key={c.username || c._id}
                            onClick={() => {
                              const uname = c.username || '';
                              const url = `${window.location.origin}/cashier${uname ? `?username=${encodeURIComponent(uname)}` : ''}`;
                              window.open(url, '_blank', 'noopener');
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            title="Open cashier tab"
                          >
                            <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid #243b8a', background: '#1f2a6a' }}>
                              {c.photo || c.profileImage ? (
                                <img src={`http://localhost:5000${c.photo || c.profileImage}`} alt="Cashier" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', fontWeight: 800 }}>
                                  {(c.name || c.username || 'C').slice(0,1).toUpperCase()}
                                </div>
                              )}
                              <span style={{ position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, background: '#22c55e', borderRadius: '50%', border: '2px solid #0b1f66' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 13 }}>
                                {(c.firstName && c.lastName) ? `${c.firstName} ${c.lastName}` : (c.name || c.username || 'Cashier')}
                              </span>
                              <span style={{ color: '#cbd5e1', fontSize: 11 }}>
                                {c.assignedBranch || 'Unassigned'} · active
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </li>
              </>
            )}

            {/* Cashier dedicated menu removed: access is via Staff sidebar cashier list */}
          </ul>
        </div>
      </div>
    </>
  );
}
