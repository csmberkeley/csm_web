import PropTypes from "prop-types";
export const OVERRIDE_SHAPE = PropTypes.shape({
  date: PropTypes.string.isRequired,
  // Hacky solution to avoid cyclic dependence between OVERRIDE_SHAPE and SPACETIME_SHAPE
  spacetime: PropTypes.shape({
    dayOfWeek: PropTypes.string.isRequired,
    duration: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired,
    location: PropTypes.string.isRequired,
    startTime: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired
  })
});

export const SPACETIME_SHAPE = PropTypes.shape({
  dayOfWeek: PropTypes.string.isRequired,
  duration: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  location: PropTypes.string.isRequired,
  startTime: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired,
  override: OVERRIDE_SHAPE
});
