import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Socket } from 'ngx-socket-io';
import { Draw } from '../../../interfaces/draw.interfaces';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { WebSocketFirebaseCommunicator } from '../../services/web-sockets-firebase.communicator';

@Component({
  selector: 'app-create-draw',
  templateUrl: './create-draw.page.html',
  styleUrls: ['./create-draw.page.scss'],
})
export class CreateDrawPage implements OnInit {

  public draw: Draw = {
    data: {},
  };

  user: any;

  constructor(
    public socket: Socket,
    public wsConnector: WebSocketFirebaseCommunicator,
    public authSrvc: FirebaseAuthService,
    public toastCtrl: ToastController,
    public router: Router,
  ) { }

  ngOnInit() {
    this.user = this.authSrvc.currentUser;
  }

  async createDraw() {

    const loading = await this.showLoading();
    console.log('Creating draw...');

    const draw: Draw = {
      spots: this.draw.spots,
      data: this.draw.data,
    };

    const createdDrawEvent = await this.wsConnector.createDraw(draw)
      .catch(err => {
        console.error(err);
        this.showToast('Erro ao criar sorteio', 4000, 'danger');
        loading.dismiss();
      });

    if (createdDrawEvent) {
      loading.dismiss();
      this.showToast('Sorteio criado com sucesso!', 3000, 'success');
      this.router.navigate(['/home']);
    }
  }

  async showLoading() {
    return await this.showToast(
      'Carregando...',
      null,
      'dark',
      'top',
    );
  }

  async showToast(msg, duration = 2000, color = 'light', position = 'bottom') {
    const toast = await this.toastCtrl.create({
      message: msg,
      position: position as any,
      duration,
      color,
    });
    toast.present();

    return toast;
  }

}
