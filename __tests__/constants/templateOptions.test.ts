import { TEMPLATE_OPTIONS } from '@/constants/templateOptions';
import { DOCUMENT_TEMPLATE_IDS } from '@/types/settings';

describe('TEMPLATE_OPTIONS', () => {
  it('has exactly 6 entries matching DOCUMENT_TEMPLATE_IDS', () => {
    expect(TEMPLATE_OPTIONS).toHaveLength(DOCUMENT_TEMPLATE_IDS.length);
  });

  it('covers all DocumentTemplateId values', () => {
    const values = TEMPLATE_OPTIONS.map((o) => o.value);
    for (const id of DOCUMENT_TEMPLATE_IDS) {
      expect(values).toContain(id);
    }
  });

  it('each entry has value, label, and description', () => {
    for (const option of TEMPLATE_OPTIONS) {
      expect(typeof option.value).toBe('string');
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    }
  });
});
