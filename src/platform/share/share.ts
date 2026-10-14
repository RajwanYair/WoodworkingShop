export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export type ShareLinkResult = 'shared' | 'copied' | 'failed';

export async function shareLink(title: string, url: string): Promise<ShareLinkResult> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch {
      // User cancellation and unsupported share failures fall back to clipboard.
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
}
