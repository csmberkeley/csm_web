import React from "react";

export function alert_modal(message, callback) {
  UIkit.modal.alert(message).then(callback);
}

export function Modal(props) {
  return (
    <div id={props.id} data-uk-modal>
      <div className="uk-modal-dialog uk-modal-body">
        <button
          className="uk-modal-close"
          type="button"
          style={{ float: "right" }}
          data-uk-icon="icon: close"
        >
          {" "}
        </button>
        <h2 className="uk-modal-title" style={{ marginTop: "0px" }}>
          {props.title}
        </h2>
        {props.children}
      </div>
    </div>
  );
}
