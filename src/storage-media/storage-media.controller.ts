import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { Response } from 'express';
import { Public } from '../auth/public.anotation';
import { BaseUrl } from '../constants';
import { StorageMediaService } from './storage-media.service';
import { StandardResponse } from '../commons/standard-response';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Controller(BaseUrl.STORAGE)
@Public()
export class StorageMediaController {
  constructor(
    private readonly storageMediaService: StorageMediaService,
    private readonly configService: ConfigService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type?: string,
  ) {
    if (!file) {
      throw new BadRequestException(StandardResponse.fail('No file uploaded'));
    }

    const folder = ['documents', 'images'].includes(type ?? '')
      ? type
      : 'documents';
    const ext = path.extname(file.originalname);
    const id = (crypto as any).randomUUID
      ? (crypto as any).randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const key = `${folder}/${id}${ext}`;

    // Upload to S3
    await this.storageMediaService.uploadFile(file.buffer, key, file.mimetype);

    // const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const baseFetchUrl = this.configService.get<string>('S3_GET_ENDPOINT');
    const bucketName = this.storageMediaService.getBucketName();

    const publicUrl = `${baseFetchUrl}/${bucketName}/${key}`;
    console.log('publicUrl: ', publicUrl);

    return StandardResponse.ok(
      {
        key: key,
        filename: `${id}${ext}`,
        mimetype: file.mimetype,
        size: file.size,
        folder: folder,
        url: publicUrl,
      },
      'File uploaded successfully',
    );
  }

  @Public()
  @Get(':folder/:filename')
  async getFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const key = `${folder}/${filename}`;
    await this.storageMediaService.assertFileExistsOrThrow(key);
    const url = await this.storageMediaService.getFileUrl(key);
    res.redirect(String(url));
  }
}
