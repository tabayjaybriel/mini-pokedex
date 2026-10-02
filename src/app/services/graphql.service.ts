import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, startWith } from 'rxjs';
import { DataState } from '../../shared/components/data-state.component';

@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private apiUrl = 'https://beta.pokeapi.co/graphql/v1beta';

  constructor(private http: HttpClient) {}

  // Method to fetch Pokémon data from the GraphQL API. It constructs a GraphQL query with the specified limit and offset, sends a POST request to the API, 
  // and processes the response to extract relevant Pokémon information. The method returns an observable that emits a DataState object representing the 
  // loading, success, error, or empty state of the data fetching operation.
  getPokemon(limit: number, offset: number) {
    const query = `
      query getPokemon($limit: Int, $offset: Int) {
        pokemon_v2_pokemon(limit: $limit, offset: $offset) {
          name
          id
          pokemon_v2_pokemontypes {
            pokemon_v2_type {
              name
            }
          }
          pokemon_v2_pokemonstats {
            base_stat
            pokemon_v2_stat {
              name
            }
          }
          pokemon_v2_pokemonabilities {
            pokemon_v2_ability {
              name
            }
          }
        }
      }
    `;

    // Send a POST request to the GraphQL API with the constructed query and variables (limit and offset). 
    // The response is processed to extract Pokémon data, including name, ID, types, stats, abilities, and total stats. 
    // The method handles different states (loading, success, error, empty) and returns an observable that emits a DataState object representing 
    // the current state of the data fetching operation.
    return this.http.post<any>(this.apiUrl, { query, variables: { limit, offset } }).pipe(
      map(res => {
        const data = (res.data?.pokemon_v2_pokemon ?? []).map((pokemon: any) => {
          const statsMap = (pokemon.pokemon_v2_pokemonstats ?? []).reduce((acc: Record<string, number>, item: any) => {
            const statName = item.pokemon_v2_stat?.name;
            if (statName) acc[statName] = item.base_stat;
            return acc;
          }, {});

          const statValues = Object.values(statsMap as Record<string, number>) as number[];
          const total = statValues.reduce((sum: number, value: number) => sum + value, 0);

          return {
            name: pokemon.name,
            id: pokemon.id,
            sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
            types: (pokemon.pokemon_v2_pokemontypes ?? []).map((entry: any) => entry.pokemon_v2_type?.name).filter(Boolean),
            stats: {
              hp: statsMap.hp ?? 0,
              attack: statsMap.attack ?? 0,
              defense: statsMap.defense ?? 0,
              speed: statsMap.speed ?? 0,
              specialAttack: statsMap['special-attack'] ?? 0,
              specialDefense: statsMap['special-defense'] ?? 0,
            },
            abilities: (pokemon.pokemon_v2_pokemonabilities ?? []).map((entry: any) => entry.pokemon_v2_ability?.name).filter(Boolean),
            total
          };
        });

        if (data.length === 0) {
          return { state: 'empty', message: 'No pokemon found' } as DataState<any>;
        }

        return { state: 'success', data } as DataState<any>;
      }),
      catchError(err => of({ state: 'error', message: err.message } as DataState<any>)),
      startWith({ state: 'loading' } as DataState<any>)
    );
  }
}