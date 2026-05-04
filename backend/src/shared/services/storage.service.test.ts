/**
 * Storage Helper Tests
 * Unit tests for storage utility functions
 */

import {
  generateDocumentPath,
  getFileExtension,
  validateFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  type DocumentType,
} from './storage.service';

describe('Storage Helper Functions', () => {
  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
      expect(getFileExtension('document.png')).toBe('png');
      expect(getFileExtension('image.JPEG')).toBe('jpeg');
      expect(getFileExtension('file.with.dots.webp')).toBe('webp');
    });
  });

  describe('generateDocumentPath', () => {
    it('should generate correct path format', () => {
      const applicationId = '550e8400-e29b-41d4-a716-446655440000';
      const documentType: DocumentType = 'house_photo';
      const extension = 'png';

      const path = generateDocumentPath(applicationId, documentType, extension);

      expect(path).toMatch(
        /^550e8400-e29b-41d4-a716-446655440000\/house_photo_\d+\.png$/
      );
    });

    it('should generate unique paths for same inputs', async () => {
      const applicationId = '550e8400-e29b-41d4-a716-446655440000';
      const documentType: DocumentType = 'government_id';
      const extension = 'jpg';

      const path1 = generateDocumentPath(applicationId, documentType, extension);
      
      // Wait 1ms to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const path2 = generateDocumentPath(applicationId, documentType, extension);

      expect(path1).not.toBe(path2);
    });

    it('should handle all document types', () => {
      const applicationId = '550e8400-e29b-41d4-a716-446655440000';
      const documentTypes: DocumentType[] = [
        'house_photo',
        'government_id',
        'id_selfie',
        'signature',
      ];

      documentTypes.forEach((type) => {
        const path = generateDocumentPath(applicationId, type, 'png');
        expect(path).toContain(type);
      });
    });
  });

  describe('validateFile', () => {
    it('should accept valid JPEG file', () => {
      const file = {
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg',
      };

      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid PNG file', () => {
      const file = {
        size: 2 * 1024 * 1024, // 2MB
        type: 'image/png',
      };

      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid WebP file', () => {
      const file = {
        size: 3 * 1024 * 1024, // 3MB
        type: 'image/webp',
      };

      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file exceeding size limit', () => {
      const file = {
        size: 6 * 1024 * 1024, // 6MB (exceeds 5MB limit)
        type: 'image/jpeg',
      };

      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds');
      expect(result.error).toContain('5MB');
    });

    it('should reject invalid MIME type', () => {
      const file = {
        size: 1024 * 1024, // 1MB
        type: 'application/pdf',
      };

      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject GIF files', () => {
      const file = {
        size: 1024 * 1024, // 1MB
        type: 'image/gif',
      };

      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should accept file at exact size limit', () => {
      const file = {
        size: MAX_FILE_SIZE, // Exactly 5MB
        type: 'image/png',
      };

      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject file one byte over limit', () => {
      const file = {
        size: MAX_FILE_SIZE + 1, // 5MB + 1 byte
        type: 'image/png',
      };

      const result = validateFile(file);
      expect(result.valid).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct MAX_FILE_SIZE', () => {
      expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    });

    it('should have correct ALLOWED_MIME_TYPES', () => {
      expect(ALLOWED_MIME_TYPES).toEqual([
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);
    });
  });
});
