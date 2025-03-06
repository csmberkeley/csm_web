import React from "react";
import styles from "../../css/coord_interface.scss";

export default function SearchBar(change: (event: React.ChangeEvent<HTMLInputElement>) => void) {
  return (
    <div className={styles}>
      <div className="search-bar">
        <input type="text" placeholder="Search" onChange={change} />
      </div>
    </div>
  );
}
