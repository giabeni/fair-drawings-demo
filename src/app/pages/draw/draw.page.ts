import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DrawData, wait } from '../../../interfaces/draw.interfaces';
import { DrawService } from '../../sdk/draw/draw.service';
import { Candidate } from '../../sdk/draw/entities/candidate.entity';
import { Draw } from '../../sdk/draw/entities/draw.entity';
import { DrawStatus } from '../../sdk/draw/enums/draw-status.enum';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import firebase from 'firebase/app';
import { DrawEventType } from '../../sdk/draw/enums/draw-event-type.enum';
import { DrawErrorEvent, DrawEvent } from '../../sdk/draw/interfaces/draw-event.interface';
import { SecurityService } from '../../sdk/security/security.service';
import { CommitRevealService } from '../../sdk/commit-reveal/commit-reveal.service';
import { Reveal } from '../../sdk/commit-reveal/interfaces/reveal.interface';
import { DrawAckType } from '../../sdk/draw/enums/draw-ack-type.enum';
import { SignedReveal } from '../../sdk/commit-reveal/interfaces/signed-reveal.interface';
import { SignedCommit } from '../../sdk/commit-reveal/interfaces/signed-commit.interface';

@Component({
  selector: 'app-draw',
  templateUrl: './draw.page.html',
  styleUrls: ['./draw.page.scss'],
})
export class DrawPage implements OnInit, OnDestroy {

  private uuid?: string;

  public draw: Draw<DrawData>;

  loading = false;

  DrawStatus = DrawStatus;

  modals = {
    sendCommit: false,
    sendReveal: false,
    viewDetails: false,
  };
  modalOpen = false;

  forms = {
    commit: {
      sentValue: null,
      sentNonce: null,
      value: null,
      nonce: null,
      hash: null,
    },
    reveal: {
      value: null,
      nonce: null,
      hash: null,
    }
  };

  details: {
    candidate?: Candidate;
  } = {};

  currentUser: firebase.User;

  subscriptions: {
    user?: Subscription,
    params?: Subscription,
    drawEvents?: Subscription,
  } = {};

