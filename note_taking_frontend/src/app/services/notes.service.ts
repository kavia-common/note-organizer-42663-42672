import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Note, Tag, Folder, createEmptyNote } from '../models/note.model';
import { getAppEnv } from '../env.config';

// PUBLIC_INTERFACE
export abstract class NotesService {
  /** List all notes ordered by updatedAt desc */
  abstract listNotes(): Observable<Note[]>;

  /** Get single note by id */
  abstract getNote(id: string): Observable<Note | undefined>;

  /** Create a new note */
  abstract createNote(note: Partial<Note>): Observable<Note>;

  /** Update an existing note */
  abstract updateNote(id: string, changes: Partial<Note>): Observable<Note>;

  /** Delete a note by id */
  abstract deleteNote(id: string): Observable<void>;

  /** List tags */
  abstract listTags(): Observable<Tag[]>;

  /** Upsert tag by name */
  abstract upsertTag(name: string): Observable<Tag>;

  /** List folders */
  abstract listFolders(): Observable<Folder[]>;

  /** Upsert folder by name */
  abstract upsertFolder(name: string): Observable<Folder>;

  /** Set note's folder */
  abstract moveToFolder(noteId: string, folderId: string | null): Observable<Note>;

  /** Assign/remove tag */
  abstract toggleTag(noteId: string, tagId: string): Observable<Note>;
}

const LS_KEYS = {
  notes: 'ocean.notes',
  tags: 'ocean.tags',
  folders: 'ocean.folders',
};

@Injectable({ providedIn: 'root' })
export class LocalStorageNotesService extends NotesService {
  private notes$ = new BehaviorSubject<Note[]>(this.read<Note[]>(LS_KEYS.notes, []));
  private tags$ = new BehaviorSubject<Tag[]>(this.read<Tag[]>(LS_KEYS.tags, []));
  private folders$ = new BehaviorSubject<Folder[]>(this.read<Folder[]>(LS_KEYS.folders, []));

