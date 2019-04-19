import moment from "moment";
import $ from "jquery";
/*import Cookies from "js-cookie";*/

/* Why is this useful? Trying to access a mispelled property of an object will result in an error
   during build, whereas a mispelled string literal would cause an error only when fetch
   was actually called */
/*const HTTP_METHODS = Object.freeze({
  POST: "POST",
  GET: "GET",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE"
});
export { HTTP_METHODS };

export function fetchWithMethod(endpoint, method, data = {}) {
  if (!HTTP_METHODS.hasOwnProperty(method)) {
    // check that method choice is valid
    throw new Error(
      "HTTP method must be one of: POST, GET, PUT, PATCH, or DELETE"
    );
  }
  return fetch(`/api/${endpoint}`, {
    method: method,
    credentials: "same-origin",
    headers: {
      "X-CSRFToken": Cookies.get("csrftoken"),
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });
}

export function fetchJSON(endpoint) {
  return fetch(`/api/${endpoint}`).then(response => response.json());
}

endpoint = "http://127.0.0.1:8000/api/flag/1/toggle"
fetchWithMethod(endpoint, 'POST')
*/
/**
 * Global Variables
 */

var isMouseDown = false;

var colorBuffer = "#6c7ae0";
var colorHighlighted = "#6c7ae0";

/**
 * Toggle visibility of the availability table
 */

function toggleAvailabilityTable() {
  if ($("table").is(":visible")) {
    $("table").hide();
  } else {
    $("table").show();
  }
}

/**
 * Returns a list of moment objects between start time and stop time (both
 * included) separated by provided time internation
 * @param  {moment} paramStartTime Parsed in start time
 * @param  {moment} paramStopTime Parsed in stop time
 * @param  {moment} paramInterval Parsed in time interval
 * @return {Array} timeStops List of time stops
 */

function getTimeStops(paramStartTime, paramStopTime, paramInterval) {
  var startTime = moment(paramStartTime, "HH:mm");
  var endTime = moment(paramStopTime, "HH:mm");
  var interval = paramInterval;
  var timeStops = [];

  while (startTime <= endTime) {
    timeStops.push(new moment(startTime).format("HH:mm"));
    startTime.add(interval, "minutes");
  }

  return timeStops;
}

/**
 * Populates a select element with option elements with moment objects
 * from provided list of time stops.
 * @param  {string} selectID Select element's 'id' attribute
 * @param  {Array} timeStops Array of moment objects
 * @param  {integer} defaultSelected Selects the default time at the given index
 */

function populateSelectOptions(selectID, timeStops, defaultSelected = 0) {
  var select = document.getElementById(selectID);

  for (var i = 0; i < timeStops.length; i++) {
    var data = timeStops[i];
    var option = $("<option>", { value: data })
      .text(data)
      .prop("selected", i == defaultSelected);
    option.appendTo(select);
  }
}

function populateDropDown(
  defaultStart = 18,
  defaultStop = 34,
  intervalMinutes = 30
) {
  var timeStops = getTimeStops("00:00", "23:30", intervalMinutes);
  populateSelectOptions("select-start", timeStops, defaultStart);
  populateSelectOptions("select-end", timeStops, defaultStop);
}

function populateAvailabilityTable() {
  // Stores references to start select and end select
  var start = document.getElementById("select-start");
  var end = document.getElementById("select-end");

  // Extracts selected start and end time
  var startTime = start.options[start.selectedIndex].value;
  var endTime = end.options[end.selectedIndex].value;
  console.log(startTime);
  console.log(endTime);

  // Dynamically delete rows from preexisting table configuration
  deleteRowsFromAvailabilityTable(startTime, endTime);

  // Dynamic creation of rows in a new table configuration
  // addRowsToNewAvailabilityTable()

  // Shows table if its hidden
  if (!$("table").is(":visible")) {
    toggleAvailabilityTable();
  }
}

function deleteRowsFromAvailabilityTable(startTime, endTime) {
  // Creates a list of time stops between the start and end time
  var timeStops = getTimeStops("00:00", "23:30", 30);
  var selectedTimeStops = getTimeStops(startTime, endTime, 30);

  var deleteTimeStops = timeStops.filter(function removeElementsFromArray(el) {
    return !selectedTimeStops.includes(el);
  });

  // Dynamic removal of rows that are not needed
  for (var i = 0; i < deleteTimeStops.length; i++) {
    // Replace 15 with timeStops.length after table is completed
    var time = deleteTimeStops[i];
    var timeClass = time.replace(":", "");
    var row = $(".time" + timeClass);
    row.remove();
  }
}

function addHoverRowColumnHighlight() {
  var table = $(this)
    .parent()
    .parent()
    .parent();

  var column = $(this).data("column") + "";

  $(table)
    .find("." + column)
    .addClass("hov-column");
  $(table)
    .find(".row100.head ." + column)
    .addClass("hov-column-head");
}

function removeHoverRowColumnHighlight() {
  var table = $(this)
    .parent()
    .parent()
    .parent();

  var column = $(this).data("column") + "";

  $(table)
    .find("." + column)
    .removeClass("hov-column");
  $(table)
    .find(".row100.head ." + column)
    .removeClass("hov-column-head");
}

function mousedownSelectCell() {
  isMouseDown = true;

  if (!this.highlighted) {
    this.colorBuffer = this.style.backgroundColor;
    this.highlighted = true;
    this.style.backgroundColor = colorHighlighted;
  } else {
    this.style.backgroundColor = this.colorBuffer;
    this.highlighted = false;
  }
  return false;
}

function mouseoverDragSelect() {
  if (isMouseDown) {
    if (!this.highlighted) {
      this.colorBuffer = this.style.backgroundColor;
      this.highlighted = true;
      this.style.backgroundColor = colorHighlighted;
    } else {
      this.style.backgroundColor = this.colorBuffer;
      this.highlighted = false;
    }
  }
}

$(document).ready(function() {
  // Hides table initially
  $(toggleAvailabilityTable());
  // Populates the drop down menus with time slots
  $(populateDropDown());
  //
  $(".button").on("click", populateAvailabilityTable);
  //
  $(".column").on("mouseover", addHoverRowColumnHighlight);
  //
  $(".column").on("mouseout", removeHoverRowColumnHighlight);
  //
  $(".column")
    .mousedown(mousedownSelectCell)
    .mouseover(mouseoverDragSelect);
  //
  $(document).mouseup(function() {
    isMouseDown = false;
  });
});
