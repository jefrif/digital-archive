import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserAccessRightComponent } from './user-access-right.component';

describe('UserAccessRightComponent', () => {
  let component: UserAccessRightComponent;
  let fixture: ComponentFixture<UserAccessRightComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UserAccessRightComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserAccessRightComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
