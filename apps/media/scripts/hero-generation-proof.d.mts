export type HeroId = 'car' | 'house' | 'land' | 'creditCard' | 'studentLoan' |
  'medical' | 'personal' | 'recreation' | 'custom' | 'vault';
export interface FileFingerprint { path: string; bytes: number; sha256: string }
export interface HeroInput {
  id: HeroId; model: string; preparedModel: string; renderModel: string;
}
export interface ExpectedInputs {
  type: 'hero-turntables-inputs'; version: 2; outputParent: string;
  heroes: HeroInput[]; files: string[]; runtimeTrees: string[];
}
export interface GenerationReceipt {
  type: 'hero-generation'; version: 2; generation: string; inputs: FileFingerprint[];
  runtime: { path: string; files: FileFingerprint[] }[];
  heroes: { id: HeroId; model: string; video: FileFingerprint }[];
}
export type Producer = (outputs: readonly Readonly<{ id: HeroId; path: string }>[]) => Promise<void>;
export function expectedInputs(ids: HeroId[]): ExpectedInputs;
export function recordGeneration(root: string, expected: ExpectedInputs, produce: Producer): Promise<GenerationReceipt>;
export function verifyGeneration(root: string, expected: ExpectedInputs, receipt: unknown): Promise<true>;
