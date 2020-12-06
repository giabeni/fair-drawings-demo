/**
 * Static service to provide methods for secure communication.
 * Such as signing messages, verifying hashes, cypher etc.
 */
export class SecurityService {
  public static readonly KEY_ALGORITHM = 'ECDSA';
  public static readonly HASH_METHOD = 'SHA-384';
  public static readonly CURVE_METHOD = 'P-384';

  /**
   * Generates the key pair for assimetric encryption.
   */
  public static async generateKeyPair() {
    // return crypto.generateKeyPairSync(this.AUTH_METHOD, { modulusLength: 2048 });
    return await crypto.subtle.generateKey(
      {
        name: this.KEY_ALGORITHM,
        namedCurve: this.CURVE_METHOD,
      },
      true,
      ['sign', 'verify']
    );
  }

  /**
   * Signs some data with a private key.
   * @param data: the data in string or binary.
   * @param privateKey: the private key in KeyObject format.
   */
  public static async sign(dataEncoded: Uint8Array, privateKey: JsonWebKey) {
    const importedPrivateKey = await this.importKey(privateKey, 'sign');
    return await crypto.subtle.sign(
      {
        name: this.KEY_ALGORITHM,
        hash: { name: this.HASH_METHOD },
      },
      importedPrivateKey,
      dataEncoded,
    );
  }

  /**
   * Verifies if the data was previously signed by the owner of the public key.
   * @param data: data to verify in string or binary.
   * @param publicKey: the public of the expected owner.
   * @param signature: the signature associated to the data.
   */
  public static async verifySignature(dataEncoded: Uint8Array, publicKey: JsonWebKey, signature: ArrayBuffer) {
    const importedPublicKey = await this.importKey(publicKey, 'verify');
    return await crypto.subtle.verify(
      {
        name: this.KEY_ALGORITHM,
        hash: { name: this.HASH_METHOD },
      },
      importedPublicKey,
      signature,
      dataEncoded,
    );
  }

  public static async exportKey(key: CryptoKey) {
    return await crypto.subtle.exportKey(
      'jwk',
      key
    );
  }

  public static async importKey(jsonKey: JsonWebKey, ops: 'sign' | 'verify') {
    return await crypto.subtle.importKey(
      'jwk',
      jsonKey,
      {
        name: this.KEY_ALGORITHM,
        namedCurve: this.CURVE_METHOD,
      },
      true,
      [ops],
    );
  }
}
