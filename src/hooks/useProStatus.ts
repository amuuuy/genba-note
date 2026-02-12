/**
 * useProStatus Hook
 *
 * React hook for checking Pro subscription status with user-friendly error handling.
 * Provides loading state, error messages, and refresh capability.
 */

import { useState, useCallback, useEffect } from 'react';
import { checkProStatus } from '@/subscription/proAccessService';
import type { ProGateReason } from '@/subscription/types';
import { getProGateMessage } from '@/constants/errorMessages';

export interface UseProStatusReturn {
  /** Whether the user has Pro access */
  isPro: boolean;
  /** Whether the status is being loaded/refreshed */
  isLoading: boolean;
  /** User-friendly error/status message (null if Pro) */
  message: string | null;
  /** The raw Pro gate reason */
  reason: ProGateReason | null;
  /** Whether online verification is required */
  requiresOnlineVerification: boolean;
  /** Refresh the Pro status */
  refresh: () => Promise<void>;
}

/**
 * Determines if a reason requires online verification
 *
 * Must match logic in subscription/offlineValidationService.ts
 * All failure reasons require online verification.
 */
function needsOnlineVerification(reason: ProGateReason): boolean {
  // Only success reasons do NOT require online verification
  const successReasons: ProGateReason[] = [
    'online_verified',
    'offline_grace_period',
    'placeholder_always_true',
    'development_mode',
  ];
  return !successReasons.includes(reason);
}

/**
 * Hook for checking Pro subscription status
 *
 * @returns Pro status state and controls
 */
export function useProStatus(): UseProStatusReturn {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reason, setReason] = useState<ProGateReason | null>(null);

  // Check Pro status
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await checkProStatus();
      setIsPro(result.isPro);
      setReason(result.reason);
    } catch (error) {
      // On error, assume not Pro
      setIsPro(false);
      setReason('cache_missing');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Compute derived values
  // Special case: online_verified with isPro=false means verified as non-subscriber
  // In this case, show entitlement_inactive message instead of "Pro is active"
  const effectiveReason =
    !isPro && reason === 'online_verified' ? 'entitlement_inactive' : reason;
  const message = !isPro && effectiveReason ? getProGateMessage(effectiveReason) : null;
  const requiresOnlineVerification = reason ? needsOnlineVerification(reason) : false;

  return {
    isPro,
    isLoading,
    message,
    reason,
    requiresOnlineVerification,
    refresh: checkStatus,
  };
}
