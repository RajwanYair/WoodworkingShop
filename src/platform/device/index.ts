export {
  isCameraSupported,
  isWebSerialSupported,
  isWebVibrationSupported,
  isWebGPUSupported,
  requestEnvironmentCamera,
  stopMediaStream,
  vibrate,
} from './capabilities';
export { getSupportedMediaRecorderMimeType, startAudioRecording } from './media-recorder';
export { isWebXRSupported, isImmersiveARSupported } from './xr';
export { getGrantedSerialPorts, requestSerialPort } from './serial';
export type { SerialConnectionProfile, SerialPortHandle, SerialPortInfo } from './serial';
export { captureVideoFrame } from './camera';
export { probeWebGLTier, isWebGLAvailable, getWebGL2MaxTextureSize } from './webgl';
