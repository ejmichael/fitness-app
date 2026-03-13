import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LayoutDashboard, Utensils, Dumbbell, LogOut, User, Settings } from 'lucide-react';
import '../styles/Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Meals', path: '/meals', icon: <Utensils size={20} /> },
    { name: 'Workouts', path: '/workouts', icon: <Dumbbell size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="layout-wrapper">
      {/* Sidebar for Desktop */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Activity className="text-indigo-500" size={28} />
            <span className="brand-title">FitInfluencer</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              <User size={20} />
            </div>
            <div className="user-info">
              <p className="user-name">{user?.name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-container">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="mobile-nav">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            {item.icon}
            <span className="mobile-nav-text">{item.name}</span>
          </Link>
        ))}
        <button onClick={handleLogout} className="mobile-nav-item" style={{ background: 'transparent', border: 'none' }}>
          <LogOut size={20} />
          <span className="mobile-nav-text">Logout</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
