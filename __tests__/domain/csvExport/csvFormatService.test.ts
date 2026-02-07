/**
 * CSV Format Service Tests
 *
 * Tests for RFC 4180 compliant CSV formatting functions.
 */

import {
  escapeField,
  formatCsvRow,
  formatHeaderRow,
  formatCsvContent,
  generateCsvFilename,
} from '@/domain/csvExport/csvFormatService';
import { UTF8_BOM, CRLF, CSV_HEADER } from '@/domain/csvExport/types';
import { createTestCsvRow } from './helpers';

describe('csvFormatService', () => {
  describe('escapeField', () => {
    describe('no escape needed', () => {
      it('should return simple string as-is', () => {
        expect(escapeField('hello')).toBe('hello');
      });

      it('should return empty string as-is', () => {
        expect(escapeField('')).toBe('');
      });

      it('should convert number to string', () => {
        expect(escapeField(12345)).toBe('12345');
      });

      it('should convert zero to string', () => {
        expect(escapeField(0)).toBe('0');
      });

      it('should handle Japanese text without special chars', () => {
        expect(escapeField('株式会社テスト')).toBe('株式会社テスト');
      });
    });

    describe('comma escape', () => {
      it('should wrap string with comma in quotes', () => {
        expect(escapeField('hello, world')).toBe('"hello, world"');
      });

      it('should wrap string with multiple commas', () => {
        expect(escapeField('a,b,c')).toBe('"a,b,c"');
      });
    });

    describe('double-quote escape', () => {
      it('should double quotes and wrap in quotes', () => {
        expect(escapeField('say "hi"')).toBe('"say ""hi"""');
      });

      it('should handle single quote character', () => {
        expect(escapeField('"')).toBe('""""');
      });

      it('should handle multiple quotes', () => {
        expect(escapeField('a"b"c')).toBe('"a""b""c"');
      });
    });

    describe('newline escape', () => {
      it('should wrap string with LF in quotes', () => {
        expect(escapeField('line1\nline2')).toBe('"line1\nline2"');
      });

      it('should wrap string with CR in quotes', () => {
        expect(escapeField('line1\rline2')).toBe('"line1\rline2"');
      });

      it('should wrap string with CRLF in quotes', () => {
        expect(escapeField('line1\r\nline2')).toBe('"line1\r\nline2"');
      });
    });

    describe('mixed special characters', () => {
      it('should handle comma and quote together', () => {
        expect(escapeField('hello, "world"')).toBe('"hello, ""world"""');
      });

      it('should handle all special chars', () => {
        expect(escapeField('a,b"c\nd')).toBe('"a,b""c\nd"');
      });
    });

    describe('formula injection protection (B5)', () => {
      it('should prefix = with single quote', () => {
        expect(escapeField('=HYPERLINK("http://evil.com")')).toBe(
          '"\'=HYPERLINK(""http://evil.com"")"'
        );
      });

      it('should prefix + with single quote', () => {
        expect(escapeField("+cmd|' /C calc'!A0")).toBe(
          "'+cmd|' /C calc'!A0"
        );
      });

      it('should prefix @ with single quote', () => {
        expect(escapeField('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      });

      it('should prefix - with single quote for string values', () => {
        expect(escapeField('-1+1')).toBe("'-1+1");
      });

      it('should prefix \\t with single quote', () => {
        expect(escapeField('\t=cmd')).toBe("'\t=cmd");
      });

      it('should prefix \\r with single quote', () => {
        // \r triggers both formula protection AND RFC 4180 quoting
        expect(escapeField('\rDANGEROUS')).toBe("\"'\rDANGEROUS\"");
      });

      it('should prefix \\n with single quote', () => {
        // \n triggers both formula protection AND RFC 4180 quoting
        expect(escapeField('\n=SUM(A1)')).toBe("\"'\n=SUM(A1)\"");
      });

      it('should NOT prefix negative number', () => {
        expect(escapeField(-500)).toBe('-500');
      });

      it('should prefix string that looks like negative number', () => {
        expect(escapeField('-500')).toBe("'-500");
      });

      it('should not prefix empty string', () => {
        expect(escapeField('')).toBe('');
      });

      it('should not prefix normal strings', () => {
        expect(escapeField('hello')).toBe('hello');
      });

      it('should not prefix strings starting with other special chars', () => {
        expect(escapeField('#comment')).toBe('#comment');
      });

      it('should handle = as only character', () => {
        expect(escapeField('=')).toBe("'=");
      });

      it('should handle formula with comma (both protections apply)', () => {
        expect(escapeField('=A1,B1')).toBe("\"'=A1,B1\"");
      });
    });
  });

  describe('formatCsvRow', () => {
    it('should format basic row correctly', () => {
      const row = createTestCsvRow();
      const result = formatCsvRow(row);

      expect(result).toBe(
        'INV-001,2026-01-15,2026-02-15,,Test Client,Test Project,10000,1000,11000,sent'
      );
    });

    it('should format row with empty optional fields', () => {
      const row = createTestCsvRow({
        dueDate: '',
        paidAt: '',
        subject: '',
      });
      const result = formatCsvRow(row);

      expect(result).toContain('INV-001');
      expect(result).toContain(',,,'); // empty dueDate, paidAt, then clientName
    });

    it('should escape client name with special chars', () => {
      const row = createTestCsvRow({
        clientName: 'Company, Inc.',
      });
      const result = formatCsvRow(row);

      expect(result).toContain('"Company, Inc."');
    });

    it('should escape subject with quotes', () => {
      const row = createTestCsvRow({
        subject: 'Project "Alpha"',
      });
      const result = formatCsvRow(row);

      expect(result).toContain('"Project ""Alpha"""');
    });

    it('should format paid invoice row', () => {
      const row = createTestCsvRow({
        status: 'paid',
        paidAt: '2026-01-20',
      });
      const result = formatCsvRow(row);

      expect(result).toContain('2026-01-20');
      expect(result).toContain(',paid');
    });

    it('should sanitize malicious clientName (B5)', () => {
      const row = createTestCsvRow({
        clientName: '=HYPERLINK("http://evil.com")',
      });
      const result = formatCsvRow(row);

      expect(result).toContain("\"'=HYPERLINK(\"\"http://evil.com\"\")\"");
    });
  });

  describe('formatHeaderRow', () => {
    it('should format header with correct column order', () => {
      const result = formatHeaderRow();

      expect(result).toBe(
        'documentNo,issueDate,dueDate,paidAt,clientName,subject,subtotalYen,taxYen,totalYen,status'
      );
    });

    it('should match CSV_HEADER constant order', () => {
      const result = formatHeaderRow();
      const expected = CSV_HEADER.join(',');

      expect(result).toBe(expected);
    });
  });

  describe('formatCsvContent', () => {
    it('should start with UTF-8 BOM', () => {
      const rows = [createTestCsvRow()];
      const result = formatCsvContent(rows);

      expect(result.startsWith(UTF8_BOM)).toBe(true);
    });

    it('should use CRLF line endings', () => {
      const rows = [createTestCsvRow()];
      const result = formatCsvContent(rows);

      // Should have CRLF between header and first row
      expect(result).toContain(CRLF);
      // Should not have LF-only line endings
      const withoutCRLF = result.replace(/\r\n/g, '');
      expect(withoutCRLF).not.toContain('\n');
    });

    it('should include header row first', () => {
      const rows = [createTestCsvRow()];
      const result = formatCsvContent(rows);

      const lines = result.replace(UTF8_BOM, '').split(CRLF);
      expect(lines[0]).toBe(formatHeaderRow());
    });

    it('should include data rows after header', () => {
      const rows = [
        createTestCsvRow({ documentNo: 'INV-001' }),
        createTestCsvRow({ documentNo: 'INV-002' }),
      ];
      const result = formatCsvContent(rows);

      const lines = result.replace(UTF8_BOM, '').split(CRLF);
      expect(lines.length).toBe(4); // header + 2 data rows + trailing empty
      expect(lines[1]).toContain('INV-001');
      expect(lines[2]).toContain('INV-002');
    });

    it('should end with CRLF', () => {
      const rows = [createTestCsvRow()];
      const result = formatCsvContent(rows);

      expect(result.endsWith(CRLF)).toBe(true);
    });

    it('should handle empty rows array (header only)', () => {
      const result = formatCsvContent([]);

      const lines = result.replace(UTF8_BOM, '').split(CRLF);
      expect(lines[0]).toBe(formatHeaderRow());
      expect(lines.length).toBe(2); // header + trailing empty
    });
  });

  describe('generateCsvFilename', () => {
    it('should generate filename with reference date', () => {
      const result = generateCsvFilename('2026-01-15');

      expect(result).toBe('invoices_20260115.csv');
    });

    it('should generate filename without hyphens', () => {
      const result = generateCsvFilename('2026-12-31');

      expect(result).toBe('invoices_20261231.csv');
    });

    it('should generate filename with today when no reference date', () => {
      // Mock date
      const mockDate = new Date(2026, 0, 20); // 2026-01-20
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      const result = generateCsvFilename();

      expect(result).toBe('invoices_20260120.csv');

      jest.useRealTimers();
    });

    it('should have correct format prefix', () => {
      const result = generateCsvFilename('2026-01-01');

      expect(result.startsWith('invoices_')).toBe(true);
      expect(result.endsWith('.csv')).toBe(true);
    });
  });
});
