import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Note } from '../../models/note.model';
import { DatePipe, NgFor, NgIf } from '@angular/common';

/**
 * Renders a list of notes with simple preview and delete action.
 */
@Component({
  selector: 'app-note-list',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe],
  templateUrl: './note-list.component.html',
  styleUrl: './note-list.component.css',
})
export class NoteListComponent {
  @Input() notes: Note[] = [];
  @Input() activeNoteId: string | null = null;
  @Output() select = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  // PUBLIC_INTERFACE
  preview(text: string): string {
    const t = (text || '').replace(/\s+/g, ' ').trim();
    return t.length > 120 ? t.slice(0, 120) + '…' : t;
  }
}
