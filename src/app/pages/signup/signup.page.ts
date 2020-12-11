import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
})
export class SignupPage implements OnInit {

  unlogged = false;

  constructor(
    public authSrvc: FirebaseAuthService,
    public router: Router,
    public toastCtrl: ToastController,
  ) { }

  ngOnInit() {
    this.authSrvc.user$.subscribe(async user => {
      if (user) {
        (await this.toastCtrl.create({
          header: `Olá, ${user.displayName}!`,
          // message: 'Autenticação confirmada...',
          duration: 2000,
        })).present();

        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 100);

      } else {
        this.unlogged = true;
      }
    });
  }

  async googleLogin() {
    this.unlogged = false;

    const authResponse = await this.authSrvc.signInWithGoogle()
    .catch(err => {
      console.error('Erro google login', err);
      this.unlogged = true;
      alert('Erro ao fazer login com o Google' + JSON.stringify(err));
    });

    console.log(`🚀 ~ file: signup.page.ts ~ line 20 ~ SignupPage ~ googleLogin ~ authResponse`, authResponse);

    // .then((result: any) => {
    //   console.log(`🚀 ~ file: signup.page.ts ~ line 21 ~ SignupPage ~ .then ~ result`, result);
    //   if (result.additionalUserInfo) {
    //     this.authSrvc.setProviderAdditionalInfo(result.additionalUserInfo.profile);
    //   }
    //   // This gives you a Google Access Token. You can use it to access the Google API.
    //   // const token = result.credential.accessToken;
    //   // The signed-in user info is in result.user;
    //   // this.redirectLoggedUserToProfilePage();
    // }).catch((error) => {
    //   // Handle Errors here.
    //   console.log(error);
    // });
  }

}
