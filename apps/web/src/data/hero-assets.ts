import type { Domain } from '@/stores/financial-store';

export type HeroId = Domain | 'vault';
export interface HeroAsset {
  id: HeroId;
  label: string;
  poster: string;
  model: string;
  alt: string;
  credit?: { name: string; url: string };
}

// Posters are generated product references. GLBs are independently authored geometry.
export const heroAssets: Record<HeroId, HeroAsset> = {
  car: { id: 'car', label: 'Auto', poster: '/heroes/car.webp', model: '/heroes/car.glb', alt: 'Crimson touring coupe with machined alloy wheels', credit: { name: '3D: Eric Chadwick / DGG, CC BY 4.0, adapted', url: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept' } },
  house: { id: 'house', label: 'House', poster: '/heroes/house.webp', model: '/heroes/house.glb', alt: 'Limestone family home with warm windows and landscaping' },
  land: { id: 'land', label: 'Land', poster: '/heroes/land.webp', model: '/heroes/land.glb', alt: 'Green land parcel with trees, a path and exposed soil layers' },
  creditCard: { id: 'creditCard', label: 'Credit Card', poster: '/heroes/creditCard.webp', model: '/heroes/creditCard.glb', alt: 'Brushed platinum and emerald payment cards' },
  studentLoan: { id: 'studentLoan', label: 'Student Loan', poster: '/heroes/studentLoan.webp', model: '/heroes/studentLoan.glb', alt: 'Graduation cap, leather books and a ribbon-tied diploma' },
  medical: { id: 'medical', label: 'Medical', poster: '/heroes/medical.webp', model: '/heroes/medical.glb', alt: 'White medical case and chrome stethoscope' },
  personal: { id: 'personal', label: 'Personal', poster: '/heroes/personal.webp', model: '/heroes/personal.glb', alt: 'Stitched leather satchel and silver key' },
  recreation: { id: 'recreation', label: 'Recreation', poster: '/heroes/recreation.webp', model: '/heroes/recreation.glb', alt: 'Teal and white sailboat with detailed rigging' },
  custom: { id: 'custom', label: 'Custom', poster: '/heroes/custom.webp', model: '/heroes/custom.glb', alt: 'Precision titanium compass with emerald and red needles' },
  vault: { id: 'vault', label: 'Vault', poster: '/heroes/vault.webp', model: '/heroes/vault.glb', alt: 'Brushed steel vault with a precision locking door' },
};
