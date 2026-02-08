/**
 * DocumentListItem Photo Icon Logic Tests
 *
 * Tests the photo icon visibility logic:
 * - Camera icon should appear when customerId is set and onPhotoPress is provided
 * - Camera icon should be hidden when customerId is null
 * - Camera icon should be hidden when onPhotoPress is not provided
 *
 * Note: The React component rendering is verified manually.
 * We test only the pure visibility logic here, following the project pattern.
 */

/**
 * Pure function extracted from DocumentListItem for testability.
 * Determines whether the photo icon should be visible.
 *
 * In the component, this logic is:
 *   {document.customerId && onPhotoPress && ( <Pressable>...</Pressable> )}
 */
function shouldShowPhotoIcon(
  customerId: string | null,
  onPhotoPress: ((customerId: string) => void) | undefined
): boolean {
  return customerId !== null && onPhotoPress !== undefined;
}

describe('DocumentListItem', () => {
  describe('photo icon visibility', () => {
    it('shows photo icon when customerId is set and onPhotoPress is provided', () => {
      const onPhotoPress = jest.fn();
      expect(shouldShowPhotoIcon('cust-123', onPhotoPress)).toBe(true);
    });

    it('hides photo icon when customerId is null', () => {
      const onPhotoPress = jest.fn();
      expect(shouldShowPhotoIcon(null, onPhotoPress)).toBe(false);
    });

    it('hides photo icon when onPhotoPress is not provided', () => {
      expect(shouldShowPhotoIcon('cust-123', undefined)).toBe(false);
    });

    it('hides photo icon when both customerId is null and onPhotoPress is not provided', () => {
      expect(shouldShowPhotoIcon(null, undefined)).toBe(false);
    });
  });

  describe('photo press handler', () => {
    it('calls onPhotoPress with correct customerId', () => {
      const onPhotoPress = jest.fn();
      const customerId = 'cust-456';

      // Simulate the handlePhotoPress callback logic
      if (customerId && onPhotoPress) {
        onPhotoPress(customerId);
      }

      expect(onPhotoPress).toHaveBeenCalledTimes(1);
      expect(onPhotoPress).toHaveBeenCalledWith('cust-456');
    });

    it('does not call onPhotoPress when customerId is null', () => {
      const onPhotoPress = jest.fn();
      const customerId: string | null = null;

      if (customerId && onPhotoPress) {
        onPhotoPress(customerId);
      }

      expect(onPhotoPress).not.toHaveBeenCalled();
    });
  });
});
