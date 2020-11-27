import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable, Subject, from, BehaviorSubject } from 'rxjs';
import { Platform } from '@ionic/angular';
import { filter, map, take } from 'rxjs/operators';
import firebase from 'firebase/app';
import { Router } from '@angular/router';

export type User = any;

@Injectable()
export class FirebaseAuthService {

  currentUser: any;
  userProviderAdditionalInfo: any;
  redirectResult: Subject<any> = new Subject<any>();
  user$ = new BehaviorSubject<any>(undefined);

  constructor(
    public angularFireAuth: AngularFireAuth,
    public platform: Platform,
    public router: Router,
  ) {
    this.angularFireAuth.onAuthStateChanged((user) => {
      console.log(`AuthStateChanged - user:`, user);
      if (user) {
        // User is signed in.
        this.currentUser = user;
        this.user$.next(this.currentUser);
      } else {
        // No user is signed in.
        this.currentUser = null;
        this.user$.next(null);
        this.router.navigate(['/']);
      }
    });

    // when using signInWithRedirect, this listens for the redirect results
    this.angularFireAuth.getRedirectResult()
    .then((result) => {
      // result.credential.accessToken gives you the Provider Access Token. You can use it to access the Provider API.
      if (result.user) {
        this.setProviderAdditionalInfo(result.additionalUserInfo.profile);
        this.currentUser = result.user;
        this.redirectResult.next(result);
      }
    }, (error) => {
      this.redirectResult.next({error: error.code});
    });
  }

  getRedirectResult(): Observable<any> {
    return this.redirectResult.asObservable();
  }

  setProviderAdditionalInfo(additionalInfo: any) {
    this.userProviderAdditionalInfo = {...additionalInfo};
  }

  public getProfileDataSource() {
    return this.angularFireAuth.user
    .pipe(
      filter((user: User) => user != null),
      map((user: User) => {
        return this.getProfileData();
      }),
      take(1) // this.angularFireAuth.user never completes so we use take(1) in order to complete after the first value is emitted
    );
  }

  public getProfileData() {
    const userModel: any = {};
    let providerData: any = this.currentUser.providerData[0];

    if (this.userProviderAdditionalInfo) {
      providerData = {...providerData, ...this.userProviderAdditionalInfo};
    }

    // Default imgs are too small and our app needs a bigger image
    switch (providerData.providerId) {
      case 'facebook.com':
        userModel.image = providerData.photoURL + '?height=400';
        break;
      case 'password':
        userModel.image = 'https://s3-us-west-2.amazonaws.com/ionicthemes/otros/avatar-placeholder.png';
        break;
      case 'twitter.com':
        userModel.image = providerData.photoURL.replace('_normal', '_400x400');
        break;
      case 'google.com':
        userModel.image = providerData.photoURL.split('=')[0];
        break;
      default:
        userModel.image = providerData.photoURL;
    }
    userModel.name = providerData.name || providerData.displayName || 'What\'s your name?';
    userModel.role = 'How would you describe yourself?';
    userModel.description = providerData.description || 'Anything else you would like to share with the world?';
    userModel.phoneNumber = providerData.phoneNumber || 'Is there a number where I can reach you?';
    userModel.email = providerData.email || 'Where can I send you emails?';
    userModel.provider = (providerData.providerId !== 'password') ? providerData.providerId : 'Credentials';

    return userModel;
  }

  signOut(): Observable<any> {
    return from(this.angularFireAuth.signOut());
  }

  signInWithEmail(email: string, password: string): Promise<firebase.auth.UserCredential> {
    return this.angularFireAuth.signInWithEmailAndPassword(email, password);
  }

  signUpWithEmail(email: string, password: string): Promise<firebase.auth.UserCredential> {
    return this.angularFireAuth.createUserWithEmailAndPassword(email, password);
  }

  socialSignIn(provider: any, scopes?: Array<string>): Promise<any> {
    // add any permission scope you need
    if (scopes) {
      scopes.forEach(scope => {
        provider.addScope(scope);
      });
    }

    if (this.platform.is('desktop')) {
      return firebase.auth().signInWithPopup(provider);
    } else {
      // web but not desktop, for example mobile PWA
      return firebase.auth().signInWithRedirect(provider);
    }
  }

  signInWithFacebook() {
    const provider = new firebase.auth.FacebookAuthProvider();
    // const scopes = ['user_birthday'];
    return this.socialSignIn(provider);
  }

  signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const scopes = ['profile', 'email'];
    return this.socialSignIn(provider, scopes);
  }

  signInWithTwitter() {
    const provider = new firebase.auth.TwitterAuthProvider();
    return this.socialSignIn(provider);
  }
}