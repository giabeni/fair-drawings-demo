import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { DrawData, wait } from '../../../interfaces/draw.interfaces';
import DRAWS_MOCKS from '../../../mocks/draws.json';
import USERS_MOCKS from '../../../mocks/users.json';
import { DrawService } from '../../sdk/draw/draw.service';
import { Candidate } from '../../sdk/draw/entities/candidate.entity';
import { Draw } from '../../sdk/draw/entities/draw.entity';
import { DrawStatus } from '../../sdk/draw/enums/draw-status.enum';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import firebase from 'firebase/app';
import { DrawEventType } from '../../sdk/draw/enums/draw-event-type.enum';
import { DrawEvent } from '../../sdk/draw/interfaces/draw-event.interface';
import { SecurityService } from '../../sdk/security/security.service';
import { CommitRevealService } from '../../sdk/commit-reveal/commit-reveal.service';
import { Reveal } from '../../sdk/commit-reveal/interfaces/reveal.interface';

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

  userSubs: Subscription;

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

    this.userSubs = this.authSrvc.user$.subscribe(user => {
      this.currentUser = user;
    });

    console.log(`🚀 ~ file: draw.page.ts ~ line 58 ~ DrawPage ~ ngOnInit ~ this.currentUser`, this.currentUser);
    this.route.params.subscribe(async params => {
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
    if (this.userSubs) {
      this.userSubs.unsubscribe();
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

    console.log(`🚀 ~ file: draw.page.ts ~ line 51 ~ DrawPage ~ getDraw ~ this.draw`, this.draw);

  }

  async joinDraw() {
    await DrawService.joinDraw(this.draw, this.authSrvc.keyPair.publicKey);
  }

  async subscribeToDraw() {
    const drawStream = await DrawService.watchDraw(this.uuid, this.draw);
    drawStream.subscribe(update => {
      console.log('NEW DRAW UPDATE:', update);
      this.draw = update.draw;
      this.changeDetector.detectChanges();
      this.showToast(
        this.getEventText(update.event),
        1200
      );
    });

  }

  getCandidateBadge(candidate: Candidate) {
    if (this.draw.status === DrawStatus.PENDING) {
      return {
        color: 'medium',
        text: 'presente',
      };
    } else if (this.draw.status === DrawStatus.COMMIT) {
      return !!this.draw.getCommitByCandidate(candidate) ? {
        color: 'success',
        text: 'ver commit',
      } : {
        color: 'primary',
        text: 'commit pendente',
      };
    } else if (this.draw.status === DrawStatus.REVEAL) {
      const reveal = this.draw.getRevealByCandidate(candidate);
      return reveal && reveal.valid ? {
        color: 'success',
        text: 'reveal: ',
      } : {
        color: 'primary',
        text: 'reveal pendente',
      };
    } else if (this.draw.status === DrawStatus.FINISHED) {
      const reveal = this.draw.getRevealByCandidate(candidate);
      return reveal && reveal.valid ? {
        color: 'dark',
        text: reveal.data,
      } : {
        color: 'danger',
        text: '?',
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
    this.modalOpen = false;

    await wait(100);
    this.modals[modal] = false;
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
    const alert = await this.alertCtrl.create({
      header: 'Sair do sorteio?',
      message: 'Deseja mesmo sair da sala de sorteio? Ao sair, o sorteio é cancelado.',
      buttons: [
        {
          text: 'Ficar no sorteio',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('Stay in draw');
          }
        }, {
          text: 'Sair do sorteio',
          cssClass: 'danger',
          handler: () => {
            console.log('Leave Draw');
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
    await DrawService.sendSignedCommit(this.draw.uuid, rawCommit, privateKey);
    await this.closeModal('commit');
  }

  async confirmReveal() {
    const reveal: Reveal = {
      data: String(this.forms.commit.value),
      nonce: this.forms.commit.nonce,
      userId: this.currentUser.uid,
      metadata: undefined,
      timestamp: null,
    };

    const privateKey = this.authSrvc.keyPair.privateKey;
    await DrawService.sendSignedReveal(this.draw.uuid, reveal, privateKey);
    await this.closeModal('reveala');
  }

  getEventText(event: DrawEvent) {
    switch (event.type) {
      // new candidate subscribed to the draw
      case DrawEventType.CANDIDATE_SUBSCRIBED:
        return `${event.data.profile.firstName} entrou no sorteio.`;

      // candidate unsubscribed of the draw
      case DrawEventType.CANDIDATE_UNSUBSCRIBED:
        return `${event.data.profile.firstName} saiu do sorteio.`;


      // candidate send a commit
      case DrawEventType.COMMIT_RECEIVED:
        return `${event.from.profile.firstName} enviou seu commit.`;

      // candidate send a reveal
      case DrawEventType.REVEAL_RECEIVED:
        return `${event.from.profile.firstName} enviou seu reveal.`;

      // candidate acks all commits
      case DrawEventType.ALL_COMMITS_RECEIVED:
        return `${event.from.profile.firstName} confirmou o recebimento de todos commits`;

      // candidate acks all reveals
      case DrawEventType.ALL_REVEALS_RECEIVED:
        return `${event.from.profile.firstName} confirmou o recebimento de todos reveals`;

      default:
        return `${event.type}`;
    }
  }

}
