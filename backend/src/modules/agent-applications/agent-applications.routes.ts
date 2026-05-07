import { Router, Request, Response } from 'express';
import { supabase } from '../../shared/config/supabase';
import { verifyToken, checkAdmin } from '../../shared/middleware/auth';
import archiver from 'archiver';

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
  console.log(`[uploadBase64File] Starting upload for ${documentType}`);
  console.log(`[uploadBase64File] Base64 data length: ${base64Data?.length || 0}`);
  console.log(`[uploadBase64File] First 100 chars: ${base64Data?.substring(0, 100)}`);
  
  // Handle both data URL format and plain base64
  let mimeType = 'application/octet-stream';
  let base64Content = base64Data;

  // Check if it's a data URL (data:mime/type;base64,content)
  const dataUrlMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch && dataUrlMatch.length === 3) {
    mimeType = dataUrlMatch[1];
    base64Content = dataUrlMatch[2];
    console.log(`[uploadBase64File] Detected mime type: ${mimeType}`);
  } else {
    console.log('[uploadBase64File] No data URL prefix found, using plain base64');
  }

  // Convert base64 to buffer
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Content, 'base64');
    console.log(`[uploadBase64File] Buffer size: ${buffer.length} bytes`);
    
    if (buffer.length === 0) {
      throw new Error('Decoded buffer is empty - invalid base64 data');
    }
  } catch (error) {
    console.error('[uploadBase64File] Failed to decode base64:', error);
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
  console.log(`[uploadBase64File] Upload path: ${filePath}`);

  const { data, error } = await supabase.storage
    .from(AGENT_DOCUMENTS_BUCKET)
    .upload(filePath, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: mimeType,
    });

  if (error) {
    console.error(`[uploadBase64File] Upload error for ${documentType}:`, error);
    throw new Error(`Failed to upload ${documentType}: ${error.message}`);
  }

  console.log(`[uploadBase64File] Upload successful: ${data.path}`);
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
 * GET /api/agent-applications/:id/documents/download-all
 * Download all documents for an agent application as ZIP
 * Admin only
 */
router.get('/:id/documents/download-all', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[Bulk Download] Request for application ${id}`);

    // Get application details
    const { data: application, error: fetchError } = await supabase
      .from('agent_applications')
      .select(`
        *,
        referrer:referrers!referred_by_referrer_id (id, name, referral_code)
      `)
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !application) {
      console.log(`[Bulk Download] Application not found`);
      return res.status(404).json({ error: 'Agent application not found' });
    }

    // Collect all document URLs
    const documentUrls = [
      { url: application.resume_url, name: 'resume' },
      { url: application.valid_id_url, name: 'valid_id' },
      { url: application.barangay_clearance_url, name: 'barangay_clearance' },
      { url: application.gcash_screenshot_url, name: 'gcash_screenshot' },
    ].filter(doc => doc.url);

    if (documentUrls.length === 0) {
      console.log(`[Bulk Download] No documents found`);
      return res.status(404).json({ error: 'No documents found for this application' });
    }

    // Create safe filename
    const safeName = `${application.first_name}_${application.last_name}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();

    console.log(`[Bulk Download] Creating ZIP: ${safeName}_agent_application.zip`);

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_agent_application.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('[Bulk Download] Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Download and add each document to the archive
    for (const doc of documentUrls) {
      try {
        const filePath = doc.url;
        console.log(`[Bulk Download] Downloading: ${filePath}`);

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(AGENT_DOCUMENTS_BUCKET)
          .download(filePath);

        if (downloadError || !fileData) {
          console.error(`[Bulk Download] Failed to download ${doc.name}:`, downloadError);
          continue; // Skip this file and continue with others
        }

        // Get file extension from path
        const extension = filePath.split('.').pop() || 'bin';
        const fileName = `${doc.name}.${extension}`;

        // Convert Blob to Buffer
        const buffer = Buffer.from(await fileData.arrayBuffer());
        console.log(`[Bulk Download] Adding to ZIP: ${fileName} (${buffer.length} bytes)`);

        // Add file to archive
        archive.append(buffer, { name: fileName });
      } catch (err) {
        console.error(`[Bulk Download] Error processing ${doc.name}:`, err);
        // Continue with other files
      }
    }

    // Finalize the archive
    console.log(`[Bulk Download] Finalizing archive`);
    await archive.finalize();
  } catch (error) {
    console.error('Error in GET /api/agent-applications/:id/documents/download-all:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * GET /api/agent-applications/:id/documents/:documentType
 * Download a document from an agent application
 * documentType: resume, valid_id, barangay_clearance, gcash_screenshot
 * Admin only
 */
router.get('/:id/documents/:documentType', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id, documentType } = req.params;
    console.log(`[Download] Request for application ${id}, document type: ${documentType}`);

    // Validate document type
    const validTypes = ['resume', 'valid_id', 'barangay_clearance', 'gcash_screenshot'] as const;
    type ValidDocumentType = typeof validTypes[number];
    
    if (!validTypes.includes(documentType as ValidDocumentType)) {
      console.log(`[Download] Invalid document type: ${documentType}`);
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Get application to retrieve document path
    const { data: application, error: fetchError } = await supabase
      .from('agent_applications')
      .select(`${documentType}_url`)
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !application) {
      console.log(`[Download] Application not found or error:`, fetchError);
      return res.status(404).json({ error: 'Agent application not found' });
    }

    const documentPath = (application as any)[`${documentType}_url`] as string | null;
    console.log(`[Download] Document path from DB: ${documentPath}`);
    
    if (!documentPath) {
      console.log(`[Download] No document path in database`);
      return res.status(404).json({ error: 'Document not found' });
    }

    // Download file from storage
    console.log(`[Download] Attempting to download from bucket: ${AGENT_DOCUMENTS_BUCKET}, path: ${documentPath}`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(AGENT_DOCUMENTS_BUCKET)
      .download(documentPath);

    if (downloadError || !fileData) {
      console.error('[Download] Storage download error:', downloadError);
      return res.status(500).json({ error: 'Failed to download document', details: downloadError?.message });
    }

    console.log(`[Download] File downloaded, size: ${fileData.size} bytes, type: ${fileData.type}`);

    // Convert blob to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    console.log(`[Download] Buffer created, size: ${buffer.length} bytes`);

    // Determine content type from file extension
    let extension = documentPath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    // Try to detect from extension first
    if (extension === 'pdf') contentType = 'application/pdf';
    else if (extension === 'doc') contentType = 'application/msword';
    else if (extension === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
    else if (extension === 'png') contentType = 'image/png';
    else if (extension === 'webp') contentType = 'image/webp';
    // Fallback: detect from file signature (magic bytes)
    else if (buffer.length > 4) {
      const signature = buffer.slice(0, 4).toString('hex');
      console.log(`[Download] File signature: ${signature}`);
      
      // Check magic bytes
      if (signature === '504b0304') { // PK.. (ZIP-based: docx, xlsx, etc)
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'docx';
      } else if (signature === '25504446') { // %PDF
        contentType = 'application/pdf';
        extension = 'pdf';
      } else if (signature.startsWith('89504e47')) { // PNG
        contentType = 'image/png';
        extension = 'png';
      } else if (signature.startsWith('ffd8ff')) { // JPEG
        contentType = 'image/jpeg';
        extension = 'jpg';
      }
    }

    console.log(`[Download] Sending file with content-type: ${contentType}, extension: ${extension}`);

    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${documentType}.${extension}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error in GET /api/agent-applications/:id/documents/:documentType:', error);
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
