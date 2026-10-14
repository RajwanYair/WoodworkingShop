import { downloadContent } from '../platform/files/index';

/** Trigger a browser file download from in-memory content. */
export function triggerDownload(content: string, mimeType: string, filename: string): void {
  downloadContent(content, mimeType, filename);
}
