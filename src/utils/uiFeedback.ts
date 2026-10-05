export function confirmFeedback() {
  document.dispatchEvent(new CustomEvent('zney-ui-feedback', { detail: 'confirm' }));
}
