// Apparence des personnages : tout est paramétrable pour créer de nouveaux personnages.

export type HairStyle = 'short' | 'long' | 'bun';
export type SleeveStyle = 'short' | 'long' | 'none';
export type LegStyle = 'long' | 'capri' | 'shorts';

export interface Character {
  id: string;
  name: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  sleeves: SleeveStyle;
  bottom: string;
  legs: LegStyle;
  shoes: string;
  cheeks: string;
}

export const CHARACTERS: Character[] = [
  {
    id: 'coach',
    name: 'Coach',
    skin: '#E9B88F',
    hair: '#33241C',
    hairStyle: 'short',
    top: '#7E93B6',
    sleeves: 'short',
    bottom: '#26282C',
    legs: 'shorts',
    shoes: '#7C9AE8',
    cheeks: '#F2A28F',
  },
  {
    id: 'senior',
    name: 'Mamie sport',
    skin: '#F2CBA9',
    hair: '#C5C9D2',
    hairStyle: 'bun',
    top: '#F2E4C8',
    sleeves: 'short',
    bottom: '#4E78B8',
    legs: 'long',
    shoes: '#F2CBA9',
    cheeks: '#EFA3A0',
  },
  {
    id: 'sportive',
    name: 'Sportive',
    skin: '#E6B391',
    hair: '#6B4532',
    hairStyle: 'long',
    top: '#2E2F34',
    sleeves: 'short',
    bottom: '#5F7F70',
    legs: 'long',
    shoes: '#C9CCD6',
    cheeks: '#F0A090',
  },
];

export const characterById = (id: string): Character => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
