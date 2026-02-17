/**
 * Jest mock for expo-file-system
 *
 * Mocks the new File and Paths API used in imageUtils.ts
 */

// Mock File class
export class File {
  static _mockExists = true;
  static _mockSize = 1024;
  uri: string;

  get exists(): boolean {
    return File._mockExists;
  }

  get size(): number {
    return File._mockSize;
  }

  constructor(...paths: (string | File | Directory)[]) {
    // Combine paths to form URI
    this.uri = paths
      .map((p) => (typeof p === 'string' ? p : p.uri))
      .join('/');
  }

  async text(): Promise<string> {
    return '';
  }

  textSync(): string {
    return '';
  }

  async base64(): Promise<string> {
    return 'mockBase64Data';
  }

  base64Sync(): string {
    return 'mockBase64Data';
  }

  async bytes(): Promise<Uint8Array> {
    return new Uint8Array();
  }

  bytesSync(): Uint8Array {
    return new Uint8Array();
  }

  write(content: string | Uint8Array): void {
    // No-op
  }

  delete(): void {
    // No-op
  }

  async copy(destination: File | Directory): Promise<void> {
    // No-op
  }

  async move(destination: File | Directory): Promise<void> {
    // No-op
  }

  validatePath(): void {
    // No-op
  }
}

// Mock Directory class
export class Directory {
  static _mockListEntries: (File | Directory)[] = [];
  uri: string;
  exists = true;

  constructor(...paths: (string | File | Directory)[]) {
    this.uri = paths
      .map((p) => (typeof p === 'string' ? p : p.uri))
      .join('/');
  }

  create(): void {
    // No-op
  }

  delete(): void {
    // No-op
  }

  list(): (File | Directory)[] {
    return Directory._mockListEntries;
  }

  validatePath(): void {
    // No-op
  }
}

// Mock Paths object
export const Paths = {
  document: {
    uri: 'file:///mock/document',
  } as Directory,
  cache: {
    uri: 'file:///mock/cache',
  } as Directory,
  appleSharedContainers: {} as Record<string, Directory>,
};

// Re-export legacy API items that may be used
export const documentDirectory = 'file:///mock/document/';
export const cacheDirectory = 'file:///mock/cache/';

export async function getInfoAsync(
  fileUri: string,
  options?: { md5?: boolean }
): Promise<{ exists: boolean; isDirectory: boolean }> {
  return { exists: true, isDirectory: false };
}

export async function readAsStringAsync(
  fileUri: string,
  options?: { encoding?: string }
): Promise<string> {
  return '';
}

export async function writeAsStringAsync(
  fileUri: string,
  contents: string,
  options?: { encoding?: string }
): Promise<void> {
  // No-op
}

export async function deleteAsync(
  fileUri: string,
  options?: { idempotent?: boolean }
): Promise<void> {
  // No-op
}

export async function copyAsync(options: {
  from: string;
  to: string;
}): Promise<void> {
  // No-op
}

export async function moveAsync(options: {
  from: string;
  to: string;
}): Promise<void> {
  // No-op
}

export async function makeDirectoryAsync(
  fileUri: string,
  options?: { intermediates?: boolean }
): Promise<void> {
  // No-op
}

export const EncodingType = {
  UTF8: 'utf8',
  Base64: 'base64',
};
