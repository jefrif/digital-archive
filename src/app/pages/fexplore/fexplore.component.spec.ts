import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FexploreComponent } from './fexplore.component';

describe('FexploreComponent', () => {
  let component: FexploreComponent;
  let fixture: ComponentFixture<FexploreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FexploreComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FexploreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
