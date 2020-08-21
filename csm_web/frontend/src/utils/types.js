import PropTypes from "prop-types";
export const SPACETIME_SHAPE = PropTypes.shape({
  dayOfWeek: PropTypes.string.isRequired,
  duration: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  location: PropTypes.string.isRequired,
  startTime: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired
});
