'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/common/ThemeToggle';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Copy } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import MapModal to avoid SSR issues with Leaflet
// @ts-ignore - Dynamic import type resolution issue
const MapModal = dynamic(
  // @ts-ignore
  () => import('@/features/map/components/MapModal'),
  { ssr: false }
) as React.ComponentType<{
  address: string;
  name: string;
  lat?: number;
  lng?: number;
  onClose: () => void;
}>;

interface Agent {
  id: string;
  name: string;
  referral_code: string;
  contact_number?: string;
  email?: string;
  role?: string;
  team_leader?: {
    id: string;
    name: string;
    referral_code: string;
  };
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

interface Application {
  id: string;
  first_name: string;
  last_name: string;
  contact_number: string;
  address: string;
  status: string;
  status_reason?: string;
  created_at: string;
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

interface TeamMember {
  id: string;
  name: string;
  referral_code: string;
  contact_number?: string;
  email?: string;
  role?: string;
}

export default function AgentPortalPage() {
  const params = useParams();
  const referralCode = params.referralCode as string;
  const { resolvedTheme } = useTheme();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'applicants' | 'subscribers' | 'commissions' | 'team'>('applicants');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; lat?: number; lng?: number; name: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchAgentData();
  }, [referralCode]);

  const handleAddressClick = (address: string, name: string, lat?: number, lng?: number) => {
    setSelectedLocation({ address, name, lat, lng });
    setShowMapModal(true);
  };

  const handleCloseModal = () => {
    setShowMapModal(false);
    setSelectedLocation(null);
  };

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

