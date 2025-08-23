export interface FileSource {
  getFile(): Promise<File>
}

export class HandleFileSource implements FileSource {
  constructor(private readonly handle: FileSystemFileHandle) {
    this.handle = handle
  }

  async getFile(): Promise<File> {
    return this.handle.getFile()
  }
}

export class InlineFileSource implements FileSource {
  constructor(private readonly file: File) {
    this.file = file
  }

  async getFile(): Promise<File> {
    return this.file
  }
}
