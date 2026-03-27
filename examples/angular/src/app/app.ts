import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiagramEditorComponent } from '../workflow-editor';

@Component({
  selector: 'app-root',
  imports: [DiagramEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('workflow-editor-angular-demo');
}
