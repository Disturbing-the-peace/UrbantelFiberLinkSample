import { Router, Request, Response } from 'express';
import { verifyToken } from '../middleware/auth';
import { getDocumentUrl } from '../lib/storage';

const router = Router();

/**
 * GET /api/documents/:applicationId/:filename
 * Get a signed URL for viewing a document
 * Returns JSON with the signed URL instead of redirecting
 */
router.get('/:applicationId/:filename', verifyToken, async (req: Request, res: Response) => {
  try {
    const { applicationId, filename } = req.params;
    
    if (!applicationId || !filename) {
      return res.status(400).json({ error: 'Application ID and filename are required' });
    }

    // Construct the full file path
    const filePath = `${applicationId}/${filename}`;

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await getDocumentUrl(filePath, 3600);

    // Return the signed URL as JSON
    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating document URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate document URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
