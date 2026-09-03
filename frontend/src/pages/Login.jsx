import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('manager@warehouse.ai');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);

    // Simulate authenticating against backend / local session
    setTimeout(() => {
      localStorage.setItem('user', JSON.stringify({ email, role: 'Warehouse Manager', name: 'Alex Mercer' }));
      localStorage.setItem('isAuthenticated', 'true');
      setLoading(false);
      navigate('/');
    }, 600);
  };

  const handleQuickFill = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `linear-gradient(135deg, rgba(15, 17, 23, 0.88) 0%, rgba(26, 29, 39, 0.92) 100%), url('/warehouse_bg.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '24px'
    }}>
      
      {/* Glassmorphism Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(30, 33, 48, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '40px 36px',
        boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.75)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)'
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', margin: '8px 0 0 0', tracking: '-0.02em' }}>
            Warehouse AI
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontWeight: 500 }}>
            Enterprise Intelligent Management System
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--error)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Email Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.1em' }}>
              Work Email / Username
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '14px', color: '#94a3b8', fontSize: '14px' }}>✉️</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@warehouse.ai"
                style={{
                  width: '100%',
                  background: 'rgba(15, 17, 23, 0.7)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 14px 12px 42px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.1em' }}>
                Security Password
              </label>
              <span style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                Forgot?
              </span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '14px', color: '#94a3b8', fontSize: '14px' }}>🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(15, 17, 23, 0.7)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '12px 42px 12px 42px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <label htmlFor="remember" style={{ fontSize: '12px', color: '#94a3b8', cursor: 'pointer', fontWeight: 500 }}>
              Remember this terminal session
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              background: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Console →'}
          </button>
        </form>

        {/* Quick Fill Demo Credentials */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Auto-Fill:
          </span>
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('manager@warehouse.ai')}
              style={{
                flex: 1,
                background: 'rgba(15, 17, 23, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px',
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              👑 Manager Demo
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('picker@warehouse.ai')}
              style={{
                flex: 1,
                background: 'rgba(15, 17, 23, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px',
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              📦 Operator Demo
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
