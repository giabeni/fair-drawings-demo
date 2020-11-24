import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DrawPage } from './draw.page';

const routes: Routes = [
  {
    path: '',
    component: DrawPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DrawPageRoutingModule {}
