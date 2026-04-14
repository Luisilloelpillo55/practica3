import { trigger, state, style, transition, animate } from '@angular/animations';

/**
 * Animation for page entrance (fade-in + slide)
 * Use this on the main container of any page component
 */
export const pageEnterAnimation = trigger('pageEnter', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'translateY(20px)'
    }),
    animate('400ms ease-out', style({
      opacity: 1,
      transform: 'translateY(0)'
    }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({
      opacity: 0,
      transform: 'translateY(-20px)'
    }))
  ])
]);

/**
 * Animation for list items staggered entrance
 * Use this on *ngFor items to create a cascading effect
 */
export const listItemAnimation = trigger('listItem', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'translateX(-30px)'
    }),
    animate('300ms 100ms ease-out', style({
      opacity: 1,
      transform: 'translateX(0)'
    }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({
      opacity: 0,
      transform: 'translateX(30px)'
    }))
  ])
]);

/**
 * Animation for modal/dialog entrance
 * Use this on dialog containers
 */
export const modalAnimation = trigger('modal', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'scale(0.95)'
    }),
    animate('300ms ease-out', style({
      opacity: 1,
      transform: 'scale(1)'
    }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({
      opacity: 0,
      transform: 'scale(0.95)'
    }))
  ])
]);

/**
 * Animation for card entrance (staggered with delay)
 * Use this on card components
 */
export const cardAnimation = trigger('card', [
  transition(':enter', [
    style({
      opacity: 0,
      transform: 'translateY(30px)'
    }),
    animate('400ms 150ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({
      opacity: 1,
      transform: 'translateY(0)'
    }))
  ])
]);

/**
 * Smooth fade animation
 */
export const fadeAnimation = trigger('fade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-in', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('300ms ease-out', style({ opacity: 0 }))
  ])
]);

/**
 * Rotation animation for loading spinners
 */
export const spinAnimation = trigger('spin', [
  state('spinning', style({ transform: 'rotate(360deg)' })),
  transition('* => spinning', animate('1000ms linear', style({ transform: 'rotate(360deg)' }))),
]);
