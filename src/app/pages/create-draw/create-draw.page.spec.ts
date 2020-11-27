import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CreateDrawPage } from './create-draw.page';

describe('CreateDrawPage', () => {
  let component: CreateDrawPage;
  let fixture: ComponentFixture<CreateDrawPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CreateDrawPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateDrawPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
