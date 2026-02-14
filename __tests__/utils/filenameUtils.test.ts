/**
 * Filename Sanitization Tests (M19)
 *
 * Tests for sanitizeFilename() pure function.
 */

import { sanitizeFilename } from '../../src/utils/filenameUtils';

describe('filenameUtils', () => {
  describe('sanitizeFilename', () => {
    describe('forbidden character removal', () => {
      it('removes forward slash', () => {
        expect(sanitizeFilename('test/file')).toBe('testfile.pdf');
      });

      it('removes backslash', () => {
        expect(sanitizeFilename('test\\file')).toBe('testfile.pdf');
      });

      it('removes question mark', () => {
        expect(sanitizeFilename('test?file')).toBe('testfile.pdf');
      });

      it('removes asterisk', () => {
        expect(sanitizeFilename('test*file')).toBe('testfile.pdf');
      });

      it('removes angle brackets', () => {
        expect(sanitizeFilename('test<file>name')).toBe('testfilename.pdf');
      });

      it('removes pipe', () => {
        expect(sanitizeFilename('test|file')).toBe('testfile.pdf');
      });

      it('removes double quotes', () => {
        expect(sanitizeFilename('test"file"name')).toBe('testfilename.pdf');
      });

      it('removes colon', () => {
        expect(sanitizeFilename('test:file')).toBe('testfile.pdf');
      });

      it('removes multiple forbidden characters at once', () => {
        expect(sanitizeFilename('test/file:name')).toBe('testfilename.pdf');
      });

      it('removes hash character', () => {
        expect(sanitizeFilename('report#1')).toBe('report1.pdf');
      });

      it('removes percent character', () => {
        expect(sanitizeFilename('report%20v2')).toBe('report20v2.pdf');
      });
    });

    describe('.pdf extension handling', () => {
      it('preserves .pdf extension when present', () => {
        expect(sanitizeFilename('report.pdf')).toBe('report.pdf');
      });

      it('preserves .PDF uppercase extension', () => {
        expect(sanitizeFilename('test.PDF')).toBe('test.PDF');
      });

      it('auto-appends .pdf when no extension present', () => {
        expect(sanitizeFilename('report')).toBe('report.pdf');
      });
    });

    describe('length limiting', () => {
      it('truncates to 100 characters including .pdf extension', () => {
        const longName = 'a'.repeat(200);
        const result = sanitizeFilename(longName);
        expect(result.length).toBeLessThanOrEqual(100);
        expect(result).toBe('a'.repeat(96) + '.pdf');
      });

      it('does not truncate names already within limit', () => {
        const name = 'a'.repeat(50);
        expect(sanitizeFilename(name)).toBe(name + '.pdf');
      });

      it('handles long name with .pdf extension already present', () => {
        const name = 'a'.repeat(200) + '.pdf';
        const result = sanitizeFilename(name);
        expect(result.length).toBeLessThanOrEqual(100);
        expect(result.endsWith('.pdf')).toBe(true);
      });
    });

    describe('empty / whitespace fallback', () => {
      it('returns default name when input is empty', () => {
        expect(sanitizeFilename('', 'fallback')).toBe('fallback.pdf');
      });

      it('returns default name when input is only whitespace', () => {
        expect(sanitizeFilename('   ', 'fallback')).toBe('fallback.pdf');
      });

      it('returns default name when all chars are forbidden', () => {
        expect(sanitizeFilename('/\\?*<>|":', 'fallback')).toBe('fallback.pdf');
      });

      it('uses "document" as fallback when no defaultName provided', () => {
        expect(sanitizeFilename('')).toBe('document.pdf');
      });

      it('sanitizes defaultName with forbidden characters', () => {
        expect(sanitizeFilename('', 'bad/name:here')).toBe('badnamehere.pdf');
      });

      it('falls back to "document" when defaultName is also all forbidden chars', () => {
        expect(sanitizeFilename('', '/\\?*')).toBe('document.pdf');
      });
    });

    describe('whitespace trimming', () => {
      it('trims leading and trailing whitespace', () => {
        expect(sanitizeFilename('  report  ')).toBe('report.pdf');
      });

      it('preserves internal spaces', () => {
        expect(sanitizeFilename('my report')).toBe('my report.pdf');
      });
    });

    describe('Japanese filename support', () => {
      it('preserves Japanese characters', () => {
        expect(sanitizeFilename('EST-001_見積書')).toBe('EST-001_見積書.pdf');
      });

      it('preserves full-width characters', () => {
        expect(sanitizeFilename('テスト請求書')).toBe('テスト請求書.pdf');
      });
    });
  });
});
