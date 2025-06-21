import CryptoJS from 'crypto-js';
import { config } from '../config';

export class EncryptionService {
  private static readonly key = config.encryption.key;

  static encrypt(text: string): string {
    const encrypted = CryptoJS.AES.encrypt(text, this.key).toString();
    return encrypted;
  }

  static decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  }

  static encryptCredentials(username: string, password: string): string {
    const credentials = JSON.stringify({ username, password });
    return this.encrypt(credentials);
  }

  static decryptCredentials(encryptedCredentials: string): { username: string; password: string } {
    const decrypted = this.decrypt(encryptedCredentials);
    return JSON.parse(decrypted);
  }
}