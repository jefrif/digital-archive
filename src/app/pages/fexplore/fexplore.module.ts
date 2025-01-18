import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {InputTextModule} from 'primeng/inputtext';
import {DialogModule} from 'primeng/dialog';
import {StyleClassModule} from 'primeng/styleclass';
import {DividerModule} from 'primeng/divider';
import {ChartModule} from 'primeng/chart';
import {PanelModule} from 'primeng/panel';
import {ButtonModule} from 'primeng/button';
import {MenuModule} from 'primeng/menu';
import {MenubarModule} from 'primeng/menubar';
import {ToastModule} from 'primeng/toast';
import {BlockUIModule} from 'primeng/blockui';
import {SplitterModule} from 'primeng/splitter';
import {TreeModule} from 'primeng/tree';
import {ConfirmPopupModule} from 'primeng/confirmpopup';
import {ContextMenuModule} from 'primeng/contextmenu';
import {FexploreRoutingModule} from './fexplore-routing.module';
import {FexploreComponent} from './fexplore.component';

@NgModule({
  imports: [
    CommonModule,
    FexploreRoutingModule,
    FormsModule,
    DividerModule,
    StyleClassModule,
    ChartModule,
    PanelModule,
    ButtonModule,
    MenuModule,
    MenubarModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    BlockUIModule,
    SplitterModule,
    TreeModule,
    ConfirmPopupModule,
    ContextMenuModule
  ],
  declarations: [FexploreComponent]
})
export class FexploreModule {
}
