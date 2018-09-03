/*
    MIT License

    Copyright (c) 2018 Temainfo Software

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
  AfterContentInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild
} from '@angular/core';

import { TlInput } from '../../../input/input';

import { Rgba } from './colorpicker-formats';

import { ColorPickerService } from './colorpicker-service';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'tl-colorpicker-content',
  templateUrl: './colorpicker-content.html',
  styleUrls: ['./colorpicker-content.scss']
})

export class TlColorPickerContent implements OnInit, AfterContentInit, OnChanges {

  @Input('input') input: TlInput;

  @Input('overlayPosition') overlayPosition: string;

  @Input('selectedColor') selectedColor: string;

  @Output('selectColor') selectColor: EventEmitter<string> = new EventEmitter<string>();

  @ViewChild(TemplateRef) template: TemplateRef<any>;

  @ViewChild('content') content: ElementRef;

  @ViewChild('scheme') scheme: ElementRef;

  @ViewChild('hue') hue: ElementRef;

  @ViewChild('hueSlider') hueSlider: ElementRef;

  @ViewChild('alpha') alpha: ElementRef;

  @ViewChild('alphaSlider') alphaSlider: ElementRef;

  public positionSchemeX = 0;

  public positionSchemeY = 0;

  public positionHue = 0;

  public positionAlpha = 144;

  public contextScheme;

  public contextHueSlider;

  public contextAlphaSlider;

  public opacity = 1;

  public rgbaColor = 'rgba(255,0,0,' + this.opacity + ')';

  public rgbaColorPreview = 'rgba(255,0,0,' + this.opacity + ')';

  private isMoving = false;

  public presetColors: string[];

  constructor(private colorPickerService: ColorPickerService) {
  }

  ngOnInit() {
    this.getPresetColor();
  }

  ngAfterContentInit() {
    this.contextScheme = this.scheme.nativeElement.getContext('2d');
    this.contextScheme.rect(0, 0, this.contextScheme.canvas.width, this.contextScheme.canvas.height);
    this.fillGradient();

    this.contextHueSlider = this.hueSlider.nativeElement.getContext('2d');
    this.contextHueSlider.rect(0, 0, this.contextHueSlider.canvas.width, this.contextHueSlider.canvas.height);
    const hue = this.contextHueSlider.createLinearGradient(0, 0, this.contextHueSlider.canvas.width, 0);
    hue.addColorStop(0, 'rgba(255, 0, 0, 1)');
    hue.addColorStop(0.17, 'rgba(255, 255, 0, 1)');
    hue.addColorStop(0.34, 'rgba(0, 255, 0, 1)');
    hue.addColorStop(0.51, 'rgba(0, 255, 255, 1)');
    hue.addColorStop(0.68, 'rgba(0, 0, 255, 1)');
    hue.addColorStop(0.85, 'rgba(255, 0, 255, 1)');
    hue.addColorStop(1, 'rgba(255, 0, 0, 1)');
    this.contextHueSlider.fillStyle = hue;
    this.contextHueSlider.fill();

    this.contextAlphaSlider = this.alphaSlider.nativeElement.getContext('2d');
    this.contextAlphaSlider.rect(0, 0, this.contextAlphaSlider.canvas.width, this.contextAlphaSlider.canvas.height);
    this.opacityGradient();
  }

  ngOnChanges(value: SimpleChanges) {
    if (value['selectedColor'] && this.selectedColor !== undefined) {
      this.rgbaColorPreview = this.selectedColor;
      this.rgbaColor = this.hexToRgbString(this.selectedColor);
      // this.mapCursor(this.selectedColor);
    }
  }

  public setMoving(value) {
    this.isMoving = value;
  }

  public onMouseDownScheme($event) {
    this.setMoving(true);
    this.setPositionScheme($event);
    this.changeColorScheme($event);
  }

  public onMouseDownHue($event) {
    this.setMoving(true);
    this.setPositionHue($event);
    this.changeColor($event);
  }

  public onMouseDownAlpha($event) {
    this.setMoving(true);
    this.setPositionAlpha($event);
    this.changeOpacity($event);
  }

  public onMouseMoveScheme($event) {
    if (!this.isMoving) {
      return;
    }
    this.setPositionScheme($event);
    this.changeColorScheme($event);
  }

  public onMouseMoveHue($event) {
    if (!this.isMoving) {
      return;
    }
    this.setPositionHue($event);
    this.changeColor($event);
  }

  public onMouseMoveAlpha($event) {
    if (!this.isMoving) {
      return;
    }
    this.setPositionAlpha($event);
    this.changeOpacity($event);
  }

  mapCursor(color) {
    const rgb = this.hexToRgb(color);
    const pixelsPoint = 144 / 7;
    let pixelPoint = 0;
    if (rgb[0] === 255 && rgb[1] > 0) {
      pixelPoint = (rgb[1] * pixelsPoint) / 255;
    }
    if (rgb[1] === 255 && rgb[0] > 0) {
      pixelPoint = pixelsPoint + (pixelsPoint * 2) - (pixelsPoint + (rgb[0] * pixelsPoint) / 255);
    }
    if (rgb[1] === 255 && rgb[2] > 0) {
      pixelPoint = (pixelsPoint * 2) + (rgb[2] * pixelsPoint) / 255;
    }
    if (rgb[2] === 255 && rgb[1] > 0) {
      pixelPoint = pixelsPoint + (pixelsPoint * 4) - (pixelsPoint + (rgb[1] * pixelsPoint) / 255);
    }
    if (rgb[2] === 255 && rgb[0] > 0) {
      pixelPoint = ((rgb[0] * pixelsPoint) / 255) + (pixelsPoint * 4);
    }
    if (rgb[0] === 255 && rgb[2] > 0) {
      pixelPoint = pixelsPoint + (pixelsPoint * 6) - (pixelsPoint + (rgb[2] * pixelsPoint) / 255);
    }
    this.positionHue = pixelPoint;
  }

  setPositionScheme($event) {
    this.positionSchemeX = $event.clientX - this.content.nativeElement.offsetParent.offsetLeft - 8;
    this.positionSchemeY = $event.clientY - this.content.nativeElement.offsetParent.offsetTop - 16;
  }

  setPositionHue($event) {
    this.positionHue = $event.clientX - this.content.nativeElement.offsetParent.offsetLeft -
      (this.hue.nativeElement.offsetWidth / 2) - 4;
  }

  setPositionAlpha($event) {
    this.positionAlpha = $event.clientX - this.content.nativeElement.offsetParent.offsetLeft -
      (this.hue.nativeElement.offsetWidth / 2) - 4;
  }

  fillGradient() {
    this.contextScheme.fillStyle = this.rgbaColor;
    this.contextScheme.fillRect(0, 0, this.contextScheme.canvas.width, this.contextScheme.canvas.height);

    const gridWhite = this.contextScheme.createLinearGradient(0, 0, this.contextScheme.canvas.width, 0);
    gridWhite.addColorStop(0, 'rgba(255,255,255,1)');
    gridWhite.addColorStop(1, 'rgba(255,255,255,0)');
    this.contextScheme.fillStyle = gridWhite;
    this.contextScheme.fillRect(0, 0, this.contextScheme.canvas.width, this.contextScheme.canvas.height);

    const gridBlack = this.contextScheme.createLinearGradient(0, 0, 0, this.contextScheme.canvas.height);
    gridBlack.addColorStop(0, 'rgba(0,0,0,0)');
    gridBlack.addColorStop(1, 'rgba(0,0,0,1)');
    this.contextScheme.fillStyle = gridBlack;
    this.contextScheme.fillRect(0, 0, this.contextScheme.canvas.width, this.contextScheme.canvas.height);
  }

  opacityGradient() {
    const context = this.alphaSlider.nativeElement.getContext('2d');
    context.clearRect(0, 0, this.contextAlphaSlider.canvas.width, this.contextAlphaSlider.canvas.height);

    const gridTransparent = this.contextAlphaSlider.createLinearGradient(0, 0, this.contextAlphaSlider.canvas.width, 0);
    gridTransparent.addColorStop(0, 'transparent');
    gridTransparent.addColorStop(1, this.rgbaColor);
    this.contextAlphaSlider.fillStyle = gridTransparent;
    this.contextAlphaSlider.fillRect(0, 0, this.contextAlphaSlider.canvas.width, this.contextAlphaSlider.canvas.height);
  }

  changeColorScheme($event) {
    const x = $event.offsetX;
    const y = $event.offsetY;
    const imageData = this.contextScheme.getImageData(x, y, 1, 1).data;
    this.setColor(imageData);
    this.opacityGradient();
  }

  changeColor($event) {
    const x = $event.offsetX;
    const y = $event.offsetY;
    const imageData = this.contextHueSlider.getImageData(x, y, 1, 1).data;
    this.setColor(imageData);
    this.fillGradient();
    this.opacityGradient();
  }

  changeOpacity($event) {
    this.opacity = Math.round((100 * ($event.offsetX + 1) / $event.target.clientWidth)) / 100;
    const x = $event.offsetX;
    const y = $event.offsetY;
    const imageData = this.contextAlphaSlider.getImageData(x, y, 1, 1).data;
    this.setColor(imageData);
  }

  setColor(imageData) {
    this.rgbaColor = 'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',1)';
    this.rgbaColorPreview = 'rgba(' + imageData[0] + ',' + imageData[1] + ',' + imageData[2] + ',' + this.opacity + ')';
    const rgba = new Rgba(imageData[0], imageData[1], imageData[2], this.opacity);
    this.rgbaColorPreview = (this.opacity === 1) ? this.rgbaToHex(rgba) : this.rgbaToHex(rgba, true);
    this.selectColor.emit(this.rgbaColorPreview);
  }

  getPresetColor(): void {
    this.presetColors = this.colorPickerService.getPresetColor();
  }

  setPresetColor(color): Observable<string[]> {
    this.colorPickerService.addPresetColor(color);
    this.getPresetColor();
    return of(this.colorPickerService.presetColors);
  }

  rgbaToHex(rgba: Rgba, allowHex8?: boolean): string {
    let hex = '#' + ((1 << 24) | (rgba.r << 16) | (rgba.g << 8) | rgba.b).toString(16).substr(1);
    if (allowHex8) {
      hex += ((1 << 8) | Math.round(rgba.a * 255)).toString(16).substr(1);
    }
    return hex;
  }

  hexToRgb(hex): Array<number> {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    const a = Math.round((parseInt(hex.substring(7, 9), 16) / 255) * 100) / 100;
    return (hex.length > 7) ? [r, g, b] : [r, g, b];
  }

  hexToRgbString(hex): string {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    const a = Math.round((parseInt(hex.substring(7, 9), 16) / 255) * 100) / 100;
    return (hex.length > 7) ? 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')' : 'rgba(' + r + ',' + g + ',' + b + ',1)';
  }

}
