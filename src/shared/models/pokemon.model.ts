// Model for a Pokémon entity
export interface Pokemon {
  name: string;
  id: number;
  types: string[];
  sprite: string;
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    specialAttack: number;
    specialDefense: number;
  };
  abilities: string[];
  total: number;
}

// Model for a Team entity, which consists of an ID, name, and an array of Pokémon members
export interface Team {
  id: string;
  name: string;
  members: Pokemon[];
}