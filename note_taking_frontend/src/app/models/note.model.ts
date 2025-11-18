export type NoteID = string;

export interface Tag {
  id: string;
  name: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Note {
  id: NoteID;
  title: string;
  content: string;
  tags: string[]; // tag ids
  folderId?: string | null;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  pinned?: boolean;
  archived?: boolean;
}

// PUBLIC_INTERFACE
export function createEmptyNote(partial?: Partial<Note>): Note {
  const now = Date.now();
  return {
    id: cryptoRandomId(),
    title: '',
    content: '',
    tags: [],
    folderId: null,
    createdAt: now,
    updatedAt: now,
    pinned: false,
    archived: false,
    ...partial,
  };
}

/** PUBLIC_INTERFACE: Generate a random id string */
export function cryptoRandomId(): string {
  try {
    const arr = new Uint8Array(16);
    (globalThis as any).crypto?.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
