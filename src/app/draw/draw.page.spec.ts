import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DrawPage } from './draw.page';

describe('DrawPage', () => {
  let component: DrawPage;
  let fixture: ComponentFixture<DrawPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DrawPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(DrawPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
