import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuditLogParams {
  actionType: string;
  entityType: string;
  entityId?: string | null;
  detailsJson?: Record<string, any> | null;
}

export function useAuditLog() {
  // Log an action using the database function
  const logAction = useCallback(async (
    entraUserId: string | null,
    params: AuditLogParams
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('log_action', {
        p_user_id: entraUserId,
        p_action_type: params.actionType,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId || null,
        p_details_json: params.detailsJson || null,
      });

      if (error) {
        console.error('Error logging action:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Error logging action:', error);
      return null;
    }
  }, []);

  // Common action types for convenience
  const logLogin = useCallback(async (
    entraUserId: string,
    details?: Record<string, any>
  ) => {
    return logAction(entraUserId, {
      actionType: 'LOGIN',
      entityType: 'session',
      detailsJson: details,
    });
  }, [logAction]);

  const logDrawCreated = useCallback(async (
    entraUserId: string | null,
    drawId: string,
    details?: Record<string, any>
  ) => {
    return logAction(entraUserId, {
      actionType: 'DRAW_CREATED',
      entityType: 'raffle_draw',
      entityId: drawId,
      detailsJson: details,
    });
  }, [logAction]);

  const logDrawLocked = useCallback(async (
    entraUserId: string | null,
    drawId: string,
    details?: Record<string, any>
  ) => {
    return logAction(entraUserId, {
      actionType: 'DRAW_LOCKED',
      entityType: 'raffle_draw',
      entityId: drawId,
      detailsJson: details,
    });
  }, [logAction]);

  const logWinnerDrawn = useCallback(async (
    entraUserId: string | null,
    drawId: string,
    winnerId: string,
    details?: Record<string, any>
  ) => {
    return logAction(entraUserId, {
      actionType: 'WINNER_DRAWN',
      entityType: 'raffle_winner',
      entityId: winnerId,
      detailsJson: { ...details, draw_id: drawId },
    });
  }, [logAction]);

  const logUserRoleChanged = useCallback(async (
    entraUserId: string | null,
    targetUserId: string,
    oldRole: string | null,
    newRole: string,
    details?: Record<string, any>
  ) => {
    return logAction(entraUserId, {
      actionType: 'ROLE_CHANGED',
      entityType: 'user_role',
      entityId: targetUserId,
      detailsJson: { ...details, old_role: oldRole, new_role: newRole },
    });
  }, [logAction]);

  return {
    logAction,
    logLogin,
    logDrawCreated,
    logDrawLocked,
    logWinnerDrawn,
    logUserRoleChanged,
  };
}
