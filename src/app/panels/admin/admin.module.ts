import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TreeModule } from 'primeng/tree';
import { TreeTableModule } from 'primeng/treetable';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';

import { AdminRoutingModule } from './admin-routing.module';
import { UserAccessRightComponent } from './user-access-right/user-access-right.component';


@NgModule({
  declarations: [
    UserAccessRightComponent
  ],
  imports: [
    CommonModule,
    AdminRoutingModule,
    FormsModule,
    TreeModule,
    TreeTableModule,
    CardModule,
    TableModule,
    CheckboxModule,
    ToolbarModule,
    ButtonModule,
    SplitButtonModule
  ]
})
export class AdminModule { }
