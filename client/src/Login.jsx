import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaBuilding, FaUserTag, FaSignInAlt, FaTabletAlt } from 'react-icons/fa';

const API = 'http://localhost:5000';

// Brand Colors (teal palette)
const COLORS = {
  primary: '#00695C',
  primaryGradient: 'linear-gradient(135deg, #00695C 0%, #26A69A 100%)',
  secondary: '#26A69A',
  text: '#102A27',
  textLight: '#4B635E',
  inputBorder: '#B2DFDB',
  inputFocus: '#00695C',
  white: '#ffffff',
  bgLeft: '#E0F2F1'
};

// Maptimize Logo Component (SVG)
const MaptimizeLogo = ({ lightMode = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginBottom: '10px' }}>
    <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: lightMode ? 'drop-shadow(0 0 10px rgba(0,0,0,0.3))' : 'none' }}>
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00695C', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#00796B', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Abstract Map Pin Shape with 4 colors */}
      <path d="M50 95C50 95 20 65 20 40C20 23.4315 33.4315 10 50 10C66.5685 10 80 23.4315 80 40C80 65 50 95 50 95Z" fill={lightMode ? "#0a1242" : "url(#grad1)"} />
      <path d="M50 95C50 95 20 65 20 40C20 23.4315 33.4315 10 50 10" stroke="white" strokeWidth="2" strokeOpacity={lightMode ? "0.8" : "0.2"}/>
      
      {/* Internal Segments to mimic the colorful logo */}
      <path d="M50 10V40H80C80 23.4315 66.5685 10 50 10Z" fill="#26A69A" /> {/* Top Right - Light Green */}
      <path d="M20 40C20 23.4315 33.4315 10 50 10V40H20Z" fill="#004D40" /> {/* Top Left - Dark Teal */}
      <path d="M20 40H50V70C35 60 20 40 20 40Z" fill="#fd7e14" /> {/* Bottom Left - Orange */}
      <path d="M50 40H80C80 40 65 60 50 70V40Z" fill="#ffc107" /> {/* Bottom Right - Yellow */}
      
      {/* Pin Hole */}
      <circle cx="50" cy="40" r="12" fill="white" />
    </svg>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1', color: lightMode ? '#FFFFFF' : '#00332C', letterSpacing: '-0.5px', textShadow: lightMode ? '0 2px 4px rgba(0,0,0,0.45)' : 'none' }}>
        Map<span style={{ color: lightMode ? '#E0F2F1' : '#00332C' }}>timize</span>
      </span>
      <span style={{ fontSize: '12px', color: lightMode ? 'rgba(255,255,255,0.9)' : '#4B635E', letterSpacing: '0.5px', marginTop: '4px' }}>
        Map it right. Sell it fast.
      </span>
    </div>
  </div>
);

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('manager');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/branches`)
      .then(res => res.json())
      .then(data => {
        setBranches(data);
        if (data.length > 0) setSelectedBranch(data[0].name);
      })
      .catch(err => console.error('Failed to fetch branches:', err));
  }, []);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setShowPassword(false);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErr('');
    if (!username || !password || !role) {
      return setErr('All fields are required.');
    }
    if (branches.length > 0 && !selectedBranch) {
        return setErr('Please select a branch.');
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, role, branchName: selectedBranch }),
      });

      const data = await res.clone().json().catch(() => ({}));

      if (res.ok && data.success) {
        const effectiveBranch = data.assignedBranch || selectedBranch || '';
        localStorage.setItem('currentUserUsername', data.username);
        localStorage.setItem('currentUserName', data.name);
        localStorage.setItem('currentUserRole', data.role);
        localStorage.setItem('currentBranch', effectiveBranch);
        if (data.profileImage) {
          localStorage.setItem('currentUserProfileImage', data.profileImage);
        } else {
          localStorage.removeItem('currentUserProfileImage');
        }

        if (data.role === 'staff') navigate('/staff-dashboard');
        else if (data.role === 'manager') navigate('/dashboard');
        else if (data.role === 'admin') navigate('/admin-dashboard');
        else if (data.role === 'cashier') navigate('/cashier');
        else navigate('/');
      } else {
        const text = !res.ok ? await res.text() : '';
        setErr(data.message || text || 'Login failed.');
        setPassword('');
      }
    } catch (err) {
      setErr('Cannot reach server — is it running on :5000?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const containerStyle = {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    backgroundColor: '#FFFFFF'
  };

  const leftPanelStyle = {
    flex: '1',
    background: '#00796B',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    color: 'white',
    padding: '40px',
  };

  const rightPanelStyle = {
    flex: '1',
    background: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '60px',
    position: 'relative',
  };

  const formContainerStyle = {
    width: '100%',
    maxWidth: '380px',
    position: 'relative',
    zIndex: 2,
  };

  const inputGroupStyle = (fieldName) => ({
    marginBottom: '25px',
    position: 'relative',
    transition: 'all 0.3s ease',
    transform: focusedField === fieldName ? 'translateY(-2px)' : 'none',
  });

  const labelStyle = {
    fontSize: '14px',
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: '8px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const inputStyle = (fieldName) => ({
    width: '100%',
    padding: '12px 15px',
    fontSize: '16px',
    border: 'none',
    borderBottom: `2px solid ${focusedField === fieldName ? COLORS.inputFocus : COLORS.inputBorder}`,
    outline: 'none',
    background: '#E0F2F1',
    borderRadius: '4px 4px 0 0',
    transition: 'all 0.3s ease',
    color: COLORS.text,
  });

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    background: COLORS.primaryGradient,
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: '20px',
    boxShadow: '0 4px 15px rgba(0, 105, 92, 0.3)',
    transition: 'all 0.3s ease',
    opacity: loading ? 0.8 : 1,
    transform: loading ? 'scale(0.98)' : 'scale(1)',
  };

  // Abstract Shapes for Left Panel
  const Circle = ({ size, top, left, opacity }) => (
    <div style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.1)',
      top,
      left,
      opacity,
      zIndex: 0,
    }} />
  );

  return (
    <div style={containerStyle}>
      {/* Left Panel - Illustration/Brand */}
      <div style={leftPanelStyle} className="d-none d-md-flex">
        <Circle size="400px" top="-100px" left="-100px" opacity={0.5} />
        <Circle size="300px" top="40%" left="60%" opacity={0.3} />
        <Circle size="150px" top="80%" left="10%" opacity={0.4} />
        
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: '80%' }}>
          {/* Use a larger version of the logo or an illustration here */}
           <div style={{ marginBottom: '40px', transform: 'scale(1.5)' }}>
             <MaptimizeLogo lightMode={true} /> 
             {/* Using the logo again as the main visual since we lack an illustration asset, but styled differently if needed */}
           </div>
           
           <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '20px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
             Welcome to Maptimize
           </h1>
           <p style={{ fontSize: '18px', lineHeight: '1.6', opacity: 0.9 }}>
             Visualize your store layout, track inventory, and optimize product placement for maximum efficiency.
           </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={rightPanelStyle}>
        {/* Kiosk Button (Top Right) */}
        <button
          onClick={() => navigate('/kiosk')}
          style={{
            position: 'absolute',
            top: '25px',
            right: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: 'white',
            border: `2px solid ${COLORS.primary}`,
            borderRadius: '50px',
            color: COLORS.primary,
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.primary;
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = COLORS.primary;
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
          }}
        >
          <FaTabletAlt size={16} />
          Customer Kiosk
        </button>

        <div style={formContainerStyle}>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <MaptimizeLogo />
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: COLORS.text, marginTop: '20px' }}>Login your account</h2>
            <p style={{ color: COLORS.white }}>Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={submit}>
              
              <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ ...inputGroupStyle('branch'), flex: 1 }}>
                <label style={labelStyle}><FaBuilding style={{ marginRight: 6 }}/> Branch</label>
                <select
                    style={inputStyle('branch')}
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    onFocus={() => setFocusedField('branch')}
                    onBlur={() => setFocusedField(null)}
                >
                    <option value="" disabled>Select Branch</option>
                    {branches.map(branch => (
                    <option key={branch._id} value={branch.name}>{branch.name}</option>
                    ))}
                </select>
                </div>

                <div style={{ ...inputGroupStyle('role'), flex: 1 }}>
                <label style={labelStyle}><FaUserTag style={{ marginRight: 6 }}/> Role</label>
                <select
                    style={inputStyle('role')}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    onFocus={() => setFocusedField('role')}
                    onBlur={() => setFocusedField(null)}
                >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                </select>
                </div>
            </div>

            <div style={inputGroupStyle('username')}>
              <label style={labelStyle}><FaUser style={{ marginRight: 6 }}/> Username</label>
              <input
                type="text"
                style={inputStyle('username')}
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoComplete="off"
                name="login-username"
              />
            </div>

            <div style={inputGroupStyle('password')}>
              <label style={labelStyle}><FaLock style={{ marginRight: 6 }}/> Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  style={{ ...inputStyle('password'), paddingRight: '40px' }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="new-password"
                  name="login-password"
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    color: '#888',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {err && (
              <div style={{ 
                padding: '10px', 
                background: '#fee2e2', 
                color: '#ef4444', 
                borderRadius: '4px', 
                marginBottom: '20px', 
                fontSize: '14px',
                borderLeft: '4px solid #ef4444'
              }}>
                {err}
              </div>
            )}

            <button 
              type="submit" 
              style={buttonStyle}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(26, 44, 163, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(26, 44, 163, 0.3)'; }}
            >
              {loading ? 'Signing In...' : 'Login'} <FaSignInAlt style={{ marginLeft: '8px' }}/>
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
}
