'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Download } from 'lucide-react';

export default function AgentLoginPage() {
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  // Animated S-curves with traveling pulses (4 lines, staggered)
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

  const handleShowQR = () => {
    if (!referralCode.trim()) {
      setError('Please enter your referral code first');
      return;
    }
    setError('');
    setShowQRModal(true);
  };

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `referral-qr-${referralCode}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const getReferralUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/agent/${referralCode.trim()}`;
    }
    return '';
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
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
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Logos - Mobile Only */}
          <div className="mb-8 flex justify-center gap-6 md:hidden">
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

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 px-4 text-white font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

                <button
                  type="button"
                  onClick={handleShowQR}
                  disabled={loading}
                  className="py-4 px-4 text-[#00A191] dark:text-[#14B8A6] font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border-2 border-[#00A191] dark:border-[#14B8A6] bg-white/50 dark:bg-gray-800/50"
                  title="Show QR Code"
                >
                  <QrCode className="w-6 h-6" />
                </button>
              </div>
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

      {/* Footer Logos - Desktop Only */}
      <div className="hidden md:flex absolute bottom-8 right-8 z-10 items-center gap-6">
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

      {/* QR Code Modal */}
      {showQRModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowQRModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* Modal Content */}
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                Referral QR Code
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Scan this code to access your referral link
              </p>

              {/* QR Code */}
              <div 
                ref={qrRef}
                className="bg-white p-6 rounded-xl inline-block mb-6"
              >
                <QRCodeSVG
                  value={getReferralUrl()}
                  size={256}
                  level="H"
                  fgColor="#00A191"
                  bgColor="#ffffff"
                  includeMargin={true}
                />
              </div>

              {/* Referral Code Display */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Referral Code</p>
                <p className="text-2xl font-mono font-bold text-[#00A191] dark:text-[#14B8A6]">
                  {referralCode}
                </p>
              </div>

              {/* URL Display */}
              <div className="mb-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Referral URL</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 break-all">
                  {getReferralUrl()}
                </p>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownloadQR}
                className="w-full py-3 px-4 bg-[#00A191] text-white font-semibold rounded-xl transition-all transform hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

