import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, of, take } from 'rxjs';
import { PokemonStore } from '../pokedex/state/pokemon.store';
import { DataState, DataStateComponent } from '../shared/components/data-state.component';
import { Pokemon, Team } from '../shared/models/pokemon.model';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';


// The AppComponent is the main component of the Mini-Pokedex application. It manages the state of Pokémon data, search terms, type filters, pagination,
// and team creation. It interacts with the PokemonStore to fetch and filter Pokémon data, handle user interactions, and manage the selected team.
// this is where I put everything from the pokemon-table.component.ts because I need to manage the state of the selected team and handle adding Pokémon to 
// the team. for me it makes it easier to manage the state of the selected team and handle adding Pokémon to the team.

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule, DataStateComponent, DragDropModule],
  template: `
    <header style="background:#FFDE00 ;color:white;padding:25px;text-align:center;">
      <h1 style="margin:0;font-size:48px; color:#FF0000;">MINI-POKEDEX APPLICATION</h1>
    </header>

    <div style="padding:20px;background:#ecf0f1;min-height:100vh;display:grid;grid-template-columns:1.8fr .9fr;gap:20px;">
      <section style="background:white;border:3px solid #3B4CCA;border-radius:12px;padding:16px;">
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:16px;">
          <input
            list="pokemon-suggestions"
            [value]="searchTerm()"
            (input)="onSearch($any($event.target).value)"
            placeholder="Search Pokémon by name"
            style="padding:10px;border:2px solid #3B4CCA;border-radius:8px;width:260px;"
          />

          <select
            [value]="typeFilter()"
            (change)="onTypeChange($any($event.target).value)"
            style="padding:10px;border:2px solid #3B4CCA;border-radius:8px;background:white;min-width:160px;"
          >
            <option value="all">All types</option>
            @for (type of typeOptions(); track type) {
              <option [value]="type">{{ type }}</option>
            }
          </select>

          <select
            [value]="pageSize()"
            (change)="pageSize.set(+$any($event.target).value); pageIndex.set(0);"
            style="padding:10px;border:2px solid #3B4CCA;border-radius:8px;background:white;min-width:120px;"
          >
            <option [value]="10">10</option>
            <option [value]="25">25</option>
            <option [value]="50">50</option>
          </select>
        </div>

        <datalist id="pokemon-suggestions">
          @for (pokemon of pokemonList(); track pokemon.id) {
            <option [value]="pokemon.name"></option>
          }
        </datalist>

        <app-data-state [state]="state()">
          @if (state().state === 'success') {
            <table
              cdkDropList
              id="pokemon-list"
              [cdkDropListData]="paginatedPokemons()"
              [cdkDropListConnectedTo]="connectedTeamDropListIds()"
              [cdkDropListSortingDisabled]="true"
              style="width:100%;border-collapse:collapse;background:white;"
            >
              <thead>
                <tr style="background:#27ae60;color:white;">
                  <th>No.</th>
                  <th>Sprite</th>
                  <th (click)="sortBy('name')" style="cursor:pointer;">Name</th>
                  <th>Types</th>
                  <th (click)="sortBy('hp')" style="cursor:pointer;">HP</th>
                  <th (click)="sortBy('attack')" style="cursor:pointer;">Attack</th>
                  <th (click)="sortBy('defense')" style="cursor:pointer;">Defense</th>
                  <th (click)="sortBy('specialAttack')" style="cursor:pointer;">Sp.Atk</th>
                  <th (click)="sortBy('specialDefense')" style="cursor:pointer;">Sp.Def</th>
                  <th (click)="sortBy('speed')" style="cursor:pointer;">Speed</th>
                  <th >Abilities</th>
                  
                  <th (click)="sortBy('total')" style="cursor:pointer;">Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                @for (pokemon of paginatedPokemons(); track pokemon.id) {
                  <tr (click)="selectPokemon(pokemon)" style="cursor:pointer;border-bottom:1px solid #eaf3ea;">
                    <td>{{ paginatedPokemons().indexOf(pokemon) + 1 }}</td>
                    <td>
                      <img
                        cdkDrag
                        [cdkDragData]="pokemon"
                        (click)="$event.stopPropagation()"
                        [src]="pokemon.sprite"
                        [alt]="pokemon.name"
                        style="width:42px;height:42px;cursor:grab;"
                      />
                    </td>
                    <td>{{ pokemon.name }}</td>
                    <td>
                      @for (type of pokemon.types; track type) {
                        <span style="display:inline-block;background:#eafaf1;color:#1d5d3b;padding:4px 8px;border-radius:999px;margin:2px;font-size:12px;">{{ type }}</span>
                      }
                    </td>
                    <td>{{ pokemon.stats.hp }}</td>
                    <td>{{ pokemon.stats.attack }}</td>
                    <td>{{ pokemon.stats.defense }}</td>
                    <td>{{ pokemon.stats.specialAttack }}</td>
                    <td>{{ pokemon.stats.specialDefense }}</td>
                    <td>{{ pokemon.stats.speed }}</td>
                    <td>
                      @for (ability of pokemon.abilities; track ability) {
                        <span style="display:inline-block;background:#eafaf1;color:#1d5d3b;padding:4px 8px;border-radius:999px;margin:2px;font-size:12px;">{{ ability }}</span>
                      }
                    </td>

                    <td>{{ pokemon.total }}</td>
                    <td>
                      <button
                        type="button"
                        (click)="$event.stopPropagation(); addToSelectedTeam(pokemon)"
                        [disabled]="isPokemonInSelectedTeam(pokemon) || selectedMembers().length >= 6"
                        [style.opacity]="isPokemonInSelectedTeam(pokemon) || selectedMembers().length >= 6 ? 0.6 : 1"
                        style="background:#27ae60;color:white;border:none;padding:6px 12px;border-radius:5px;cursor:pointer;"
                      >
                        {{ isPokemonInSelectedTeam(pokemon) ? 'Added' : (selectedMembers().length >= 6 ? 'Full' : 'Add') }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;">
              <button type="button" (click)="decrementPage()" [disabled]="pageIndex()===0" style="padding:8px 12px;border:1px solid #27ae60;border-radius:8px;background:white;color:#27ae60;cursor:pointer;">Prev</button>
              <span>Page {{ pageIndex() + 1 }} / {{ totalPages() }}</span>
              <button type="button" (click)="incrementPage()" [disabled]="pageIndex() >= totalPages()-1" style="padding:8px 12px;border:1px solid #27ae60;border-radius:8px;background:white;color:#27ae60;cursor:pointer;">Next</button>
            </div>
          }
        </app-data-state>
      </section>

      <aside style="background:white;border:3px solid #3B4CCA;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:16px;">
        <div>
          <h3 style="margin:0 0 12px;color:#27ae60;">Create team</h3>
          <form [formGroup]="teamForm" (ngSubmit)="submitTeam()" novalidate style="display:flex;flex-direction:column;gap:12px;">
            <label style="display:flex;flex-direction:column;gap:6px;font-weight:600;">
              Team name
              <input formControlName="teamName" placeholder="e.g. Elite Squad" style="padding:10px;border:2px solid #27ae60;border-radius:8px;" />
            </label>

            @if (teamForm.controls.teamName.touched && teamForm.controls.teamName.invalid) {
              <div style="color:#d93025;font-size:12px;">
                @if (teamForm.controls.teamName.hasError('required')) { Team name is required. }
                @if (teamForm.controls.teamName.hasError('minlength')) { Team name must be at least 3 characters. }
                @if (teamForm.controls.teamName.hasError('maxlength')) { Team name must be at most 30 characters. }
                @if (teamForm.controls.teamName.hasError('duplicateTeamName')) { Team name must be unique. }
              </div>
            }
           

            <datalist id="add-pokemon-suggestions">
              @for (pokemon of pokemonList(); track pokemon.id) {
                <option [value]="pokemon.name"></option>
              }
            </datalist>

            <div
              cdkDropList
              id="team-builder"
              [cdkDropListData]="selectedMembers()"
              [cdkDropListConnectedTo]="['pokemon-list']"
              [cdkDropListSortingDisabled]="true"
              (cdkDropListDropped)="onDropToTeam($event)"
              style="display:flex;flex-wrap:wrap;gap:8px;min-height:150px;padding:10px;border:2px dashed #27ae60;border-radius:10px;background:#f5fff8;"
            >
              @if (selectedMembers().length === 0) {
                <span style="color:#5d6d5d;">Drag a Pokémon here to add it to your team.</span>
              }

              @for (pokemon of selectedMembers(); track pokemon.id) {
                <span style="display:inline-flex;align-items:center;gap:8px;background:#eafaf1;color:#1d5d3b;padding:6px 10px;border-radius:999px;">
                  {{ pokemon.name }}
                  <button type="button" (click)="removeSelectedMember(pokemon.id)" style="border:none;background:none;color:#1d5d3b;cursor:pointer;font-weight:bold;">×</button>
                </span>
              }
            </div>

            @if (teamFeedback()) {
              <div style="color:#d93025;font-size:12px;">{{ teamFeedback() }}</div>
            }

            <button type="submit" [disabled]="teamForm.invalid || selectedMembers().length === 0" style="padding:10px 14px;border:none;border-radius:8px;background:#27ae60;color:white;cursor:pointer;font-weight:700;">
              Create team
            </button>
          </form>
        </div>

        <div>
          <h3 style="margin:0 0 12px;color:#27ae60;">Saved teams</h3>
          @if (teams().length === 0) {
            <p style="color:#555;">No teams yet.</p>
          } @else {
            @for (team of teams(); track team.id) {
              <div style="border:1px solid #dfeadf;padding:12px;border-radius:10px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                  <strong>{{ team.name }}</strong>
                  <button type="button" (click)="deleteTeam(team.id)" style="border:none;background:#d93025;color:white;padding:4px 8px;border-radius:5px;cursor:pointer;">Delete</button>
                </div>
                <div
                  cdkDropList
                  [id]="'team-' + team.id"
                  [cdkDropListData]="team.members"
                  [cdkDropListConnectedTo]="['pokemon-list']"
                  [cdkDropListSortingDisabled]="true"
                  (cdkDropListDropped)="onDropToSavedTeam($event, team.id)"
                  style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;min-height:36px;padding:6px;border:1px dashed #dfeadf;border-radius:8px;"
                >
                  @for (member of team.members; track member.id) {
                    <span style="display:inline-block;background:#ecf0f1;padding:4px 8px;border-radius:999px;font-size:12px;">{{ member.name }}</span>
                  }
                  @if (team.members.length === 0) {
                    <span style="color:#666;font-size:12px;">Drop Pokémon here</span>
                  }
                </div>
              </div>
            }
          }
        </div>
      </aside>
    </div>

    @if (panelOpen() && selectedPokemon()) {
     <div style=" 
        position:fixed;
        left:50%;
        top:50%;
        transform:translate(-50%,-50%);
        width:360px;
        max-height:90vh;
        background:#fff;
        border:3px solid #27ae60;
        border-radius:12px;
        box-shadow:0 8px 24px rgba(0,0,0,.25);
        padding:20px;
        overflow-y:auto;
      ">

        <div style="display:flex;justify-content:end;align-items:center;margin-bottom:16px;">
         
          <button type="button" (click)="panelOpen.set(false)" style="border:none;background:#d93025;color:white;border-radius:999px;width:28px;height:28px;cursor:pointer;">×</button>
        </div>

        <img [src]="selectedPokemon()?.sprite" [alt]="selectedPokemon()?.name" style="width:150px;height:150px;display:block;margin:0 auto 16px; border:1px solid #27ae60; 
        border-radius:8px;" />

          <div style=" text-align:center; margin-bottom:20px; padding:16px; background:linear-gradient(135deg,#f4fff7,#eafaf1);
            border-radius:14px; border:1px solid #d5eadb; "> 
            <h2 style=" margin:0 0 10px; color:#1d5d3b; font-size:24px; font-weight:700; 
            text-transform:capitalize; "> {{ selectedPokemon()?.name }} </h2> 
            
            <div style=" display:flex; justify-content:center; align-items:center; 
            flex-wrap:wrap; gap:8px; "> 
            
            @for (type of selectedPokemon()?.types ?? []; track type) { <span style=" background:#27ae60; color:white; 
            padding:6px 14px; border-radius:999px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; 
            box-shadow:0 2px 5px rgba(39,174,96,.2); "> {{ type }} </span> } 
            </div> 
            </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:#f4f7f4;padding:8px;border-radius:8px; text-align:center; border:1px solid #ddd;"><strong>HP</strong><div>{{ selectedPokemon()?.stats.hp }}</div></div>
          <div style="background:#f4f7f4;padding:8px;border-radius:8px; text-align:center; border:1px solid #ddd;"><strong>Attack</strong><div>{{ selectedPokemon()?.stats.attack }}</div></div>
          <div style="background:#f4f7f4;padding:8px;border-radius:8px; text-align:center; border:1px solid #ddd;"><strong>Defense</strong><div>{{ selectedPokemon()?.stats.defense }}</div></div>
          <div style="background:#f4f7f4;padding:8px;border-radius:8px; text-align:center; border:1px solid #ddd;"><strong>Speed</strong><div>{{ selectedPokemon()?.stats.speed }}</div></div>
          <div style="background:#f4f7f4;padding:8px;border-radius:8px; text-align:center; border:1px solid #ddd;"><strong>Sp.Atk</strong><div>{{ selectedPokemon()?.stats.specialAttack }}</div></div>
          <div style="background:#f4f7f4;padding:8px;border-radius:8px; text-align:center; border:1px solid #ddd;"><strong>Sp.Def</strong><div>{{ selectedPokemon()?.stats.specialDefense }}</div></div>
        </div>
        


        <div style=" text-align:center; margin-top:20px; margin-bottom:20px; padding:16px; background:linear-gradient(135deg,#f4fff7,#eafaf1);
            border-radius:14px; border:1px solid #d5eadb; "> 
            <h3 style=" margin:0 0 10px; color:#1d5d3b; font-size:20px; font-weight:700; text-transform:capitalize; "> Total Stats: {{ selectedPokemon()?.total }} </h3>
            <hr>
                    
            <h4 style="margin:0 0 10px; color:#1d5d3b; font-size:24px; font-weight:700;">Abilities</h4>

            <div style=" display:flex; justify-content:center; align-items:center; 
              flex-wrap:wrap; gap:8px;"> 
              
                  @for (ability of selectedPokemon()?.abilities ?? []; track ability) { <span style=" background:#27ae60; color:white; 
                  padding:6px 14px; border-radius:999px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; 
                  box-shadow:0 2px 5px rgba(39,174,96,.2); "> {{ ability }} </span> } 
                    
                  
             
            </div>
        </div>

        <button
          type="button"
          (click)="addToSelectedTeam(selectedPokemon()!)"
          [disabled]="!selectedPokemon() || isPokemonInSelectedTeam(selectedPokemon()!) || selectedMembers().length >= 6"
          style="margin-top:16px;width:100%;padding:10px;border:none;background:#27ae60;color:white;border-radius:8px;cursor:pointer;"
        >
          {{ !selectedPokemon() ? 'No Pokémon selected' : isPokemonInSelectedTeam(selectedPokemon()!) ? 'Already added to team' : (selectedMembers().length >= 6 ? 'Team is full' : 'Add to selected team') }}
        </button>
      </div>
    }
  `
})

