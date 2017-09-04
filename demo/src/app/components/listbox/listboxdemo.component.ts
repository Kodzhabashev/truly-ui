import { ChangeDetectionStrategy, Component } from '@angular/core';
import { routerTransition } from "../../router.animations";

import * as jsonProp from './listboxdemo-dataproperties.json';
import * as jsonEvt from './listboxdemo-events.json';
import { DumpDataService } from "../../shared/services/dumpdata";

@Component( {
  selector: 'app-listbox',
  templateUrl: './listboxdemo.component.html',
  animations: [ routerTransition() ],
  styleUrls: [ './listboxdemo.component.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DumpDataService]
} )
export class ListBoxDemo {

  private dataTableProperties;
  private events;
  private data = [];


  constructor(private dataDumpService: DumpDataService) {
    this.dataTableProperties = jsonProp.dataProperties;
    this.events = jsonEvt.events;

    this.data = this.dataDumpService.createRandomData(5000);

  }

}