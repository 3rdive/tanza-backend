import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { Response, Request } from 'express';
import { Public } from '../auth/public.anotation';
import { BaseUrl } from '../constants';
import { StorageMediaService } from './storage-media.service';
import { StandardResponse } from '../commons/standard-response';
import * as fs from 'fs';
import * as crypto from 'crypto';

@Controller(BaseUrl.STORAGE)
export class StorageMediaController {
  constructor(private readonly storageMediaService: StorageMediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // ensure directory exists before saving

          // 'this' not accessible here; we will compute via process.cwd and env indirectly
          const UploadDir = process.env.UPLOAD_DIR || 'uploads';
          const abs = path.isAbsolute(UploadDir)
            ? UploadDir
            : path.join(process.cwd(), UploadDir);
          try {
            // Create the directory if it doesn't exist
            // Avoid requiring service instance here
            fs.mkdirSync(abs, { recursive: true });
          } catch (e) {
            console.log('error with multer: ', e);
            // ignore; Multer will still try and throw meaningful error
          }
          cb(null, abs);
        },
        filename: (req, file, cb) => {
          const original = file.originalname;
          const ext = path.extname(original);
          // Use a UUID so we never expose the original name and avoid duplicates
          const id = (crypto as any).randomUUID
            ? (crypto as any).randomUUID()
            : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${id}${ext}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    if (!file) {
      throw new BadRequestException(StandardResponse.fail('No file uploaded'));
    }

    const baseUrl = request.protocol + '://' + request.get('host');
    return StandardResponse.ok(
      {
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: `${baseUrl}/api/v1/storage-media/${file.filename}`,
      },
      'File uploaded successfully',
    );
  }

  @Public()
  @Get(':filename')
  getFile(@Param('filename') filename: string, @Res() res: Response) {
    const full = this.storageMediaService.assertFileExistsOrThrow(filename);
    return res.sendFile(full);
  }
}
