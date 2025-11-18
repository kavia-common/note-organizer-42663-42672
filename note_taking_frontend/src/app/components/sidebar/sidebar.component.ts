import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Sidebar with search and simple folder/tag filters.
 * Emits create/search/filterChange to the parent layout.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  @Output() create = new EventEmitter<void>();
  @Output() search = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ folderId?: string | null; tagId?: string | null }>();

  q = signal('');
  // for ngModel compatibility use a plain property
  qValue = '';

  selectedFolder = signal<string | null>(null);
  selectedTag = signal<string | null>(null);

  onSearchChange(): void {
    this.q.set(this.qValue);
    this.search.emit(this.q());
  }

  setFolder(id: string | null): void {
    this.selectedFolder.set(id);
    this.filterChange.emit({ folderId: id, tagId: this.selectedTag() ?? undefined });
  }

  setTag(id: string | null): void {
    this.selectedTag.set(id);
    this.filterChange.emit({ folderId: this.selectedFolder() ?? undefined, tagId: id ?? undefined });
  }
}
