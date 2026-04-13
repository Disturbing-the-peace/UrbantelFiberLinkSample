'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import Image from 'next/image';

interface Agent {
  id: string;
  name: string;
  referral_code: string;
  contact_number?: string;
  email?: string;
}

interface Subscriber {
  id: string;
  first_name: string;
  last_name: string;
  contact_number: string;
  address: string;
  activated_at: string;
  plans?: {
    name: string;
    speed: string;
    price: number;
  };
}

interface Commission {
  id: string;
  amount: number;
  status: 'Pending' | 'Eligible' | 'Paid';
  date_activated: string;
  date_paid?: string;
  applications?: {
    first_name: string;
    last_name: string;
    plans?: {
      name: string;
      speed: string;
      price: number;
    };
  };
}

export default function AgentPortalPage() {
  const params = useParams();
  const referralCode = params.referralCode as string;
  const { resolvedTheme } = useTheme();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subscribers' | 'commissions'>('subscribers');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchAgentData();
  }, [referralCode]);

  // Animated S-curve with traveling pulse
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let pulseProgress = 0;
    const pulseSpeed = 0.0015;

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

      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      
      ctx.strokeStyle = 'rgba(0, 161, 145, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      pulseProgress += pulseSpeed;
      if (pulseProgress > 1 + 0.1) {
        pulseProgress = -0.1;
      }

      if (pulseProgress >= 0 && pulseProgress <= 1) {
        const index = Math.floor(pulseProgress * (pathPoints.length - 1));
        const point = pathPoints[index];

        const outerGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 60);
        outerGlow.addColorStop(0, 'rgba(0, 161, 145, 0.4)');
        outerGlow.addColorStop(0.3, 'rgba(0, 161, 145, 0.2)');
        outerGlow.addColorStop(0.6, 'rgba(0, 161, 145, 0.1)');
        outerGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

        ctx.beginPath();
        ctx.arc(point.x, point.y, 60, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();

        const mediumGlow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 30);
        mediumGlow.addColorStop(0, 'rgba(0, 161, 145, 0.8)');
        mediumGlow.addColorStop(0.5, 'rgba(0, 161, 145, 0.4)');
        mediumGlow.addColorStop(1, 'rgba(0, 161, 145, 0)');

        ctx.beginPath();
        ctx.arc(point.x, point.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = mediumGlow;
        ctx.fill();

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

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch agent info
      const agentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/agents/by-referral/${referralCode}`
      );

      if (!agentResponse.ok) {
        throw new Error('Agent not found');
      }

      const agentData = await agentResponse.json();
      setAgent(agentData);

      // Fetch subscribers
      const subscribersResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/subscribers?agent_id=${agentData.id}`
      );

      if (subscribersResponse.ok) {
        const subscribersData = await subscribersResponse.json();
        setSubscribers(subscribersData);
      }

      // Fetch commissions
      const commissionsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/commissions?agent_id=${agentData.id}`
      );

      if (commissionsResponse.ok) {
        const commissionsData = await commissionsResponse.json();
        setCommissions(commissionsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  const totalCommissionsPending = commissions
    .filter((c) => c.status === 'Pending')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalCommissionsEligible = commissions
    .filter((c) => c.status === 'Eligible')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalCommissionsPaid = commissions
    .filter((c) => c.status === 'Paid')
    .reduce((sum, c) => sum + c.amount, 0);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Eligible: 'bg-blue-100 text-blue-800',
      Paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#00A191' }}></div>
          <p className="mt-4 text-gray-900 dark:text-white">Loading agent portal...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Agent Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'The referral code you entered is invalid or the agent account is not active.'}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-xl text-white font-semibold transition-all"
            style={{ backgroundColor: '#00A191' }}
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Animated S-Curve with Pulse */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ 
          opacity: 0.3,
          zIndex: 0
        }}
      />

      {/* Header */}
      <div className="relative z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src={resolvedTheme === 'dark' ? "/urbantelwhite.png" : "/urbantel.png"}
                alt="UrbanTel"
                width={50}
                height={50}
                className="object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Agent Portal
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {agent.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Referral Code</p>
                <p className="text-lg font-mono font-bold" style={{ color: '#00A191' }}>
                  {agent.referral_code}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Subscribers
            </div>
            <div className="text-3xl font-bold mt-2" style={{ color: '#00A191' }}>
              {subscribers.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Pending Commissions
            </div>
            <div className="text-3xl font-bold mt-2 text-yellow-600 dark:text-yellow-500">
              ₱{totalCommissionsPending.toFixed(2)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Eligible Commissions
            </div>
            <div className="text-3xl font-bold mt-2 text-blue-600 dark:text-blue-500">
              ₱{totalCommissionsEligible.toFixed(2)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Paid Commissions
            </div>
            <div className="text-3xl font-bold mt-2 text-green-600 dark:text-green-500">
              ₱{totalCommissionsPaid.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative z-10 flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'subscribers'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
            }`}
          >
            Subscribers ({subscribers.length})
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'commissions'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
            }`}
          >
            Commissions ({commissions.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'subscribers' ? (
          <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-300">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Subscriber
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Activated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {subscribers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No subscribers yet
                      </td>
                    </tr>
                  ) : (
                    subscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {subscriber.first_name} {subscriber.last_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {subscriber.contact_number}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 dark:text-white">{subscriber.plans?.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {subscriber.plans?.speed} - ₱{subscriber.plans?.price}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {subscriber.address}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(subscriber.activated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-300">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Subscriber
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No commissions yet
                      </td>
                    </tr>
                  ) : (
                    commissions.map((commission) => (
                      <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {commission.applications?.first_name} {commission.applications?.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 dark:text-white">
                            {commission.applications?.plans?.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {commission.applications?.plans?.speed}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold" style={{ color: '#00A191' }}>
                          ₱{commission.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(commission.status)}`}>
                            {commission.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {commission.date_paid
                            ? `Paid: ${new Date(commission.date_paid).toLocaleDateString()}`
                            : `Activated: ${new Date(commission.date_activated).toLocaleDateString()}`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
