import React from "react";
import styles from "../../css/coord_interface.scss";

interface CheckBoxProps {
  id: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CheckBox({ id, checked, onChange }: CheckBoxProps) {
  return (
    <td className={styles} onClick={e => e.stopPropagation()}>
      <div className="checkbox-wrapper">
        <input
          className="inp-cbx"
          id={id + "check"}
          type="checkbox"
          checked={checked} // Controlled by React State!
          onChange={onChange} // Standard React event
        />
        <label className="cbx" htmlFor={id + "check"}>
          <span>
            <svg width="12px" height="10px">
              <use xlinkHref="#check"></use>
            </svg>
          </span>
        </label>
        <svg className="inline-svg">
          <symbol id="check" viewBox="0 0 12 10">
            <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
          </symbol>
        </svg>
      </div>
    </td>
  );
}