      // Fetch team members if agent is a Team Leader
      if (agentData.role === 'Team Leader') {
        try {
          const teamMembersResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/agents/team-members/${agentData.id}`
          );
          if (teamMembersResponse.ok) {
            const teamMembersData = await teamMembersResponse.json();
            setTeamMembers(teamMembersData);
          }
        } catch (err) {
          console.error('Error fetching team members:', err);
          // Don't fail the whole page if team members fetch fails
        }
      }

      // Fetch applications using public endpoint
      const applicationsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/applications/public/${agentData.id}`
      );

      if (applicationsResponse.ok) {
        const applicationsData = await applicationsResponse.json();
        // Filter out activated applications - they should only appear in Subscribers tab
        const filteredApplications = applicationsData.filter(
          (app: Application) => app.status !== 'Activated'
        );
        setApplications(filteredApplications);
      }

      // Fetch subscribers using public endpoint
      const subscribersResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/subscribers/public/${agentData.id}`
      );

      if (subscribersResponse.ok) {
        const subscribersData = await subscribersResponse.json();
        setSubscribers(subscribersData);
      }

      // Fetch commissions using public endpoint
      const commissionsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/commissions/public/${agentData.id}`
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

  const pendingApplications = applications.filter(
    (app) => !['Activated', 'Denied', 'Voided'].includes(app.status)
  ).length;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-800',
      Eligible: 'bg-blue-100 text-blue-800',
      Paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getApplicationStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Submitted': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
      'Under Review': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
      'Approved': 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
      'Scheduled for Installation': 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
      'Activated': 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200',
      'Denied': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
      'Voided': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <LoadingSpinner size="lg" />
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
              <Link
                href="/agent"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Back to Agent Portal"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <Image
                src={resolvedTheme === 'dark' ? "/lobosw.png" : "/lobost.png"}
                alt="NetHub"
                width={50}
                height={50}
                className="object-contain"
              />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {agent.name}
                  </h1>
                  {agent.role && (
                    <span className="px-3 py-1 text-sm font-semibold rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200">
                      {agent.role}
                    </span>
                  )}
                </div>
                {agent.team_leader ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Under: <span className="font-medium text-gray-900 dark:text-white">{agent.team_leader.name}</span>
                    <span className="text-gray-500 dark:text-gray-500 ml-2 font-mono text-xs">
                      ({agent.team_leader.referral_code})
                    </span>
                  </p>
                ) : agent.role === 'Team Leader' ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Independent Team Leader
                  </p>
                ) : agent.role === 'Organic' ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Organic Agent
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Independent CBA
                  </p>
                )}
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
              Pending Applications
            </div>
            <div className="text-3xl font-bold mt-2 text-orange-600 dark:text-orange-500">
              {pendingApplications}
            </div>
          </div>

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
        <div className="relative z-10 flex gap-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('applicants')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === 'applicants'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
            }`}
          >
            Applicants ({applications.length})
          </button>
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === 'subscribers'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
            }`}
          >
            Subscribers ({subscribers.length})
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === 'commissions'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
            }`}
          >
            Commissions ({commissions.length})
          </button>
          {agent?.role === 'Team Leader' && (
            <button
              onClick={() => setActiveTab('team')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === 'team'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700'
              }`}
            >
              My Team ({teamMembers.length})
            </button>
          )}
        </div>

        {/* Content */}
        {activeTab === 'applicants' ? (
          <div className="relative z-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-300">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Applied
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No applications yet
                      </td>
                    </tr>
                  ) : (
                    applications.map((application) => (
                      <tr key={application.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {application.first_name} {application.last_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {application.contact_number}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-900 dark:text-white">{application.plans?.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {application.plans?.speed} - ₱{application.plans?.price}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleAddressClick(
                              application.address,
                              `${application.first_name} ${application.last_name}`
                            )}
                            className="text-sm text-[#00A191] dark:text-[#14B8A6] hover:underline flex items-center gap-1 max-w-xs truncate"
                          >
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{application.address}</span>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getApplicationStatusColor(application.status)}`}>
                            {application.status}
                          </span>
                          {application.status_reason && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {application.status_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(application.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'subscribers' ? (
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
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleAddressClick(
                              subscriber.address,
                              `${subscriber.first_name} ${subscriber.last_name}`
                            )}
                            className="text-sm text-[#00A191] dark:text-[#14B8A6] hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span>{subscriber.address}</span>
                          </button>
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
        ) : activeTab === 'commissions' ? (
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
        ) : activeTab === 'team' ? (
          <div className="relative z-10 space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-300">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Agent Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Referral Code
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {teamMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                          No team members yet
                        </td>
                      </tr>
                    ) : (
                      teamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {member.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 inline-flex text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200">
                              {member.role || 'CBA'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-semibold" style={{ color: '#00A191' }}>
                              {member.referral_code}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {member.contact_number || 'N/A'}
                            </div>
                            {member.email && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {member.email}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => copyToClipboard(member.referral_code, 'code')}
                                className="px-3 py-1 text-xs font-medium rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                              >
                                {copiedCode === member.referral_code ? 'Copied!' : 'Copy Code'}
                              </button>
                              <button
                                onClick={() => copyToClipboard(
                                  `${window.location.origin}/agent/${member.referral_code}`,
                                  'link'
                                )}
                                className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                {copiedCode === `${window.location.origin}/agent/${member.referral_code}` ? 'Copied!' : 'Copy Link'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {teamMembers.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
                  No team members yet
                </div>
              ) : (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm transition-colors duration-300"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {member.name}
                        </h3>
                        <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200">
                          {member.role || 'CBA'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Referral Code</span>
                        <p className="font-mono text-sm font-semibold" style={{ color: '#00A191' }}>
                          {member.referral_code}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Contact</span>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {member.contact_number || 'N/A'}
                        </p>
                        {member.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(member.referral_code, 'code')}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors"
                      >
                        {copiedCode === member.referral_code ? 'Copied!' : 'Copy Code'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(
                          `${window.location.origin}/agent/${member.referral_code}`,
                          'link'
                        )}
                        className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {copiedCode === `${window.location.origin}/agent/${member.referral_code}` ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Map Modal */}
      {showMapModal && selectedLocation && (
        <MapModal
          address={selectedLocation.address}
          name={selectedLocation.name}
          lat={selectedLocation.lat}
          lng={selectedLocation.lng}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
