import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core'

@Component({
  selector: 'app-file-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div
      class="border-2 border-dashed p-6 text-center cursor-pointer rounded-lg flex flex-col items-center justify-center min-h-[200px] transition-colors hover:border-primary-focus hover:bg-base-200"
      [class]="hostClasses()"
      (click)="handleClick()"
      (dragenter)="handleDragEnter($event)"
      (dragleave)="handleDragLeave($event)"
      (dragover)="handleDragOver($event)"
      (drop)="handleDrop($event)"
      role="button"
      tabindex="0"
      (keydown)="handleKeyDown($event)"
    >
      <input
        #fileInput
        type="file"
        class="hidden"
        [accept]="accept()"
        [multiple]="multiple()"
        (change)="handleFileChange($event)"
      >

      <div class="text-5xl text-primary mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>

      <ng-content select="[slot=upload-text]">
        <h3 class="text-lg font-semibold" [class.text-primary]="isDragging()">
          Drag and drop files here
        </h3>
        <p class="text-sm text-base-content opacity-70">
          or click to select files
        </p>
      </ng-content>
    </div>
  `,
})
export class FileUpload {
  accept = input('')
  multiple = input(false)
  filesSelected = output<File[]>()

  fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput')
  isDragging = signal(false)

  hostClasses = computed(() => ({
    'border-primary': this.isDragging(),
    'border-base-300': !this.isDragging(),
    'bg-base-200': this.isDragging(),
    'bg-base-100': !this.isDragging(),
  }))

  handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      this.filesSelected.emit(Array.from(input.files))
      input.value = ''
    }
  }

  handleClick(): void {
    this.fileInput().nativeElement.click()
  }

  handleDragEnter(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging.set(true)
  }

  handleDragLeave(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()
    const relatedTarget = event.relatedTarget as Node
    const currentTarget = event.currentTarget as Node
    if (!currentTarget.contains(relatedTarget)) {
      this.isDragging.set(false)
    }
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
    if (!this.isDragging()) {
      this.isDragging.set(true)
    }
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()
    this.isDragging.set(false)

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.filesSelected.emit(Array.from(event.dataTransfer.files))
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.handleClick()
    }
  }
}
