export interface FileSource {
  getFile(): Promise<File>
}

export class HandleFileSource implements FileSource {
  private readonly handle: FileSystemFileHandle

  constructor(handle: FileSystemFileHandle) {
    this.handle = handle
  }

  async getFile(): Promise<File> {
    return this.handle.getFile()
  }
}

export class InlineFileSource implements FileSource {
  private readonly file: File

  constructor(file: File) {
    this.file = file
  }

  async getFile(): Promise<File> {
    return this.file
  }
}
