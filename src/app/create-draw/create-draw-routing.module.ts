import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CreateDrawPage } from './create-draw.page';

const routes: Routes = [
  {
    path: '',
    component: CreateDrawPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreateDrawPageRoutingModule {}
