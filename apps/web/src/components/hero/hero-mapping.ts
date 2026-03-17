import { DebtItem } from '@/engine/portfolio';
import { HeroAssetType } from '@/components/hero/HeroShowroom';

export function mapDebtToHeroAsset(debt: DebtItem): HeroAssetType {
  const name = debt.name.toLowerCase();

  if (name.includes('semi') || debt.category === 'auto') return 'semiTruck';
  if (name.includes('jet ski') || name.includes('jetski') || debt.category === 'purchase_plan') return 'jetSki';
  if (name.includes('black card') || debt.category === 'credit_card') return 'blackCard';
  if (name.includes('townhouse') || debt.category === 'mortgage' || debt.category === 'land') return 'townhouse';
  return 'jewelry';
}

