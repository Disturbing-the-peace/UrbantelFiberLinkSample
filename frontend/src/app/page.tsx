'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const { user, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Animated S-curves with traveling pulses (4 lines, staggered)
  useEffect(() => {
    if (loading || user) return;

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
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A191]"></div>
          <p className="mt-4 text-[#00A191]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle variant="subtle" />
      </div>
      
      {/* Animated S-Curves with Pulses */}
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

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-gray-900 dark:text-white">
                Connect to the Future
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-gray-700 dark:text-gray-200">
                High-Speed Fiber Internet for Your Home & Business
              </p>
              <p className="text-lg mb-8 text-gray-600 dark:text-gray-400">
                Experience lightning-fast connectivity with speeds up to 1 Gbps. Reliable, affordable, and always there when you need it.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/apply"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl text-white transition-all transform hover:scale-105 hover:shadow-xl"
                  style={{ backgroundColor: '#00A191' }}
                >
                  Apply for Service
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-xl bg-transparent border-2 border-[#00A191] text-[#00A191] hover:bg-[#00A191] hover:text-white"
                >
                  Admin Login
                </Link>
              </div>

              {/* Stats Row */}
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

            {/* Right Side - Feature Cards */}
            <div className="space-y-6">
              {/* Card 1 */}
              <div 
                className="p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#00A191]"
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                      Lightning Fast Speeds
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Experience speeds up to 1 Gbps with our fiber optic network. Stream, game, and work without interruption.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div 
                className="p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#00A191]"
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                      Reliable Connection
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      99.9% uptime guarantee with 24/7 technical support. We're always here when you need us.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div 
                className="p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#00A191]"
                  >
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                      Affordable Plans
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Flexible pricing options for homes and businesses. Get the speed you need at a price you'll love.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Logos - Lower Right */}
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

