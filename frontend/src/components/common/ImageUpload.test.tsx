import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUpload from './ImageUpload';

// Mock browser-image-compression
jest.mock('browser-image-compression', () => {
  return jest.fn((file) => {
    // Return a mock compressed file
    return Promise.resolve(new File(['compressed'], 'compressed.png', { type: 'image/png' }));
  });
});

describe('ImageUpload Component', () => {
  const mockOnImageChange = jest.fn();

  beforeEach(() => {
    mockOnImageChange.mockClear();
  });

  it('renders with label and required indicator', () => {
    render(
      <ImageUpload
        label="Test Image"
        name="testImage"
        required
        onImageChange={mockOnImageChange}
      />
    );

    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays file size limit information', () => {
    render(
      <ImageUpload
        label="Test Image"
        name="testImage"
        onImageChange={mockOnImageChange}
        maxSizeMB={5}
      />
    );

    expect(screen.getByText(/Max size: 5MB/)).toBeInTheDocument();
    expect(screen.getByText(/Image will be compressed to PNG format/)).toBeInTheDocument();
  });

  it('shows error for non-image files', async () => {
    render(
      <ImageUpload
        label="Test Image"
        name="testImage"
        onImageChange={mockOnImageChange}
      />
    );

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/Test Image/) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Please select a valid image file')).toBeInTheDocument();
    });
  });

  it('shows error for files exceeding size limit', async () => {
    render(
      <ImageUpload
        label="Test Image"
        name="testImage"
        onImageChange={mockOnImageChange}
        maxSizeMB={1}
      />
    );

    // Create a file larger than 1MB (1.5MB)
    const largeFile = new File([new ArrayBuffer(1.5 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Test Image/) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('File size must be less than 1MB')).toBeInTheDocument();
    });
  });

  it('compresses and passes valid image to parent', async () => {
    render(
      <ImageUpload
        label="Test Image"
        name="testImage"
        onImageChange={mockOnImageChange}
      />
    );

    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Test Image/) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(mockOnImageChange).toHaveBeenCalledWith('testImage', expect.any(File));
    });
  });

  it('clears image when remove button is clicked', async () => {
    render(
      <ImageUpload
        label="Test Image"
        name="testImage"
        onImageChange={mockOnImageChange}
      />
    );

    const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Test Image/) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });

    const removeButton = screen.getByRole('button', { name: '×' });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockOnImageChange).toHaveBeenCalledWith('testImage', null);
    });
  });
});
