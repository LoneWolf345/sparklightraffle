import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Participant, Winner, RaffleConfig } from '@/types/raffle';
import { toast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface SavedDraw {
  id: string;
  draw_id: string;
  created_at: string;
  total_participants: number;
  total_tickets: number;
  is_locked: boolean;
  config: RaffleConfig;
  winner_count: number;
}

export function useRafflePersistence() {
  const saveDraw = useCallback(async (
    drawId: string,
    participants: Participant[],
    winners: Winner[],
    config: RaffleConfig,
    seed: string,
    datasetChecksum: string,
    isLocked: boolean
  ): Promise<string | null> => {
    try {
      // First, check if draw already exists
      const { data: existing } = await supabase
        .from('raffle_draws')
        .select('id')
        .eq('draw_id', drawId)
        .maybeSingle();

      let drawUuid: string;

      if (existing) {
        // Update existing draw
        drawUuid = existing.id;
        const { error: updateError } = await supabase
          .from('raffle_draws')
          .update({
            config: config as unknown as Json,
            is_locked: isLocked,
          })
          .eq('id', drawUuid);

        if (updateError) throw updateError;

        // Delete existing winners and re-insert
        await supabase
          .from('raffle_winners')
          .delete()
          .eq('raffle_draw_id', drawUuid);
      } else {
        // Insert new draw
        const { data: newDraw, error: insertError } = await supabase
          .from('raffle_draws')
          .insert({
            draw_id: drawId,
            dataset_checksum: datasetChecksum,
            seed,
            config: config as unknown as Json,
            total_participants: participants.length,
            total_tickets: participants.reduce((sum, p) => sum + p.entries, 0),
            participants: participants as unknown as Json,
            is_locked: isLocked,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        drawUuid = newDraw.id;
      }

      // Insert winners
      if (winners.length > 0) {
        const winnerRows = winners.map(w => ({
          raffle_draw_id: drawUuid,
          draw_number: w.drawNumber,
          name: w.participant.name,
          email: w.participant.email,
          entries: w.participant.entries,
          is_bonus_prize: w.isBonusPrize || false,
          drawn_at: w.timestamp.toISOString(),
        }));

        const { error: winnersError } = await supabase
          .from('raffle_winners')
          .insert(winnerRows);

        if (winnersError) throw winnersError;
      }

      return drawUuid;
    } catch (error) {
      console.error('Error saving draw:', error);
      toast({
        title: 'Error Saving Draw',
        description: 'Failed to save draw to database',
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  const loadDraws = useCallback(async (): Promise<SavedDraw[]> => {
    try {
      const { data: draws, error } = await supabase
        .from('raffle_draws')
        .select(`
          id,
          draw_id,
          created_at,
          total_participants,
          total_tickets,
          is_locked,
          config,
          raffle_winners(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (draws || []).map(d => ({
        id: d.id,
        draw_id: d.draw_id,
        created_at: d.created_at,
        total_participants: d.total_participants,
        total_tickets: d.total_tickets,
        is_locked: d.is_locked,
        config: d.config as unknown as RaffleConfig,
        winner_count: (d.raffle_winners as unknown as { count: number }[])?.[0]?.count || 0,
      }));
    } catch (error) {
      console.error('Error loading draws:', error);
      return [];
    }
  }, []);

  const loadDraw = useCallback(async (id: string): Promise<{
    participants: Participant[];
    winners: Winner[];
    config: RaffleConfig;
    seed: string;
    drawId: string;
    datasetChecksum: string;
    isLocked: boolean;
  } | null> => {
    try {
      const { data: draw, error: drawError } = await supabase
        .from('raffle_draws')
        .select('*')
        .eq('id', id)
        .single();

      if (drawError) throw drawError;

      const { data: winnerRows, error: winnersError } = await supabase
        .from('raffle_winners')
        .select('*')
        .eq('raffle_draw_id', id)
        .order('draw_number', { ascending: true });

      if (winnersError) throw winnersError;

      const participants = draw.participants as unknown as Participant[];
      
      const winners: Winner[] = (winnerRows || []).map(w => {
        const participant = participants.find(p => p.email === w.email) || {
          id: w.email, // Use email as fallback id
          name: w.name,
          email: w.email,
          entries: w.entries,
        };
        return {
          participant,
          drawNumber: w.draw_number,
          timestamp: new Date(w.drawn_at),
          isBonusPrize: w.is_bonus_prize,
        };
      });

      return {
        participants,
        winners,
        config: draw.config as unknown as RaffleConfig,
        seed: draw.seed,
        drawId: draw.draw_id,
        datasetChecksum: draw.dataset_checksum,
        isLocked: draw.is_locked,
      };
    } catch (error) {
      console.error('Error loading draw:', error);
      toast({
        title: 'Error Loading Draw',
        description: 'Failed to load draw from database',
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  const deleteDraw = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('raffle_draws')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting draw:', error);
      toast({
        title: 'Error Deleting Draw',
        description: 'Failed to delete draw from database',
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  return {
    saveDraw,
    loadDraws,
    loadDraw,
    deleteDraw,
  };
}
