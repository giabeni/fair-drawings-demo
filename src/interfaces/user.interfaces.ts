export interface FirebaseUser {
  uid: string;
  refreshToken: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  photoUrl: string;
  [key: string]: string | object | boolean;
}
