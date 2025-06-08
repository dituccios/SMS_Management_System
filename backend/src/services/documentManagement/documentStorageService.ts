import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const prisma = new PrismaClient();

export interface StorageConfig {
  type: 'local' | 'aws-s3' | 'azure-blob';
  basePath: string;
  encryption: boolean;
  compression: boolean;
  backup: boolean;
}

export interface FileMetadata {
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  encryptionKey?: string;
  isEncrypted: boolean;
  isCompressed: boolean;
}

export class DocumentStorageService {
  private readonly config: StorageConfig;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  constructor() {
    this.config = {
      type: (process.env.STORAGE_TYPE as any) || 'local',
      basePath: process.env.STORAGE_BASE_PATH || './storage/documents',
      encryption: process.env.STORAGE_ENCRYPTION === 'true',
      compression: process.env.STORAGE_COMPRESSION === 'true',
      backup: process.env.STORAGE_BACKUP === 'true'
    };
    
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      if (this.config.type === 'local') {
        await fs.mkdir(this.config.basePath, { recursive: true });
        await fs.mkdir(path.join(this.config.basePath, 'backups'), { recursive: true });
        await fs.mkdir(path.join(this.config.basePath, 'temp'), { recursive: true });
      }
    } catch (error) {
      logger.error('Failed to initialize storage:', error);
    }
  }

  // File Storage Operations
  async storeFile(
    file: Buffer, 
    fileName: string, 
    companyId: string, 
    options?: { encrypt?: boolean; compress?: boolean }
  ): Promise<FileMetadata> {
    try {
      const fileId = crypto.randomUUID();
      const fileExtension = path.extname(fileName);
      const storedFileName = `${fileId}${fileExtension}`;
      const companyPath = path.join(this.config.basePath, companyId);
      const filePath = path.join(companyPath, storedFileName);

      // Ensure company directory exists
      await fs.mkdir(companyPath, { recursive: true });

      // Calculate original checksum
      const originalChecksum = crypto.createHash('sha256').update(file).digest('hex');

      let processedFile = file;
      let encryptionKey: string | undefined;
      let isEncrypted = false;
      let isCompressed = false;

      // Compress if enabled
      if (options?.compress || this.config.compression) {
        processedFile = await this.compressFile(processedFile);
        isCompressed = true;
      }

      // Encrypt if enabled
      if (options?.encrypt || this.config.encryption) {
        const encryptionResult = await this.encryptFile(processedFile);
        processedFile = encryptionResult.encryptedData;
        encryptionKey = encryptionResult.key;
        isEncrypted = true;
      }

      // Store file
      await fs.writeFile(filePath, processedFile);

      // Create backup if enabled
      if (this.config.backup) {
        await this.createBackup(filePath, storedFileName, companyId);
      }

      const metadata: FileMetadata = {
        fileName: storedFileName,
        originalFileName: fileName,
        mimeType: this.getMimeType(fileName),
        fileSize: file.length,
        checksum: originalChecksum,
        encryptionKey,
        isEncrypted,
        isCompressed
      };

      logger.info(`File stored: ${storedFileName}`, {
        companyId,
        fileSize: file.length,
        isEncrypted,
        isCompressed
      });

      return metadata;
    } catch (error) {
      logger.error('Failed to store file:', error);
      throw error;
    }
  }

  async retrieveFile(fileName: string, companyId: string, metadata?: FileMetadata): Promise<Buffer> {
    try {
      const filePath = path.join(this.config.basePath, companyId, fileName);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new Error('File not found');
      }

      let fileData = await fs.readFile(filePath);

      // Decrypt if encrypted
      if (metadata?.isEncrypted && metadata.encryptionKey) {
        fileData = await this.decryptFile(fileData, metadata.encryptionKey);
      }

      // Decompress if compressed
      if (metadata?.isCompressed) {
        fileData = await this.decompressFile(fileData);
      }

      // Verify checksum if available
      if (metadata?.checksum) {
        const currentChecksum = crypto.createHash('sha256').update(fileData).digest('hex');
        if (currentChecksum !== metadata.checksum) {
          logger.warn(`Checksum mismatch for file: ${fileName}`, {
            expected: metadata.checksum,
            actual: currentChecksum
          });
        }
      }

      return fileData;
    } catch (error) {
      logger.error('Failed to retrieve file:', error);
      throw error;
    }
  }

  async deleteFile(fileName: string, companyId: string): Promise<void> {
    try {
      const filePath = path.join(this.config.basePath, companyId, fileName);
      
      // Move to deleted folder instead of permanent deletion
      const deletedPath = path.join(this.config.basePath, 'deleted', companyId);
      await fs.mkdir(deletedPath, { recursive: true });
      
      const deletedFilePath = path.join(deletedPath, `${Date.now()}_${fileName}`);
      await fs.rename(filePath, deletedFilePath);

      logger.info(`File moved to deleted: ${fileName}`, { companyId });
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  async moveFile(oldPath: string, newPath: string, companyId: string): Promise<void> {
    try {
      const oldFilePath = path.join(this.config.basePath, companyId, oldPath);
      const newFilePath = path.join(this.config.basePath, companyId, newPath);
      
      // Ensure destination directory exists
      await fs.mkdir(path.dirname(newFilePath), { recursive: true });
      
      await fs.rename(oldFilePath, newFilePath);

      logger.info(`File moved: ${oldPath} -> ${newPath}`, { companyId });
    } catch (error) {
      logger.error('Failed to move file:', error);
      throw error;
    }
  }

  async copyFile(sourcePath: string, destPath: string, companyId: string): Promise<void> {
    try {
      const sourceFilePath = path.join(this.config.basePath, companyId, sourcePath);
      const destFilePath = path.join(this.config.basePath, companyId, destPath);
      
      // Ensure destination directory exists
      await fs.mkdir(path.dirname(destFilePath), { recursive: true });
      
      await fs.copyFile(sourceFilePath, destFilePath);

      logger.info(`File copied: ${sourcePath} -> ${destPath}`, { companyId });
    } catch (error) {
      logger.error('Failed to copy file:', error);
      throw error;
    }
  }

  // File Information
  async getFileInfo(fileName: string, companyId: string): Promise<any> {
    try {
      const filePath = path.join(this.config.basePath, companyId, fileName);
      const stats = await fs.stat(filePath);

      return {
        fileName,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      logger.error('Failed to get file info:', error);
      throw error;
    }
  }

  async listFiles(companyId: string, directory = ''): Promise<string[]> {
    try {
      const dirPath = path.join(this.config.basePath, companyId, directory);
      const files = await fs.readdir(dirPath);
      return files;
    } catch (error) {
      logger.error('Failed to list files:', error);
      throw error;
    }
  }

  // Storage Analytics
  async getStorageUsage(companyId: string): Promise<any> {
    try {
      const companyPath = path.join(this.config.basePath, companyId);
      const usage = await this.calculateDirectorySize(companyPath);

      const fileCount = await this.countFiles(companyPath);

      return {
        totalSize: usage,
        fileCount,
        averageFileSize: fileCount > 0 ? usage / fileCount : 0,
        companyId
      };
    } catch (error) {
      logger.error('Failed to get storage usage:', error);
      throw error;
    }
  }

  async getStorageStats(): Promise<any> {
    try {
      const totalSize = await this.calculateDirectorySize(this.config.basePath);
      const companies = await fs.readdir(this.config.basePath);
      
      const companyStats = await Promise.all(
        companies.map(async (companyId) => {
          const companyPath = path.join(this.config.basePath, companyId);
          const stats = await fs.stat(companyPath);
          
          if (stats.isDirectory()) {
            return await this.getStorageUsage(companyId);
          }
          return null;
        })
      );

      return {
        totalSize,
        totalCompanies: companyStats.filter(Boolean).length,
        companyStats: companyStats.filter(Boolean)
      };
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  // Private Helper Methods
  private async encryptFile(data: Buffer): Promise<{ encryptedData: Buffer; key: string }> {
    try {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.encryptionAlgorithm, key);
      
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
      const tag = cipher.getAuthTag();
      
      const encryptedData = Buffer.concat([iv, tag, encrypted]);
      const keyString = key.toString('base64');

      return { encryptedData, key: keyString };
    } catch (error) {
      logger.error('Failed to encrypt file:', error);
      throw error;
    }
  }

  private async decryptFile(encryptedData: Buffer, keyString: string): Promise<Buffer> {
    try {
      const key = Buffer.from(keyString, 'base64');
      const iv = encryptedData.slice(0, 16);
      const tag = encryptedData.slice(16, 32);
      const encrypted = encryptedData.slice(32);
      
      const decipher = crypto.createDecipher(this.encryptionAlgorithm, key);
      decipher.setAuthTag(tag);
      
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt file:', error);
      throw error;
    }
  }

  private async compressFile(data: Buffer): Promise<Buffer> {
    try {
      const zlib = await import('zlib');
      return new Promise((resolve, reject) => {
        zlib.gzip(data, (err, compressed) => {
          if (err) reject(err);
          else resolve(compressed);
        });
      });
    } catch (error) {
      logger.error('Failed to compress file:', error);
      throw error;
    }
  }

  private async decompressFile(data: Buffer): Promise<Buffer> {
    try {
      const zlib = await import('zlib');
      return new Promise((resolve, reject) => {
        zlib.gunzip(data, (err, decompressed) => {
          if (err) reject(err);
          else resolve(decompressed);
        });
      });
    } catch (error) {
      logger.error('Failed to decompress file:', error);
      throw error;
    }
  }

  private async createBackup(filePath: string, fileName: string, companyId: string): Promise<void> {
    try {
      const backupPath = path.join(this.config.basePath, 'backups', companyId);
      await fs.mkdir(backupPath, { recursive: true });
      
      const backupFileName = `${Date.now()}_${fileName}`;
      const backupFilePath = path.join(backupPath, backupFileName);
      
      await fs.copyFile(filePath, backupFilePath);
    } catch (error) {
      logger.error('Failed to create backup:', error);
    }
  }

  private getMimeType(fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  private async calculateDirectorySize(dirPath: string): Promise<number> {
    try {
      let totalSize = 0;
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          totalSize += await this.calculateDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  private async countFiles(dirPath: string): Promise<number> {
    try {
      let fileCount = 0;
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          fileCount += await this.countFiles(filePath);
        } else {
          fileCount++;
        }
      }

      return fileCount;
    } catch (error) {
      return 0;
    }
  }
}

export default new DocumentStorageService();
