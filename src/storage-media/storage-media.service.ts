import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageMediaService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    this.bucketName = this.config.get<string>('S3_BUCKET_NAME') || '';

    this.s3Client = new S3Client({
      region: this.config.get<string>('S3_REGION') || 'eu-west-1',
      endpoint: this.config.get<string>('S3_ENDPOINT') || '',
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID') || '',
        secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY') || '',
      },
      forcePathStyle: true,
    });
  }

  getS3Client(): S3Client {
    return this.s3Client;
  }

  getBucketName(): string {
    return this.bucketName;
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
  }

  async assertFileExistsOrThrow(key: string): Promise<string> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      return key;
    } catch {
      throw new NotFoundException('file not found');
    }
  }

  async getFileUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }
}
