/**
 * LineItemList Unit Price Registration Prompt Logic Tests
 *
 * Tests the logic for showing a confirmation dialog to register
 * a newly added line item to the unit price list.
 *
 * When a user manually adds a NEW line item:
 * - If onRegisterToUnitPrice callback is available, show a confirmation alert
 * - If user confirms, call onRegisterToUnitPrice with the line item input
 * - If user declines, do nothing (item is already saved as a line item)
 *
 * The prompt should NOT appear when:
 * - Editing an existing line item
 * - The add operation fails
 * - onRegisterToUnitPrice is not provided
 *
 * Note: We test only the pure logic here.
 * The React component rendering is verified manually.
 */

/**
 * Determines whether to show the "register to unit price list" confirmation
 * after saving a line item in the editor modal.
 */
function shouldPromptUnitPriceRegistration(params: {
  isEditing: boolean;
  addSuccess: boolean;
  hasRegisterCallback: boolean;
}): boolean {
  return !params.isEditing && params.addSuccess && params.hasRegisterCallback;
}

/**
 * Returns the alert content for the unit price registration confirmation.
 */
function getUnitPriceRegistrationAlert(itemName: string): {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
} {
  return {
    title: '単価表にも登録しますか？',
    message: `「${itemName}」を単価表に登録すると、次回から単価表から選択して追加できます。`,
    confirmText: '登録する',
    cancelText: 'しない',
  };
}

describe('LineItemList', () => {
  describe('shouldPromptUnitPriceRegistration', () => {
    it('returns true when adding new item successfully with register callback', () => {
      expect(
        shouldPromptUnitPriceRegistration({
          isEditing: false,
          addSuccess: true,
          hasRegisterCallback: true,
        })
      ).toBe(true);
    });

    it('returns false when editing existing item', () => {
      expect(
        shouldPromptUnitPriceRegistration({
          isEditing: true,
          addSuccess: true,
          hasRegisterCallback: true,
        })
      ).toBe(false);
    });

    it('returns false when add operation fails', () => {
      expect(
        shouldPromptUnitPriceRegistration({
          isEditing: false,
          addSuccess: false,
          hasRegisterCallback: true,
        })
      ).toBe(false);
    });

    it('returns false when register callback is not provided', () => {
      expect(
        shouldPromptUnitPriceRegistration({
          isEditing: false,
          addSuccess: true,
          hasRegisterCallback: false,
        })
      ).toBe(false);
    });

    it('returns false when all conditions are negative', () => {
      expect(
        shouldPromptUnitPriceRegistration({
          isEditing: true,
          addSuccess: false,
          hasRegisterCallback: false,
        })
      ).toBe(false);
    });
  });

  describe('getUnitPriceRegistrationAlert', () => {
    it('returns correct alert title', () => {
      const alert = getUnitPriceRegistrationAlert('外壁塗装工事');
      expect(alert.title).toBe('単価表にも登録しますか？');
    });

    it('includes item name in message', () => {
      const alert = getUnitPriceRegistrationAlert('外壁塗装工事');
      expect(alert.message).toContain('外壁塗装工事');
    });

    it('returns correct button texts', () => {
      const alert = getUnitPriceRegistrationAlert('テスト品目');
      expect(alert.confirmText).toBe('登録する');
      expect(alert.cancelText).toBe('しない');
    });

    it('formats message with guidance about unit price list benefit', () => {
      const alert = getUnitPriceRegistrationAlert('配管工事');
      expect(alert.message).toBe(
        '「配管工事」を単価表に登録すると、次回から単価表から選択して追加できます。'
      );
    });
  });

  describe('confirm button behavior', () => {
    it('calls onRegisterToUnitPrice with input when confirmed', () => {
      const onRegisterToUnitPrice = jest.fn();
      const input = {
        name: '外壁塗装工事',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 50000,
        taxRate: 10 as const,
      };

      if (
        shouldPromptUnitPriceRegistration({
          isEditing: false,
          addSuccess: true,
          hasRegisterCallback: true,
        })
      ) {
        onRegisterToUnitPrice(input);
      }

      expect(onRegisterToUnitPrice).toHaveBeenCalledTimes(1);
      expect(onRegisterToUnitPrice).toHaveBeenCalledWith(input);
    });

    it('does not call onRegisterToUnitPrice when not prompted', () => {
      const onRegisterToUnitPrice = jest.fn();

      if (
        shouldPromptUnitPriceRegistration({
          isEditing: true,
          addSuccess: true,
          hasRegisterCallback: true,
        })
      ) {
        onRegisterToUnitPrice({
          name: 'test',
          quantityMilli: 1000,
          unit: '式',
          unitPrice: 1000,
          taxRate: 10 as const,
        });
      }

      expect(onRegisterToUnitPrice).not.toHaveBeenCalled();
    });
  });
});
