'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { signIn, verify2FA, listMFAFactors, getAuthErrorMessage } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';
import LoadingSpinner from '@/components/LoadingSpinner';
import Image from 'next/image';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { resolvedTheme } = useTheme();
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toastShownRef = useRef(false);
  
  const redirectPath = searchParams.get('redirect') || '/dashboard';
  const logoutSuccess = searchParams.get('logout') === 'success';

  useEffect(() => {
    console.log('Login page useEffect - user:', user, 'redirectPath:', redirectPath);
    // If already logged in, redirect to dashboard
    if (user) {
      console.log('User exists, redirecting to:', redirectPath);
      router.push(redirectPath);
    }
  }, [user, router, redirectPath]);

  // Show logout success toast
  useEffect(() => {
    if (logoutSuccess && !user && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success('You have been successfully logged out');
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('logout');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [logoutSuccess, user, toast]);

  // Animated S-curves with traveling pulses (4 lines, staggered)
  useEffect(() => {
    if (user) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let currentLineIndex = Math.floor(Math.random() * 4); // Start with random line
    let pulseProgress = -0.15; // Start slightly before the line
    const pulseDuration = 3000; // 3 seconds to complete one line
    let lineStartTime = Date.now();

    // 4 lines with different offsets
    const lines = [
      { yOffset: -80 },
      { yOffset: -30 },
      { yOffset: 30 },
      { yOffset: 80 }
    ];

    // Function to get next random line (different from current)
    const getNextRandomLine = (current: number): number => {
      const availableLines = [0, 1, 2, 3].filter(i => i !== current);
      return availableLines[Math.floor(Math.random() * availableLines.length)];
    };

    // Generate S-curve path points for a line
    const generateSCurve = (yOffset: number) => {
      const points: { x: number; y: number }[] = [];
      const centerY = canvas.height / 2 + yOffset;
      const amplitude = Math.min(canvas.height * 0.08, 80);
      const segments = 200;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = canvas.width * t;
        const y = centerY + Math.sin(t * Math.PI * 2 - Math.PI / 2) * amplitude;
        points.push({ x, y });
      }
      
      return points;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate pulse progress based on elapsed time
      const elapsed = Date.now() - lineStartTime;
      pulseProgress = -0.15 + (elapsed / pulseDuration) * 1.3; // -0.15 to 1.15

      // Check if pulse completed this line
      if (pulseProgress > 1.15) {
        // Move to random next line (different from current)
        currentLineIndex = getNextRandomLine(currentLineIndex);
        pulseProgress = -0.15;
        lineStartTime = Date.now();
      }

      // Draw each line
      lines.forEach((line, lineIndex) => {
        const pathPoints = generateSCurve(line.yOffset);

        // Draw the thin line path
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        
        for (let i = 1; i < pathPoints.length; i++) {
          ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        
        ctx.strokeStyle = 'rgba(0, 161, 145, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Only draw pulse on the current active line
        if (lineIndex === currentLineIndex && pulseProgress >= 0 && pulseProgress <= 1) {
          const index = Math.floor(pulseProgress * (pathPoints.length - 1));
          const point = pathPoints[index];

          // Large outer glow
          const outerGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 50);
          outerGlow.addColorStop(0, 'rgba(0, 161, 145, 0.5)');
          outerGlow.addColorStop(0.3, 'rgba(0, 161, 145, 0.25)');
          outerGlow.addColorStop(0.6, 'rgba(0, 161, 145, 0.1)');
          outerGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

          ctx.beginPath();
          ctx.arc(point.x, point.y, 50, 0, Math.PI * 2);
          ctx.fillStyle = outerGlow;
          ctx.fill();

          // Medium glow
          const mediumGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 25);
          mediumGlow.addColorStop(0, 'rgba(0, 161, 145, 0.9)');
          mediumGlow.addColorStop(0.5, 'rgba(0, 161, 145, 0.5)');
          mediumGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

          ctx.beginPath();
          ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
          ctx.fillStyle = mediumGlow;
          ctx.fill();

          // Bright core
          const coreGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 10);
          coreGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
          coreGlow.addColorStop(0.3, 'rgba(0, 161, 145, 1)');
          coreGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

          ctx.beginPath();
          ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
          ctx.fillStyle = coreGlow;
          ctx.shadowColor = '#00A191';
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Draw motion blur trail
          for (let i = 1; i <= 4; i++) {
            const trailIndex = Math.max(0, index - i * 4);
            const trailPoint = pathPoints[trailIndex];
            const trailOpacity = 0.4 * (1 - i / 4);

            const trailGlow = ctx.createRadialGradient(
              trailPoint.x, trailPoint.y, 0,
              trailPoint.x, trailPoint.y, 12
            );
            trailGlow.addColorStop(0, `rgba(0, 161, 145, ${trailOpacity})`);
            trailGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

            ctx.beginPath();
            ctx.arc(trailPoint.x, trailPoint.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = trailGlow;
            ctx.fill();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [user]);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user: loggedInUser, error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(getAuthErrorMessage(signInError));
        setLoading(false);
        return;
      }

      if (!loggedInUser) {
        setError('Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Check if user requires 2FA
      if (loggedInUser.requires2FA) {
        // Get MFA factors
        const { factors, error: factorsError } = await listMFAFactors();
        
        if (factorsError || factors.length === 0) {
          setError('2FA is required but not set up. Please contact administrator.');
          setLoading(false);
          return;
        }

        // Use the first TOTP factor
        setFactorId(factors[0].id);
        setRequires2FA(true);
        setLoading(false);
      } else {
        // No 2FA required, refresh user and redirect
        console.log('No 2FA required, refreshing user and redirecting to:', redirectPath);
        await refreshUser();
        console.log('User refreshed, pushing to:', redirectPath);
        router.push(redirectPath);
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!factorId) {
      setError('2FA factor not found. Please try logging in again.');
      setLoading(false);
      return;
    }

    try {
      const { success, error: verifyError } = await verify2FA(factorId, totpCode);

      if (verifyError || !success) {
        setError(getAuthErrorMessage(verifyError || 'Invalid verification code'));
        setLoading(false);
        return;
      }

      // 2FA successful, refresh user and redirect
      console.log('2FA successful, refreshing user and redirecting to:', redirectPath);
      await refreshUser();
      console.log('User refreshed after 2FA, pushing to:', redirectPath);
      router.push(redirectPath);
    } catch (err: any) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setFactorId(null);
    setTotpCode('');
    setError('');
  };

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Animated S-Curve with Pulse */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ 
          opacity: 1,
          zIndex: 1
        }}
      />

      {/* Geometric Background Shapes */}
      <div className="absolute inset-0 overflow-hidden" style={{ opacity: 0.15 }}>
        <div 
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full"
          style={{ 
            background: 'linear-gradient(135deg, #00A191 0%, #00A191 100%)',
            filter: 'blur(100px)'
          }}
        />
        <div 
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full"
          style={{ 
            background: 'linear-gradient(45deg, #00A191 0%, #00A191 100%)',
            filter: 'blur(90px)'
          }}
        />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mb-12 flex justify-center gap-8">
            <Image
              src={resolvedTheme === 'dark' ? "/urbantelwhite.png" : "/urbantel.png"}
              alt="UrbanTel"
              width={180}
              height={180}
              className="object-contain"
            />
            <Image
              src="/cverge.png"
              alt="Cverge"
              width={180}
              height={180}
              className="object-contain"
            />
          </div>
          <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
            ISP Management System
          </h2>
          <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Streamline your operations with our comprehensive platform for managing subscribers, applications, and network services.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div>
              <div className="text-3xl font-bold text-[#00A191]">1000+</div>
              <div className="text-sm font-medium mt-1 text-gray-500 dark:text-gray-400">Customers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00A191]">80%</div>
              <div className="text-sm font-medium mt-1 text-gray-500 dark:text-gray-400">Up to Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00A191]">24/7</div>
              <div className="text-sm font-medium mt-1 text-gray-500 dark:text-gray-400">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center px-4 py-12">
        {/* Theme Toggle - Top Right */}
        <div className="absolute top-4 right-4">
          <ThemeToggle variant="subtle" />
        </div>
        
        <div className="max-w-md w-full">
          {/* Card Container */}
          <div 
            className="p-8 rounded-2xl shadow-2xl border-2"
            style={{ 
              backgroundColor: 'rgba(0, 161, 145, 0.05)',
              backdropFilter: 'blur(10px)',
              borderColor: '#00A191'
            }}
          >
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
                Welcome Back
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {requires2FA ? 'Two-Factor Authentication' : 'Sign in to your account'}
              </p>
            </div>

            {error && (
              <div 
                className="mb-6 p-4 rounded-xl border"
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.3)'
                }}
              >
                <p className="text-sm" style={{ color: '#FCA5A5' }}>{error}</p>
              </div>
            )}

            {!requires2FA ? (
              <form onSubmit={handleEmailPasswordSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl border outline-none transition-all bg-white/90 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="admin@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-xl border outline-none transition-all bg-white/90 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-4 text-white font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ backgroundColor: '#00A191' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handle2FASubmit} className="space-y-6">
                <div>
                  <label htmlFor="totpCode" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Verification Code
                  </label>
                  <p className="text-sm mb-3 text-gray-600 dark:text-gray-400">
                    Enter the 6-digit code from your authenticator app
                  </p>
                  <input
                    id="totpCode"
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl border outline-none transition-all text-center text-2xl tracking-widest font-mono bg-white/90 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    placeholder="000000"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className="w-full py-4 px-4 text-white font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ backgroundColor: '#00A191' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Verify & Sign In'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  disabled={loading}
                  className="w-full py-2 px-4 font-medium transition-colors disabled:opacity-50 hover:opacity-80 text-gray-600 dark:text-gray-400"
                >
                  ← Back to Login
                </button>
              </form>
            )}

            <div className="mt-8 text-center">
              <a
                href="/"
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: '#00A191' }}
              >
                ← Back to Home
              </a>
            </div>
          </div>

          {/* Logos - Mobile Only, Below Card */}
          <div className="mt-6 flex lg:hidden items-center justify-center gap-4">
            <Image
              src={resolvedTheme === 'dark' ? "/urbantelwhite.png" : "/urbantel.png"}
              alt="UrbanTel"
              width={60}
              height={60}
              className="object-contain opacity-50"
            />
            <Image
              src="/cverge.png"
              alt="Cverge"
              width={60}
              height={60}
              className="object-contain opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <LoadingSpinner size="md" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

