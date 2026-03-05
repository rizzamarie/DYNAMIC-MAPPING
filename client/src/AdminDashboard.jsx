import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUsers, FaMap, FaBuilding, FaUserCheck, FaUserTimes, FaRocket, FaShieldAlt, FaChartLine } from 'react-icons/fa';

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    offlineUsers: 0,
    totalMaps: 0,
    totalBranches: 0,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStatsAndUser = async () => {
      try {
        const [usersRes, mapsRes, branchesRes] = await Promise.all([
          axios.get('http://localhost:5000/users'),
          axios.get('http://localhost:5000/maps'),
          axios.get('http://localhost:5000/branches'),
        ]);

        const users = usersRes.data || [];
        const maps = mapsRes.data || [];
        const branches = branchesRes.data || [];

        const activeUsers = users.filter(u => u.isOnline).length;
        const offlineUsers = users.length - activeUsers;

        setStats({
          totalUsers: users.length,
          activeUsers,
          offlineUsers,
          totalMaps: maps.length,
          totalBranches: branches.length,
        });

        // Load current user data with full name
        const storedUsername = localStorage.getItem('currentUserUsername');
        if (storedUsername) {
          const userData = users.find(u => u.username === storedUsername);
          if (userData) {
            const fullName = userData.firstName && userData.lastName 
              ? `${userData.firstName} ${userData.lastName}`
              : userData.name || localStorage.getItem('currentUserName') || 'User';
            
            setCurrentUser({ 
              username: userData.username, 
              name: fullName, 
              role: userData.role || localStorage.getItem('currentUserRole') || 'Administrator' 
            });
          } else {
            // Fallback to localStorage if not found in users list
            setCurrentUser({ 
              username: storedUsername, 
              name: localStorage.getItem('currentUserName') || 'User', 
              role: localStorage.getItem('currentUserRole') || 'Administrator' 
            });
          }
        }
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      }
    };

    fetchStatsAndUser();
  }, []);

  const softStyles = {
    container: {
      padding: '20px 30px',
      fontFamily: '"Inter", "Roboto", sans-serif',
      background: '#f8f9fe',
      height: 'calc(100vh - 70px)',
      overflow: 'hidden',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    },
    row: {
      display: 'flex',
      flexWrap: 'wrap',
      margin: '0 -15px',
    },
    colThird: {
      flex: '0 0 33.333%',
      maxWidth: '33.333%',
      padding: '0 15px',
      marginBottom: '20px',
      boxSizing: 'border-box',
    },
    card: (isHovered) => ({
      background: '#ffffff',
      borderRadius: '24px',
      boxShadow: isHovered 
        ? '0 20px 40px rgba(0,0,0,0.12)' 
        : '0 10px 30px rgba(0,0,0,0.05)',
      padding: '20px 24px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
      cursor: 'pointer',
      border: '1px solid rgba(0,0,0,0.03)',
      position: 'relative',
      overflow: 'hidden',
    }),
    cardLabel: {
      color: '#8898aa',
      fontSize: '13px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '12px',
      display: 'block',
    },
    cardValue: {
      color: '#32325d',
      fontSize: '28px',
      fontWeight: '800',
      margin: 0,
      lineHeight: '1.2',
    },
    iconBox: (gradient) => ({
      width: '48px',
      height: '48px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: gradient,
      color: '#fff',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    }),
    userStatsRow: {
      display: 'flex',
      gap: '15px',
      marginTop: '15px',
      paddingTop: '15px',
      borderTop: '1px solid #f1f3f9',
    },
    userStatItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    statusDot: (active) => ({
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: active ? '#2dce89' : '#f5365c',
    }),
    welcomeCard: {
      background: 'linear-gradient(135deg, #004D40 0%, #00695C 50%, #00796B 100%)',
      borderRadius: '30px',
      padding: '35px 45px',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 50px rgba(0, 77, 64, 0.35)',
      marginTop: '10px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    welcomeContent: {
      position: 'relative',
      zIndex: 2,
    },
    welcomeBgIcon: {
      position: 'absolute',
      right: '-30px',
      top: '-10px',
      fontSize: '220px',
      color: 'rgba(255,255,255,0.05)',
      zIndex: 1,
      transform: 'rotate(-15deg)',
    },
    actionBtn: (primary) => ({
      background: primary ? '#fff' : 'transparent',
      color: primary ? '#00695C' : '#fff',
      border: primary ? 'none' : '1px solid rgba(255,255,255,0.4)',
      padding: '12px 24px',
      borderRadius: '12px',
      fontWeight: '700',
      fontSize: '14px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      transition: 'all 0.2s ease',
      boxShadow: primary ? '0 4px 15px rgba(0,0,0,0.1)' : 'none',
    }),
  };

  return (
    <div style={softStyles.container}>
      <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ color: '#32325d', fontWeight: 800, fontSize: '28px', margin: 0 }}>System Overview</h2>
          <p style={{ color: '#8898aa', margin: '4px 0 0 0', fontSize: '15px' }}>Manage and monitor your entire store network.</p>
        </div>
        <div style={{ background: '#fff', padding: '8px 16px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', color: '#525f7f', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaShieldAlt color="#00695C" /> Administrator Mode
        </div>
      </div>

      <div style={softStyles.row}>
        {/* COMBINED USER STATS BOX */}
        <div style={softStyles.colThird}>
          <div 
            style={softStyles.card(hoveredCard === 'users')}
            onMouseEnter={() => setHoveredCard('users')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={softStyles.cardLabel}>System Users</span>
                <h3 style={softStyles.cardValue}>{stats.totalUsers}</h3>
              </div>
              <div style={softStyles.iconBox('linear-gradient(135deg, #2152ff 0%, #21d4fd 100%)')}>
                <FaUsers size={24} />
              </div>
            </div>
            
            <div style={softStyles.userStatsRow}>
              <div style={softStyles.userStatItem}>
                <div style={softStyles.statusDot(true)} />
                <span style={{ fontSize: '14px', color: '#525f7f', fontWeight: 600 }}>{stats.activeUsers} Active</span>
              </div>
              <div style={softStyles.userStatItem}>
                <div style={softStyles.statusDot(false)} />
                <span style={{ fontSize: '14px', color: '#525f7f', fontWeight: 600 }}>{stats.offlineUsers} Offline</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAPS BOX */}
        <div style={softStyles.colThird}>
          <div 
            style={softStyles.card(hoveredCard === 'maps')}
            onMouseEnter={() => setHoveredCard('maps')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={softStyles.cardLabel}>Store Maps</span>
                <h3 style={softStyles.cardValue}>{stats.totalMaps}</h3>
              </div>
              <div style={softStyles.iconBox('linear-gradient(135deg, #7928ca 0%, #ff0080 100%)')}>
                <FaMap size={24} />
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaChartLine color="#2dce89" />
              <span style={{ fontSize: '14px', color: '#2dce89', fontWeight: 700 }}>System Live</span>
            </div>
          </div>
        </div>

        {/* BRANCHES BOX */}
        <div style={softStyles.colThird}>
          <div 
            style={softStyles.card(hoveredCard === 'branches')}
            onMouseEnter={() => setHoveredCard('branches')}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={softStyles.cardLabel}>Active Branches</span>
                <h3 style={softStyles.cardValue}>{stats.totalBranches}</h3>
              </div>
              <div style={softStyles.iconBox('linear-gradient(135deg, #f53939 0%, #fbcf33 100%)')}>
                <FaBuilding size={24} />
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ ...softStyles.statusDot(true), width: '6px', height: '6px' }} />
              <span style={{ fontSize: '14px', color: '#525f7f' }}>All locations operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* CREATIVE WELCOME SECTION */}
      <div style={softStyles.row}>
        <div style={{ flex: '0 0 100%', maxWidth: '100%', padding: '0 15px' }}>
          <div style={softStyles.welcomeCard}>
            <FaRocket style={softStyles.welcomeBgIcon} />
            <div style={softStyles.welcomeContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '10px', backdropFilter: 'blur(10px)' }}>
                  <FaShieldAlt size={20} />
                </div>
                <span style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, fontSize: '12px', opacity: 0.8 }}>Control Center</span>
              </div>
              
              <h1 style={{ fontSize: '42px', fontWeight: 900, margin: '0 0 5px 0', letterSpacing: '-1px' }}>
                Welcome back, <span style={{ color: '#00f2fe', textShadow: '0 0 20px rgba(0,242,254,0.5)' }}>{currentUser?.name || 'User'}</span>!
              </h1>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '25px', textTransform: 'capitalize' }}>
                Role: {currentUser?.role || 'Administrator'}
              </p>
              
              <p style={{ fontSize: '16px', lineHeight: '1.5', opacity: 0.9, maxWidth: '600px', marginBottom: '30px', fontWeight: 500 }}>
                The Maptimize engine is running at full capacity. You have total control over user access, 
                branch configurations, and the interactive store environment. What's your next move?
              </p>
              
              <div style={{ display: 'flex', gap: '20px' }}>
                <button 
                  onClick={() => navigate('/users')}
                  style={softStyles.actionBtn(true)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                  }}
                >
                  <FaUsers /> Manage Personnel
                </button>
                <button 
                  onClick={() => navigate('/branches')}
                  style={softStyles.actionBtn(false)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <FaBuilding /> Configure Branches
                </button>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div style={{ position: 'absolute', bottom: '40px', right: '50px', display: 'flex', gap: '40px', opacity: 0.6 }}>
               <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.activeUsers}</div>
                 <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Online</div>
               </div>
               <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.totalMaps}</div>
                 <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Maps</div>
               </div>
               <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '24px', fontWeight: 800 }}>{stats.totalBranches}</div>
                 <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Hubs</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
