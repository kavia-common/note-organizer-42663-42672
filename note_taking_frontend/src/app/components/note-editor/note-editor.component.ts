import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotesService, provideNotesService } from '../../services/notes.service';
import { Note } from '../../models/note.model';
import { NgIf } from '@angular/common';

function debounce<T extends (...args: any[]) => void>(fn: T, ms = 400): T {
  let t: any;
  return ((...args: any[]) => {
    (globalThis as any).clearTimeout?.(t);
    t = (globalThis as any).setTimeout?.(() => fn(...args), ms);
  }) as T;
}

/**
 * Editor for a single note. Auto-saves on change with debounce.
 */
@Component({
  selector: 'app-note-editor',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './note-editor.component.html',
  styleUrl: './note-editor.component.css',
})
export class NoteEditorComponent implements OnChanges {
  @Input() noteId!: string;
  @Output() save = new EventEmitter<Note>();

  private svc: NotesService = provideNotesService();

  note = signal<Note | null>(null);
  saving = signal(false);
  savedAt = signal<number | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['noteId']?.currentValue) {
      this.load();
    }
  }

  load(): void {
    this.svc.getNote(this.noteId).subscribe((n) => this.note.set(n ?? null));
  }

  onTitleChange(): void {
    this.triggerSave();
  }
  onContentChange(): void {
    this.triggerSave();
  }

  private triggerSave = debounce(() => {
    const n = this.note();
    if (!n) return;
    this.saving.set(true);
    this.svc.updateNote(n.id, { title: n.title, content: n.content }).subscribe((updated) => {
      this.saving.set(false);
      this.savedAt.set(Date.now());
      this.note.set(updated);
      this.save.emit(updated);
    });
  }, 500);
}
