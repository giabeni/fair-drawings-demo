import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Draw, DrawStatus, wait } from '../../../interfaces/draw.interfaces';
import DRAWS_MOCKS from '../../../mocks/draws.json';
import USERS_MOCKS from '../../../mocks/users.json';

@Component({
  selector: 'app-draw',
  templateUrl: './draw.page.html',
  styleUrls: ['./draw.page.scss'],
})
export class DrawPage implements OnInit {

  private uuid?: string;

  public draw: Draw;

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
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params && params.uuid) {
        this.uuid = params.uuid;
        this.getDraw();
      }
    });
  }

  async getDraw() {
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

}
