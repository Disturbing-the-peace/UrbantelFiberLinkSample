'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { subscribersApi, agentsApi, plansApi, exportApi } from '@/lib/api';
import { Agent, Plan } from '@/types';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface Subscriber {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  contact_number: string;
  email?: string;
  address: string;
  status: string;
  activated_at: string;
  agent_id: string;
  plan_id: string;
  latitude?: number;
  longitude?: number;
  agents?: Agent;
  plans?: Plan;
}

// Map component wrapper to handle Leaflet initialization
function SubscriberMapView({ subscriber }: { subscriber: Subscriber }) {
  const [mapIcon, setMapIcon] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      
      // Fix Leaflet default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Create custom pin icon
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: #00A191;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 3px 6px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 10px;
              height: 10px;
              background-color: white;
              border-radius: 50%;
              transform: rotate(45deg);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      setMapIcon(customIcon);
    }
  }, []);

  if (!isClient || !mapIcon || !subscriber.latitude || !subscriber.longitude) {
    return (
      <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A191] mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        key={`subscriber-map-${subscriber.id}-${subscriber.latitude}-${subscriber.longitude}`}
        center={[subscriber.latitude, subscriber.longitude]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker 
          position={[subscriber.latitude, subscriber.longitude]}
          icon={mapIcon}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-[#00A191] mb-1">
                {subscriber.first_name} {subscriber.last_name}
              </h3>
              <div className="text-sm text-gray-700">
                <p><span className="font-medium">Plan:</span> {subscriber.plans?.name}</p>
                <p><span className="font-medium">Address:</span> {subscriber.address}</p>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'timeline'>('customer');

  // Filters
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportingCsv, setExportingCsv] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchAgents(),
        fetchPlans(),
        fetchSubscribers()
      ]);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only fetch when filters change, not on initial load
    if (agents.length > 0 && plans.length > 0) {
      fetchSubscribers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFilter, planFilter, startDate, endDate]);

  const fetchAgents = async () => {
    try {
      const data = await agentsApi.getAll();
      setAgents(data.filter((agent: Agent) => agent.is_active));
    } catch (err: any) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await plansApi.getAll();
      setPlans(data);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
    }
  };

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: {
        agent_id?: string;
        plan_id?: string;
        start_date?: string;
        end_date?: string;
      } = {};

      if (agentFilter) params.agent_id = agentFilter;
      if (planFilter) params.plan_id = planFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await subscribersApi.getAll(params);
      setSubscribers(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setAgentFilter('');
    setPlanFilter('');
    setStartDate('');
    setEndDate('');
  };

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      const params: {
        agent_id?: string;
        plan_id?: string;
        start_date?: string;
        end_date?: string;
      } = {};

      if (agentFilter) params.agent_id = agentFilter;
      if (planFilter) params.plan_id = planFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await exportApi.subscribers(params);

      if (!response.ok) {
        throw new Error('Failed to export subscribers');
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'subscribers.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export subscribers. Please try again.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleViewDetails = (subscriber: Subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowDetailsModal(true);
    setActiveTab('customer');
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedSubscriber(null);
    setActiveTab('customer');
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#00A191] mb-4">Subscriber Management</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => fetchSubscribers()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-[#00A191]">Subscriber Management</h1>
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {exportingCsv ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export to CSV
              </>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-4 transition-colors duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent
              </label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan
              </label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Plans</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {(agentFilter || planFilter || startDate || endDate) && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden relative min-h-[400px] transition-colors duration-300">
        {loading && (
          <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Loading subscribers...</div>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-[#00A191] dark:bg-[#008c7a]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Subscriber Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Contact Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Referring Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Date Activated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {subscriber.first_name} {subscriber.last_name}
                    </div>
                    {subscriber.email && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">{subscriber.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {subscriber.contact_number}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {subscriber.address}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{subscriber.agents?.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{subscriber.agents?.referral_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{subscriber.plans?.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {subscriber.plans?.speed} - ₱{subscriber.plans?.price}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(subscriber.activated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleViewDetails(subscriber)}
                      className="text-[#00A191] hover:text-[#008c7a] font-medium p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      title="View Details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {subscribers.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No subscribers found. Try adjusting your filters.
          </div>
        )}
      </div>

      {subscribers.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Subscriber Details Modal */}
      {showDetailsModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriber Details</h2>
              <button
                onClick={closeDetailsModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl transition-colors"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Tabs */}
              <div className="mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setActiveTab('customer')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'customer'
                          ? 'border-[#00A191] text-[#00A191]'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      Customer Information
                    </button>
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === 'timeline'
                          ? 'border-[#00A191] text-[#00A191]'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      Subscription Details
                    </button>
                  </nav>
                </div>
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === 'customer' && (
                  <>
                    {/* Personal Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#00A191] mb-4">Personal Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            First Name
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedSubscriber.first_name}</p>
                        </div>
                        {selectedSubscriber.middle_name && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Middle Name
                            </label>
                            <p className="text-gray-900 dark:text-white">{selectedSubscriber.middle_name}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Last Name
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedSubscriber.last_name}</p>
                        </div>
                        {selectedSubscriber.email && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Email Address
                            </label>
                            <p className="text-gray-900 dark:text-white">{selectedSubscriber.email}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Contact Number
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedSubscriber.contact_number}</p>
                        </div>
                      </div>
                    </div>

                    {/* Service Address */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#00A191] mb-4">Service Address</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Full Address
                        </label>
                        <p className="text-gray-900 dark:text-white">{selectedSubscriber.address}</p>
                      </div>
                    </div>

                    {/* Service Location Map */}
                    {selectedSubscriber.latitude && selectedSubscriber.longitude && (
                      <div>
                        <h3 className="text-lg font-semibold text-[#00A191] mb-4">Service Location</h3>
                        <SubscriberMapView subscriber={selectedSubscriber} />
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'timeline' && (
                  <>
                    {/* Plan Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#00A191] mb-4">Plan Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Plan Name
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedSubscriber.plans?.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Category
                          </label>
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            selectedSubscriber.plans?.category === 'Residential'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200'
                          }`}>
                            {selectedSubscriber.plans?.category}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Speed
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedSubscriber.plans?.speed}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Monthly Fee
                          </label>
                          <p className="text-gray-900 dark:text-white font-semibold">₱{selectedSubscriber.plans?.price}</p>
                        </div>

                      </div>
                    </div>

                    {/* Agent Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#00A191] mb-4">Referring Agent</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Agent Name
                          </label>
                          <p className="text-gray-900 dark:text-white">{selectedSubscriber.agents?.name}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Referral Code
                          </label>
                          <p className="text-gray-900 dark:text-white font-mono">{selectedSubscriber.agents?.referral_code}</p>
                        </div>
                        {selectedSubscriber.agents?.email && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Agent Email
                            </label>
                            <p className="text-gray-900 dark:text-white">{selectedSubscriber.agents?.email}</p>
                          </div>
                        )}
                        {selectedSubscriber.agents?.phone && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Agent Phone
                            </label>
                            <p className="text-gray-900 dark:text-white">{selectedSubscriber.agents?.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subscription Status */}
                    <div>
                      <h3 className="text-lg font-semibold text-[#00A191] mb-4">Subscription Status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Status
                          </label>
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            selectedSubscriber.status === 'Active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : selectedSubscriber.status === 'Suspended'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                            {selectedSubscriber.status}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Activation Date
                          </label>
                          <p className="text-gray-900 dark:text-white">
                            {new Date(selectedSubscriber.activated_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

