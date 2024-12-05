import { DateTime, Info } from "luxon";
import React, { useEffect, useState } from "react";

import { DEFAULT_TIMEZONE } from "../../../utils/datetime";

import LeftArrow from "../../../../static/frontend/img/angle-left-solid.svg";
import RightArrow from "../../../../static/frontend/img/angle-right-solid.svg";

import "../../../css/calendar-month.scss";

interface CalendarMonthProps {
  // List of dates that have occurrences, in ISO format
  occurrenceDates: string[];
  // Mapping between occurrence dates and text to display for that occurrence.
  // Keys should match items in `occurrenceDates` exactly; some elements can be omitted.
  occurrenceTextMap: Map<string, string>;
  selectedOccurrence?: string;
  // click handler; the date in ISO format is passed in as an argument
  onClickDate: (day: string) => void;
}

export const CalendarMonth = ({
  occurrenceDates,
  occurrenceTextMap,
  selectedOccurrence,
  onClickDate
}: CalendarMonthProps) => {
  /**
   * Current ISO month number.
   */
  const [curMonth, setCurMonth] = useState<number>(DateTime.now().month);
  /**
   * Current year.
   */
  const [curYear, setCurYear] = useState<number>(DateTime.now().year);

  useEffect(() => {
    if (selectedOccurrence != null) {
      // upon change of the selected occurence, make sure the calendar also matches
      const selectedDateTime = DateTime.fromISO(selectedOccurrence, { zone: DEFAULT_TIMEZONE });
      if (curMonth !== selectedDateTime.month) {
        setCurMonth(selectedDateTime.month);
      }
      if (curYear != selectedDateTime.year) {
        setCurYear(selectedDateTime.year);
      }
    }
  }, [selectedOccurrence]);

  const modifyMonth = (diff: number) => {
    const curDate = DateTime.fromObject({ year: curYear, month: curMonth });
    const nextDate = curDate.plus({ months: diff });

    setCurMonth(nextDate.month);
    setCurYear(nextDate.year);
  };

  /**
   * Navigate to the current month.
   */
  const handleToday = () => {
    const today = DateTime.now();
    setCurMonth(today.month);
    setCurYear(today.year);
  };

  /**
   * Compute the weekday index from an ISO weekday number (1-7).
   * This accounts for any shifting that we need to perform to display days in the calendar.
   */
  const weekdayIndexFromISO = (weekday: number) => {
    return weekday % 7;
  };

  const weekdayISOFromIndex = (idx: number) => {
    return ((idx + 6) % 7) + 1;
  };

  const curMonthFirstDay = DateTime.fromObject({ year: curYear, month: curMonth, day: 1 });
  const nextMonthFirstDay = curMonthFirstDay.plus({ months: 1 });

  const monthGrid: React.ReactNode[][] = [];
  // push empty days until the first day of the month
  const firstWeekPadding = [...Array(weekdayIndexFromISO(curMonthFirstDay.weekday))].map((_, idx) => (
    <CalendarMonthDay key={-idx} year={-1} month={-1} day={-1} isoDate="" hasOccurrence={false} selected={false} />
  ));
  monthGrid.push(firstWeekPadding);

  for (let date = curMonthFirstDay; date < nextMonthFirstDay; date = date.plus({ days: 1 })) {
    // get last week in month grid
    const curWeek = monthGrid[monthGrid.length - 1];

    const curDay = (
      <CalendarMonthDay
        key={date.day}
        year={date.year}
        month={date.month}
        day={date.day}
        isoDate={date.toISODate() ?? ""}
        hasOccurrence={occurrenceDates.includes(date.toISODate()!)}
        text={occurrenceTextMap.get(date.toISODate())}
        selected={date.toISODate() === selectedOccurrence}
        onClickDate={onClickDate}
      />
    );

    if (curWeek.length < 7) {
      curWeek.push(curDay);
    } else {
      monthGrid.push([curDay]);
    }
  }

  return (
    <div className="calendar-month-container">
      <div className="calendar-month-header">
        <div className="calendar-month-header-left">
          <span className="calendar-month-title">
            {Info.months()[curMonth - 1]} {curYear}
          </span>
        </div>
        <div className="calendar-month-header-right">
          <button className="calendar-month-today-btn" onClick={handleToday}>
            Today
          </button>
          <LeftArrow className="icon calendar-month-nav-icon" onClick={() => modifyMonth(-1)} />
          <RightArrow className="icon calendar-month-nav-icon" onClick={() => modifyMonth(1)} />
        </div>
      </div>
      <div className="calendar-month-weekday-headers">
        {[...Array(7)].map((_, idx) => (
          <div key={idx} className="calendar-month-weekday-header">
            {Info.weekdays("short")[weekdayISOFromIndex(idx) - 1]}
          </div>
        ))}
      </div>
      <div className="calendar-month-grid">
        {monthGrid.map((monthGridWeek, idx) => (
          <div key={idx} className="calendar-month-week">
            {monthGridWeek}
          </div>
        ))}
      </div>
    </div>
  );
};

interface CalendarMonthDayProps {
  year: number;
  month: number;
  day: number;
  isoDate: string;
  // Text to be displayed in the calendar day
  text?: string;
  hasOccurrence: boolean;
  selected: boolean;
  onClickDate?: (date: string) => void;
}

/**
 * Calendar month day component.
 *
 * If `day` is -1, displays an empty box.
 */
export const CalendarMonthDay = ({
  year,
  month,
  day,
  isoDate,
  text,
  hasOccurrence,
  selected,
  onClickDate
}: CalendarMonthDayProps) => {
  const today = DateTime.now();
  const curDate = DateTime.fromObject({ year, month, day });
  const isTransparent = day === -1;
  const classes = ["calendar-month-day"];
  if (isTransparent) {
    // transparent higher priority than disabled
    classes.push("transparent");
  } else if (selected) {
    classes.push("selected");
  } else if (hasOccurrence) {
    classes.push("with-occurrence");
  }

  if (year === today.year && month === today.month && day == today.day) {
    classes.push("today");
  } else if (curDate < today) {
    classes.push("past");
  }

  const handleClick = () => {
    if (onClickDate != null && !selected && hasOccurrence) {
      onClickDate(isoDate);
    }
  };

  return (
    <div className={classes.join(" ")} onClick={handleClick}>
      {isTransparent ? (
        <span></span>
      ) : (
        <>
          <span className="calendar-month-day-number">{day}</span>
          <span className="calendar-month-day-text">{text}</span>
        </>
      )}
    </div>
  );
};
