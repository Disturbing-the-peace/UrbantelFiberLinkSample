import { Router, Request, Response } from 'express';
import { supabase } from '../../shared/config/supabase';
import { verifyToken, checkAdmin } from '../../shared/middleware/auth';

const router = Router();

// Storage bucket for agent application documents
const AGENT_DOCUMENTS_BUCKET = 'agent-application-documents';

/**
 * Helper function to upload base64 file to Supabase Storage
 */
async function uploadBase64File(
  base64Data: string,
  applicationId: string,
  documentType: string
): Promise<string> {
  // Handle both data URL format and plain base64
  let mimeType = 'application/octet-stream';
  let base64Content = base64Data;

  // Check if it's a data URL (data:mime/type;base64,content)
  const dataUrlMatch = base64Data.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
  if (dataUrlMatch && dataUrlMatch.length === 3) {
    mimeType = dataUrlMatch[1];
    base64Content = dataUrlMatch[2];
  } else {
    // If not a data URL, assume it's plain base64 and try to detect type from content
    // For now, we'll use a generic mime type
    console.log('No data URL prefix found, using plain base64');
  }

  // Convert base64 to buffer
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Content, 'base64');
  } catch (error) {
    console.error('Failed to decode base64:', error);
    throw new Error('Invalid base64 encoding');
  }

  // Determine file extension from mime type
  let extension = 'bin';
  if (mimeType.includes('pdf')) extension = 'pdf';
  else if (mimeType.includes('msword')) extension = 'doc';
  else if (mimeType.includes('wordprocessingml')) extension = 'docx';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
  else if (mimeType.includes('png')) extension = 'png';
  else if (mimeType.includes('webp')) extension = 'webp';

  const timestamp = Date.now();
  const filePath = `${applicationId}/${documentType}_${timestamp}.${extension}`;

  const { data, error } = await supabase.storage
    .from(AGENT_DOCUMENTS_BUCKET)
    .upload(filePath, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: mimeType,
    });

  if (error) {
    console.error(`Upload error for ${documentType}:`, error);
    throw new Error(`Failed to upload ${documentType}: ${error.message}`);
  }

  return data.path;
}

/**
 * GET /api/agent-applications
 * List all agent applications with optional filtering
 * Query params: start_date, end_date, referred_by_agent_id
 * Admin only
 */
