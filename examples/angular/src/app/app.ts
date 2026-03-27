import { Component, signal } from '@angular/core';
import { DiagramEditorComponent } from '@relevance/workflow-editor/angular';

@Component({
  selector: 'app-root',
  imports: [DiagramEditorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('workflow-editor-angular-demo');
}