  previousStatus: DrawStatus;
  showedAlerts = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastCtrl: ToastController,
    private changeDetector: ChangeDetectorRef,
    public alertCtrl: AlertController,
    public authSrvc: FirebaseAuthService,
    public ngZone: NgZone,
    ) { }

  ngOnInit() {

    if (!DrawService.getCommunicator()) {
      this.ngZone.run(() => this.router.navigate(['/']));
    }

    this.subscriptions.user = this.authSrvc.user$.subscribe(user => {
      this.currentUser = user;
    });

    console.log(`🚀 ~ file: draw.page.ts ~ line 58 ~ DrawPage ~ ngOnInit ~ this.currentUser`, this.currentUser);
    this.subscriptions.params = this.route.params.subscribe(async params => {
      if (params && params.uuid) {
        this.uuid = params.uuid;
        this.loading = true;
        await this.getDraw();
        await this.subscribeToDraw();
        if (this.draw.status === DrawStatus.PENDING) {
          await this.joinDraw();
        }
        this.loading = false;
        this.changeDetector.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    for (const subs in this.subscriptions) {
      if (this.subscriptions[subs]) {
        this.subscriptions[subs].unsubscribe();
      }
    }
  }

  async getDraw() {
    this.draw = await DrawService.getDraw(this.uuid)
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

    this.previousStatus = this.draw.status;

    console.log(`🚀 ~ file: draw.page.ts ~ line 51 ~ DrawPage ~ getDraw ~ this.draw`, this.draw);

  }

  async joinDraw() {
    await DrawService.joinDraw(this.draw);
  }

  async subscribeToDraw() {
    const drawStream = await DrawService.watchDraw(this.uuid, this.draw);
    this.subscriptions.drawEvents = drawStream.subscribe(async update => {

      console.log('UPDATE -' + update.event.type, update);
      this.draw = update.draw;

      this.changeDetector.detectChanges();

      if (this.draw.status !== this.previousStatus && !this.showedAlerts[this.draw.status]) {
        await this.showNewStatusAlert(this.draw.status);
      }

      this.previousStatus = this.draw.status;

      const toast = this.getEventToast(update.event);
      if (toast) {
        this.showToast(
          toast.text,
          2000,
          undefined,
          'top',
        );
      }
    });

  }

  async showNewStatusAlert(status: DrawStatus) {
    this.showedAlerts[status] = true;
    let alert: HTMLIonAlertElement;
    switch (status) {
      case DrawStatus.PENDING:
        alert = await this.alertCtrl.create({
          header: 'Aguardando participantes',
          subHeader: `Há ${this.draw.spots} disponíveis`,
          message: `
              O sorteio só se inicia quando todos participantes tiverem entrado na sala.
          `,
          buttons: [{
            text: 'Entendido',
            role: 'cancel',
            cssClass: 'success',
          }]
        });
        break;
      case DrawStatus.COMMIT:
        alert = await this.alertCtrl.create({
          header: 'Fase de Commit',
          subHeader: 'O sorteio começou!',
          message: `
              Nessa primeira fase de Commit, escolha um número de 0 até ${this.draw.spots * 10 - 1} para enviar aos participantes de forma protegida.
              Esse valor será revelado por você na etapa seguinte.
          `,
          buttons: [{
            text: 'Entendido',
            role: 'cancel',
            cssClass: 'success',
          }]
        });
        break;
      case DrawStatus.REVEAL:
        alert = await this.alertCtrl.create({
          header: 'Fase de Reveal',
          subHeader: 'Revele sua escolha!',
          message: `
              Todos participantes já enviaram seu número. Agora, todos deverão revelá-los para que possa definir quem será o sorteado.
              A ordem de revelação não importa, pois o aplicativo será capaz de identificar tentativas de alteração no número previamente escolhido.
              Caso alguém tente trapacear, o sorteio é automaticamente invalidado.
          `,
          buttons: [{
            text: 'Entendido',
            role: 'cancel',
            cssClass: 'success',
          }]
        });
        break;
      case DrawStatus.FINISHED:
        alert = await this.alertCtrl.create({
          header: 'Fase de Resultado',
          subHeader: 'Veja quem foi sorteado!',
          message: `
            Agora que todos participantes já revelaram suas escolhas de números, e elas foram validadas, o sistema irá definir o sorteado com sendo:
            o resto da divisão entre a soma dos números enviados e número de participantes.
          `,
          buttons: [{
            text: 'Entendido',
            role: 'cancel',
            cssClass: 'success',
          }]
        });
        break;
        alert = await this.alertCtrl.create({
          header: 'Fase de Commit',
          subHeader: 'O sorteio começou!',
          message: `
              Nessa primeira fase de Commit, escolha um número de 0 até ${this.draw.spots * 10 - 1} para enviar aos participantes de forma protegida.
              Esse valor será revelado por você na etapa seguinte.
          `,
          buttons: [{
            text: 'Entendido',
            role: 'cancel',
            cssClass: 'success',
          }]
        });
        break;
      case DrawStatus.INVALIDATED:
        alert = await this.alertCtrl.create({
          header: 'Sorteio Cancelado!',
          subHeader: 'Algo de estranho aconteceu...',
          message: `
            Para evitar resultados manipulados, quando um problema é detectado, o sorteio é automaticamente cancelado.
            Caso o erro tenha sido causado por má fé de algum participante, o sistema detecta e reporta na tela do sorteio.
          `,
          buttons: [{
            text: 'Verificar problema',
            role: 'cancel',
            cssClass: 'ion-text danger',
          }]
        });
        break;
    }


    return alert.present().then(() => {
      this.changeDetector.detectChanges();
    });
  }

  getCandidateBadge(candidate: Candidate) {
    if (this.draw.status === DrawStatus.PENDING) {
      return {
        color: 'medium',
        text: 'presente',
      };
    } else {
      const commit = this.draw.getCommitByCandidate(candidate);
      const reveal = this.draw.getRevealByCandidate(candidate);
      // Draw Finished
      if (this.draw.status === DrawStatus.FINISHED) {
        return  {
          color: 'dark',
          text: '',
        };
      } else
      // Reveal Phase
      if (reveal && reveal.valid) {
        return{
          color: 'success',
          text: 'reveal: ',
        };
      } else if (reveal && !reveal.valid) {
        return {
          color: 'warning',
          text: 'trapaceou!',
        };
      } else if (!reveal && this.draw.status === DrawStatus.REVEAL) {
        return {
          color: 'primary',
          text: 'reveal pendente',
        };
      } else
      // Commit Phase
      if (commit && commit.valid) {
        return  {
          color: 'success',
          text: 'ver commit',
        };
      } else if (commit && !commit.valid) {
        return {
          color: 'danger',
          text: 'commit inválido',
        };
      } else if (!commit && this.draw.status === DrawStatus.COMMIT) {
        return {
          color: 'primary',
          text: 'commit pendente',
        };
      }

      return {
        color: '',
        text: '',
      };

    }
  }

  getReadableDate(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' às ' + date.toLocaleTimeString();
  }

  getDigestFromReveal(candidate: Candidate) {
    const reveal = this.draw.getRevealByCandidate(candidate);
    const commit = this.draw.getCommitByCandidate(candidate);

    return CommitRevealService.getDigestFromReveal(reveal, commit);
  }

  async openModal(modal: 'sendCommit' | 'sendReveal' | 'viewDetails', candidate?: Candidate) {
    if (modal === 'sendCommit') {
      this.getRandomValue('commit');
      this.getRandomNonce('commit');
      this.getCommit('commit');
    } else if (modal === 'sendReveal') {
      this.forms.reveal.value = this.forms.commit.sentValue;
      this.forms.reveal.nonce = this.forms.commit.sentNonce;
      this.getCommit('reveal');
    } else if (modal === 'viewDetails' && !!candidate) {
      this.details = {
        candidate,
      };
    }
    this.modals[modal] = true;
    this.modalOpen = true;
    this.changeDetector.detectChanges();
  }

  async closeModal(modal: string) {
    this.modals[modal] = false;
    this.modalOpen = false;

    await wait(100);
    this.changeDetector.detectChanges();
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

  async leaveDraw() {
    if (this.draw.status === DrawStatus.FINISHED || this.draw.status === DrawStatus.INVALIDATED) {
      return await this.router.navigate(['/home']);
    }
    const alert = await this.alertCtrl.create({
      header: 'Sair do sorteio?',
      message: 'Deseja mesmo sair da sala de sorteio? Ao sair, o sorteio é cancelado.',
      buttons: [
        {
          text: 'Ficar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Stay in draw');
          }
        }, {
          text: 'Sair',
          cssClass: 'danger',
          role: 'destructive',
          handler: async () => {
            await DrawService.leaveDraw(this.draw);
            await this.router.navigate(['/home']);
          }
        }
      ]
    });

    await alert.present();
  }

  incrementNumber(form: 'commit'|'reveal') {
    let num = this.forms[form].value;
    if (num < this.draw.spots * 10 - 1) {
      num++;
    }
    this.forms[form].value = num;
    this.changeDetector.detectChanges();
  }

  decrementNumber(form: 'commit'|'reveal') {
    let num = this.forms[form].value;
    if (num > 0) {
      num--;
    }
    this.forms[form].value = num;
    this.changeDetector.detectChanges();
  }

  getRandomNonce(form: 'commit'|'reveal') {
    this.forms[form].nonce = CommitRevealService.getRandomNonce();
    this.changeDetector.detectChanges();
  }

  getRandomValue(form: 'commit'|'reveal') {
    this.forms[form].value = Math.floor(Math.random() * (this.draw.spots * 10 - 1));
    this.changeDetector.detectChanges();
  }

  getCommit(form: 'commit'|'reveal') {
    const value = this.forms[form].value;
    const nonce = this.forms[form].nonce;
    const commit = CommitRevealService.createCommit({
      data: String(value),
      nonce,
      userId: this.currentUser.uid,
      metadata: undefined,
    });

    this.forms[form].hash = commit.digest;
    this.changeDetector.detectChanges();
    return commit;
  }

  resetOriginalValue() {
    this.forms.reveal.value = this.forms.commit.sentValue;
    this.changeDetector.detectChanges();
  }

  resetOriginalNonce() {
    this.forms.reveal.nonce = this.forms.commit.sentNonce;
    this.changeDetector.detectChanges();
  }

  isCheating() {
    return  this.forms.reveal.value !== this.forms.commit.sentValue ||
            this.forms.reveal.nonce !== this.forms.commit.sentNonce;
  }

  async confirmCommit() {
    this.forms.commit.sentValue = this.forms.commit.value;
    this.forms.commit.sentNonce = this.forms.commit.nonce;

    const rawCommit = {
      data: String(this.forms.commit.value),
      nonce: this.forms.commit.nonce,
      userId: this.currentUser.uid,
      metadata: undefined,
    };

    const privateKey = this.authSrvc.keyPair.privateKey;
    console.log(`🚀 ~ file: draw.page.ts ~ line 415 ~ DrawPage ~ confirmCommit ~ privateKey`, privateKey);
    await DrawService.sendSignedCommit(this.draw.uuid, rawCommit, privateKey);
    await this.closeModal('commit');
  }

  async confirmReveal() {
    const reveal: Reveal = {
      data: String(this.forms.reveal.value),
      nonce: this.forms.reveal.nonce,
      userId: this.currentUser.uid,
      metadata: undefined,
      timestamp: null,
    };

    const privateKey = this.authSrvc.keyPair.privateKey;
    await DrawService.sendSignedReveal(this.draw.uuid, reveal, privateKey);
    await this.closeModal('reveala');
  }

  getEventToast(event: DrawEvent) {
    switch (event.type) {
      // new candidate subscribed to the draw
      case DrawEventType.CANDIDATE_SUBSCRIBED:
        return {
          text: `${event.data.profile.firstName} entrou no sorteio.`,
        };

      // candidate unsubscribed of the draw
      case DrawEventType.CANDIDATE_UNSUBSCRIBED:
        return {
          text: `${event.data.profile.firstName} saiu do sorteio.`,
        };


      // candidate send a commit
      case DrawEventType.COMMIT_RECEIVED:
        return {
          text: `${event.from.profile.firstName} enviou seu commit.`,
        };

      // candidate send a reveal
      case DrawEventType.REVEAL_RECEIVED:
        return {
          text: `${event.from.profile.firstName} enviou seu reveal.`,
        };

      // status changes
      case DrawEventType.STATUS_CHANGED:
        return undefined;

      // candidate send ack
      case DrawEventType.ACK:
        // if (event.data.type === DrawAckType.ALL_JOINED) {
        //   return `${event.from.profile.firstName} confirmou a entrada de todos participantes`;
        // } else if (event.data.type === DrawAckType.ALL_COMMITED) {
        //   return `${event.from.profile.firstName} confirmou o recebimento de todos commits`;
        // } else if (event.data.type === DrawAckType.ALL_REVEALED) {
        //   return `${event.from.profile.firstName} confirmou o recebimento de todos reveals`;
        // } else if (event.data.type === DrawAckType.FINISHED) {
        //   return `${event.from.profile.firstName} confirmou o resultado do sorteio`;
        // } else {
        //   return null;
        // }
        return undefined;

      default:
        return undefined;
    }
  }

  getErrorDescription(errors: DrawErrorEvent[]) {
    const firstError = errors[0];

    let userName: string;
    if ((firstError.data as SignedCommit).commit) {
      userName = this.draw.getCandidateByUserId(
        (firstError.data as SignedCommit).commit.userId
      ).profile.firstName;
    } else if ((firstError.data as SignedReveal).reveal) {
      userName = this.draw.getCandidateByUserId(
        (firstError.data as SignedReveal).reveal.userId
      ).profile.firstName;
    } else if ((firstError.data as Candidate).profile) {
      userName = (firstError.data as Candidate).profile.firstName;
    }

    switch (firstError.type) {
      case DrawEventType.CANDIDATE_UNSUBSCRIBED:
        return {
          title: `${userName} deixou o sorteio`,
          description: `Quando um participante sai do sorteio, ele é automaticamente cancelado.`,
        };

      case DrawEventType.WRONG_COMMIT_FORMAT:
        return {
          title: 'Problema detectado!',
          description: `O commit enviado por ${userName} não está bem formatado.`,
        };

      case DrawEventType.WRONG_REVEAL_FORMAT:
        return {
          title: 'Problema detectado!',
          description: `O reveal enviado por ${userName} não está bem formatado.`,
        };

      case DrawEventType.INVALID_REVEAL_MASK:
        return {
          title: `${userName} trapaceou!`,
          description: `O reveal enviado por ${userName} não consiste com seu commit.`,
        };

      case DrawEventType.UNAUTHORIZED_COMMIT_SIGNATURE:
        return {
          title: 'Problema detectado!',
          description: `Não foi possível validar a assinatura do commit enviado por ${userName}`,
        };

      case DrawEventType.UNAUTHORIZED_REVEAL_SIGNATURE:
        return {
          title: 'Problema detectado!',
          description: `Não foi possível validar a assinatura do reveal enviado por ${userName}`,
        };

      default:
        return {
          title: 'Problema deconhecido',
          description: `Um problema desconhecido foi detectado.`,
        };
    }
  }

}
