import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged, map, shareReplay } from 'rxjs';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GraphqlService } from '../../app/services/graphql.service';
import { DataState } from '../../shared/components/data-state.component';
import { Pokemon, Team } from '../../shared/models/pokemon.model';

// The PokemonStore is an injectable service that manages the state of Pokémon data, search terms, type filters, and teams. It provides observables for the 
// current state of Pokémon, filtered Pokémon based on search and type, and the list of teams. It also handles loading Pokémon data from the GraphQL API, 
// creating and deleting teams, and adding/removing Pokémon from teams.
@Injectable({ providedIn: 'root' })
export class PokemonStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly stateSubject = new BehaviorSubject<DataState<Pokemon[]>>({ state: 'loading' });
  private readonly teamsSubject = new BehaviorSubject<Team[]>(this.readTeamsFromStorage());
  private readonly searchTermSubject = new BehaviorSubject('');
  private readonly typeFilterSubject = new BehaviorSubject('all');

  readonly pokemonState$ = this.stateSubject.asObservable().pipe(shareReplay(1));
  readonly searchTerm$ = this.searchTermSubject.asObservable().pipe(debounceTime(300), distinctUntilChanged(), shareReplay(1));
  readonly typeFilter$ = this.typeFilterSubject.asObservable().pipe(distinctUntilChanged(), shareReplay(1));
  readonly teams$ = this.teamsSubject.asObservable().pipe(shareReplay(1));

  // Observable that combines the Pokémon state, search term, and type filter to produce a filtered list of Pokémon based on the current search and filter criteria. It uses distinctUntilChanged to avoid emitting duplicate values and shareReplay to cache the latest emitted value for new subscribers.
  readonly filteredPokemons$ = combineLatest([
    this.pokemonState$.pipe(map(state => (state.state === 'success' ? state.data : []))),
    this.searchTerm$,
    this.typeFilter$
  ]).pipe(
    map(([pokemonList, term, type]) => {
      const normalized = term.trim().toLowerCase();
      let result = [...pokemonList];

      if (normalized) {
        result = result.filter(p => p.name.toLowerCase().includes(normalized));
      }

      if (type !== 'all') {
        result = result.filter(p => p.types.includes(type));
      }

      return result;
    }),
    distinctUntilChanged((prev, next) => JSON.stringify(prev) === JSON.stringify(next)),
    shareReplay(1)
  );

  // Observable that emits the names of all teams, ensuring that the emitted value is distinct and cached for new subscribers. It uses distinctUntilChanged to 
  // avoid emitting duplicate values and shareReplay to cache the latest emitted value for new subscribers.
  readonly teamNames$ = this.teams$.pipe(
    map(teams => teams.map(team => team.name)),
    distinctUntilChanged((prev, next) => JSON.stringify(prev) === JSON.stringify(next)),
    shareReplay(1)
  );

  // Constructor that injects the GraphqlService and initializes the store by loading Pokémon data and persisting teams to local storage.
  constructor(private graphql: GraphqlService) {
    this.persistTeams();
  }

  // Method to load Pokémon data from the GraphQL API. It sets the state to 'loading', calls the GraphqlService to fetch Pokémon data, and updates 
  // the state based on the response. It uses takeUntilDestroyed to automatically unsubscribe when the service is destroyed.
  loadPokemon(limit: number, offset: number) {
    this.stateSubject.next({ state: 'loading' });

    this.graphql.getPokemon(limit, offset)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => this.stateSubject.next(state));
  }

  // Method to set the search term for filtering Pokémon. It updates the searchTermSubject with the provided term, which will trigger the filteredPokemons$ 
  // observable to emit a new filtered list based on the updated search term.
  setSearch(term: string) {
    this.searchTermSubject.next(term);
  }

  // Method to set the type filter for filtering Pokémon. It updates the typeFilterSubject with the provided type, which will trigger the filteredPokemons$ 
  // observable to emit a new filtered list based on the updated type filter.
  setTypeFilter(type: string) {
    this.typeFilterSubject.next(type || 'all');
  }

  // Method to create a new team with the specified name and members. It checks for a valid team name, ensures uniqueness, creates an optimistic team object, 
  // updates the teams state, and persists the changes to local storage. It returns the newly created team.
  createTeam(name: string, members: Pokemon[]) {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Team name is required');
    }

    const exists = this.teamsSubject.value.some(team => team.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      throw new Error('Team name must be unique');
    }

    const optimisticTeam: Team = {
      id: crypto.randomUUID(),
      name: trimmed,
      members: members.slice(0, 6)
    };

    this.teamsSubject.next([optimisticTeam, ...this.teamsSubject.value]);
    this.persistTeams();
    return optimisticTeam;
  }

  // Method to delete a team by its ID. It filters out the specified team from the teams state, updates the teams state, and persists the changes to local 
  // storage.
  deleteTeam(id: string) {
    const next = this.teamsSubject.value.filter(team => team.id !== id);
    this.teamsSubject.next(next);
    this.persistTeams();
  }

  // Method to add a Pokémon to a specific team. It takes the team ID and Pokémon object as parameters, checks if the team exists and if the Pokémon is 
  // already in the team, and then adds the Pokémon to the team's members if possible. After updating, it persists the changes to local storage.
  addToTeam(teamId: string, pokemon: Pokemon) {
    const next = this.teamsSubject.value.map(team => {
      if (team.id !== teamId) return team;
      if (team.members.length >= 6) return team;
      const alreadySelected = team.members.some(member => member.id === pokemon.id);
      if (alreadySelected) return team;
      return { ...team, members: [...team.members, pokemon] };
    });

    this.teamsSubject.next(next);
    this.persistTeams();
  }

  // Method to remove a Pokémon from a specific team. It takes the team ID and Pokémon ID as parameters, filters out the specified Pokémon from the team's 
  // members, and updates the teams state. After updating, it persists the changes to local storage.
  removeFromTeam(teamId: string, pokemonId: number) {
    const next = this.teamsSubject.value.map(team => {
      if (team.id !== teamId) return team;
      return { ...team, members: team.members.filter(member => member.id !== pokemonId) };
    });

    this.teamsSubject.next(next);
    this.persistTeams();
  }

  // Private method to read the list of teams from local storage. It attempts to parse the stored JSON string and return an array of Team objects. If parsing 
  // fails or no data is found, it returns an empty array.
  private readTeamsFromStorage(): Team[] {
    try {
      const raw = localStorage.getItem('mini-pokedex-teams');
      return raw ? JSON.parse(raw) as Team[] : [];
    } catch {
      return [];
    }
  }

  private persistTeams() {
    localStorage.setItem('mini-pokedex-teams', JSON.stringify(this.teamsSubject.value));
  }
}