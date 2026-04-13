import { Router, Request, Response } from 'express';

const router = Router();

// Placeholder routes - to be implemented in subsequent tasks
router.post('/login', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Auth login endpoint - not yet implemented' });
});

router.post('/logout', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Auth logout endpoint - not yet implemented' });
});

router.get('/me', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Auth me endpoint - not yet implemented' });
});

export default router;
