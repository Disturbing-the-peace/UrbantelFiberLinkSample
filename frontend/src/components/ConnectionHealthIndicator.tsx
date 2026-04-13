'use client';

import { useState, useEffect } from 'react';
import { getConnectionStats, forceReset, testConnection } from '@/lib/connectionHealth';

/**
 * Connection Health Indicator
 * Shows connection status and allows manual reset
 * Add this to your dashboard layout for debugging
 */
export default function ConnectionHealthIndicator() {
  const [stats, setStats] = useState(getConnectionStats());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getConnectionStats());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testConnection();
    setTestResult(result);
    setTesting(false);
    setStats(getConnectionStats());
  };

  const handleReset = () => {
    forceReset();
    setStats(getConnectionStats());
    setTestResult(null);
  };

  const minutesSinceLastSuccess = Math.floor(stats.timeSinceLastSuccess / 60000);
  const isStale = stats.isStale;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Connection Health</h3>
        <div className={`w-3 h-3 rounded-full ${isStale ? 'bg-red-500' : 'bg-green-500'}`} />
      </div>
      
      <div className="text-xs text-gray-600 space-y-1 mb-3">
        <div>Last success: {minutesSinceLastSuccess}m ago</div>
        <div>Resets: {stats.connectionResetCount}</div>
        {testResult !== null && (
          <div className={testResult ? 'text-green-600' : 'text-red-600'}>
            Test: {testResult ? 'Passed ✓' : 'Failed ✗'}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {testing ? 'Testing...' : 'Test'}
        </button>
        <button
          onClick={handleReset}
          className="flex-1 px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
