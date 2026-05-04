import { Router, Request, Response } from 'express';
import { supabase } from '../../shared/config/supabase';
import { verifyToken, checkAdmin } from '../../shared/middleware/auth';
import archiver from 'archiver';
import { CUSTOMER_DOCUMENTS_BUCKET } from '../../shared/services/storage.service';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

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

    // Verify application exists and get full details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        agent:agents(name, referral_code),
        plan:plans(name, speed, price)
      `)
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

    // Create subscriber information Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'SUBSCRIBER INFORMATION',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Personal Information Section
          new Paragraph({
            text: 'Personal Information',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Name: ', bold: true }),
              new TextRun(`${application.first_name} ${application.middle_name || ''} ${application.last_name}`)
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date of Birth: ', bold: true }),
              new TextRun(application.date_of_birth || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Contact Number: ', bold: true }),
              new TextRun(application.contact_number || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Email: ', bold: true }),
              new TextRun(application.email || 'N/A')
            ],
            spacing: { after: 100 }
          }),

          // Address Section
          new Paragraph({
            text: 'Address',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Street Address: ', bold: true }),
              new TextRun(application.address || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Barangay: ', bold: true }),
              new TextRun(application.barangay || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'City: ', bold: true }),
              new TextRun(application.city || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Province: ', bold: true }),
              new TextRun(application.province || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Zip Code: ', bold: true }),
              new TextRun(application.zip_code || 'N/A')
            ],
            spacing: { after: 100 }
          }),

          // Location Coordinates Section
          new Paragraph({
            text: 'Location Coordinates',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Latitude: ', bold: true }),
              new TextRun(application.latitude?.toString() || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Longitude: ', bold: true }),
              new TextRun(application.longitude?.toString() || 'N/A')
            ],
            spacing: { after: 100 }
          }),

          // Plan Information Section
          new Paragraph({
            text: 'Plan Information',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Plan: ', bold: true }),
              new TextRun(application.plan?.name || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Speed: ', bold: true }),
              new TextRun(application.plan?.speed || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Price: ', bold: true }),
              new TextRun(`₱${application.plan?.price || 'N/A'}`)
            ],
            spacing: { after: 100 }
          }),

          // Agent Information Section
          new Paragraph({
            text: 'Agent Information',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Agent Name: ', bold: true }),
              new TextRun(application.agent?.name || 'N/A')
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Referral Code: ', bold: true }),
              new TextRun(application.agent?.referral_code || 'N/A')
            ],
            spacing: { after: 100 }
          }),

          // Application Details Section
          new Paragraph({
            text: 'Application Details',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Application ID: ', bold: true }),
              new TextRun(application.id)
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Status: ', bold: true }),
              new TextRun(application.status)
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Submitted: ', bold: true }),
              new TextRun(application.created_at ? new Date(application.created_at).toLocaleString() : 'N/A')
            ],
            spacing: { after: 100 }
          }),
          ...(application.date_activated ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Activated: ', bold: true }),
                new TextRun(new Date(application.date_activated).toLocaleString())
              ],
              spacing: { after: 100 }
            })
          ] : []),
          ...(application.status_reason ? [
            new Paragraph({
              children: [
                new TextRun({ text: 'Status Reason: ', bold: true }),
                new TextRun(application.status_reason)
              ],
              spacing: { after: 100 }
            })
          ] : []),

          // Additional Notes Section
          new Paragraph({
            text: 'Additional Notes',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            text: application.notes || 'None',
            spacing: { after: 100 }
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({ text: 'Generated: ', italics: true }),
              new TextRun({ text: new Date().toLocaleString(), italics: true })
            ],
            spacing: { before: 400 },
            alignment: AlignmentType.CENTER
          })
        ]
      }]
    });

    // Generate Word document buffer
    const docBuffer = await Packer.toBuffer(doc);

    // Create a safe filename from applicant name (remove special characters)
    const safeName = `${application.first_name}_${application.last_name}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();

    console.log(`[Export] Generating ZIP for: ${application.first_name} ${application.last_name}`);
    console.log(`[Export] Safe filename: ${safeName}_documents.zip`);

    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_documents.zip"`);

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

    // Add subscriber information Word document first
    archive.append(docBuffer, { name: 'subscriber_info.docx' });

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