// The main application component that manages the Pokémon list, team creation, and saved teams.
export class AppComponent implements OnInit {
  private readonly store = inject(PokemonStore);
  private readonly fb = inject(FormBuilder);

  readonly pokemonList = toSignal(this.store.filteredPokemons$, { initialValue: [] as Pokemon[] });
  readonly state = toSignal(this.store.pokemonState$, { initialValue: { state: 'loading' } as DataState<Pokemon[]> });
  readonly teams = toSignal(this.store.teams$, { initialValue: [] as Team[] });

  readonly searchTerm = signal('');
  readonly typeFilter = signal('all');
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0);
  readonly pickerValue = signal('');
  readonly selectedMembers = signal<Pokemon[]>([]);
  readonly connectedTeamDropListIds = computed(() => [
    'team-builder',
    ...this.teams().map(team => `team-${team.id}`)
  ]);
  readonly selectedPokemon = signal<Pokemon | null>(null);
  readonly panelOpen = signal(false);
  readonly teamFeedback = signal('');
  readonly sortKey = signal<keyof Pokemon['stats'] | 'name' | 'total'>('total');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly typeOptions = computed(() => {
    const list = this.pokemonList();
    return [...new Set(list.flatMap(p => p.types))].sort((a, b) => a.localeCompare(b));
  });

  // Computed property to sort the Pokémon list based on the selected sort key and direction
  readonly sortedPokemon = computed(() => {
    const list = [...this.pokemonList()];
    const key = this.sortKey();
    const direction = this.sortDirection();

    const compare = (a: Pokemon, b: Pokemon) => {
      if (key === 'name') return a.name.localeCompare(b.name);
      if (key === 'total') return a.total - b.total;
      return (a.stats[key] ?? 0) - (b.stats[key] ?? 0);
    };

    list.sort((a, b) => compare(a, b) * (direction === 'asc' ? 1 : -1));
    return list;
  });

  // Computed property to get the paginated Pokémon list based on the current page index and page size
  readonly paginatedPokemons = computed(() => {
    const offset = this.pageIndex() * this.pageSize();
    return this.sortedPokemon().slice(offset, offset + this.pageSize());
  });

  // Computed property to calculate the total number of pages based on the sorted Pokémon list and page size
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.sortedPokemon().length / this.pageSize())));

  // Form group for creating a new team with validation
  readonly teamForm = this.fb.group({
    teamName: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(30)],
      asyncValidators: [control => {
        const value = control.value?.trim();
        if (!value) return of(null);
        return this.store.teamNames$.pipe(
          take(1),
          map(names => names.some(name => name.toLowerCase() === value.toLowerCase()) ? { duplicateTeamName: true } : null)
        );
      }],
      updateOn: 'blur'
    })
  });

  // Lifecycle hook that initializes the component by loading the first 50 Pokémon from the store. 
  // You can adjust the number of Pokémon to load by changing the parameters passed to the loadPokemon method.
  ngOnInit(): void {
    this.store.loadPokemon(50, 0);
  }

  // Handle search input changes automatically. It updates the search term signal and calls the store's setSearch method to filter the 
  // Pokémon list based on the input value.
  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.store.setSearch(value);
  }

  // Handle type filter changes automatically. It updates the type filter signal and calls the store's setTypeFilter method to filter the 
  // Pokémon list based on the selected type.
  onTypeChange(value: string): void {
    this.typeFilter.set(value || 'all');
    this.store.setTypeFilter(value || 'all');
  }
  
  decrementPage(): void {
    this.pageIndex.set(Math.max(0, this.pageIndex() - 1));
  }

  incrementPage(): void {
    this.pageIndex.set(Math.min(this.totalPages() - 1, this.pageIndex() + 1));
  }

  sortBy(key: keyof Pokemon['stats'] | 'name' | 'total'): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set(key === 'name' ? 'asc' : 'desc');
  }

  // Select a Pokémon to view its details in the panel and open the panel. It updates the selectedPokemon signal with the chosen Pokémon 
  // and sets the panelOpen signal to true.
  selectPokemon(pokemon: Pokemon): void {
    this.selectedPokemon.set(pokemon);
    this.panelOpen.set(true);
  }

  // Check if a Pokémon is already in the selected team by comparing its ID with the IDs of the selected members. 
  // It returns true if the Pokémon is found in the selected team, otherwise false.
  isPokemonInSelectedTeam(pokemon: Pokemon): boolean {
    return this.selectedMembers().some(item => item.id === pokemon.id);
  }

  // Add a Pokémon to the selected team with validation for duplicates and team size. It checks if the Pokémon is already in the selected team or if 
  // the team has reached its maximum size of 6 members.
  addToSelectedTeam(pokemon: Pokemon): void {
    const current = this.selectedMembers();

    if (current.some(item => item.id === pokemon.id)) {
      this.teamFeedback.set('This Pokémon is already added to the team.');
      return;
    }

    if (current.length >= 6) {
      this.teamFeedback.set('Your team already has 6 Pokémon.');
      return;
    }

    this.selectedMembers.set([...current, pokemon].slice(0, 6));
    this.teamFeedback.set('');
    this.pickerValue.set('');
  }

  // Remove a Pokémon from the selected team by its ID and clear any feedback messages. It filters out the Pokémon with the specified ID from the 
  // selectedMembers signal and updates it.
  removeSelectedMember(id: number): void {
    this.selectedMembers.set(this.selectedMembers().filter(p => p.id !== id));
    if (this.teamFeedback()) this.teamFeedback.set('');
  }

  // Handle drag-and-drop events for adding Pokémon to the selected team by checking if the dragged Pokémon is valid and calling the addToSelectedTeam method.
  onDropToTeam(event: CdkDragDrop<Pokemon[]>): void {
    const draggedPokemon = event.item.data as Pokemon | undefined;
    if (!draggedPokemon) {
      return;
    }

    this.addToSelectedTeam(draggedPokemon);
  }

  // Handle drag-and-drop events for adding Pokémon to a saved team by checking if the dragged Pokémon is valid and calling the store's 
  // addToTeam method with the team ID and Pokémon.
  onDropToSavedTeam(event: CdkDragDrop<Pokemon[]>, teamId: string): void {
    const draggedPokemon = event.item.data as Pokemon | undefined;
    if (draggedPokemon) {
      this.store.addToTeam(teamId, draggedPokemon);
    }
  }

  // Submit the team creation form with validation for team name and members. It checks if the form is valid, retrieves the team name and selected members,
  // and calls the store's createTeam method. If the team name is not unique, it sets an error on the teamName form control.
  submitTeam(): void {
    if (this.teamForm.invalid) return;
    const teamName = this.teamForm.get('teamName')?.value?.trim();
    const teamMembers = this.selectedMembers();

    if (!teamName || teamMembers.length === 0) return;

    try {
      this.store.createTeam(teamName, teamMembers);
      this.teamForm.reset();
      this.selectedMembers.set([]);
    } catch {
      this.teamForm.get('teamName')?.setErrors({ duplicateTeamName: true });
    }
  }

  // Delete a saved team by its ID
  deleteTeam(teamId: string): void {
    this.store.deleteTeam(teamId);
  }
}