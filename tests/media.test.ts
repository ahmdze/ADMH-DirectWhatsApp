import { describe, expect, it } from 'vitest';
import { MAX_FILE_INPUT_BYTES, MAX_IMAGE_INPUT_BYTES, mediaKind, validateMediaFile } from '../src/lib/media';

function file(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('media attachment validation', () => {
  it('accepts images and common documents', () => {
    expect(validateMediaFile(file('photo.jpg', 'image/jpeg', 1024))).toBeNull();
    expect(validateMediaFile(file('doc.pdf', 'application/pdf', 1024))).toBeNull();
    expect(validateMediaFile(file('contact.vcf', 'text/vcard', 128))).toBeNull();
  });

  it('rejects unsupported types and oversized files', () => {
    expect(validateMediaFile(file('app.exe', 'application/x-msdownload', 10))).toBe('unsupported');
    expect(validateMediaFile(file('big.pdf', 'application/pdf', MAX_FILE_INPUT_BYTES + 1))).toBe('too-large');
    expect(validateMediaFile(file('big.png', 'image/png', MAX_IMAGE_INPUT_BYTES + 1))).toBe('too-large');
  });

  it('categorizes images, vCards and generic files', () => {
    expect(mediaKind(file('a.png', 'image/png', 10))).toBe('image');
    expect(mediaKind(file('a.vcf', 'text/vcard', 10))).toBe('vcard');
    expect(mediaKind(file('a.pdf', 'application/pdf', 10))).toBe('file');
  });
});
