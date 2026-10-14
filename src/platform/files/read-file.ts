export function readTextFile(file: Blob): Promise<string> {
  return file.text();
}
