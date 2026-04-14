import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-page-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isLoading$ | async" class="page-loader">
      <div class="spinner-container">
        <div class="spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <p class="loader-text">Cargando...</p>
      </div>
    </div>
  `,
  styles: [`
    .page-loader {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
    }

    .spinner-container {
      text-align: center;
    }

    .spinner {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
    }

    .spinner-ring {
      position: absolute;
      border: 4px solid rgba(91, 45, 144, 0.2);
      border-radius: 50%;
      animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    .spinner-ring:nth-child(1) {
      width: 80px;
      height: 80px;
      animation-delay: -0.45s;
    }

    .spinner-ring:nth-child(2) {
      width: 60px;
      height: 60px;
      animation-delay: -0.3s;
      border-color: rgba(91, 45, 144, 0.4);
    }

    .spinner-ring:nth-child(3) {
      width: 40px;
      height: 40px;
      animation-delay: -0.15s;
      border-color: rgba(91, 45, 144, 0.6);
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
        border-color: rgba(91, 45, 144, 0.2);
      }
      50% {
        border-color: rgba(91, 45, 144, 1);
      }
      100% {
        transform: rotate(360deg);
        border-color: rgba(91, 45, 144, 0.2);
      }
    }

    .loader-text {
      color: #fff;
      font-size: 1rem;
      margin: 0;
      letter-spacing: 2px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
  `]
})
export class PageLoaderComponent implements OnInit {
  isLoading$: any;

  constructor(private loadingService: LoadingService) {}

  ngOnInit(): void {
    this.isLoading$ = this.loadingService.loading$;
  }
}
