import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, ToastController } from '@ionic/angular';
import { Socket } from 'ngx-socket-io';
import { Observable, Subject, Subscription } from 'rxjs';
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service';
import { DrawData, wait } from '../../../interfaces/draw.interfaces';
import DRAWS_MOCKS from '../../../mocks/draws.json';
import { DrawService } from '../../sdk/draw/draw.service';
import { Draw } from '../../sdk/draw/entities/draw.entity';
import { DrawStatus } from '../../sdk/draw/enums/draw-status.enum';
import { PaginationResponse } from '../../sdk/draw/interfaces/pagination-response.inteface';
import { WebSocketFirebaseCommunicator } from '../../services/web-sockets-firebase.communicator';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {

  loading = true;
  draws: Draw<DrawData>[] = [];

  DrawStatus = DrawStatus;

  pagination: PaginationResponse<Draw> = {
    page: 1,
    pageCount: 1,
    totalCount: 1,
    items: []
  };

  currentUser: any;
  userSubscription: Subscription;
  drawsSubscription: Subscription;

  constructor(
    private socket: Socket,
    private toastCtrl: ToastController,
    public authSrvc: FirebaseAuthService,
    public router: Router,
    public actionSheetCtrl: ActionSheetController,
    public wsConnector: WebSocketFirebaseCommunicator,
    public changeDetector: ChangeDetectorRef,
    public ngZone: NgZone,
  ) {

  }

  async ngOnInit() {

    this.userSubscription = this.authSrvc.user$.asObservable()
    .subscribe(async user => {
      if (user && this.authSrvc.keyPair) {
        this.currentUser = user;
        await this.connectToSocket();
        DrawService.setCommunicator(this.wsConnector);
        await this.getDraws();
      } else {
        this.ngZone.run(() => this.router.navigate(['/']));
      }
    });

  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.drawsSubscription) {
      this.drawsSubscription.unsubscribe();
    }
  }

  async getDraws() {
    this.loading = true;
    this.drawsSubscription = (await DrawService.subscribeToDrawsList())
      .subscribe(draws => {
        this.draws = draws.map(draw => new Draw<DrawData>(draw));
        console.log(`🚀 ~ file: home.page.ts ~ line 154 ~ HomePage ~ connectToSocket ~ draws`, draws);
        this.loading = false;
        this.changeDetector.detectChanges();
      });

    return this.drawsSubscription;
  }

  /**
   * @TODO check status before entering draw page
   */

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

  async connectToSocket() {

    await this.wsConnector.openConnection({
      socket: this.socket,
      firebaseAuthToken: this.authSrvc.authToken,
      userId: this.currentUser.uid,
      publicKey: this.authSrvc.keyPair.publicKey,
    });

  }

  ionViewWillLeave() {
    // this.socket.disconnect();
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
