'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import Image from 'next/image';

export default function AgentLoginPage() {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated S-curve with traveling pulse
  useEffect(() => {
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
    let pulseProgress = 0;
    const pulseSpeed = 0.0015;

    // Generate S-curve path points
    const generateSCurve = () => {
      const points: { x: number; y: number }[] = [];
      const centerY = canvas.height / 2;
      const amplitude = Math.min(canvas.height * 0.15, 150);
      const segments = 200;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = canvas.width * t;
        const y = centerY + Math.sin(t * Math.PI * 2 - Math.PI / 2) * amplitude;
        points.push({ x, y });
      }
      
      return points;
    };

    const pathPoints = generateSCurve();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the thin line path
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      
      ctx.strokeStyle = 'rgba(0, 161, 145, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Update pulse progress
      pulseProgress += pulseSpeed;
      if (pulseProgress > 1 + 0.1) {
        pulseProgress = -0.1;
      }

      // Draw traveling pulse
      if (pulseProgress >= 0 && pulseProgress <= 1) {
        const index = Math.floor(pulseProgress * (pathPoints.length - 1));
        const point = pathPoints[index];

        // Large outer glow
        const outerGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 60);
        outerGlow.addColorStop(0, 'rgba(0, 161, 145, 0.4)');
        outerGlow.addColorStop(0.3, 'rgba(0, 161, 145, 0.2)');
        outerGlow.addColorStop(0.6, 'rgba(0, 161, 145, 0.1)');
        outerGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

        ctx.beginPath();
        ctx.arc(point.x, point.y, 60, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();

        // Medium glow
        const mediumGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 30);
        mediumGlow.addColorStop(0, 'rgba(0, 161, 145, 0.8)');
        mediumGlow.addColorStop(0.5, 'rgba(0, 161, 145, 0.4)');
        mediumGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

        ctx.beginPath();
        ctx.arc(point.x, point.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = mediumGlow;
        ctx.fill();

        // Bright core
        const coreGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 12);
        coreGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        coreGlow.addColorStop(0.3, 'rgba(0, 161, 145, 1)');
        coreGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

        ctx.beginPath();
        ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = coreGlow;
        ctx.shadowColor = '#00A191';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Motion blur trail
        for (let i = 1; i <= 5; i++) {
          const trailIndex = Math.max(0, index - i * 3);
          const trailPoint = pathPoints[trailIndex];
          const trailOpacity = 0.3 * (1 - i / 5);

          const trailGlow = ctx.createRadialGradient(
            trailPoint.x, trailPoint.y, 0,
            trailPoint.x, trailPoint.y, 15
          );
          trailGlow.addColorStop(0, `rgba(0, 161, 145, ${trailOpacity})`);
          trailGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

          ctx.beginPath();
          ctx.arc(trailPoint.x, trailPoint.y, 15, 0, Math.PI * 2);
          ctx.fillStyle = trailGlow;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!referralCode.trim()) {
      setError('Please enter your referral code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify the referral code exists
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/agents/by-referral/${referralCode.trim()}`
      );

      if (!response.ok) {
        setError('Invalid referral code. Please check and try again.');
        setLoading(false);
        return;
      }

      // Redirect to agent portal
      router.push(`/agent/${referralCode.trim()}`);
    } catch (err) {
      setError('Failed to verify referral code. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Animated S-Curve with Pulse */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ 
          opacity: resolvedTheme === 'dark' ? 1 : 0.3,
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

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Logos */}
          <div className="mb-8 flex justify-center gap-6">
            <Image
              src={resolvedTheme === 'dark' ? "/urbantelwhite.png" : "/urbantel.png"}
              alt="UrbanTel"
              width={80}
              height={80}
              className="object-contain"
            />
            <Image
              src="/cverge.png"
              alt="Cverge"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>

          {/* Card */}
          <div 
            className="p-8 rounded-2xl shadow-2xl border bg-white/10 dark:bg-white/5 backdrop-blur-lg border-gray-200/20 dark:border-white/10"
          >
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                Agent Portal
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Enter your referral code to view your commissions and subscribers
              </p>
            </div>

            {error && (
              <div 
                className="mb-6 p-4 rounded-xl border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"
              >
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="referralCode" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
                  Referral Code
                </label>
                <input
                  id="referralCode"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  required
                  className="w-full px-4 py-3 rounded-xl border outline-none transition-all text-center text-xl font-mono tracking-wider bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="AGT-XXXXXX"
                  disabled={loading}
                  maxLength={10}
                />
                <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                  Example: AGT-ABC123
                </p>
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
                    Verifying...
                  </span>
                ) : (
                  'View My Portal'
                )}
              </button>
            </form>

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

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have a referral code? Contact your administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Logos */}
      <div className="absolute bottom-8 right-8 z-10 flex items-center gap-6">
        <Image
          src={resolvedTheme === 'dark' ? "/urbantelwhite.png" : "/urbantel.png"}
          alt="UrbanTel"
          width={100}
          height={100}
          className="object-contain opacity-80 hover:opacity-100 transition-opacity"
        />
        <Image
          src="/cverge.png"
          alt="Cverge"
          width={100}
          height={100}
          className="object-contain opacity-80 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}

