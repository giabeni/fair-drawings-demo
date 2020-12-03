import * as crypto from 'crypto';

/**
 * Static service to provide methods for secure communication.
 * Such as signing messages, verifying hashes, cypher etc.
 */
export class SecurityService {
  public static readonly AUTH_METHOD = 'rsa';
  public static readonly SIGN_METHOD = 'SHA256';
  public static readonly CIPHER_MEHTOD = 'AES';

  /**
   * Generates the key pair for assimetric encryption.
   */
  public static generateKeyPair() {
    return crypto.generateKeyPairSync(this.AUTH_METHOD, { modulusLength: 2048 });
  }

  /**
   * Signs some data with a private key.
   * @param data: the data in string or binary.
   * @param privateKey: the private key in KeyObject format.
   */
  public static sign(data: crypto.BinaryLike, privateKey: crypto.KeyObject) {
    const sign = crypto.createSign(this.SIGN_METHOD);
    sign.update(data);
    sign.end();
    return sign.sign(privateKey);
  }

  /**
   * Verifies if the data was previously signed by the owner of the public key.
   * @param data: data to verify in string or binary.
   * @param publicKey: the public of the expected owner.
   * @param signature: the signature associated to the data.
   */
  public static verifySignature(data: crypto.BinaryLike, publicKey: crypto.KeyObject, signature: Buffer) {
    const verify = crypto.createVerify(this.SIGN_METHOD);
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature);
  }

  /**
   * Returns a pseudo-random string.
   */
  public static getRandomString() {
    return crypto.randomBytes(16).toString('hex');
  }
}
