import PropTypes from "prop-types";

export const ROLES = Object.freeze({ COORDINATOR: "COORDINATOR", STUDENT: "STUDENT", MENTOR: "MENTOR" });

export const SPACETIME_SHAPE = PropTypes.shape({
  dayOfWeek: PropTypes.string.isRequired,
  duration: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  location: PropTypes.string.isRequired,
  startTime: PropTypes.string.isRequired,
  time: PropTypes.string.isRequired
});

export const PROFILE_SHAPE = PropTypes.shape({
  id: PropTypes.number.isRequired,
  sectionId: PropTypes.number,
  sectionSpacetime: PropTypes.shape({ time: PropTypes.string.isRequired, location: PropTypes.string }),
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  courseId: PropTypes.number.isRequired,
  role: PropTypes.oneOf(Object.values(ROLES)).isRequired
});
