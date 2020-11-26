import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Draw, DrawStatus, wait } from '../../interfaces/draw.interfaces';
import DRAWS_MOCKS from '../../mocks/draws.json';

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
    const spots = Math.floor(Math.random() * 18) + 2;
    const candidatesCount = Math.floor(Math.random() * (spots + 5));
    this.draw = {
      data: {
        ...draw,
        private: Math.random() % 2 === 0,
      },
      uuid: draw.uuid,
      spots,
      status: Math.floor(Math.random() * 4) - 1,
      candidatesCount: candidatesCount <= spots ? candidatesCount : spots,
    };
    console.log('🚀 ~ file: draw.page.ts ~ line 44 ~ DrawPage ~ getDraw ~ this.draw', this.draw);


    this.draw.candidates = [];
    for (let i = 0; i < this.draw.candidatesCount; i++) {
      this.draw.candidates.push(i);
    }

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
