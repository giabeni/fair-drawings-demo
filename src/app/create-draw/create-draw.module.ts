import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CreateDrawPageRoutingModule } from './create-draw-routing.module';

import { CreateDrawPage } from './create-draw.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateDrawPageRoutingModule
  ],
  declarations: [CreateDrawPage]
})
export class CreateDrawPageModule {}
