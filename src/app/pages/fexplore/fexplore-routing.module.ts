import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {FexploreComponent} from './fexplore.component';

@NgModule({
    imports: [RouterModule.forChild([
        {path: '', component: FexploreComponent}
    ])],
    exports: [RouterModule]
})
export class FexploreRoutingModule {
}
