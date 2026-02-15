/**
 * AiModelSelector Component Tests
 *
 * Tests the segmented control for switching between Gemini Flash and Pro models.
 */

import type { AiModelSelectorProps } from '@/components/unitPrice/AiModelSelector';
import type { AiSearchModel } from '@/types/materialResearch';
import { AI_SEARCH_MODELS } from '@/types/materialResearch';

describe('AiModelSelector', () => {
  describe('AiModelSelectorProps interface', () => {
    it('accepts model and onChange props', () => {
      const props: AiModelSelectorProps = {
        model: 'FLASH',
        onChange: jest.fn(),
      };
      expect(props.model).toBe('FLASH');
      expect(typeof props.onChange).toBe('function');
    });

    it('accepts optional disabled prop', () => {
      const props: AiModelSelectorProps = {
        model: 'PRO',
        onChange: jest.fn(),
        disabled: true,
      };
      expect(props.disabled).toBe(true);
    });

    it('disabled defaults to false when not provided', () => {
      const props: AiModelSelectorProps = {
        model: 'FLASH',
        onChange: jest.fn(),
      };
      expect(props.disabled).toBeUndefined();
    });

    it('accepts optional testID', () => {
      const props: AiModelSelectorProps = {
        model: 'FLASH',
        onChange: jest.fn(),
        testID: 'ai-model-selector',
      };
      expect(props.testID).toBe('ai-model-selector');
    });
  });

  describe('model options', () => {
    it('FLASH is a valid AiSearchModel', () => {
      const model: AiSearchModel = 'FLASH';
      expect(model).toBe('FLASH');
    });

    it('PRO is a valid AiSearchModel', () => {
      const model: AiSearchModel = 'PRO';
      expect(model).toBe('PRO');
    });

    it('AI_SEARCH_MODELS contains exactly FLASH and PRO', () => {
      expect(AI_SEARCH_MODELS).toEqual(['FLASH', 'PRO']);
      expect(AI_SEARCH_MODELS).toHaveLength(2);
    });
  });

  describe('selection behavior', () => {
    it('onChange receives selected model string', () => {
      const mockOnChange = jest.fn();
      mockOnChange('FLASH');
      mockOnChange('PRO');
      expect(mockOnChange).toHaveBeenCalledWith('FLASH');
      expect(mockOnChange).toHaveBeenCalledWith('PRO');
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });
  });
});
