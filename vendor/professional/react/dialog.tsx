'use client';
import * as React from 'react';
import { Dialog as Primitive } from '@base-ui/react/dialog';

function classes<S>(base: string, value?: string | ((state: S) => string | undefined)) {
  return typeof value === 'function' ? (state: S) => `${base} ${value(state) || ''}` : `${base} ${value || ''}`;
}
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogPortal = Primitive.Portal;
export const DialogClose = Primitive.Close;
export function DialogOverlay({className, ...props}: Primitive.Backdrop.Props) {
  return <Primitive.Backdrop data-slot="dialog-overlay" className={classes('pf-dialog-overlay', className)} {...props} />;
}
export function DialogContent({className, children, showCloseButton = true, ...props}: Primitive.Popup.Props & {showCloseButton?: boolean}) {
  return <DialogPortal>
    <DialogOverlay />
    <Primitive.Popup data-slot="dialog-content" className={classes('pf-dialog', className)} {...props}>
      {children}
      {showCloseButton && <DialogClose className="pf-dialog-close" aria-label="Close dialog">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </DialogClose>}
    </Primitive.Popup>
  </DialogPortal>;
}
export function DialogHeader({className, ...props}: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={`pf-dialog-header ${className || ''}`} {...props} />;
}
export function DialogBody({className, ...props}: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-body" className={`pf-dialog-body ${className || ''}`} {...props} />;
}
export function DialogFooter({className, children, showCloseButton = false, ...props}: React.ComponentProps<'div'> & {showCloseButton?: boolean}) {
  return <div data-slot="dialog-footer" className={`pf-dialog-footer ${className || ''}`} {...props}>
    {children}{showCloseButton && <DialogClose>Close</DialogClose>}
  </div>;
}
export function DialogTitle({className, ...props}: Primitive.Title.Props) {
  return <Primitive.Title data-slot="dialog-title" className={classes('pf-dialog-title', className)} {...props} />;
}
export function DialogDescription({className, ...props}: Primitive.Description.Props) {
  return <Primitive.Description data-slot="dialog-description" className={classes('pf-dialog-description', className)} {...props} />;
}
