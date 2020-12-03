import { HashOptions } from '../enums/hash-options.enum';

/**
 * Object that represents the commit AFTER it is encrypted
 */
export interface Commit {
  /**
   * The value resulted from the hash function + nonce
   */
  digest: string;

  /**
   * The timestamp when the commit was CREATED
   */
  timestamp: number;

  /**
   * The hash function used to encrypt the data
   */
  hashFunction: HashOptions;

  /**
   * The user authentication token
   */
  userId: string;
}
