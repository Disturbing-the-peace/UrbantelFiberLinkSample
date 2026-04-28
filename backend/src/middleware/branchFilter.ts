import { Request } from 'express';

/**
 * Helper function to apply branch filtering to Supabase queries
 * Superadmins see all branches, admins see only their assigned branches
 * 
 * @param query - The Supabase query builder
 * @param req - Express request object with user info
 * @param branchIdColumn - The column name for branch_id (default: 'branch_id')
 * @returns The query with branch filtering applied
 */
export function applyBranchFilter<T>(
  query: any,
  req: Request,
  branchIdColumn: string = 'branch_id'
): any {
  // If user is admin, filter by their accessible branches
  if (req.user?.role === 'admin' && req.user?.branch_ids && req.user.branch_ids.length > 0) {
    return query.in(branchIdColumn, req.user.branch_ids);
  }
  
  // Superadmins see all branches by default
  // But can optionally filter by branch_id query param
  const branchIdParam = req.query.branch_id;
  if (branchIdParam && typeof branchIdParam === 'string') {
    return query.eq(branchIdColumn, branchIdParam);
  }
  
  return query;
}

/**
 * Get the branch filter condition for count queries
 * Returns the branch_ids to filter by, or null for no filtering
 */
export function getBranchFilterValue(req: Request): string[] | null {
  // If user is admin, return their accessible branches
  if (req.user?.role === 'admin' && req.user?.branch_ids && req.user.branch_ids.length > 0) {
    return req.user.branch_ids;
  }
  
  // Superadmins can optionally filter by branch_id query param
  const branchIdParam = req.query.branch_id;
  if (branchIdParam && typeof branchIdParam === 'string') {
    return [branchIdParam];
  }
  
  return null;
}

