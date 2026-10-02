import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataState } from '../../shared/components/data-state.component';
import { Pokemon } from '../../shared/models/pokemon.model';

// The PokemonTableComponent is a standalone component that displays a table of Pokémon data based on the provided DataState. It handles different states such 
// as loading, error, empty, and success, and allows users to add Pokémon to their team. 
// I start here but i transfer to app.component.ts because i need to manage the state of the selected team and handle adding Pokémon to the team. 
// The component uses input and output decorators to receive the Pokémon data and emit events when a Pokémon is added to the team.
// it makes it easier to manage the state of the selected team and handle adding Pokémon to the team.
@Component({
  selector: 'app-pokemon-table', standalone: true, imports: [CommonModule],
  template: `
    @let s = state();
    @switch (s.state) {
      @case ('loading') { <p>Loading...</p> }
      @case ('error') { <p style="color:red">{{ s.message }}</p> }
      @case ('empty') { <p>{{ s.message }}</p> }
      @case ('success') {
        <table width="100%" style="border-collapse: collapse; background: white;">
          <tr style="background:#27ae60; color:white;">
            <th>No.</th>
            <th>Pokémon</th>
            <th>Action</th>
          </tr>
          @for (pokemon of s.data; track pokemon.name; let i = $index) {
            <tr>
              <td>{{ i + 1 }}</td>
              <td style="display:flex; align-items:center; gap:10px;">
                <img
                  [src]="'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + pokemon.id + '.png'"
                  [alt]="pokemon.name"
                  style="width:50px;height:50px;vertical-align:middle;"
                />
                <span>{{ pokemon.name }}</span>
              </td>
              <td>
                <button (click)="addToTeam.emit(pokemon)" style="background:#27ae60;color:white;border:none;padding:6px 12px;border-radius:5px;cursor:pointer;">
                  Add to Team
                </button>
              </td>
            </tr>
          }
        </table>
      }
    }
  `
})
export class PokemonTableComponent { state = input.required<DataState<Pokemon[]>>(); addToTeam = output<Pokemon>(); }