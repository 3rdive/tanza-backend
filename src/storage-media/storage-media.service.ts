import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageMediaService {
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    const baseDir = this.config.get<string>('UPLOAD_DIR') ?? 'uploads';
    // Ensure absolute path based on project root
    this.uploadDir = path.isAbsolute(baseDir)
      ? baseDir
      : path.join(process.cwd(), baseDir);
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  ensureDirExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getAbsolutePath(filename: string): string {
    // Normalize and prevent path traversal
    const safe = path.normalize(filename).replace(/^\/+/, '');
    const full = path.join(this.uploadDir, safe);
    if (!full.startsWith(this.uploadDir)) {
      // outside of upload dir
      throw new NotFoundException('file not found');
    }
    return full;
  }

  assertFileExistsOrThrow(filename: string): string {
    const full = this.getAbsolutePath(filename);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      throw new NotFoundException('file not found');
    }
    return full;
  }
}
