export type PrizeDisplayType = 'text' | 'image' | 'both';

export interface Prize {
  id: string;
  text?: string;
  imageUrl?: string;
  displayType: PrizeDisplayType;
}

export type PrizeMode = 'same' | 'sequential';

export interface PrizeConfig {
  mode: PrizeMode;
  samePrize?: Prize; // Used when mode is 'same'
  sequentialPrizes?: Prize[]; // Used when mode is 'sequential'
}

export const getDefaultPrizeConfig = (): PrizeConfig => ({
  mode: 'same',
  samePrize: {
    id: crypto.randomUUID(),
    text: '$250 Gift Card',
    displayType: 'text',
  },
  sequentialPrizes: [],
});

export const getPrizeForWinner = (config: PrizeConfig | null, winnerIndex: number): Prize | null => {
  if (!config) return null;
  
  if (config.mode === 'same' && config.samePrize) {
    return config.samePrize;
  }
  
  if (config.mode === 'sequential' && config.sequentialPrizes) {
    // Return the prize at the winner's index, or the last prize if we've run out
    const prizes = config.sequentialPrizes;
    if (prizes.length === 0) return null;
    const index = Math.min(winnerIndex, prizes.length - 1);
    return prizes[index];
  }
  
  return null;
};
