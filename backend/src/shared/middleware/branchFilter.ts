import { Request } from 'express';

/**
 * Helper function to apply branch filtering to Supabase queries
 * System administrators and superadmins see all branches, admins see only their assigned branches
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
  // System administrators and superadmins see all branches by default
  if (req.user?.role === 'system_administrator' || req.user?.role === 'superadmin') {
    // But can optionally filter by branch_id query param
    const branchIdParam = req.query.branch_id;
    if (branchIdParam && typeof branchIdParam === 'string') {
      return query.eq(branchIdColumn, branchIdParam);
    }
    return query;
  }
  
  // If user is admin, filter by their accessible branches OR NULL (system applications)
  if (req.user?.role === 'admin' && req.user?.branch_ids && req.user.branch_ids.length > 0) {
    return query.or(`${branchIdColumn}.in.(${req.user.branch_ids.join(',')}),${branchIdColumn}.is.null`);
  }
  
  return query;
}

/**
 * Get the branch filter condition for count queries
 * Returns the branch_ids to filter by, or null for no filtering
 */
export function getBranchFilterValue(req: Request): string[] | null {
  // System administrators and superadmins can optionally filter by branch_id query param
  if (req.user?.role === 'system_administrator' || req.user?.role === 'superadmin') {
    const branchIdParam = req.query.branch_id;
    if (branchIdParam && typeof branchIdParam === 'string') {
      return [branchIdParam];
    }
    return null; // No filtering - see all branches
  }
  
  // If user is admin, return their accessible branches
  if (req.user?.role === 'admin' && req.user?.branch_ids && req.user.branch_ids.length > 0) {
    return req.user.branch_ids;
  }
  
  return null;
}

