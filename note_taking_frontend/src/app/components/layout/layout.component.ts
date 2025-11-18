import { Component, inject, signal, computed } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NoteListComponent } from '../note-list/note-list.component';
import { NoteEditorComponent } from '../note-editor/note-editor.component';
import { NotesService, provideNotesService } from '../../services/notes.service';
import { Note } from '../../models/note.model';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [SidebarComponent, NoteListComponent, NoteEditorComponent, NgIf],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent {
  // resolve service via factory to allow env switching without Angular providers complexity
  private svc: NotesService = provideNotesService();

  notes = signal<Note[]>([]);
  query = signal<string>('');
  activeNoteId = signal<string | null>(null);
  sidebarFilter = signal<{ folderId?: string | null; tagId?: string | null }>({});

  constructor() {
    this.refresh();
  }

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const f = this.sidebarFilter();
    return this.notes().filter(n => {
      if (f.folderId !== undefined && f.folderId !== null) {
        if (n.folderId !== f.folderId) return false;
      }
      if (f.tagId) {
        if (!n.tags.includes(f.tagId)) return false;
      }
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    });
  });

  refresh() {
    this.svc.listNotes().subscribe(n => this.notes.set(n));
  }

  onSearch(q: string) {
    this.query.set(q);
  }

  onCreateNote() {
    this.svc.createNote({ title: 'New note' }).subscribe(n => {
      this.refresh();
      this.activeNoteId.set(n.id);
    });
  }

  onSelectNote(id: string) {
    this.activeNoteId.set(id);
  }

  onDeleteNote(id: string) {
    const confirmDelete = (typeof globalThis !== 'undefined' && (globalThis as any).confirm)
      ? (globalThis as any).confirm('Delete this note?')
      : true;
    if (!confirmDelete) return;
    this.svc.deleteNote(id).subscribe(() => {
      if (this.activeNoteId() === id) this.activeNoteId.set(null);
      this.refresh();
    });
  }

  onSaveNote(note: Note) {
    this.svc.updateNote(note.id, note).subscribe(() => this.refresh());
  }

  onSidebarFilterChange(filter: { folderId?: string | null; tagId?: string | null }) {
    this.sidebarFilter.set(filter);
  }
}
