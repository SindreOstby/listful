import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OfflineNotice } from './core/offline-notice';

@Component({
  imports: [OfflineNotice, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
