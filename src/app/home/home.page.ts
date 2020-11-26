import { Component, OnInit } from '@angular/core';
import { Draw, DrawStatus, PaginationResponse, wait } from '../../interfaces/draw.interfaces';
import DRAWS_MOCKS from '../../mocks/draws.json';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  loading = false;
  draws: Draw[] = [];

  DrawStatus = DrawStatus;

  pagination: PaginationResponse<Draw> = {
    page: 1,
    pageCount: 1,
    totalCount: 1,
    items: []
  };

  constructor() {}

  ngOnInit() {
    this.getDraws();
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
      const spots = Math.floor(Math.random() * 18) + 2;
      const candidatesCount = Math.floor(Math.random() * (spots + 5));
      return {
        data: {
          ...draw,
          private: Math.random() % 2 === 0,
        },
        uuid: draw.uuid,
        spots,
        status: Math.floor(Math.random() * 4) - 1,
        candidatesCount: candidatesCount <= spots ? candidatesCount : spots,
      };
    }) as Draw[];
    console.log('🚀 ~ file: home.page.ts ~ line 50 ~ HomePage ~ newDraws ~ newDraws', newDraws);

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

}
