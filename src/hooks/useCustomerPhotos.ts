/**
 * useCustomerPhotos Hook
 *
 * Manages customer photos (before/after work) for a specific customer.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { CustomerPhoto, PhotoType } from '@/types/customerPhoto';
import {
  getPhotosByCustomer,
  addPhoto as addPhotoService,
  deletePhoto as deletePhotoService,
  updatePhotoWorkLogEntry as updatePhotoWorkLogEntryService,
} from '@/domain/customer';

/**
 * Customer photos state
 */
interface CustomerPhotosState {
  /** All loaded photos for this customer */
  allPhotos: CustomerPhoto[];
  /** Whether photos are loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
}

/**
 * Photos grouped by type
 */
export interface PhotosByType {
  before: CustomerPhoto[];
  after: CustomerPhoto[];
}

export interface UseCustomerPhotosReturn {
  /** Photos taken before work (作業前) */
  beforePhotos: CustomerPhoto[];
  /** Photos taken after work (作業後) */
  afterPhotos: CustomerPhoto[];
  /** Whether photos are loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Add a new photo (requires workLogEntryId) */
  addPhoto: (
    type: PhotoType,
    sourceUri: string,
    workLogEntryId: string,
    originalFilename?: string | null
  ) => Promise<boolean>;
  /** Delete a photo */
  deletePhoto: (photoId: string) => Promise<boolean>;
  /** Get photos by work log entry ID */
  getPhotosByEntry: (entryId: string) => PhotosByType;
  /** Reassign a photo to a different work log entry (workLogEntryId required) */
  reassignPhoto: (photoId: string, workLogEntryId: string) => Promise<boolean>;
  /** Refresh the photos list */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing customer photos
 *
 * @param customerId - Customer ID to load photos for (null = no photos loaded)
 */
export function useCustomerPhotos(customerId: string | null): UseCustomerPhotosReturn {
  const [state, setState] = useState<CustomerPhotosState>({
    allPhotos: [],
    isLoading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!customerId) {
      setState({ allPhotos: [], isLoading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getPhotosByCustomer(customerId);
      if (result.success && result.data) {
        setState({
          allPhotos: result.data,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          allPhotos: [],
          isLoading: false,
          error: result.error?.message ?? '写真の読み込みに失敗しました',
        });
      }
    } catch {
      setState({
        allPhotos: [],
        isLoading: false,
        error: '写真の読み込みに失敗しました',
      });
    }
  }, [customerId]);

  // Load on mount and when customerId changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Memoized filtered photos by type
  const beforePhotos = useMemo(() => {
    return state.allPhotos.filter((photo) => photo.type === 'before');
  }, [state.allPhotos]);

  const afterPhotos = useMemo(() => {
    return state.allPhotos.filter((photo) => photo.type === 'after');
  }, [state.allPhotos]);

  /**
   * Get photos grouped by type for a specific work log entry
   */
  const getPhotosByEntry = useCallback(
    (entryId: string): PhotosByType => {
      const entryPhotos = state.allPhotos.filter(
        (photo) => photo.workLogEntryId === entryId
      );
      return {
        before: entryPhotos.filter((photo) => photo.type === 'before'),
        after: entryPhotos.filter((photo) => photo.type === 'after'),
      };
    },
    [state.allPhotos]
  );

  /**
   * Add a new photo (requires workLogEntryId)
   * @returns true if successful
   */
  const addPhoto = useCallback(
    async (
      type: PhotoType,
      sourceUri: string,
      workLogEntryId: string,
      originalFilename?: string | null
    ): Promise<boolean> => {
      if (!customerId) {
        return false;
      }

      const result = await addPhotoService({
        customerId,
        workLogEntryId,
        type,
        sourceUri,
        originalFilename,
      });

      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [customerId, refresh]
  );

  /**
   * Reassign a photo to a different work log entry (workLogEntryId required)
   * @returns true if successful
   */
  const reassignPhoto = useCallback(
    async (photoId: string, workLogEntryId: string): Promise<boolean> => {
      const result = await updatePhotoWorkLogEntryService(photoId, workLogEntryId);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  /**
   * Delete a photo
   * @returns true if successful
   */
  const deletePhoto = useCallback(
    async (photoId: string): Promise<boolean> => {
      const result = await deletePhotoService(photoId);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  return {
    beforePhotos,
    afterPhotos,
    isLoading: state.isLoading,
    error: state.error,
    addPhoto,
    deletePhoto,
    getPhotosByEntry,
    reassignPhoto,
    refresh,
  };
}
