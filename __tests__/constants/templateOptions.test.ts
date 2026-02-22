import {
  TEMPLATE_OPTIONS,
  isProTemplate,
  resolveTemplateForUser,
  getSelectableTemplateOptions,
} from '@/constants/templateOptions';
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

  it('each entry has value, label, description, and requiresPro', () => {
    for (const option of TEMPLATE_OPTIONS) {
      expect(typeof option.value).toBe('string');
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
      expect(typeof option.requiresPro).toBe('boolean');
    }
  });
});

describe('TemplateOption.requiresPro', () => {
  it('FORMAL_STANDARD, ACCOUNTING, SIMPLE are free (requiresPro=false)', () => {
    const freeIds = ['FORMAL_STANDARD', 'ACCOUNTING', 'SIMPLE'] as const;
    for (const id of freeIds) {
      const opt = TEMPLATE_OPTIONS.find((o) => o.value === id);
      expect(opt?.requiresPro).toBe(false);
    }
  });

  it('MODERN, CLASSIC, CONSTRUCTION are pro (requiresPro=true)', () => {
    const proIds = ['MODERN', 'CLASSIC', 'CONSTRUCTION'] as const;
    for (const id of proIds) {
      const opt = TEMPLATE_OPTIONS.find((o) => o.value === id);
      expect(opt?.requiresPro).toBe(true);
    }
  });
});

describe('isProTemplate', () => {
  it('returns false for free templates', () => {
    expect(isProTemplate('FORMAL_STANDARD')).toBe(false);
    expect(isProTemplate('ACCOUNTING')).toBe(false);
    expect(isProTemplate('SIMPLE')).toBe(false);
  });

  it('returns true for Pro templates', () => {
    expect(isProTemplate('MODERN')).toBe(true);
    expect(isProTemplate('CLASSIC')).toBe(true);
    expect(isProTemplate('CONSTRUCTION')).toBe(true);
  });
});

describe('resolveTemplateForUser', () => {
  it('returns the same ID for free template when user is not Pro', () => {
    expect(resolveTemplateForUser('estimate', 'FORMAL_STANDARD', false)).toBe('FORMAL_STANDARD');
    expect(resolveTemplateForUser('invoice', 'ACCOUNTING', false)).toBe('ACCOUNTING');
    expect(resolveTemplateForUser('estimate', 'SIMPLE', false)).toBe('SIMPLE');
  });

  it('returns the same ID for any template when user is Pro', () => {
    expect(resolveTemplateForUser('estimate', 'MODERN', true)).toBe('MODERN');
    expect(resolveTemplateForUser('invoice', 'CLASSIC', true)).toBe('CLASSIC');
    expect(resolveTemplateForUser('estimate', 'CONSTRUCTION', true)).toBe('CONSTRUCTION');
  });

  it('falls back to FORMAL_STANDARD for estimate when free user has Pro template', () => {
    expect(resolveTemplateForUser('estimate', 'MODERN', false)).toBe('FORMAL_STANDARD');
    expect(resolveTemplateForUser('estimate', 'CLASSIC', false)).toBe('FORMAL_STANDARD');
    expect(resolveTemplateForUser('estimate', 'CONSTRUCTION', false)).toBe('FORMAL_STANDARD');
  });

  it('falls back to ACCOUNTING for invoice when free user has Pro template', () => {
    expect(resolveTemplateForUser('invoice', 'MODERN', false)).toBe('ACCOUNTING');
    expect(resolveTemplateForUser('invoice', 'CLASSIC', false)).toBe('ACCOUNTING');
    expect(resolveTemplateForUser('invoice', 'CONSTRUCTION', false)).toBe('ACCOUNTING');
  });
});

describe('getSelectableTemplateOptions', () => {
  it('returns all 6 templates for Pro users with none disabled', () => {
    const options = getSelectableTemplateOptions(true);
    expect(options).toHaveLength(6);
    expect(options.every((o) => o.disabled === false)).toBe(true);
  });

  it('returns all 6 templates for free users with Pro ones disabled', () => {
    const options = getSelectableTemplateOptions(false);
    expect(options).toHaveLength(6);
    const enabled = options.filter((o) => !o.disabled);
    const disabled = options.filter((o) => o.disabled);
    expect(enabled).toHaveLength(3);
    expect(disabled).toHaveLength(3);
    expect(disabled.map((o) => o.value).sort()).toEqual(
      ['CLASSIC', 'CONSTRUCTION', 'MODERN']
    );
  });
});
