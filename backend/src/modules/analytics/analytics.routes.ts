import { Router, Request, Response } from 'express';
import { supabase } from '../../shared/config/supabase';
import { verifyToken, checkAdmin } from '../../shared/middleware/auth';
import { applyBranchFilter, getBranchFilterValue } from '../../shared/middleware/branchFilter';

const router = Router();

/**
 * GET /api/analytics/subscribers-monthly
 * Get total number of subscribers (activated applications) for the current month
 * Superadmins see all branches, admins see only their branch
 */
router.get('/subscribers-monthly', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    let query = supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Activated')
      .gte('activated_at', startOfMonth)
      .lte('activated_at', endOfMonth);

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching monthly subscribers:', error);
      return res.status(500).json({ error: 'Failed to fetch monthly subscribers' });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in GET /api/analytics/subscribers-monthly:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/subscribers-per-agent
 * Get subscriber count grouped by agent
 * Superadmins see all branches, admins see only their branch
 */
router.get('/subscribers-per-agent', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('agent_id, agents:agent_id (id, name)')
      .eq('status', 'Activated');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching subscribers per agent:', error);
      return res.status(500).json({ error: 'Failed to fetch subscribers per agent' });
    }

    // Group by agent and count
    const agentCounts = (subscribers || []).reduce((acc: any[], item: any) => {
      const agentId = item.agent_id;
      const agentName = item.agents?.name || 'Unknown';
      
      const existing = acc.find(a => a.agent_id === agentId);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({
          agent_id: agentId,
          agent_name: agentName,
          count: 1,
        });
      }
      return acc;
    }, []);

    res.json(agentCounts);
  } catch (error) {
    console.error('Error in GET /api/analytics/subscribers-per-agent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/subscribers-per-plan
 * Get subscriber count grouped by plan
 * Superadmins see all branches, admins see only their branch
 */
router.get('/subscribers-per-plan', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('plan_id, plans:plan_id (id, name, category)')
      .eq('status', 'Activated');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching subscribers per plan:', error);
      return res.status(500).json({ error: 'Failed to fetch subscribers per plan' });
    }

    // Group by plan and count
    const planCounts = (subscribers || []).reduce((acc: any[], item: any) => {
      const planId = item.plan_id;
      const planName = item.plans?.name || 'Unknown';
      const planCategory = item.plans?.category || 'Unknown';
      
      const existing = acc.find(p => p.plan_id === planId);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({
          plan_id: planId,
          plan_name: planName,
          plan_category: planCategory,
          count: 1,
        });
      }
      return acc;
    }, []);

    res.json(planCounts);
  } catch (error) {
    console.error('Error in GET /api/analytics/subscribers-per-plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/subscription-trends
 * Get subscription trends over time (monthly aggregation for the last 12 months)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/subscription-trends', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

    let query = supabase
      .from('applications')
      .select('activated_at')
      .eq('status', 'Activated')
      .gte('activated_at', twelveMonthsAgo)
      .order('activated_at', { ascending: true });

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching subscription trends:', error);
      return res.status(500).json({ error: 'Failed to fetch subscription trends' });
    }

    // Group by month
    const monthlyTrends = (subscribers || []).reduce((acc: any[], item: any) => {
      const date = new Date(item.activated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = acc.find(m => m.month === monthKey);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({
          month: monthKey,
          count: 1,
        });
      }
      return acc;
    }, []);

    res.json(monthlyTrends);
  } catch (error) {
    console.error('Error in GET /api/analytics/subscription-trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/conversion-rate
 * Calculate application conversion rate (Activated / Total Applications)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/conversion-rate', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const branchFilter = getBranchFilterValue(req);

    // Get total applications count
    let totalQuery = supabase
      .from('applications')
      .select('*', { count: 'exact', head: true });
    
    if (branchFilter) {
      totalQuery = totalQuery.in('branch_id', branchFilter);
    }

    const { count: totalCount, error: totalError } = await totalQuery;

    if (totalError) {
      console.error('Error fetching total applications:', totalError);
      return res.status(500).json({ error: 'Failed to fetch total applications' });
    }

    // Get activated applications count
    let activatedQuery = supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Activated');
    
    if (branchFilter) {
      activatedQuery = activatedQuery.in('branch_id', branchFilter);
    }

    const { count: activatedCount, error: activatedError } = await activatedQuery;

    if (activatedError) {
      console.error('Error fetching activated applications:', activatedError);
      return res.status(500).json({ error: 'Failed to fetch activated applications' });
    }

    const total = totalCount || 0;
    const activated = activatedCount || 0;
    const conversionRate = total > 0 ? (activated / total) * 100 : 0;

    res.json({
      total_applications: total,
      activated_applications: activated,
      conversion_rate: parseFloat(conversionRate.toFixed(2)),
    });
  } catch (error) {
    console.error('Error in GET /api/analytics/conversion-rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/pending-applications
 * Get count of pending applications (Submitted, Under Review, Approved, Scheduled for Installation)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/pending-applications', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const pendingStatuses = ['Submitted', 'Under Review', 'Approved', 'Scheduled for Installation'];
    const branchFilter = getBranchFilterValue(req);

    let query = supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('status', pendingStatuses);

    if (branchFilter) {
      query = query.in('branch_id', branchFilter);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error fetching pending applications:', error);
      return res.status(500).json({ error: 'Failed to fetch pending applications' });
    }

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error in GET /api/analytics/pending-applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/total-commissions-due
 * Get total amount of commissions with status "Eligible" (ready to be paid)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/total-commissions-due', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('commissions')
      .select('amount')
      .eq('status', 'Eligible');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching commissions due:', error);
      return res.status(500).json({ error: 'Failed to fetch commissions due' });
    }

    const totalDue = (commissions || []).reduce((sum, commission) => sum + (commission.amount || 0), 0);

    res.json({
      total_due: parseFloat(totalDue.toFixed(2)),
      count: commissions?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/analytics/total-commissions-due:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/pipeline-snapshot
 * Get count of applications at each status (pipeline overview)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/pipeline-snapshot', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('status');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching pipeline snapshot:', error);
      return res.status(500).json({ error: 'Failed to fetch pipeline snapshot' });
    }

    // Group by status and count
    const statusCounts = (applications || []).reduce((acc: any, item: any) => {
      const status = item.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Convert to array format
    const pipeline = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    res.json(pipeline);
  } catch (error) {
    console.error('Error in GET /api/analytics/pipeline-snapshot:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/agent-rankings
 * Get agent rankings by total activations
 * Query params: period=monthly|quarterly (default: monthly)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/agent-rankings', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const period = req.query.period as string || 'monthly';
    const now = new Date();
    let startDate: Date;

    if (period === 'quarterly') {
      // Get start of current quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
    } else {
      // Default to monthly
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    let query = supabase
      .from('applications')
      .select('agent_id, status, agents:agent_id (id, name)')
      .eq('status', 'Activated')
      .gte('activated_at', startDate.toISOString());

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching agent rankings:', error);
      return res.status(500).json({ error: 'Failed to fetch agent rankings' });
    }

    // Group by agent and count activations
    const agentRankings = (applications || []).reduce((acc: any[], item: any) => {
      const agentId = item.agent_id;
      const agentName = item.agents?.name || 'Unknown';
      
      const existing = acc.find(a => a.agent_id === agentId);
      if (existing) {
        existing.activations += 1;
      } else {
        acc.push({
          agent_id: agentId,
          agent_name: agentName,
          activations: 1,
        });
      }
      return acc;
    }, []);

    // Sort by activations descending
    agentRankings.sort((a, b) => b.activations - a.activations);

    res.json({ period, rankings: agentRankings });
  } catch (error) {
    console.error('Error in GET /api/analytics/agent-rankings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/agent-activations-by-status
 * Get activations per agent broken down by application status
 * Superadmins see all branches, admins see only their branch
 */
router.get('/agent-activations-by-status', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('agent_id, status, agents:agent_id (id, name)');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching agent activations by status:', error);
      return res.status(500).json({ error: 'Failed to fetch agent activations by status' });
    }

    // Group by agent and status
    const agentStatusBreakdown = (applications || []).reduce((acc: any[], item: any) => {
      const agentId = item.agent_id;
      const agentName = item.agents?.name || 'Unknown';
      const status = item.status;
      
      let agent = acc.find(a => a.agent_id === agentId);
      if (!agent) {
        agent = {
          agent_id: agentId,
          agent_name: agentName,
          statuses: {},
        };
        acc.push(agent);
      }
      
      agent.statuses[status] = (agent.statuses[status] || 0) + 1;
      return acc;
    }, []);

    res.json(agentStatusBreakdown);
  } catch (error) {
    console.error('Error in GET /api/analytics/agent-activations-by-status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/stuck-applications
 * Get applications that have been in the same status for too long
 * Threshold: 30 days for non-terminal statuses
 * Superadmins see all branches, admins see only their branch
 */
router.get('/stuck-applications', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const nonTerminalStatuses = ['Submitted', 'Under Review', 'Approved', 'Scheduled for Installation'];

    let query = supabase
      .from('applications')
      .select('id, first_name, last_name, status, updated_at, agents:agent_id (name)')
      .in('status', nonTerminalStatuses)
      .lt('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: true })
      .limit(10);

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching stuck applications:', error);
      return res.status(500).json({ error: 'Failed to fetch stuck applications' });
    }

    const stuckApps = (applications || []).map((app: any) => {
      const agentName = Array.isArray(app.agents) ? app.agents[0]?.name : app.agents?.name;
      return {
        id: app.id,
        customer_name: `${app.first_name} ${app.last_name}`,
        status: app.status,
        agent_name: agentName || 'Unknown',
        days_stuck: Math.floor((Date.now() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
        updated_at: app.updated_at,
      };
    });

    res.json(stuckApps);
  } catch (error) {
    console.error('Error in GET /api/analytics/stuck-applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/agent-commissions-breakdown
 * Get commission breakdown per agent (Eligible vs Paid)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/agent-commissions-breakdown', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('commissions')
      .select('agent_id, status, amount, agents:agent_id (name)');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: commissions, error } = await query;

    if (error) {
      console.error('Error fetching agent commissions breakdown:', error);
      return res.status(500).json({ error: 'Failed to fetch agent commissions breakdown' });
    }

    // Group by agent and status
    const agentCommissions = (commissions || []).reduce((acc: any[], item: any) => {
      const agentId = item.agent_id;
      const agentName = item.agents?.name || 'Unknown';
      
      let agent = acc.find(a => a.agent_id === agentId);
      if (!agent) {
        agent = {
          agent_id: agentId,
          agent_name: agentName,
          eligible: 0,
          paid: 0,
          total: 0,
        };
        acc.push(agent);
      }
      
      const amount = item.amount || 0;
      if (item.status === 'Eligible') {
        agent.eligible += amount;
      } else if (item.status === 'Paid') {
        agent.paid += amount;
      }
      agent.total += amount;
      
      return acc;
    }, []);

    // Sort by total descending
    agentCommissions.sort((a, b) => b.total - a.total);

    res.json(agentCommissions);
  } catch (error) {
    console.error('Error in GET /api/analytics/agent-commissions-breakdown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/pipeline-duration
 * Calculate average time from Submitted to Activated
 * Superadmins see all branches, admins see only their branch
 */
router.get('/pipeline-duration', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('created_at, activated_at')
      .eq('status', 'Activated')
      .not('activated_at', 'is', null);

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching pipeline duration:', error);
      return res.status(500).json({ error: 'Failed to fetch pipeline duration' });
    }

    if (!applications || applications.length === 0) {
      return res.json({ average_days: 0, count: 0 });
    }

    // Calculate duration for each application
    const durations = applications.map(app => {
      const created = new Date(app.created_at).getTime();
      const activated = new Date(app.activated_at).getTime();
      return (activated - created) / (1000 * 60 * 60 * 24); // Convert to days
    });

    const averageDays = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    res.json({
      average_days: parseFloat(averageDays.toFixed(1)),
      count: applications.length,
    });
  } catch (error) {
    console.error('Error in GET /api/analytics/pipeline-duration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/plan-category-distribution
 * Get subscriber distribution across Residential vs Business plans
 * Superadmins see all branches, admins see only their branch
 */
router.get('/plan-category-distribution', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('plan_id, plans:plan_id (category)')
      .eq('status', 'Activated');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching plan category distribution:', error);
      return res.status(500).json({ error: 'Failed to fetch plan category distribution' });
    }

    // Group by category
    const categoryDistribution = (subscribers || []).reduce((acc: any, item: any) => {
      const category = item.plans?.category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Convert to array format
    const distribution = Object.entries(categoryDistribution).map(([category, count]) => ({
      category,
      count,
    }));

    res.json(distribution);
  } catch (error) {
    console.error('Error in GET /api/analytics/plan-category-distribution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/revenue-estimates
 * Calculate monthly revenue estimates based on activated plans
 * Superadmins see all branches, admins see only their branch
 */
router.get('/revenue-estimates', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('plan_id, plans:plan_id (price), activated_at')
      .eq('status', 'Activated');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching revenue estimates:', error);
      return res.status(500).json({ error: 'Failed to fetch revenue estimates' });
    }

    // Calculate total monthly recurring revenue
    const totalMRR = (subscribers || []).reduce((sum, item: any) => {
      return sum + (item.plans?.price || 0);
    }, 0);

    // Group by month for trend
    const monthlyRevenue = (subscribers || []).reduce((acc: any[], item: any) => {
      const date = new Date(item.activated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const price = item.plans?.price || 0;
      
      const existing = acc.find(m => m.month === monthKey);
      if (existing) {
        existing.revenue += price;
        existing.count += 1;
      } else {
        acc.push({
          month: monthKey,
          revenue: price,
          count: 1,
        });
      }
      return acc;
    }, []);

    // Sort by month
    monthlyRevenue.sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      total_mrr: parseFloat(totalMRR.toFixed(2)),
      subscriber_count: subscribers?.length || 0,
      monthly_trend: monthlyRevenue,
    });
  } catch (error) {
    console.error('Error in GET /api/analytics/revenue-estimates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/denial-reasons
 * Get most common denial reasons
 * Superadmins see all branches, admins see only their branch
 */
router.get('/denial-reasons', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('status_reason')
      .eq('status', 'Denied')
      .not('status_reason', 'is', null);

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching denial reasons:', error);
      return res.status(500).json({ error: 'Failed to fetch denial reasons' });
    }

    // Group by reason and count
    const reasonCounts = (applications || []).reduce((acc: any, item: any) => {
      const reason = item.status_reason || 'No reason provided';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    // Convert to array and sort by count
    const reasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a: any, b: any) => b.count - a.count);

    res.json(reasons);
  } catch (error) {
    console.error('Error in GET /api/analytics/denial-reasons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PHASE 3 ENDPOINTS
 */

/**
 * GET /api/analytics/subscriber-locations
 * Get all subscriber locations with coordinates for map display
 * Superadmins see all branches, admins see only their branch
 */
router.get('/subscriber-locations', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('id, first_name, last_name, latitude, longitude, plans:plan_id (name, category)')
      .eq('status', 'Activated')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching subscriber locations:', error);
      return res.status(500).json({ error: 'Failed to fetch subscriber locations' });
    }

    const locations = (subscribers || []).map((sub: any) => ({
      id: sub.id,
      name: `${sub.first_name} ${sub.last_name}`,
      latitude: sub.latitude,
      longitude: sub.longitude,
      plan_name: sub.plans?.name || 'Unknown',
      plan_category: sub.plans?.category || 'Unknown',
    }));

    res.json(locations);
  } catch (error) {
    console.error('Error in GET /api/analytics/subscriber-locations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/agent-conversion-rates
 * Get conversion rate per agent (Activated / Total Applications)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/agent-conversion-rates', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('agent_id, status, agents:agent_id (name)');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching agent conversion rates:', error);
      return res.status(500).json({ error: 'Failed to fetch agent conversion rates' });
    }

    // Group by agent
    const agentStats = (applications || []).reduce((acc: any[], item: any) => {
      const agentId = item.agent_id;
      const agentName = Array.isArray(item.agents) ? item.agents[0]?.name : item.agents?.name;
      
      let agent = acc.find(a => a.agent_id === agentId);
      if (!agent) {
        agent = {
          agent_id: agentId,
          agent_name: agentName || 'Unknown',
          total: 0,
          activated: 0,
          conversion_rate: 0,
        };
        acc.push(agent);
      }
      
      agent.total += 1;
      if (item.status === 'Activated') {
        agent.activated += 1;
      }
      
      return acc;
    }, []);

    // Calculate conversion rates
    agentStats.forEach(agent => {
      agent.conversion_rate = agent.total > 0 
        ? parseFloat(((agent.activated / agent.total) * 100).toFixed(2))
        : 0;
    });

    // Sort by conversion rate descending
    agentStats.sort((a, b) => b.conversion_rate - a.conversion_rate);

    res.json(agentStats);
  } catch (error) {
    console.error('Error in GET /api/analytics/agent-conversion-rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/plan-conversion-rates
 * Get conversion rate per plan category (Activated / Total Applications)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/plan-conversion-rates', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('plan_id, status, plans:plan_id (name, category)');

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching plan conversion rates:', error);
      return res.status(500).json({ error: 'Failed to fetch plan conversion rates' });
    }

    // Group by plan category
    const categoryStats = (applications || []).reduce((acc: any, item: any) => {
      const category = item.plans?.category || 'Unknown';
      
      if (!acc[category]) {
        acc[category] = {
          category,
          total: 0,
          activated: 0,
          conversion_rate: 0,
        };
      }
      
      acc[category].total += 1;
      if (item.status === 'Activated') {
        acc[category].activated += 1;
      }
      
      return acc;
    }, {});

    // Calculate conversion rates and convert to array
    const planStats = Object.values(categoryStats).map((stat: any) => ({
      ...stat,
      conversion_rate: stat.total > 0 
        ? parseFloat(((stat.activated / stat.total) * 100).toFixed(2))
        : 0,
    }));

    // Sort by conversion rate descending
    planStats.sort((a: any, b: any) => b.conversion_rate - a.conversion_rate);

    res.json(planStats);
  } catch (error) {
    console.error('Error in GET /api/analytics/plan-conversion-rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/growth-comparison
 * Get month-over-month growth comparison
 * Superadmins see all branches, admins see only their branch
 */
router.get('/growth-comparison', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    let query = supabase
      .from('applications')
      .select('activated_at')
      .eq('status', 'Activated')
      .order('activated_at', { ascending: true });

    // Apply branch filtering
    query = applyBranchFilter(query, req);

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Error fetching growth comparison:', error);
      return res.status(500).json({ error: 'Failed to fetch growth comparison' });
    }

    // Group by month
    const monthlyData = (subscribers || []).reduce((acc: any[], item: any) => {
      const date = new Date(item.activated_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const existing = acc.find(m => m.month === monthKey);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({
          month: monthKey,
          count: 1,
          growth_rate: 0,
        });
      }
      return acc;
    }, []);

    // Sort by month
    monthlyData.sort((a, b) => a.month.localeCompare(b.month));

    // Calculate month-over-month growth rate
    for (let i = 1; i < monthlyData.length; i++) {
      const current = monthlyData[i].count;
      const previous = monthlyData[i - 1].count;
      monthlyData[i].growth_rate = previous > 0 
        ? parseFloat((((current - previous) / previous) * 100).toFixed(2))
        : 0;
    }

    res.json(monthlyData);
  } catch (error) {
    console.error('Error in GET /api/analytics/growth-comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/analytics/void-rate
 * Calculate void rate (Voided / Total Applications)
 * Superadmins see all branches, admins see only their branch
 */
router.get('/void-rate', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const branchFilter = getBranchFilterValue(req);

    // Get total applications count
    let totalQuery = supabase
      .from('applications')
      .select('*', { count: 'exact', head: true });
    
    if (branchFilter) {
      totalQuery = totalQuery.in('branch_id', branchFilter);
    }

    const { count: totalCount, error: totalError } = await totalQuery;

    if (totalError) {
      console.error('Error fetching total applications:', totalError);
      return res.status(500).json({ error: 'Failed to fetch total applications' });
    }

    // Get voided applications count
    let voidedQuery = supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Voided');
    
    if (branchFilter) {
      voidedQuery = voidedQuery.in('branch_id', branchFilter);
    }

    const { count: voidedCount, error: voidedError } = await voidedQuery;

    if (voidedError) {
      console.error('Error fetching voided applications:', voidedError);
      return res.status(500).json({ error: 'Failed to fetch voided applications' });
    }

    const total = totalCount || 0;
    const voided = voidedCount || 0;
    const voidRate = total > 0 ? (voided / total) * 100 : 0;

    res.json({
      total_applications: total,
      voided_applications: voided,
      void_rate: parseFloat(voidRate.toFixed(2)),
    });
  } catch (error) {
    console.error('Error in GET /api/analytics/void-rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
