import { Router, Request, Response } from 'express';
import { supabase } from '../../shared/config/supabase';
import { uploadDocument, DocumentType } from '../../shared/services/storage.service';

const router = Router();

/**
 * POST /api/applications
 * Create a new customer application (with agent referral)
 */
router.post('/applications', async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      birthday,
      phoneNumber,
      email,
      address,
      latitude,
      longitude,
      planId,
      agentRef,
      images, // Base64 encoded images
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !birthday || !phoneNumber || !email || !address || !planId || !agentRef) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!images || !images.housePhoto || !images.governmentId || !images.signature || !images.idSelfie) {
      return res.status(400).json({ error: 'All required images must be provided' });
    }

    // Validate agent referral code
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, is_active, branch_id')
      .eq('referral_code', agentRef)
      .single();

    if (agentError || !agent) {
      console.error('Agent lookup error:', agentError);
      return res.status(400).json({ 
        error: 'Invalid referral code',
        details: agentError?.message 
      });
    }

    if (!agent.is_active) {
      return res.status(400).json({ error: 'Agent is not active' });
    }

    // Validate plan exists
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, is_active, price')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    if (!plan.is_active) {
      return res.status(400).json({ error: 'Plan is not active' });
    }

    // Check if proof of billing is required (plans >= 2000)
    const requiresProofOfBilling = plan.price >= 2000;
    // Check if proof of income is required (plans >= 3000)
    const requiresProofOfIncome = plan.price >= 3000;

    // Validate proof of billing if required
    if (requiresProofOfBilling && !images.proofOfBilling) {
      return res.status(400).json({ 
        error: 'Proof of billing is required for plans ₱2000 and above. Please upload a utility bill or similar document dated within the last 3 months.' 
      });
    }

    // Validate proof of income if required
    if (requiresProofOfIncome && !images.proofOfIncome) {
      return res.status(400).json({ 
        error: 'Proof of income is required for plans ₱3000 and above. Please upload a payslip, ITR, or similar document dated within the last 3 months.' 
      });
    }

    // Create application record first to get the ID
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        birthday,
        contact_number: phoneNumber,
        email: email || null,
        address,
        latitude: latitude || null,
        longitude: longitude || null,
        agent_id: agent.id,
        plan_id: planId,
        branch_id: agent.branch_id || null,
        status: 'Submitted',
      })
      .select()
      .single();

    if (applicationError || !application) {
      console.error('Error creating application:', applicationError);
      return res.status(500).json({ 
        error: 'Failed to create application',
        details: applicationError?.message || 'Unknown error',
        code: applicationError?.code
      });
    }

    // Upload images to Supabase Storage
    const imageUrls: Record<string, string> = {};

    try {
      // Helper function to convert base64 to buffer
      const base64ToBuffer = (base64String: string): Buffer => {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      };

      // Upload house photo
      const housePhotoBuffer = base64ToBuffer(images.housePhoto);
      imageUrls.house_photo_url = await uploadDocument(
        application.id,
        housePhotoBuffer,
        'house_photo',
        'house_photo.png'
      );

      // Upload government ID
      const govIdBuffer = base64ToBuffer(images.governmentId);
      imageUrls.government_id_url = await uploadDocument(
        application.id,
        govIdBuffer,
        'government_id',
        'government_id.png'
      );

      // Upload signature
      const signatureBuffer = base64ToBuffer(images.signature);
      imageUrls.signature_url = await uploadDocument(
        application.id,
        signatureBuffer,
        'signature',
        'signature.png'
      );

      // Upload ID selfie
      const idSelfieBuffer = base64ToBuffer(images.idSelfie);
      imageUrls.id_selfie_url = await uploadDocument(
        application.id,
        idSelfieBuffer,
        'id_selfie',
        'id_selfie.png'
      );

      // Upload proof of billing if provided
      if (images.proofOfBilling) {
        const proofOfBillingBuffer = base64ToBuffer(images.proofOfBilling);
        imageUrls.proof_of_billing_url = await uploadDocument(
          application.id,
          proofOfBillingBuffer,
          'proof_of_billing',
          'proof_of_billing.png'
        );
      }

      // Upload proof of income if provided
      if (images.proofOfIncome) {
        const proofOfIncomeBuffer = base64ToBuffer(images.proofOfIncome);
        imageUrls.proof_of_income_url = await uploadDocument(
          application.id,
          proofOfIncomeBuffer,
          'proof_of_income',
          'proof_of_income.png'
        );
      }

      // Update application with image URLs
      const { error: updateError } = await supabase
        .from('applications')
        .update(imageUrls)
        .eq('id', application.id);

      if (updateError) {
        throw new Error('Failed to update application with image URLs');
      }

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        applicationId: application.id,
      });
    } catch (uploadError) {
      // If image upload fails, delete the application record
      await supabase.from('applications').delete().eq('id', application.id);
      
      throw uploadError;
    }
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit application',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/system-applications
 * Create a new customer application WITHOUT agent referral (system/direct)
 * Used for QR codes on marketing materials (tarpaulins, flyers, etc.)
 */
