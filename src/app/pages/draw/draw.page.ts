import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Draw, DrawStatus, wait } from '../../../interfaces/draw.interfaces';
import DRAWS_MOCKS from '../../../mocks/draws.json';
import USERS_MOCKS from '../../../mocks/users.json';
import { WebSocketFirebaseCommunicator } from '../../services/web-sockets-firebase.communicator';

@Component({
  selector: 'app-draw',
  templateUrl: './draw.page.html',
  styleUrls: ['./draw.page.scss'],
})
export class DrawPage implements OnInit {

  private uuid?: string;

  public draw: Draw;
  private drawEvents$: Subscription;

  loading = false;

  DrawStatus = DrawStatus;

  modals = {
    sendCommit: false,
    sendReveal: false,
    viewDetails: false,
  };
  modalOpen = false;

  constructor(
    private route: ActivatedRoute,
    public wsCommunicator: WebSocketFirebaseCommunicator,
    private toastCtrl: ToastController,
    private changeDetector: ChangeDetectorRef,
    ) { }

  ngOnInit() {
    this.route.params.subscribe(async params => {
      if (params && params.uuid) {
        this.uuid = params.uuid;
        this.loading = true;
        await this.joinDraw();
        await this.getDraw();
        this.loading = false;
        this.changeDetector.detectChanges();
      }
    });
  }

  async getDraw() {
    this.draw = await this.wsCommunicator.getDraw(this.uuid)
    .catch(err => {
      console.error('Error getting draw', err);
      this.showToast(
        'Erro ao ler dados do sorteio',
        5000,
        'danger',
        'bottom',
        );
      return undefined;
    });

    if (!this.draw) { return; }

    console.log(`🚀 ~ file: draw.page.ts ~ line 51 ~ DrawPage ~ getDraw ~ this.draw`, this.draw);

  }

  async joinDraw() {
    this.drawEvents$ = (await this.wsCommunicator.listen(this.uuid))
      .subscribe(event => {
        console.log('NEW DRAW EVENT:', event);
        this.showToast(
          'Novo evento recebido',
          1000
        );
      });
  }

  async getDrawMock() {
    /** @TODO call DrawService.getDraw */
    this.loading = true;

    const draw = DRAWS_MOCKS.find(d => d.uuid === this.uuid);

    await wait(1000);
    this.draw = {
      data: {
        ...draw,
        private: false,
      },
      uuid: draw.uuid,
      spots: draw.spots,
      status: draw.status,
      candidatesCount: draw.candidatesCount > draw.spots ? draw.spots : draw.candidatesCount,
      candidates: [],
    };

    for (let i = 0; i < this.draw.candidatesCount; i++) {
      const randomIndex = Math.floor(Math.random() * 100);
      const candidate = USERS_MOCKS[randomIndex];

      this.draw.candidates.push(candidate);
    }
    console.log('🚀 ~ file: draw.page.ts ~ line 52 ~ DrawPage ~ getDraw ~ this.draw', this.draw);

    this.loading = false;
  }

  async openModal(modal: string) {
    this.modals[modal] = true;

    await wait(10);
    this.modalOpen = true;
  }

  async closeModal(modal: string) {
    this.modalOpen = false;

    await wait(600);
    this.modals[modal] = false;
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