router.get('/', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, referred_by_referrer_id } = req.query;

    let query = supabase
      .from('agent_applications')
      .select(`
        *,
        referrer:referrers!referred_by_referrer_id (id, name, referral_code)
      `)
      .order('created_at', { ascending: false });

    // Filter by referrer
    if (referred_by_referrer_id && typeof referred_by_referrer_id === 'string') {
      if (referred_by_referrer_id === 'none') {
        query = query.is('referred_by_referrer_id', null);
      } else {
        query = query.eq('referred_by_referrer_id', referred_by_referrer_id);
      }
    }

    // Filter by date range
    if (start_date && typeof start_date === 'string') {
      query = query.gte('created_at', start_date);
    }
    if (end_date && typeof end_date === 'string') {
      query = query.lte('created_at', end_date);
    }

    const { data: applications, error } = await query;

    if (error) {
      console.error('Error fetching agent applications:', error);
      return res.status(500).json({ error: 'Failed to fetch agent applications' });
    }

    res.json(applications || []);
  } catch (error) {
    console.error('Error in GET /api/agent-applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/agent-applications/:id
 * Get a single agent application by ID with full details
 * Admin only
 */
router.get('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: application, error } = await supabase
      .from('agent_applications')
      .select(`
        *,
        referrer:referrers!referred_by_referrer_id (id, name, referral_code, contact_number, email)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching agent application:', error);
      return res.status(500).json({ error: 'Failed to fetch agent application', details: error.message });
    }

    if (!application) {
      return res.status(404).json({ error: 'Agent application not found' });
    }

    res.json(application);
  } catch (error) {
    console.error('Error in GET /api/agent-applications/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/agent-applications
 * Submit a new agent application (PUBLIC - no auth required)
 * Body: { first_name, middle_name, last_name, birthday, contact_number, email, address, 
 *         resume (base64), valid_id (base64), barangay_clearance (base64), gcash_screenshot (base64), referred_by_agent_id }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      birthday,
      contact_number,
      email,
      address,
      resume,
      valid_id,
      barangay_clearance,
      gcash_screenshot,
      referred_by_referrer_id,
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !birthday || !contact_number || !address) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['first_name', 'last_name', 'birthday', 'contact_number', 'address']
      });
    }

    // Validate required documents
    if (!resume || !valid_id || !gcash_screenshot) {
      return res.status(400).json({ 
        error: 'Missing required documents',
        required: ['resume', 'valid_id', 'gcash_screenshot']
      });
    }

    // Validate referrer exists if provided
    if (referred_by_referrer_id) {
      const { data: referrer, error: referrerError } = await supabase
        .from('referrers')
        .select('id, is_active')
        .eq('id', referred_by_referrer_id)
        .maybeSingle();

      if (referrerError || !referrer) {
        return res.status(400).json({ error: 'Invalid referrer ID' });
      }

      if (!referrer.is_active) {
        return res.status(400).json({ error: 'Referrer is not active' });
      }
    }

    // Create application record first to get ID
    const { data: application, error: insertError } = await supabase
      .from('agent_applications')
      .insert({
        first_name,
        middle_name,
        last_name,
        birthday,
        contact_number,
        email,
        address,
        referred_by_referrer_id: referred_by_referrer_id || null,
      })
      .select()
      .single();

    if (insertError || !application) {
      console.error('Error creating agent application:', insertError);
      return res.status(500).json({ error: 'Failed to create agent application' });
    }

    // Upload documents to storage
    try {
      console.log('Starting document uploads for application:', application.id);
      console.log('Resume data length:', resume?.length || 0);
      console.log('Valid ID data length:', valid_id?.length || 0);
      console.log('GCash data length:', gcash_screenshot?.length || 0);
      
      const resumePath = await uploadBase64File(resume, application.id, 'resume');
      console.log('Resume uploaded:', resumePath);
      
      const validIdPath = await uploadBase64File(valid_id, application.id, 'valid_id');
      console.log('Valid ID uploaded:', validIdPath);
      
      const gcashPath = await uploadBase64File(gcash_screenshot, application.id, 'gcash_screenshot');
      console.log('GCash screenshot uploaded:', gcashPath);
      
      let barangayClearancePath = null;
      if (barangay_clearance) {
        console.log('Barangay clearance data length:', barangay_clearance.length);
        barangayClearancePath = await uploadBase64File(barangay_clearance, application.id, 'barangay_clearance');
        console.log('Barangay clearance uploaded:', barangayClearancePath);
      }

      // Update application with document URLs
      const { data: updatedApp, error: updateError } = await supabase
        .from('agent_applications')
        .update({
          resume_url: resumePath,
          valid_id_url: validIdPath,
          barangay_clearance_url: barangayClearancePath,
          gcash_screenshot_url: gcashPath,
        })
        .eq('id', application.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating agent application with document URLs:', updateError);
        return res.status(500).json({ error: 'Failed to save document references' });
      }

      console.log('Application updated successfully with document URLs');
      res.status(201).json(updatedApp);
    } catch (uploadError) {
      // If upload fails, delete the application record
      await supabase.from('agent_applications').delete().eq('id', application.id);
      console.error('Error uploading documents:', uploadError);
      return res.status(500).json({ 
        error: 'Failed to upload documents',
        details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error in POST /api/agent-applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/agent-applications/:id
 * Delete an agent application (admin only)
 */
router.delete('/:id', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if application exists
    const { data: application, error: fetchError } = await supabase
      .from('agent_applications')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !application) {
      return res.status(404).json({ error: 'Agent application not found' });
    }

    // Delete the application
    const { error: deleteError } = await supabase
      .from('agent_applications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting agent application:', deleteError);
      return res.status(500).json({ error: 'Failed to delete agent application' });
    }

    res.json({ message: 'Agent application deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/agent-applications/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
