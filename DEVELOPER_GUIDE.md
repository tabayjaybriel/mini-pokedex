# Developer Guide

## Project Overview

MiniPokedex is a standalone Angular application for browsing Pokémon and creating teams. It uses the PokéAPI GraphQL endpoint for Pokémon data, RxJS observables for asynchronous data and shared store state, Angular signals for component state and derived values, and browser local storage for saved teams.

## Requirements

- Node.js compatible with the installed Angular CLI
- npm
- Network access to `https://beta.pokeapi.co/graphql/v1beta` for Pokémon data

## Getting Started

Install the project dependencies and start the development server:

```bash
npm install
npm start
```

Open `http://localhost:4200/`. The server reloads when source files change. To use a different port:

```bash
npm start -- --port 4201
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Angular development server |
| `npm run build` | Create a production build in `dist/mini-pokedex/` |
| `npm run watch` | Rebuild continuously using the development configuration |
| `npm test` | Run the Angular unit-test target |
| `npx ng generate component path/name` | Generate an Angular component |

## Source Layout

| Location | Responsibility |
| --- | --- |
| `src/main.ts` | Bootstraps the root `AppComponent` with `appConfig` |
| `src/app/app.config.ts` | Application-level providers and router configuration |
| `src/app/app.routes.ts` | Route definitions |
| `src/app/app.component.ts` | Main page template, browse controls, detail panel, and team-creation interactions |
| `src/app/services/graphql.service.ts` | Sends the GraphQL query and maps API responses to the application data model and UI states |
| `src/pokedex/state/pokemon.store.ts` | Pokémon loading/filtering state and team management/persistence |
| `src/pokedex/components/pokemon-table.component.ts` | Reusable Pokémon table component; the main page currently renders its table directly in `AppComponent` |
| `src/shared/components/data-state.component.ts` | Shared loading, success, empty, and error state contract/component |
| `src/shared/models/pokemon.model.ts` | `Pokemon` and `Team` interfaces |
| `src/styles.css` | Global styles |
| `public/` | Static files copied into the build output |

## Data and State Flow

1. `AppComponent` calls `PokemonStore.loadPokemon()` during initialization.
2. `PokemonStore` calls `GraphqlService.getPokemon()` and publishes its `DataState<Pokemon[]>` result.
3. The GraphQL service emits `loading`, then either `success`, `empty`, or `error`.
4. `PokemonStore.filteredPokemons$` combines the Pokémon data, debounced search term, and selected type filter.
5. `AppComponent` converts observable streams to signals with `toSignal()` and computes sorted and paginated lists.

The shared state type is a discriminated union:

```ts
type DataState<T> =
  | { state: 'loading' }
  | { state: 'success'; data: T }
  | { state: 'empty'; message: string }
  | { state: 'error'; message: string };
```

When changing API behavior, keep the GraphQL response mapping aligned with the `Pokemon` interface and preserve all four UI states.

## Team Behavior

- A team can contain up to six Pokémon.
- Team names are required, limited to 3–30 characters, and checked for duplicates without regard to letter case.
- The selected roster is assembled in the create-team area. A Pokémon can be added using the Add button or by dragging its sprite into the roster.
- Saved teams are stored under the `mini-pokedex-teams` local-storage key.
- Pokémon can also be dragged into a saved team's roster. Duplicate Pokémon and teams at capacity are ignored by the store.
- If team persistence or the team model changes, update `PokemonStore` and keep the UI in sync with its `teams$` stream.

## Conventions for Changes

- Keep API access in `GraphqlService`; keep shared team and Pokémon state in `PokemonStore`.
- Use the existing `Pokemon` and `Team` interfaces rather than introducing duplicate shapes.
- Use Angular signals for local UI state and derived component values. Use RxJS for asynchronous service streams and store selectors.
- Preserve standalone component patterns and import the Angular modules or directives a component template uses.
- Keep loading, error, empty, and success behavior explicit when adding asynchronous data.
- Add or update focused tests for behavior changes, particularly filtering, team capacity, duplicate handling, and drag-and-drop.

## Testing Notes

The configured test command is `npm test`. The current `src/app/app.spec.ts` appears to be a generated starter spec: it imports `App` from `./app` and checks for the starter greeting, while `src/main.ts` bootstraps `AppComponent`. Update or replace that spec before treating it as coverage for the current Pokédex page.

Run a production build before submitting changes:

```bash
npm run build
```

## External Services

Pokémon records are requested from PokéAPI's GraphQL beta endpoint. Sprite images are loaded from the PokeAPI sprites repository. These resources require a working network connection; API availability and response timing are outside the application's control.
