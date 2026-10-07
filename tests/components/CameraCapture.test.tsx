import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CameraCapture } from '../../src/components/assembly/CameraCapture';
import { useCamera } from '../../src/hooks/useCamera';
import type { UseCameraResult } from '../../src/hooks/useCamera';

vi.mock('../../src/hooks/useCamera', () => ({ useCamera: vi.fn() }));

function createCameraResult(overrides: Partial<UseCameraResult> = {}): UseCameraResult {
  return {
    status: 'idle',
    photoDataUrl: null,
    videoRef: createRef<HTMLVideoElement>(),
    startCamera: vi.fn(async () => {}),
    stopCamera: vi.fn(),
    capturePhoto: vi.fn(() => null),
    error: null,
    isNative: false,
    isSupported: true,
    ...overrides,
  };
}

describe('CameraCapture', () => {
  it('enables capture only after video data is available', async () => {
    const user = userEvent.setup();
    const camera = createCameraResult({ status: 'active' });
    vi.mocked(useCamera).mockReturnValue(camera);

    render(<CameraCapture />);

    const captureButton = screen.getByRole('button', { name: 'Take Photo' });
    expect(captureButton).toBeDisabled();
    act(() => screen.getByLabelText('Live camera feed').dispatchEvent(new Event('loadeddata')));
    expect(captureButton).toBeEnabled();
    await user.click(captureButton);
    expect(camera.capturePhoto).toHaveBeenCalledOnce();
  });

  it('shows a supported-device notice without camera controls when unavailable', () => {
    vi.mocked(useCamera).mockReturnValue(createCameraResult({ isSupported: false }));

    render(<CameraCapture />);

    expect(screen.getByText('Camera not supported on this device')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Camera' })).not.toBeInTheDocument();
  });

  it('displays a captured photo and requests the camera again when retaking', async () => {
    const user = userEvent.setup();
    const camera = createCameraResult({ status: 'captured', photoDataUrl: 'data:image/jpeg;base64,photo' });
    vi.mocked(useCamera).mockReturnValue(camera);

    const { rerender } = render(<CameraCapture />);

    expect(screen.getByRole('img', { name: 'Captured room photo' })).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,photo',
    );
    await user.click(screen.getByRole('button', { name: 'Retake' }));
    expect(camera.startCamera).toHaveBeenCalledOnce();

    vi.mocked(useCamera).mockReturnValue(createCameraResult());
    rerender(<CameraCapture />);
    expect(screen.getByRole('button', { name: 'Open Camera' })).toBeInTheDocument();
  });
});