  private read<T>(k: string, fallback: T): T {
    try {
      const ls: any = (globalThis as any).localStorage;
      const raw = ls ? ls.getItem(k) : null;
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private write<T>(k: string, v: T): void {
    try {
      const ls: any = (globalThis as any).localStorage;
      if (ls && typeof ls.setItem === 'function') {
        ls.setItem(k, JSON.stringify(v));
      }
    } catch {
      // ignore quota errors
    }
  }

  private persistAll(): void {
    this.write(LS_KEYS.notes, this.notes$.value);
    this.write(LS_KEYS.tags, this.tags$.value);
    this.write(LS_KEYS.folders, this.folders$.value);
  }

  listNotes(): Observable<Note[]> {
    return new Observable<Note[]>((sub) => {
      const ordered = [...this.notes$.value].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      sub.next(ordered);
      sub.complete();
    });
  }

  getNote(id: string): Observable<Note | undefined> {
    return new Observable<Note | undefined>((sub) => {
      sub.next(this.notes$.value.find((n) => n.id === id));
      sub.complete();
    });
  }

  createNote(note: Partial<Note>): Observable<Note> {
    return new Observable<Note>((sub) => {
      const newNote = createEmptyNote({
        title: note.title ?? 'Untitled',
        content: note.content ?? '',
        tags: note.tags ?? [],
        folderId: note.folderId ?? null,
        pinned: !!note.pinned,
        archived: !!note.archived,
      });
      this.notes$.next([newNote, ...this.notes$.value]);
      this.persistAll();
      sub.next(newNote);
      sub.complete();
    });
  }

  updateNote(id: string, changes: Partial<Note>): Observable<Note> {
    return new Observable<Note>((sub) => {
      const found = this.notes$.value.find((n) => n.id === id);
      if (!found) {
        sub.error(new Error('Note not found'));
        return;
      }
      Object.assign(found, changes, { updatedAt: Date.now() });
      this.notes$.next([...this.notes$.value]);
      this.persistAll();
      sub.next(found);
      sub.complete();
    });
  }

  deleteNote(id: string): Observable<void> {
    return new Observable<void>((sub) => {
      this.notes$.next(this.notes$.value.filter((n) => n.id !== id));
      this.persistAll();
      sub.next();
      sub.complete();
    });
  }

  listTags(): Observable<Tag[]> {
    return new Observable<Tag[]>((sub) => {
      sub.next([...this.tags$.value].sort((a, b) => a.name.localeCompare(b.name)));
      sub.complete();
    });
  }

  upsertTag(name: string): Observable<Tag> {
    return new Observable<Tag>((sub) => {
      const trimmed = name.trim();
      const existing = this.tags$.value.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        sub.next(existing);
        sub.complete();
        return;
      }
      const tag: Tag = { id: cryptoRandomId(), name: trimmed };
      this.tags$.next([...this.tags$.value, tag]);
      this.persistAll();
      sub.next(tag);
      sub.complete();
    });
  }

  listFolders(): Observable<Folder[]> {
    return new Observable<Folder[]>((sub) => {
      sub.next([...this.folders$.value].sort((a, b) => a.name.localeCompare(b.name)));
      sub.complete();
    });
  }

  upsertFolder(name: string): Observable<Folder> {
    return new Observable<Folder>((sub) => {
      const trimmed = name.trim();
      const existing = this.folders$.value.find((f) => f.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        sub.next(existing);
        sub.complete();
        return;
      }
      const folder: Folder = { id: cryptoRandomId(), name: trimmed };
      this.folders$.next([...this.folders$.value, folder]);
      this.persistAll();
      sub.next(folder);
      sub.complete();
    });
  }

  moveToFolder(noteId: string, folderId: string | null): Observable<Note> {
    return new Observable<Note>((sub) => {
      const n = this.notes$.value.find((x) => x.id === noteId);
      if (!n) {
        sub.error(new Error('Note not found'));
        return;
      }
      n.folderId = folderId;
      n.updatedAt = Date.now();
      this.notes$.next([...this.notes$.value]);
      this.persistAll();
      sub.next(n);
      sub.complete();
    });
  }

  toggleTag(noteId: string, tagId: string): Observable<Note> {
    return new Observable<Note>((sub) => {
      const n = this.notes$.value.find((x) => x.id === noteId);
      if (!n) {
        sub.error(new Error('Note not found'));
        return;
      }
      n.tags = n.tags.includes(tagId) ? n.tags.filter((t) => t !== tagId) : [...n.tags, tagId];
      n.updatedAt = Date.now();
      this.notes$.next([...this.notes$.value]);
      this.persistAll();
      sub.next(n);
      sub.complete();
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiNotesService extends NotesService {
  private base = (getAppEnv().apiBase || '').replace(/\/+$/, '');

  private async json<T>(url: string, init?: any): Promise<T> {
    const fetchFn: any = (globalThis as any).fetch;
    const res = await fetchFn(`${this.base}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  listNotes(): Observable<Note[]> {
    return new Observable((sub) => {
      this.json<Note[]>('/notes').then((d) => {
        sub.next(d);
        sub.complete();
      }).catch((e) => sub.error(e));
    });
  }

  getNote(id: string): Observable<Note | undefined> {
    return new Observable((sub) => {
      this.json<Note>(`/notes/${id}`).then((d) => {
        sub.next(d);
        sub.complete();
      }).catch((e) => sub.error(e));
    });
  }

  createNote(note: Partial<Note>): Observable<Note> {
    return new Observable((sub) => {
      this.json<Note>('/notes', { method: 'POST', body: JSON.stringify(note) })
        .then((d) => { sub.next(d); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }

  updateNote(id: string, changes: Partial<Note>): Observable<Note> {
    return new Observable((sub) => {
      this.json<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(changes) })
        .then((d) => { sub.next(d); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }

  deleteNote(id: string): Observable<void> {
    return new Observable((sub) => {
      this.json<void>(`/notes/${id}`, { method: 'DELETE' })
        .then(() => { sub.next(); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }

  listTags(): Observable<Tag[]> {
    return new Observable((sub) => {
      this.json<Tag[]>('/tags')
        .then((d) => { sub.next(d); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }

  upsertTag(name: string): Observable<Tag> {
    return new Observable((sub) => {
      this.json<Tag>('/tags', { method: 'POST', body: JSON.stringify({ name }) })
        .then((d) => { sub.next(d); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }

  listFolders(): Observable<Folder[]> {
    return new Observable((sub) => {
      this.json<Folder[]>('/folders')
        .then((d) => { sub.next(d); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }

  upsertFolder(name: string): Observable<Folder> {
    return new Observable((sub) => {
      this.json<Folder>('/folders', { method: 'POST', body: JSON.stringify({ name }) })
        .then((d) => { sub.next(d); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }

  moveToFolder(noteId: string, folderId: string | null): Observable<Note> {
    return new Observable((sub) => {
      this.json<Note>(`/notes/${noteId}/move`, { method: 'POST', body: JSON.stringify({ folderId }) })
        .then((d) => { sub.next(d); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }

  toggleTag(noteId: string, tagId: string): Observable<Note> {
    return new Observable((sub) => {
      this.json<Note>(`/notes/${noteId}/tags/${tagId}`, { method: 'POST' })
        .then((d) => { sub.next(d); sub.complete(); })
        .catch((e) => sub.error(e));
    });
  }
}

// PUBLIC_INTERFACE
export function provideNotesService(): NotesService {
  const env = getAppEnv();
  if (env.apiBase && env.apiBase.trim() !== '') {
    return new ApiNotesService();
  }
  return new LocalStorageNotesService();
}

function cryptoRandomId(): string {
  try {
    const arr = new Uint8Array(12);
    (globalThis as any).crypto?.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).slice(2);
  }
}
