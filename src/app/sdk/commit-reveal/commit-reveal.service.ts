import { RawCommit } from './interfaces/raw-commit.interface';
import { HashOptions } from './enums/hash-options.enum';
import * as Sha256 from 'js-sha256';
import * as Sha512 from 'js-sha512';
import { Commit } from './interfaces/commit.interface';
import { Reveal } from './interfaces/reveal.interface';

export const DIGEST_DELIMITER = '_';

/**
 * Static class to handle commits and reveals
 */
export class CommitRevealService {
  public static createCommit(raw: RawCommit, hashFunction: HashOptions = HashOptions.SHA_256): Commit {
    return {
      digest: CommitRevealService.encrypt(raw.data, raw.nonce, raw.metadata, hashFunction),
      timestamp: new Date().getTime(),
      hashFunction,
      userId: raw.userId,
    };
  }

  public static createReveal(reveal: RawCommit): Reveal {
    return {
      ...reveal,
      timestamp: new Date().getTime(),
    };
  }

  public static validateReveal(reveal: Reveal, commit: Commit) {
    return (
      CommitRevealService.encrypt(reveal.data, reveal.nonce, reveal.metadata, commit.hashFunction) === commit.digest &&
      reveal.userId === commit.userId
    );
  }

  public static getDigestFromReveal(reveal: Reveal, commit: Commit) {
      return CommitRevealService.encrypt(reveal.data, reveal.nonce, reveal.metadata, commit.hashFunction);
  }

  public static checkCommitFormat(commit: Commit) {
    return (
      !!commit &&
      !!commit.digest &&
      !!commit.hashFunction &&
      commit.digest.length === CommitRevealService.getHashDigestLength(commit.hashFunction)
    );
  }

  public static getRandomNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private static encrypt(data: string, nonce: string, metadata?: any, hashFunction = HashOptions.SHA_256) {
    if (metadata) {
      try {
        metadata = JSON.stringify(metadata);
      } catch (e) {
        throw new Error('ERR_STRINGIFY_METADATA: Could not format metadata as string to encrypt');
      }
    } else {
      metadata = '';
    }
    return CommitRevealService.hash(data + DIGEST_DELIMITER + nonce + DIGEST_DELIMITER + metadata, hashFunction);
  }

  private static hash(data: string, hashFunction = HashOptions.SHA_256) {
    switch (hashFunction) {
      case HashOptions.SHA_256:
        return Sha256.sha256.create().update(data).toString();

      case HashOptions.SHA_224:
        return Sha256.sha224.create().update(data).toString();

      case HashOptions.SHA_384:
        return Sha512.sha384.create().update(data).toString();

      case HashOptions.SHA_512:
        return Sha512.sha512.create().update(data).toString();

      default:
        throw new Error('Hash function not supported.');
    }
  }

  private static getHashDigestLength(hashFunction = HashOptions.SHA_256) {
    switch (hashFunction) {
      case HashOptions.SHA_256:
        return Sha256.sha256.create().update('').toString().length;

      case HashOptions.SHA_224:
        return Sha256.sha224.create().update('').toString().length;

      case HashOptions.SHA_384:
        return Sha512.sha384.create().update('').toString().length;

      case HashOptions.SHA_512:
        return Sha512.sha512.create().update('').toString().length;

      default:
        throw new Error('Hash function not supported.');
    }
  }
}
