import { describe, expect, it } from 'vitest';
import { readTextFile } from '../../../src/platform/files/read-file';

describe('readTextFile', () => {
  it('returns the text content of a file-like blob', async () => {
    const file = new File(['cabinet data'], 'cabinet.json', { type: 'application/json' });

    await expect(readTextFile(file)).resolves.toBe('cabinet data');
  });
});
