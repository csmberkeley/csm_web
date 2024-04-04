import "../../css/coordinator-add-student.scss";

import React from 'react';
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import from '../_variables.scss';
import Modal from "../Modal";
 
export default function DropConfirmationModal() {
    return (
        <div>
            <Popup trigger=
                {<button> Drop </button>} //Drop button on the coordinator interface
                position="right center">
                <div>Do you really want to drop?</div>
                <button>Confirm drop</button>
                <button>Exit</button>
            </Popup>
        </div>
    )
};

//css start

.popup-content {
    margin: auto;
    background-color: $csm-resources;
    width: 50%;
    padding: 5px;
    border-radius: 5px;
}

.confirm-drop-button {
    background-color: $csm-green; 
    color: $calendar-header-bg; 
}

.drop-button {
    background-color: $csm-green; 
    color: $calendar-header-bg; 
}

.exit-button {
    background-color: $csm-danger;
}