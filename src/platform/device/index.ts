export {
  isCameraSupported,
  isWebSerialSupported,
  isWebVibrationSupported,
  isWakeLockSupported,
  requestEnvironmentCamera,
  stopMediaStream,
  vibrate,
} from './capabilities';
export {
  getMediaRecorderConstructor,
  getSupportedMediaRecorderMimeType,
  requestAudioStream,
  startAudioRecording,
} from './media-recorder';
export { isWebXRSupported, isImmersiveARSupported } from './xr';
export { getGrantedSerialPorts, requestSerialPort } from './serial';
export type { SerialConnectionProfile, SerialPortHandle, SerialPortInfo } from './serial';
export { captureVideoFrame } from './camera';
export { probeWebGLTier, isWebGLAvailable, isWebGL2Available, resetWebGLProbeCache } from './webgl';