router.post('/system-applications', async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      birthday,
      phoneNumber,
      email,
      address,
      latitude,
      longitude,
      planId,
      images, // Base64 encoded images
    } = req.body;

    // Validate required fields (no agentRef needed)
    if (!firstName || !lastName || !birthday || !phoneNumber || !email || !address || !planId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!images || !images.housePhoto || !images.governmentId || !images.signature || !images.idSelfie) {
      return res.status(400).json({ error: 'All required images must be provided' });
    }

    // Validate plan exists
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, is_active, price')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    if (!plan.is_active) {
      return res.status(400).json({ error: 'Plan is not active' });
    }

    // Check if proof of billing is required (plans >= 2000)
    const requiresProofOfBilling = plan.price >= 2000;
    // Check if proof of income is required (plans >= 3000)
    const requiresProofOfIncome = plan.price >= 3000;

    // Validate proof of billing if required
    if (requiresProofOfBilling && !images.proofOfBilling) {
      return res.status(400).json({ 
        error: 'Proof of billing is required for plans ₱2000 and above. Please upload a utility bill or similar document dated within the last 3 months.' 
      });
    }

    // Validate proof of income if required
    if (requiresProofOfIncome && !images.proofOfIncome) {
      return res.status(400).json({ 
        error: 'Proof of income is required for plans ₱3000 and above. Please upload a payslip, ITR, or similar document dated within the last 3 months.' 
      });
    }

    // Create application record with NULL agent_id (system application)
    const { data: application, error: applicationError } = await supabase
      .from('applications')
      .insert({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        birthday,
        contact_number: phoneNumber,
        email: email || null,
        address,
        latitude: latitude || null,
        longitude: longitude || null,
        agent_id: null, // System application - no agent referral
        plan_id: planId,
        branch_id: null, // Will be assigned by admin later
        status: 'Submitted',
      })
      .select()
      .single();

    if (applicationError || !application) {
      console.error('Error creating system application:', applicationError);
      return res.status(500).json({ 
        error: 'Failed to create application',
        details: applicationError?.message || 'Unknown error',
        code: applicationError?.code
      });
    }

    // Upload images to Supabase Storage
    const imageUrls: Record<string, string> = {};

    try {
      // Helper function to convert base64 to buffer
      const base64ToBuffer = (base64String: string): Buffer => {
        const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      };

      // Upload house photo
      const housePhotoBuffer = base64ToBuffer(images.housePhoto);
      imageUrls.house_photo_url = await uploadDocument(
        application.id,
        housePhotoBuffer,
        'house_photo',
        'house_photo.png'
      );

      // Upload government ID
      const govIdBuffer = base64ToBuffer(images.governmentId);
      imageUrls.government_id_url = await uploadDocument(
        application.id,
        govIdBuffer,
        'government_id',
        'government_id.png'
      );

      // Upload signature
      const signatureBuffer = base64ToBuffer(images.signature);
      imageUrls.signature_url = await uploadDocument(
        application.id,
        signatureBuffer,
        'signature',
        'signature.png'
      );

      // Upload ID selfie
      const idSelfieBuffer = base64ToBuffer(images.idSelfie);
      imageUrls.id_selfie_url = await uploadDocument(
        application.id,
        idSelfieBuffer,
        'id_selfie',
        'id_selfie.png'
      );

      // Upload proof of billing if provided
      if (images.proofOfBilling) {
        const proofOfBillingBuffer = base64ToBuffer(images.proofOfBilling);
        imageUrls.proof_of_billing_url = await uploadDocument(
          application.id,
          proofOfBillingBuffer,
          'proof_of_billing',
          'proof_of_billing.png'
        );
      }

      // Upload proof of income if provided
      if (images.proofOfIncome) {
        const proofOfIncomeBuffer = base64ToBuffer(images.proofOfIncome);
        imageUrls.proof_of_income_url = await uploadDocument(
          application.id,
          proofOfIncomeBuffer,
          'proof_of_income',
          'proof_of_income.png'
        );
      }

      // Update application with image URLs
      const { error: updateError } = await supabase
        .from('applications')
        .update(imageUrls)
        .eq('id', application.id);

      if (updateError) {
        throw new Error('Failed to update application with image URLs');
      }

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        applicationId: application.id,
      });
    } catch (uploadError) {
      // If image upload fails, delete the application record
      await supabase.from('applications').delete().eq('id', application.id);
      
      throw uploadError;
    }
  } catch (error) {
    console.error('System application submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit application',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/applications', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Get applications endpoint - not yet implemented' });
});

router.get('/applications/:id', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Get application by ID endpoint - not yet implemented' });
});

router.put('/applications/:id/status', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Update application status endpoint - not yet implemented' });
});

export default router;
