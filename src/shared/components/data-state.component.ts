import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
export type DataState<T> = { state: 'loading' } | { state: 'success'; data: T } | { state: 'error'; message: string } | { state: 'empty'; message: string };

// The DataStateComponent is a standalone component that displays different UI elements based on the provided DataState. It handles loading, error, empty, 
// and success states, allowing for flexible content rendering through ng-content when the state is 'success'.
@Component({
    selector: 'app-data-state', standalone: true, imports: [CommonModule],
    template: `@let s = dataState(); 
  @if(s.state==='loading'){<p>Loading...</p>} 
  @if(s.state==='error'){<p style="color:red">{{s.message}}</p>} 
  @if(s.state==='empty'){<p>{{s.message}}</p>} 
  @if(s.state==='success'){<ng-content></ng-content>}`
})
export class DataStateComponent { @Input() set state(v: DataState<any>) { this.dataState.set(v) } dataState = signal<DataState<any>>({ state: 'loading' }) }