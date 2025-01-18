import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {UserAccessRightComponent} from './user-access-right/user-access-right.component';

const routes: Routes = [
  {path: '', component: UserAccessRightComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {
}
