import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DrawPageRoutingModule } from './draw-routing.module';

import { DrawPage } from './draw.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DrawPageRoutingModule
  ],
  declarations: [DrawPage]
})
export class DrawPageModule {}
