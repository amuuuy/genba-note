/**
 * String Byte Length Tests
 *
 * Tests for UTF-8 byte length calculation utilities.
 */

import {
  getByteLength,
  getCharLength,
  truncateToBytes,
  fitsInBytes,
} from '../../src/utils/stringBytes';

describe('stringBytes', () => {
  describe('getByteLength', () => {
    // Edge cases
    describe('edge cases', () => {
      it('returns 0 for null', () => {
        expect(getByteLength(null)).toBe(0);
      });

      it('returns 0 for undefined', () => {
        expect(getByteLength(undefined)).toBe(0);
      });

      it('returns 0 for empty string', () => {
        expect(getByteLength('')).toBe(0);
      });
    });

    // ASCII (1 byte per character)
    describe('ASCII characters (1 byte)', () => {
      it('calculates ASCII string length', () => {
        expect(getByteLength('Hello')).toBe(5);
      });

      it('handles digits and symbols', () => {
        expect(getByteLength('123-456')).toBe(7);
      });

      it('handles whitespace', () => {
        expect(getByteLength('a b c')).toBe(5);
        expect(getByteLength('\t\n')).toBe(2);
      });
    });

    // Latin-1 and extended ASCII (2 bytes)
    describe('Extended Latin characters (2 bytes)', () => {
      it('calculates accented characters', () => {
        expect(getByteLength('é')).toBe(2); // U+00E9
        expect(getByteLength('café')).toBe(5); // c(1) + a(1) + f(1) + é(2) = 5
      });

      it('calculates German umlauts', () => {
        expect(getByteLength('ü')).toBe(2); // U+00FC
        expect(getByteLength('Müller')).toBe(7); // M(1) + ü(2) + ller(4) = 7
      });
    });

    // CJK characters (3 bytes)
    describe('CJK characters (3 bytes)', () => {
      it('calculates Japanese hiragana', () => {
        expect(getByteLength('あ')).toBe(3);
        expect(getByteLength('あいうえお')).toBe(15);
      });

      it('calculates Japanese kanji', () => {
        expect(getByteLength('日本語')).toBe(9);
      });

      it('calculates Chinese characters', () => {
        expect(getByteLength('中文')).toBe(6);
      });

      it('calculates Korean characters', () => {
        expect(getByteLength('한글')).toBe(6);
      });
    });

    // Emoji and supplementary characters (4 bytes)
    describe('Emoji and supplementary characters (4 bytes)', () => {
      it('calculates simple emoji', () => {
        expect(getByteLength('😀')).toBe(4);
        expect(getByteLength('🎉')).toBe(4);
      });

      it('calculates multiple emoji', () => {
        expect(getByteLength('😀🎉🌍')).toBe(12);
      });

      it('calculates emoji with ZWJ sequences', () => {
        // Family emoji: 👨‍👩‍👧‍👦 = 4 people (4 bytes each) + 3 ZWJ (3 bytes each)
        // = 16 + 9 = 25 bytes
        expect(getByteLength('👨‍👩‍👧‍👦')).toBe(25);
      });

      it('calculates flag emoji', () => {
        // JP flag: 🇯🇵 = 2 regional indicators (4 bytes each) = 8 bytes
        expect(getByteLength('🇯🇵')).toBe(8);
      });
    });

    // Mixed content
    describe('mixed content', () => {
      it('calculates mixed ASCII and Japanese', () => {
        // 'Hello世界' = Hello(5) + 世(3) + 界(3) = 11
        expect(getByteLength('Hello世界')).toBe(11);
      });

      it('calculates mixed with emoji', () => {
        // 'A😀B' = A(1) + 😀(4) + B(1) = 6
        expect(getByteLength('A😀B')).toBe(6);
      });

      it('calculates realistic document content', () => {
        const clientName = '株式会社テスト'; // 7 chars * 3 bytes = 21
        expect(getByteLength(clientName)).toBe(21);
      });
    });

    // Invalid surrogate pairs (edge case)
    describe('invalid surrogates', () => {
      it('handles orphan high surrogate', () => {
        // High surrogate without low surrogate
        const orphan = '\uD800'; // Just high surrogate
        // Should be treated as replacement char (3 bytes)
        expect(getByteLength(orphan)).toBe(3);
      });

      it('handles orphan low surrogate', () => {
        // Low surrogate without high surrogate
        const orphan = '\uDC00';
        expect(getByteLength(orphan)).toBe(3);
      });
    });
  });

  describe('getCharLength', () => {
    it('returns 0 for null/undefined/empty', () => {
      expect(getCharLength(null)).toBe(0);
      expect(getCharLength(undefined)).toBe(0);
      expect(getCharLength('')).toBe(0);
    });

    it('matches string.length for ASCII', () => {
      expect(getCharLength('Hello')).toBe(5);
      expect('Hello'.length).toBe(5);
    });

    it('differs from string.length for emoji', () => {
      expect(getCharLength('😀')).toBe(1);
      expect('😀'.length).toBe(2); // UTF-16 surrogate pair
    });

    it('counts Japanese characters correctly', () => {
      expect(getCharLength('日本語')).toBe(3);
    });
  });

  describe('truncateToBytes', () => {
    it('returns empty string for null/undefined', () => {
      expect(truncateToBytes(null, 10)).toBe('');
      expect(truncateToBytes(undefined, 10)).toBe('');
    });

    it('returns empty string for maxBytes <= 0', () => {
      expect(truncateToBytes('Hello', 0)).toBe('');
      expect(truncateToBytes('Hello', -1)).toBe('');
    });

    it('returns original string if within limit', () => {
      expect(truncateToBytes('Hello', 10)).toBe('Hello');
      expect(truncateToBytes('日本語', 9)).toBe('日本語');
    });

    it('truncates ASCII correctly', () => {
      expect(truncateToBytes('Hello World', 5)).toBe('Hello');
    });

    it('truncates CJK without breaking characters', () => {
      // Each Japanese char is 3 bytes
      expect(truncateToBytes('日本語', 6)).toBe('日本');
      expect(truncateToBytes('日本語', 3)).toBe('日');
      expect(truncateToBytes('日本語', 2)).toBe(''); // Can't fit even one
    });

    it('does not break emoji (surrogate pairs)', () => {
      // Emoji is 4 bytes, should not be split
      expect(truncateToBytes('A😀B', 4)).toBe('A'); // 1 + 4 > 4, so just 'A'
      expect(truncateToBytes('A😀B', 5)).toBe('A😀'); // 1 + 4 = 5, fits exactly
      expect(truncateToBytes('A😀B', 6)).toBe('A😀B'); // 1 + 4 + 1 = 6, fits exactly
      expect(truncateToBytes('😀😀', 4)).toBe('😀');
    });

    it('handles mixed content', () => {
      // 'Hi日' = H(1) + i(1) + 日(3) = 5
      expect(truncateToBytes('Hi日本', 5)).toBe('Hi日');
    });
  });

  describe('fitsInBytes', () => {
    it('returns true for null/undefined/empty', () => {
      expect(fitsInBytes(null, 10)).toBe(true);
      expect(fitsInBytes(undefined, 10)).toBe(true);
      expect(fitsInBytes('', 0)).toBe(true);
    });

    it('returns true when string fits', () => {
      expect(fitsInBytes('Hello', 5)).toBe(true);
      expect(fitsInBytes('Hello', 10)).toBe(true);
    });

    it('returns false when string exceeds limit', () => {
      expect(fitsInBytes('Hello', 4)).toBe(false);
      expect(fitsInBytes('日本語', 8)).toBe(false); // needs 9
    });
  });
});
