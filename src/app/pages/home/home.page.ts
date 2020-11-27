import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { Socket } from 'ngx-socket-io';
import { Observable, Subject, Subscription } from 'rxjs';
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service';
import { Draw, DrawStatus, PaginationResponse, wait } from '../../../interfaces/draw.interfaces';
import DRAWS_MOCKS from '../../../mocks/draws.json';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {

  loading = false;
  draws: Draw[] = [];

  DrawStatus = DrawStatus;

  pagination: PaginationResponse<Draw> = {
    page: 1,
    pageCount: 1,
    totalCount: 1,
    items: []
  };

  currentUser: any;
  userSubscription: Subscription;


  message = '';
  messages = [];



  constructor(
    private socket: Socket,
    private toastCtrl: ToastController,
    public authSrvc: FirebaseAuthService,
    public router: Router,
    public actionSheetCtrl: ActionSheetController,
  ) {}

  ngOnInit() {
    this.getDraws();

    this.connectToSocket();

    this.userSubscription = this.authSrvc.user$.asObservable().subscribe(user => {
      console.log(`🚀 ~ file: home.page.ts ~ line 48 ~ HomePage ~ this.userSubscription=this.authSrvc.user$.asObservable ~ user`, user);
      if (user) {
        this.currentUser = user;
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  async getDraws() {
    /** @TODO replace to DrawSerive.getDraws */
    this.loading = this.pagination.page === 1;

    await wait(1000);

    const perPage = 10;
    this.pagination.pageCount = Math.ceil(DRAWS_MOCKS.length / perPage);
    const start = this.pagination.page * perPage;
    const end = start + perPage;
    console.log('🚀 ~ file: home.page.ts ~ line 50 ~ HomePage ~ newDraws ~ DRAWS_MOCKS', Array.from(DRAWS_MOCKS));
    const newDraws = DRAWS_MOCKS.slice(start, end).map(draw => {
      return {
        data: {
          ...draw,
          private: false,
        },
        uuid: draw.uuid,
        spots: draw.spots,
        status: draw.status,
        candidatesCount: draw.candidatesCount > draw.spots ? draw.spots : draw.candidatesCount,
      };
    }) as Draw[];

    if (this.pagination.page === 1) {
      this.draws = newDraws;
    } else {
      this.draws.push(...newDraws);
    }

    this.loading = false;

  }

  async loadNextPage(event) {
    this.pagination.page++;

    await this.getDraws();

    event.target.complete();

    event.target.disabled = this.pagination.page >= this.pagination.pageCount;

  }

  async refresh(event) {
    this.pagination.page = 1;

    await this.getDraws();

    event.target.complete();
  }

  async openProfile() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.currentUser.displayName,
      // cssClass: 'my-custom-class',
      buttons: [{
        text: 'Sair',
        role: 'destructive',
        icon: 'log-out-outline',
        handler: async () => {
          this.authSrvc.signOut().subscribe(resp => {
            this.router.navigate(['/']);
          });
        }
      }, {
        text: 'Fechar',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });
    await actionSheet.present();
  }

  connectToSocket() {
    this.socket.connect();

    const name = `user-${new Date().getTime()}`;
    // this.currentUser.name = name;

    this.socket.emit('draw', name);

    this.socket.fromEvent('users').subscribe((data: any) => {
      console.log(`🚀 ~ file: home.page.ts ~ line 102 ~ HomePage ~ this.socket.fromEvent ~ data`, data);
      const user = data.user;
      if (data.event === 'left') {
        this.showToast('User left: ' + user);
      } else {
        this.showToast('User joined: ' + user);
      }
    });

    this.socket.fromEvent('message').subscribe(message => {
      this.messages.push(message);
    });

  }


  sendMessage() {
    this.socket.emit('send-message', { text: this.message });
    this.message = '';
  }

  ionViewWillLeave() {
    this.socket.disconnect();
  }

  async showToast(msg) {
    const toast = await this.toastCtrl.create({
      message: msg,
      position: 'top',
      duration: 2000
    });
    toast.present();
  }

}
