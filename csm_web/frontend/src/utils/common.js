export function alert_modal(message, callback) {
  UIkit.modal.alert(message).then(callback)
}
