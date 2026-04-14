import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken, checkAdmin } from '../middleware/auth';
import archiver from 'archiver';
import { CUSTOMER_DOCUMENTS_BUCKET } from '../lib/storage';

const router = Router();

/**
 * GET /api/export/subscribers
 * Export all subscribers data as CSV
 * Requires admin authentication
 */
router.get('/subscribers', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    // Fetch all activated subscribers with related data
    const { data: subscribers, error } = await supabase
      .from('applications')
      .select(`
        id,
        first_name,
        middle_name,
        last_name,
        birthday,
        contact_number,
        email,
        address,
        activated_at,
        agents:agent_id (name, referral_code),
        plans:plan_id (name, category, speed, price),
        commissions!commissions_subscriber_id_fkey (status, amount, date_paid)
      `)
      .eq('status', 'Activated')
      .order('activated_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscribers for export:', error);
      return res.status(500).json({ error: 'Failed to fetch subscribers' });
    }

    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({ error: 'No subscribers found' });
    }

    // Generate CSV content
    const csvHeaders = [
      'ID',
      'First Name',
      'Middle Name',
      'Last Name',
      'Birthday',
      'Contact Number',
      'Email',
      'Address',
      'Agent Name',
      'Agent Code',
      'Plan Name',
      'Plan Category',
      'Plan Speed',
      'Plan Price',
      'Activation Date',
      'Commission Status',
      'Commission Amount',
      'Commission Date Paid'
    ];

    const csvRows = subscribers.map((sub) => {
      const agent = sub.agents as any;
      const plan = sub.plans as any;
      const commission = Array.isArray(sub.commissions) && sub.commissions.length > 0
        ? sub.commissions[0]
        : null;

      return [
        sub.id,
        sub.first_name,
        sub.middle_name || '',
        sub.last_name,
        sub.birthday,
        sub.contact_number,
        sub.email || '',
        sub.address,
        agent?.name || '',
        agent?.referral_code || '',
        plan?.name || '',
        plan?.category || '',
        plan?.speed || '',
        plan?.price || '',
        sub.activated_at || '',
        commission?.status || 'Pending',
        commission?.amount || '',
        commission?.date_paid || ''
      ];
    });

    // Build CSV string
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="subscribers_export_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error in GET /api/export/subscribers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/export/subscribers/:id/documents
 * Export all uploaded documents for a subscriber as ZIP file
 * Requires admin authentication
 */
router.get('/subscribers/:id/documents', verifyToken, checkAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify application exists (not just activated subscribers)
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, first_name, last_name, status, house_photo_url, government_id_url, id_selfie_url, signature_url')
      .eq('id', id)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Collect all document URLs
    const documentUrls = [
      { url: application.house_photo_url, name: 'house_photo' },
      { url: application.government_id_url, name: 'government_id' },
      { url: application.id_selfie_url, name: 'id_selfie' },
      { url: application.signature_url, name: 'signature' }
    ].filter(doc => doc.url);

    if (documentUrls.length === 0) {
      return res.status(404).json({ error: 'No documents found for this application' });
    }

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="application_${id}_documents.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Download and add each document to the archive
    for (const doc of documentUrls) {
      try {
        // Extract file path from URL (remove bucket prefix if present)
        const filePath = doc.url.replace(`${CUSTOMER_DOCUMENTS_BUCKET}/`, '');

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(CUSTOMER_DOCUMENTS_BUCKET)
          .download(filePath);

        if (downloadError || !fileData) {
          console.error(`Failed to download ${doc.name}:`, downloadError);
          continue; // Skip this file and continue with others
        }

        // Get file extension from path
        const extension = filePath.split('.').pop() || 'jpg';
        const fileName = `${doc.name}.${extension}`;

        // Convert Blob to Buffer
        const buffer = Buffer.from(await fileData.arrayBuffer());

        // Add file to archive
        archive.append(buffer, { name: fileName });
      } catch (err) {
        console.error(`Error processing ${doc.name}:`, err);
        // Continue with other files
      }
    }

    // Finalize the archive
    await archive.finalize();
  } catch (error) {
    console.error('Error in GET /api/export/subscribers/:id/documents:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
