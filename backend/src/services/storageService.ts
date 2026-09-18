import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Readable } from 'stream';
import multer, { StorageEngine } from 'multer';
import { S3Client, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export class StorageService {
  private s3Client: S3Client | null = null;
  private uploadsRoot: string;

  constructor() {
    this.uploadsRoot = path.resolve(__dirname, '../../../uploads');
    try {
      if (!fs.existsSync(this.uploadsRoot)) {
        fs.mkdirSync(this.uploadsRoot, { recursive: true });
      }
    } catch {
      this.uploadsRoot = path.join('/tmp', 'uploads');
      if (!fs.existsSync(this.uploadsRoot)) {
        fs.mkdirSync(this.uploadsRoot, { recursive: true });
      }
    }
  }

  /**
   * Check if S3 storage is enabled.
   * Defaults to false if s3_flag / S3_FLAG is not set or not 'true'.
   */
  public isS3Enabled(): boolean {
    const flag = (process.env.s3_flag || process.env.S3_FLAG || '').trim().toLowerCase();
    return flag === 'true' || flag === '1';
  }

  public getBucketName(): string {
    return process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || 'panaceainfosec-vault';
  }

  public getRegion(): string {
    return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
  }

  private getS3Client(): S3Client {
    if (!this.s3Client) {
      const region = this.getRegion();
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

      const clientConfig: any = { region };
      if (accessKeyId && secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId,
          secretAccessKey,
        };
      }
      this.s3Client = new S3Client(clientConfig);
    }
    return this.s3Client;
  }

  public getUploadsRoot(): string {
    return this.uploadsRoot;
  }

  /**
   * Generates a safe, cryptographically unique filename
   */
  public generateUniqueFilename(originalname: string): string {
    const ext = path.extname(originalname).toLowerCase();
    const base = path.basename(originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 32);
    const uuid = crypto.randomUUID();
    return `${base}-${uuid}${ext}`;
  }

  /**
   * Creates a hybrid Multer storage engine that streams to S3 when s3_flag is true,
   * or writes to the local uploads directory when s3_flag is false.
   */
  public createHybridMulterStorage(subfolder: string): StorageEngine {
    const self = this;
    const targetFolder = subfolder.toLowerCase() === 'consultant' ? 'consultants' : subfolder.toLowerCase();

    // Ensure local subfolder exists if local storage is used
    try {
      const localDir = path.join(this.uploadsRoot, targetFolder);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
    } catch {
      // Ignored for serverless environments
    }

    return {
      _handleFile: async (
        req: any,
        file: Express.Multer.File,
        cb: (error?: any, info?: Partial<Express.Multer.File>) => void
      ) => {
        const uniqueFilename = self.generateUniqueFilename(file.originalname);

        if (self.isS3Enabled()) {
          try {
            const bucket = self.getBucketName();
            const region = self.getRegion();
            const key = `${targetFolder}/${uniqueFilename}`;
            const s3 = self.getS3Client();

            const parallelUploads3 = new Upload({
              client: s3,
              params: {
                Bucket: bucket,
                Key: key,
                Body: file.stream,
                ContentType: file.mimetype,
              },
            });

            await parallelUploads3.done();

            const s3Url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

            const fileInfo: any = {
              filename: uniqueFilename,
              path: `s3://${bucket}/${key}`,
              size: file.size,
              destination: targetFolder,
              storageType: 's3',
              s3Url,
              s3Key: key,
              s3Bucket: bucket,
              folder: targetFolder,
            };

            // Also attach directly onto file object for convenient access in controllers
            (file as any).filename = uniqueFilename;
            (file as any).storageType = 's3';
            (file as any).s3Url = s3Url;
            (file as any).s3Key = key;
            (file as any).s3Bucket = bucket;
            (file as any).folder = targetFolder;

            cb(null, fileInfo);
          } catch (err) {
            console.error('S3 Upload Error:', err);
            cb(err);
          }
        } else {
          // Local disk storage
          try {
            const localDir = path.join(self.uploadsRoot, targetFolder);
            if (!fs.existsSync(localDir)) {
              fs.mkdirSync(localDir, { recursive: true });
            }

            const finalPath = path.join(localDir, uniqueFilename);
            const outStream = fs.createWriteStream(finalPath);

            let fileSize = 0;
            file.stream.on('data', (chunk) => {
              fileSize += chunk.length;
            });

            file.stream.pipe(outStream);
            outStream.on('error', cb);
            outStream.on('finish', () => {
              const fileInfo: any = {
                destination: localDir,
                filename: uniqueFilename,
                path: finalPath,
                size: fileSize,
                storageType: 'local',
                s3Url: '',
                s3Key: '',
                s3Bucket: '',
                folder: targetFolder,
              };

              (file as any).filename = uniqueFilename;
              (file as any).path = finalPath;
              (file as any).size = fileSize;
              (file as any).storageType = 'local';
              (file as any).s3Url = '';
              (file as any).s3Key = '';
              (file as any).s3Bucket = '';
              (file as any).folder = targetFolder;

              cb(null, fileInfo);
            });
          } catch (err) {
            cb(err);
          }
        }
      },

      _removeFile: async (_req: any, file: Express.Multer.File, cb: (error: Error | null) => void) => {
        try {
          if (self.isS3Enabled()) {
            const bucket = self.getBucketName();
            const key = (file as any).s3Key || `${targetFolder}/${file.filename}`;
            const s3 = self.getS3Client();
            await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
          } else {
            if (file.path && fs.existsSync(file.path)) {
              await fs.promises.unlink(file.path);
            }
          }
          cb(null);
        } catch (err: any) {
          cb(err);
        }
      },
    };
  }

  /**
   * Retrieves a file as a readable stream regardless of whether it's stored on S3 or locally.
   */
  public async getFileStream(
    subfolder: string,
    filename: string
  ): Promise<{ stream: Readable; size?: number; mimeType?: string }> {
    const targetFolder = subfolder.toLowerCase() === 'consultant' ? 'consultants' : subfolder.toLowerCase();

    if (this.isS3Enabled()) {
      const bucket = this.getBucketName();
      const key = `${targetFolder}/${filename}`;
      const s3 = this.getS3Client();

      const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!response.Body) {
        throw new Error(`File not found in S3 bucket (${key})`);
      }
      return {
        stream: response.Body as Readable,
        size: response.ContentLength,
        mimeType: response.ContentType,
      };
    } else {
      const localPath = path.join(this.uploadsRoot, targetFolder, filename);
      if (!fs.existsSync(localPath)) {
        throw new Error(`File not found on local disk (${localPath})`);
      }
      const stats = await fs.promises.stat(localPath);
      return {
        stream: fs.createReadStream(localPath),
        size: stats.size,
      };
    }
  }

  /**
   * Deletes a file from either S3 or local disk.
   */
  public async deleteFile(subfolder: string, filename: string): Promise<boolean> {
    const targetFolder = subfolder.toLowerCase() === 'consultant' ? 'consultants' : subfolder.toLowerCase();

    if (this.isS3Enabled()) {
      try {
        const bucket = this.getBucketName();
        const key = `${targetFolder}/${filename}`;
        const s3 = this.getS3Client();
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch (err) {
        console.warn(`S3 Delete error for ${targetFolder}/${filename}:`, err);
        return false;
      }
    } else {
      try {
        const localPath = path.join(this.uploadsRoot, targetFolder, filename);
        if (fs.existsSync(localPath)) {
          await fs.promises.unlink(localPath);
        }
        return true;
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.warn(`Local Delete error for ${targetFolder}/${filename}:`, err);
        }
        return false;
      }
    }
  }

  /**
   * Checks if a file exists on S3 or local disk.
   */
  public async fileExists(subfolder: string, filename: string): Promise<boolean> {
    const targetFolder = subfolder.toLowerCase() === 'consultant' ? 'consultants' : subfolder.toLowerCase();

    if (this.isS3Enabled()) {
      try {
        const bucket = this.getBucketName();
        const key = `${targetFolder}/${filename}`;
        const s3 = this.getS3Client();
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    } else {
      const localPath = path.join(this.uploadsRoot, targetFolder, filename);
      return fs.existsSync(localPath);
    }
  }
}

export const storageService = new StorageService();
