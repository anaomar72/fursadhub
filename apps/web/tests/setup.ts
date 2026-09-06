import '@testing-library/jest-dom/vitest'

/**
 * jsdom ships `<dialog>` but not its modal behaviour: `showModal`, `close` and the `open` property
 * are all missing, so any component built on a real `<dialog>` throws on mount under test.
 *
 * <p>These stand-ins do the part tests actually observe — toggling `open`, and firing `close` so a
 * dialog's own `onClose` still runs. Everything else about modality (the top layer, the backdrop,
 * focus trapping, inertness of the page behind) is the browser's, and is not simulated here; a test
 * that needs to assert on those belongs in Playwright, not jsdom.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
    if (!this.open) return
    this.open = false
    if (returnValue !== undefined) this.returnValue = returnValue
    this.dispatchEvent(new Event('close'))
  }
}
