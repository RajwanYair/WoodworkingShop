import { expect, test } from './fixtures/app';

test('physical camera captures a room photo and releases its track @chromium-only @physical-camera', async ({
  appPage: page,
  context,
}) => {
  await context.grantPermissions(['camera'], { origin: new URL(page.url()).origin });
  const cameraLabels = await page.evaluate(async () =>
    (await navigator.mediaDevices.enumerateDevices())
      .filter((device) => device.kind === 'videoinput')
      .map((device) => device.label || '(unlabeled camera)'),
  );
  test.info().annotations.push({
    type: 'available-camera-devices',
    description: cameraLabels.length > 0 ? cameraLabels.join(', ') : 'No camera devices exposed to Chromium',
  });
  await page.evaluate(() => {
    const mediaDevices = navigator.mediaDevices;
    const getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
    Reflect.set(window, '__woodworkingPhysicalCameraRequest', 'not-started');
    Object.defineProperty(mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async (constraints: MediaStreamConstraints) => {
        Reflect.set(window, '__woodworkingPhysicalCameraRequest', 'pending');
        try {
          const stream = await getUserMedia(constraints);
          Reflect.set(window, '__woodworkingPhysicalCameraRequest', 'resolved');
          return stream;
        } catch (error) {
          const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          Reflect.set(window, '__woodworkingPhysicalCameraRequest', `rejected: ${details}`);
          throw error;
        }
      },
    });
  });
  await page.getByRole('tab', { name: 'Assembly' }).click();

  const camera = page.getByRole('region', { name: 'Room Photo Reference' });
  await camera.getByRole('button', { name: 'Open Camera' }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, '__woodworkingPhysicalCameraRequest') as string), {
      timeout: 15_000,
    })
    .toMatch(/^(resolved|rejected:)/);
  const cameraRequest = await page.evaluate(() => Reflect.get(window, '__woodworkingPhysicalCameraRequest') as string);
  if (cameraRequest !== 'resolved') {
    throw new Error(
      `Chromium camera acquisition ${cameraRequest}; available devices: ${cameraLabels.join(', ') || 'none'}`,
    );
  }

  const video = camera.locator('video[aria-label="Live camera feed"]');
  await expect(video).toBeVisible();
  await expect
    .poll(() => video.evaluate((element) => (element instanceof HTMLVideoElement ? element.videoWidth : 0)))
    .toBeGreaterThan(0);
  await expect
    .poll(() => video.evaluate((element) => (element instanceof HTMLVideoElement ? element.videoHeight : 0)))
    .toBeGreaterThan(0);

  const trackDetails = await video.evaluate((element) => {
    if (!(element instanceof HTMLVideoElement)) return null;
    const stream = element.srcObject;
    const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined;
    if (!track) return null;

    Reflect.set(window, '__woodworkingPhysicalCameraTrack', track);
    const settings = track.getSettings();
    return {
      label: track.label.trim(),
      readyState: track.readyState,
      width: settings.width ?? 0,
      height: settings.height ?? 0,
    };
  });
  if (!trackDetails) throw new Error('The camera video feed has no video track.');
  expect(cameraLabels).toContain(trackDetails.label);
  expect(trackDetails.label).not.toBe('');
  expect(trackDetails.readyState).toBe('live');
  expect(trackDetails.width).toBeGreaterThan(0);
  expect(trackDetails.height).toBeGreaterThan(0);
  test.info().annotations.push({
    type: 'physical-camera-device',
    description: `${trackDetails.label} (${trackDetails.width}x${trackDetails.height})`,
  });

  await camera.getByRole('button', { name: 'Take Photo' }).click();
  const photo = camera.getByRole('img', { name: 'Captured room photo' });
  await expect(photo).toHaveAttribute('src', /^data:image\/jpeg/);
  await expect
    .poll(() => photo.evaluate((image) => (image instanceof HTMLImageElement ? image.naturalWidth : 0)))
    .toBeGreaterThan(0);
  await expect
    .poll(() => photo.evaluate((image) => (image instanceof HTMLImageElement ? image.naturalHeight : 0)))
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const track = Reflect.get(window, '__woodworkingPhysicalCameraTrack') as MediaStreamTrack | undefined;
        return track?.readyState ?? null;
      }),
    )
    .toBe('ended');
});
