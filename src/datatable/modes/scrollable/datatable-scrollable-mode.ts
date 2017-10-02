'use strict';
/*
 MIT License

 Copyright (c) 2017 Temainfo Sistemas

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

import {
    AfterContentInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, forwardRef, Inject, NgZone, Renderer2, ViewChild
} from '@angular/core';
import { TlDatatable } from '../../datatable';
import { KeyEvent } from '../../../core/enums/key-events';
import { TlDatatableDataSource } from '../../datatable-datasource.service';

@Component( {
    selector: 'tl-datatable-scrollable-mode',
    templateUrl: './datatable-scrollable-mode.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: [ './datatable-scrollable-mode.scss', '../../datatable.scss' ],
} )
export class TlDatatableScrollableMode implements AfterContentInit {

    @ViewChild( 'listComponent' ) listComponent: ElementRef;

    @ViewChild( 'scrollBoxHeader' ) scrollBoxHeader: ElementRef;

    @ViewChild( 'listBody' ) listBody: ElementRef;

    private bodyHeight = 0;

    private quantityVisibleRows = 0;

    private quantityInVisibleRows = 0;

    private lastRowViewport = 0;

    private firstRowViewport = 0;

    private cursorViewPortPosition = 1;

    private wrapOnRemaining = 5;

    private scrollTop = 0;

    private lastScrollTop = 0;

    private lastScrollLeft= 0;

    private scrollDirection = 'DOWN';

    private skip = 0;

    private scrollLockAt = 0;

    private translateY = 0;

    private lastRecordProcessed: any;

    private mouseClicked = false;

    private activeElement: Element;

    private elementTR: ElementRef;

    private elementTD: ElementRef;

    constructor( @Inject( forwardRef( () => TlDatatable ) ) private dt: TlDatatable,
                 private renderer: Renderer2,
                 private cd: ChangeDetectorRef
    ) {}

    ngAfterContentInit() {
        this.setProprertiesFromTable();
        this.addListenerToDataSource();
        this.addListenerToScroll();
        this.firstRender();
    }

    onMouseDown() {
        this.mouseClicked = true;
    }

    onMouseUp() {
        this.mouseClicked = false;
    }


    onClick(event) {
        this.activeElement = event.target.parentElement;
        const initRange = Math.floor( this.scrollTop / this.dt.rowHeight );
    }

    onKeydown( $event ) {
        $event.preventDefault();
        if ( this.dt.loading) {
            return
        }
        switch ( $event.keyCode ) {
            case KeyEvent.ARROWDOWN: this.handleKeyArrowDown(); break;
            case KeyEvent.ARROWUP: this.handleKeyArrowUp(); break;
            case KeyEvent.HOME: this.handleKeyHome( $event ); break;
            case KeyEvent.END: this.handleKeyEnd( $event ); break;
            case KeyEvent.PAGEUP: this.handleKeyPageUp(  ); break;
            case KeyEvent.PAGEDOWN: this.handleKeyPageDown( ); break;
        }
    }

    private setProprertiesFromTable() {
        this.bodyHeight = this.dt.rowHeight * this.dt.totalRows;
        this.quantityVisibleRows = this.dt.height / this.dt.rowHeight;
        this.quantityInVisibleRows = Math.round( ( this.dt.rowsPage - this.quantityVisibleRows ) / 2 );
        this.setlastRowViewport();
    }

    private addListenerToDataSource() {
        this.dt.dataSourceService.onChangeDataSourceEmitter.subscribe((dataSource) => {
            if ( this.lastRecordProcessed !== dataSource[0]) {
                this.renderList(this.skip, dataSource);
                this.dt.loading = false;
                this.cd.detectChanges();
                this.setFocusWhenChangeData();
            }
        });
    }

    private addListenerToScroll() {
        this.listComponent.nativeElement.addEventListener('scroll', ($event) => {

            if ( this.isScrollLeft() ) {
                this.handleScrollLeft();
                this.setLastScrollLeft();
                return
            }

            this.setScrollTop();
            this.setlastRowViewport();
            this.setScrollDirection();
            this.isScrollDown() ? this.handleScrollDown() : this.handleScrollUp();
            this.setLastScrollTop();
        });

    }

    private handleScrollLeft() {
        this.scrollBoxHeader.nativeElement.scrollLeft  = this.listComponent.nativeElement.scrollLeft;
    }

    private firstRender() {
        setTimeout(() => {
            this.renderList( 0, this.dt.dataSourceService.datasource );
            this.activeElement = this.listBody.nativeElement.rows[0];
            this.cd.detectChanges();
        }, 1)
    }

    private handleKeyPageUp() {

    }

    private handleKeyPageDown() {
        this.listComponent.nativeElement.scrollTop += this.quantityVisibleRows * this.dt.rowHeight;
    }

    private handleKeyEnd( event: KeyboardEvent  ) {
        if ( event.ctrlKey ) {
            this.listComponent.nativeElement.scrollTop = this.dt.rowHeight * this.dt.totalRows;
        }
    }

    private handleKeyHome( event: KeyboardEvent ) {
        if ( event.ctrlKey ) {
            this.listComponent.nativeElement.scrollTop = 0;
        }
    }

    private handleScrollDown() {
        const lastChildElem = this.listBody.nativeElement.rows[ this.listBody.nativeElement.rows.length - 1 ];
        if ( !lastChildElem ) {
            return this.handleScrollFast();
        }

        const clientRect = lastChildElem.getBoundingClientRect();
        const parentClientRect = this.listComponent.nativeElement.getBoundingClientRect();
        if ( !clientRect ) {
            return this.handleScrollFast();
        }

        if ( clientRect.bottom < parentClientRect.bottom + (this.wrapOnRemaining * this.dt.rowHeight) ) {
            const skip = this.lastRowViewport - this.quantityInVisibleRows - this.quantityVisibleRows;
            let take = this.lastRowViewport + this.quantityInVisibleRows;
            take = take > this.dt.totalRows ? this.dt.totalRows : take;
            this.scrollLockAt = this.scrollTop;
            this.renderPageData( skip, take );
        }
    }


    private handleScrollUp() {
        const firstElement = this.listBody.nativeElement.children[ 0 ];
        const parentClientRect = this.listComponent.nativeElement.getBoundingClientRect();

        if ( !firstElement ) {
            return this.handleScrollFast();
        }

        if (!( ( firstElement.offsetTop <= this.scrollTop ) && (  this.listBody.nativeElement.rows.length > 0 ) ) ) {
            return this.handleScrollFast();
        }

        const clientRect = firstElement.getBoundingClientRect();
        if ( ( clientRect.top > parentClientRect.top - (this.wrapOnRemaining * this.dt.rowHeight) ) && (this.skip === 0) ) {
            return;
        }
        if ( clientRect.top > parentClientRect.top - (this.wrapOnRemaining * this.dt.rowHeight) ) {
            let skip = this.lastRowViewport - this.quantityInVisibleRows - this.quantityVisibleRows - this.wrapOnRemaining;
            let take = skip + this.quantityVisibleRows + (this.quantityInVisibleRows * 2);
            if ( skip < 0 ) {
                skip = 0;
                take = this.dt.rowsPage;
            }
            this.scrollLockAt = this.scrollTop;
            this.renderPageData( skip, take );
        }
    }


    private handleScrollFast( ) {
        const currentStartIndex = Math.floor( this.scrollTop / this.dt.rowHeight );
        let skip = currentStartIndex - this.quantityInVisibleRows;
        let take = currentStartIndex + this.quantityVisibleRows + this.quantityInVisibleRows;
        if ( skip < 0 ) {
            skip = 0;
            take = this.dt.rowsPage;
        }
        this.renderPageData( skip, take );
    }

    private renderPageData( skip, take ) {
        this.dt.loading = true;
        this.skip = skip;
        this.dt.dataSourceService.loadMoreData(skip, take);
        this.cd.markForCheck();
    }

    private renderList( lastRow, dataSource ) {
        this.removeChilds();
        this.lastRecordProcessed = dataSource[0];
        this.translateY = ( lastRow) * this.dt.rowHeight;
        for ( let row = 0; row < dataSource.length; row++ ) {
            this.createElementTR( row, lastRow);
            this.createElementsTD( row, dataSource );
            this.addEventClickToListElement( row );
        }
    }

    private createElementTR( row, lastRow) {
        this.elementTR = new ElementRef( this.renderer.createElement( 'tr' ) );
        this.renderer.setAttribute( this.elementTR.nativeElement, 'row', String( (row + lastRow) ) );
        this.renderer.setAttribute( this.elementTR.nativeElement, 'tabindex', String( (row + lastRow) ) );
        this.renderer.setStyle( this.elementTR.nativeElement, 'height', this.dt.rowHeight + 'px' );
        this.renderer.addClass( this.elementTR.nativeElement, 'row' );
        this.renderer.appendChild( this.listBody.nativeElement, this.elementTR.nativeElement );
    }

    private createElementsTD( row, dataSource ) {
        for ( let collumn = 0; collumn < this.dt.columns.length; collumn++ ) {

            const classAlignColumn = this.dt.getClassAlignment(this.dt.columns[ collumn ].alignment );

            this.elementTD = new ElementRef( this.renderer.createElement( 'td' ) );
            this.renderer.addClass(  this.elementTD.nativeElement, 'cel' );
            this.renderer.addClass(  this.elementTD.nativeElement, classAlignColumn );
            this.renderer.setStyle(  this.elementTD.nativeElement, 'height', this.dt.rowHeight + 'px' );
            this.elementTD.nativeElement.innerHTML = dataSource[ row ][ this.dt.columns[ collumn ].field ];
            this.renderer.appendChild( this.listBody.nativeElement.children[ row ],  this.elementTD.nativeElement );
        }
    }

    private removeChilds() {
        if ( this.listBody.nativeElement.children.length > 0 ) {
            this.listBody.nativeElement.innerHTML = '';
        }
    }

    private setlastRowViewport() {
        this.lastRowViewport = Math.round( ( this.dt.height + this.scrollTop  ) / this.dt.rowHeight );
        this.firstRowViewport = this.lastRowViewport - this.quantityVisibleRows + 1;
    }

    private setScrollTop() {
        if (this.dt.loading && (!this.mouseClicked)) {
            this.listComponent.nativeElement.scrollTop = this.scrollLockAt;
            return
        }
        this.scrollTop = this.listComponent.nativeElement.scrollTop;
    }

    private setLastScrollTop() {
        this.lastScrollTop = this.scrollTop;
    }

    private setLastScrollLeft() {
        this.lastScrollLeft =  this.listComponent.nativeElement.scrollLeft;
    }
    private setScrollDirection( ) {
        this.scrollDirection =  (this.scrollTop > this.lastScrollTop ) ? 'DOWN' : 'UP';
    }

    private isScrollDown() {
        return this.scrollDirection === 'DOWN';
    }

    private isScrollLeft() {
        return this.lastScrollLeft !== this.listComponent.nativeElement.scrollLeft;
    }

    private addEventClickToListElement( row ) {
        this.elementTR.nativeElement.addEventListener( 'click', () => {
            this.handleClickItem( this.dt.dataSourceService.datasource[ row ], row );
        } );
    }

    private handleClickItem( item, index ) {
        this.setActiveElement();
        this.getCursorViewPortPosition();
    }

    private getCursorViewPortPosition() {
        const indexItemInList: any = this.activeElement.getAttribute( 'row' );
        this.cursorViewPortPosition = ( ( this.lastRowViewport - indexItemInList )  - this.quantityVisibleRows - 1) * -1;
    }

    private handleKeyArrowDown() {
        this.setFocusInNextElement();
    }

    private handleKeyArrowUp() {
        this.setFocusInPreviousElement();
    }

    private setFocusInPreviousElement() {
        if (this.activeElement.previousElementSibling) {
            if ( this.cursorViewPortPosition > 1  ) {
                this.cursorViewPortPosition --;
            }else {
                this.listComponent.nativeElement.scrollTop -= this.dt.rowHeight;
            }
            this.setFocus( this.activeElement.previousElementSibling );
        }
    }

    private setFocusInNextElement() {
        if (this.activeElement.nextElementSibling) {
            if ( this.cursorViewPortPosition < this.quantityVisibleRows ) {
                this.cursorViewPortPosition ++;
            }else {
                this.listComponent.nativeElement.scrollTop += this.dt.rowHeight;
            }
            this.setFocus( this.activeElement.nextElementSibling );
        }
    }

    private setActiveElement() {
        this.activeElement = document.activeElement;
    }

    private setFocusWhenChangeData() {
       this.setFocus( this.getFocusElementOnChangeData() ) ;
    }

    private getFocusElementOnChangeData() {
        const rowNumber = this.activeElement.getAttribute('row');
        if (document.querySelector('tr[row="' + rowNumber + '"]')) {
            return document.querySelector('tr[row="' + rowNumber + '"]');
        }

        if ( this.isScrollDown() ) {
            return document.querySelector('tr[row="' + ( this.lastRowViewport - 1 ) + '"]');
        }else {
            return document.querySelector('tr[row="' + ( ( this.lastRowViewport - this.quantityVisibleRows ) ) + '"]');
        }

    }

    private setFocus( htmlElement ) {
        if ( htmlElement !== null ) {
            ( htmlElement as HTMLElement ).focus();
            this.setActiveElement();
            this.getCursorViewPortPosition();
        }
    }


    //
    // onKeyUp( $event ) {
    //     switch ( $event.keyCode ) {
    //         case KeyEvent.ARROWDOWN:
    //             // setTimeout( () => {
    //             //  this.scrollBoxElementRef.nativeElement.scrollTop =
    //             // ( (this.currentRow - (this.qtdRowClient - 1)) * this.datatable.rowHeight );
    //             // }, 1 );
    //             break;
    //     }
    // }
    //
    //
    // emitLazyLoad() {
    //     //  if ( this.isLazy() ) {
    //     // let at: any = document.activeElement;
    //     //
    //     //
    //     // this.Counter = Math.round(
    //     // (at.offsetTop + this.scrollOfTop - this.scrollBoxElementRef.nativeElement.scrollTop + this.datatable.rowHeight )
    //     // / this.datatable.rowHeight
    //     // );
    //
    //     if ( this.scrollPosition > this.scrollTop ) {
    //         if ( this.currentRow <= this.datatable.totalRows ) {
    //             if ( ( this.currentRow - this.qtdRowClient ) <= this.skip ) {
    //                 this.loadingSource = true;
    //                 this.skip = ( this.skip >= this.qtdRowClient ) && (  this.currentRow > this.qtdRowClient  )
    //                     ? this.currentRow - (this.qtdRowClient * 2)
    //                     : 0;
    //                 this.skip = this.skip < 0 ? 0 : this.skip;
    //
    //                 this.take = this.datatable.rowsPage;
    //                 this.scrollOfTop = (this.scrollTop - this.qtdRowClient * this.datatable.rowHeight) > 0
    //                                     ? this.scrollTop - this.qtdRowClient * this.datatable.rowHeight
    //                                     : 0;
    //
    //                 this.dataSourceService.loadMoreData( this.skip, this.take ).then(( loadingSource: boolean ) => {
    //                     setTimeout(() => {
    //                         this.loadingSource = loadingSource;
    //                     }, 100)
    //                 });
    //
    //             }
    //         }
    //     } else if ( this.scrollPosition < this.scrollTop ) {
    //         if ( this.currentRow <= this.datatable.totalRows ) {
    //             if ( ( this.take + this.skip ) <= this.currentRow ) {
    //                  this.loadingSource = true;
    //                  this.skip = this.currentRow - this.qtdRowClient;
    //                  this.take = this.datatable.rowsPage;
    //                  this.scrollOfTop = this.scrollTop;
    //
    //                  this.dataSourceService.loadMoreData( this.skip, this.take ).then(( loadingSource: boolean ) => {
    //                    setTimeout( () => {
    //                        this.loadingSource = loadingSource;
    //                    }, 100);
    //                  });
    //             }
    //         }
    //     }
    //     //  }
    // }
    //
    // emitEndRow() {
    //     if ( this.scrollTop >= (this.scrollHeight - (this.clientHeight)) ) {
    //         this.datatable.endRow.emit( { endRow : this.currentRow } )
    //     }
    // }
    //
    // emitChangePage() {
    //     if ( this.isLazy() ) {
    //         const pageNumber = Math.round( this.currentRow / this.datatable.rowsPage );
    //         if ( (this.scrollTop + this.clientHeight) >= (this.pageHeight * pageNumber) ) {
    //             if ( pageNumber !== this.pageNumber ) {
    //                 this.pageNumber = pageNumber;
    //                 this.datatable.pageChange.emit( { page : pageNumber } );
    //             }
    //         }
    //     }
    // }
    //
    // onRowClick( data, index ) {
    //     const at: any = document.activeElement;
    //     this.Counter = Math.round(
    //         (at.offsetTop + this.scrollOfTop - this.scrollBoxElementRef.nativeElement.scrollTop + this.datatable.rowHeight )
    //         / this.datatable.rowHeight
    //     );
    //     this.datatable.onRowClick( data, index );
    // }
    //
    //
    // handleKeyArrowDown(event) {
    //     if ( this.dataSourceService.loadingSource === true ) {
    //         console.log('Loading data...');
    //         return;
    //     }
    //     const at: any = document.activeElement;
    //     this.setCurrentRow();
    //     if ( this.isLastRow() ) {
    //         if ( at !== this.getChildrenOfTable()[ this.getChildrenOfTable().length - 1 ] ) {
    //             this.scrollBoxTableBodyElementRef.nativeElement.children[ at.tabIndex + 1 ].focus();
    //             this.datatable.tabindex = at.tabIndex + 1;
    //
    //             if ( this.Counter >= this.qtdRowClient ) {
    //
    //                 this.scrollBoxElementRef.nativeElement.scrollTop = (
    //                     (this.currentRow - (this.qtdRowClient - 1)) * this.datatable.rowHeight
    //                 );
    //
    //             } else {
    //                 this.Counter++
    //             }
    //         }
    //         return;
    //     }
    //
    //     this.scrollBoxTableBodyElementRef.nativeElement.children[ this.datatable.tabindex + 1 ].focus();
    //     this.datatable.tabindex = this.datatable.tabindex + 1;
    //
    //     if ( this.Counter >= this.qtdRowClient ) {
    //         this.scrollBoxElementRef.nativeElement.scrollTop =( (this.currentRow - (this.qtdRowClient - 1)) * this.datatable.rowHeight );
    //     } else {
    //         this.Counter++
    //     }
    // }
    //
    // getChildrenOfTable() {
    //     return this.scrollBoxTableBodyElementRef.nativeElement.children;
    // }
    //
    //
    // handleKeyArrowUp() {
    //     if ( this.loadingSource === true ) {
    //         console.log('Loading data...');
    //         return;
    //     }
    //     const at: any = document.activeElement;
    //     this.setCurrentRow();
    //     if ( this.isFirstRow() ) {
    //
    //         if ( at !== this.getChildrenOfTable()[ 0 ] ) {
    //             this.scrollBoxTableBodyElementRef.nativeElement.children[ at.tabIndex - 1 ].focus();
    //             this.datatable.tabindex = at.tabIndex - 1;
    //
    //             if ( this.Counter > 1 ) {
    //                 this.Counter--
    //             } else {
    //                 this.scrollBoxElementRef.nativeElement.scrollTop = (
    //                     (this.currentRow - (this.qtdRowClient + 1)) * this.datatable.rowHeight
    //                 );
    //             }
    //         }
    //         return;
    //     }
    //
    //     this.scrollBoxTableBodyElementRef.nativeElement.children[ this.datatable.tabindex - 1 ].focus();
    //     this.datatable.tabindex = this.datatable.tabindex - 1;
    //
    //
    //     if ( this.Counter > 1 ) {
    //         this.Counter--
    //     } else {
    //         this.scrollBoxElementRef.nativeElement.scrollTop = ( (this.currentRow - (this.qtdRowClient + 1)) * this.datatable.rowHeight);
    //     }
    // }
    //
    // handleKeyHome() {
    //     this.scrollBoxElementRef.nativeElement.scrollTop = 0;
    //     setTimeout( () => {
    //         this.getChildrenOfTable()[ 0 ].focus();
    //
    //         this.Counter = 1
    //     }, 300 );
    // }
    //
    // handleKeyEnd() {
    //     this.scrollBoxElementRef.nativeElement.scrollTop = this.containerHeight;
    //     setTimeout( () => {
    //         this.getChildrenOfTable()[ this.getChildrenOfTable().length - 1 ].focus();
    //         const at: any = document.activeElement;
    //         this.Counter = Math.round(
    //             (at.offsetTop + this.scrollOfTop - this.scrollBoxElementRef.nativeElement.scrollTop + this.datatable.rowHeight )
    //             / this.datatable.rowHeight
    //         );
    //     }, 300 );
    // }
    //
    // refreshScrollPosition() {
    //     setTimeout( () => {
    //         this.scrollPosition = this.scrollTop;
    //     }, 10 )
    // }
    //
    // getScrollOfTop() {
    //     return 'translateY(' + this.scrollOfTop + 'px)';
    // }
    //


    //

    //
    // isLastRow() {
    //     return this.datatable.tabindex + 1 > this.scrollBoxTableBodyElementRef.nativeElement.children.length - 1;
    // }
    //
    // isFirstRow() {
    //     return this.datatable.tabindex === 0;
    // }
    //
    // isLazy() {
    //     return this.datatable.lazy;
    // }
}
