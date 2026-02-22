/**
 * Register All Templates
 *
 * Side-effect import that populates the template registry with all 6 templates.
 * Import this module once at app startup or in tests to ensure all templates
 * are available via getTemplate().
 */

import { registerTemplate } from './templateRegistry';
import { generateFormalStandardTemplate } from './formalStandardTemplate';
import { generateSimpleTemplate } from './simpleTemplate';
import { generateModernTemplate } from './modernTemplate';
import { generateClassicTemplate } from './classicTemplate';
import { generateConstructionTemplate } from './constructionTemplate';
import { generateAccountingTemplate } from '@/pdf/invoiceAccountingTemplate';

registerTemplate('FORMAL_STANDARD', generateFormalStandardTemplate);
registerTemplate('ACCOUNTING', generateAccountingTemplate);
registerTemplate('SIMPLE', generateSimpleTemplate);
registerTemplate('MODERN', generateModernTemplate);
registerTemplate('CLASSIC', generateClassicTemplate);
registerTemplate('CONSTRUCTION', generateConstructionTemplate);
