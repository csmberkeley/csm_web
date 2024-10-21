import csv
import datetime
import io
from typing import Generator, Iterable, List, Optional, Tuple

from django.contrib.postgres.aggregates import ArrayAgg, JSONBAgg
from django.core.exceptions import BadRequest
from django.db.models import CharField, Count, Q, Value
from django.db.models.functions import Concat
from django.http.response import StreamingHttpResponse
from rest_framework.decorators import api_view
from scheduler.models import Attendance, Course, Section, Student


@api_view(["GET"])
def export_data(request):
    """
    Endpoint: /api/export

    GET: Returns a CSV file of exported data.
        Query parameters:
            preview: int or None
                if int > 0, then returns only that many entries from the database
            courses: int[]
                comma-separated list of course ids
            fields: str[]
                comma-separated list of fields
            type: str
                type of data to export
    """

    export_type = request.query_params.get("type", None)
    courses_str = request.query_params.get("courses", None)
    fields_str = request.query_params.get("fields", "")
    preview = request.query_params.get("preview", None)

    if courses_str is None or export_type is None:
        raise BadRequest(
            "Must include `courses` and `type` fields in the query parameters"
        )

    # convert courses query param into a list of ints
    try:
        courses = [int(course_id) for course_id in courses_str.split(",")]
    except ValueError as exc:
        raise BadRequest(
            "`courses` query parameter must be a comma-separated list of integers"
        ) from exc
    fields = fields_str.split(",")

    # check course ids against the user's coordinator courses
    coordinator_courses = set(
        request.user.coordinator_set.values_list("course__id", flat=True)
    )
    courses_set_diff = set(courses).difference(coordinator_courses)
    if len(courses_set_diff) > 0:
        raise PermissionError(
            "You must be a coordinator for all of the courses in the request"
        )

    # convert preview query param into an int
    if preview is not None:
        try:
            preview = int(preview)
        except ValueError as exc:
            raise BadRequest(
                "`preview` query parameter must be an integer or excluded"
            ) from exc

        if preview <= 0:
            preview = None

    # create generator for the CSV file
    csv_generator, filename = prepare_csv(export_type, courses, fields, preview=preview)

    # stream the response; this allows for more efficient data return
    response = StreamingHttpResponse(
        csv_generator,
        content_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

    return response


def get_section_times_dict(courses: List[int], section_ids: Iterable[int]):
    """
    Query the database for section times data, restricting to the given iterable of section ids.

    Normally, all data fields are fetched at the same time in a single query, but
    a second aggregate query on a different related field
    causes two OUTER JOIN operations in the SQL; this means that
    the table size increases multiplicatively, and creates many duplicate items.
    An alternative considered is a subquery in the SELECT statement,
    but this causes an extra subquery for every returned row in the database.
    A last alternative is a subquery to fetch the aggregate data as an INNER JOIN,
    but Django does not make it easy to take control of the INNER JOIN calls.
    As such, we make a second query to individually fetch the aggregate section time data,
    and combine the results in Python.
    """
    section_time_queryset = Section.objects.filter(
        # filter for courses
        mentor__course__id__in=courses
    ).annotate(
        _num_spacetimes=Count("spacetimes"),
        _location=ArrayAgg("spacetimes__location"),
        _start_time=ArrayAgg("spacetimes__start_time"),
        _duration=ArrayAgg("spacetimes__duration"),
        # weird behavior where ArrayAgg with custom DayOfWeekField
        # doesn't work (array of enums seems to be parsed by character
        # and returned as a single string)
        _day=JSONBAgg("spacetimes__day_of_week"),
    )

    # filter for only students in the earlier queryset
    # (some may be omitted by the preview or if the section is empty)
    section_time_queryset = section_time_queryset.filter(id__in=section_ids)

    section_time_values = section_time_queryset.values(
        "id",
        "_location",
        "_start_time",
        "_duration",
        "_day",
        "_num_spacetimes",
    )
    # format values in a dictionary for efficient lookup
    return {d["id"]: d for d in section_time_values}


def format_section_times(section_info: dict) -> list[str]:
    """
    Format a dictionary of section time info.

    Returns a list of formatted section spacetimes.
    """
    # format the section times
    locations = section_info["_location"]
    start_times: List[datetime.time] = section_info["_start_time"]
    durations: List[datetime.timedelta] = section_info["_duration"]
    days = section_info["_day"]

    time_list = []
    for loc, day, start, duration in zip(locations, days, start_times, durations):
        start_formatted = start.strftime("%I:%M %p")
        end_datetime = (
            datetime.datetime.combine(datetime.datetime.today(), start) + duration
        )
        end_formatted = end_datetime.time().strftime("%I:%M %p")
        time_list.append(f"{loc}, {day} {start_formatted}-{end_formatted}")

    return time_list


def prepare_csv(
    export_type: str,
    courses: List[int],
    fields: List[str],
    preview: Optional[int] = None,
) -> Tuple[Generator, str]:
    """
    Delegate CSV preparation to various other methods.
    """

    if export_type == "ATTENDANCE_DATA":
        generator = prepare_attendance_data(courses, fields, preview=preview)
        filename = "attendance_data.csv"
    elif export_type == "COURSE_DATA":
        generator = prepare_course_data(courses, fields, preview=preview)
        filename = "course_data.csv"
    elif export_type == "SECTION_DATA":
        generator = prepare_section_data(courses, fields, preview=preview)
        filename = "section_data.csv"
    elif export_type == "STUDENT_DATA":
        generator = prepare_student_data(courses, fields, preview=preview)
        filename = "student_data.csv"
    else:
        raise BadRequest("Invalid export type")

    return generator, filename


def create_csv_dict_writer(fieldnames, **kwargs):
    """
    Create a CSV DictWriter, wrapped around an in-memory buffer.

    All arguments are passed into the DictWriter constructor.
    """
    buffer = io.StringIO()
    writer = csv.DictWriter(f=buffer, fieldnames=fieldnames, **kwargs)

    def get_data():
        """
        Fetch the current data from the buffer,
        and clear it for the next usage.
        """
        buffer.seek(0)
        data = buffer.read()
        buffer.seek(0)
        buffer.truncate()

        return data

    return writer, get_data


def prepare_attendance_data(
    courses: List[int], fields: List[str], preview: Optional[int] = None
):
    """
    Prepare attendance data.
    Returns a generator for each row of the CSV file.

    Fields:
        Required:
        - student_email
        - student_name
        Optional:
        - course_name
        - active
        - section_id
        - mentor_email
        - mentor_name
        - num_present
        - num_excused
        - num_unexcused
    """
    student_queryset = Student.objects.filter(course__id__in=courses).annotate(
        full_name=Concat(
            "user__first_name",
            Value(" "),
            "user__last_name",
            output_field=CharField(),
        ),
        attendance_ids=ArrayAgg("attendance"),
    )

    export_fields = ["user__email", "full_name"]
    export_headers = ["Email", "Name"]

    if "course_name" in fields:
        export_fields.append("course__name")
        export_headers.append("Course")
    if "active" in fields:
        export_fields.append("active")
        export_headers.append("Active")
    if "section_id" in fields:
        export_fields.append("section__id")
        export_headers.append("Section ID")
    if "mentor_email" in fields:
        export_fields.append("section__mentor__user__email")
        export_headers.append("Mentor email")
    if "mentor_name" in fields:
        student_queryset = student_queryset.annotate(
            mentor_name=Concat(
                "section__mentor__user__first_name",
                Value(" "),
                "section__mentor__user__last_name",
                output_field=CharField(),
            )
        )
        export_fields.append("mentor_name")
        export_headers.append("Mentor name")
    if "num_present" in fields:
        student_queryset = student_queryset.annotate(
            num_present=Count("attendance", filter=Q(attendance__presence="PR"))
        )
        export_fields.append("num_present")
        export_headers.append("Present count")
    if "num_unexcused" in fields:
        student_queryset = student_queryset.annotate(
            num_unexcused=Count("attendance", filter=Q(attendance__presence="UN"))
        )
        export_fields.append("num_unexcused")
        export_headers.append("Unexcused count")
    if "num_excused" in fields:
        student_queryset = student_queryset.annotate(
            num_excused=Count("attendance", filter=Q(attendance__presence="EX"))
        )
        export_fields.append("num_excused")
        export_headers.append("Excused count")

    if preview is not None and preview > 0:
        # limit queryset
        student_queryset = student_queryset[:preview]

    student_values = student_queryset.values(*export_fields, "attendance_ids")

    attendance_ids = set()
    for student in student_values:
        attendance_ids.update(student["attendance_ids"])

    attendance_queryset = Attendance.objects.filter(
        id__in=attendance_ids
    ).select_related("sectionOccurrence")

    attendance_values = attendance_queryset.values(
        "id", "presence", "sectionOccurrence__date"
    )

    # preprocess to get all possible columns
    attendance_dict = {}
    date_set = set()
    for attendance in attendance_values:
        attendance_dict[attendance["id"]] = attendance
        date_set.add(attendance["sectionOccurrence__date"])

    sorted_dates = sorted(date_set)

    sorted_iso_dates = [date.isoformat() for date in sorted_dates]
    header_row = export_fields + sorted_iso_dates
    header_desc = export_headers + sorted_iso_dates
    csv_writer, get_formatted_row = create_csv_dict_writer(header_row)

    header_dict = dict(zip(header_row, header_desc))
    csv_writer.writerow(header_dict)
    yield get_formatted_row()

    for student in student_values:
        # initialize row
        row = {k: v for k, v in student.items() if k in export_fields}
        row.update({iso_date: "" for iso_date in sorted_iso_dates})

        for attendance_id in student["attendance_ids"]:
            if attendance_id is None:
                continue

            attendance = attendance_dict[attendance_id]
            att_date = attendance["sectionOccurrence__date"]
            att_presence = attendance["presence"]

            row[att_date.isoformat()] = att_presence

        csv_writer.writerow(row)
        yield get_formatted_row()


def prepare_course_data(
    courses: List[int], fields: List[str], preview: Optional[int] = None
):
    """
    Prepare course data.
    Returns a generator for each row of the CSV file.

    Fields:
        Required:
        - course_name
        Optional:
        - course_id
        - description
        - num_sections
        - num_students
        - num_mentors
    """

    course_queryset = Course.objects.filter(id__in=courses)

    export_fields = ["name"]
    export_headers = ["Name"]
    if "course_id" in fields:
        export_fields.append("id")
        export_headers.append("Course ID")
    if "description" in fields:
        export_fields.append("title")
        export_headers.append("Course title")
    if "num_sections" in fields:
        course_queryset = course_queryset.annotate(
            num_sections=Count("mentor__section", distinct=True)
        )
        export_fields.append("num_sections")
        export_headers.append("Number of sections")
    if "num_students" in fields:
        course_queryset = course_queryset.annotate(
            num_students=Count("mentor__section__students", distinct=True)
        )
        export_fields.append("num_students")
        export_headers.append("Number of students")
    if "num_mentors" in fields:
        course_queryset = course_queryset.annotate(
            num_mentors=Count("mentor", distinct=True)
        )
        export_fields.append("num_mentors")
        export_headers.append("Number of mentors")

    if preview is not None and preview > 0:
        # limit queryset
        course_queryset = course_queryset[:preview]

    values = course_queryset.values(*export_fields)

    csv_writer, get_formatted_row = create_csv_dict_writer(export_fields)

    # write the header row
    csv_writer.writerow(dict(zip(export_fields, export_headers)))
    yield get_formatted_row()

    # write the remaining rows
    for row in values:
        csv_writer.writerow(row)
        yield get_formatted_row()


def prepare_section_data(
    courses: List[int], fields: List[str], preview: Optional[int] = None
):
    """
    Prepare section data.
    Returns a generator for each row of the CSV file.

    Fields:
        Required:
        - mentor_email
        - mentor_name
        Optional:
        - course_name
        - section_id
        - section_times
        - section_description
        - num_students
        - capacity
    """
    section_queryset = Section.objects.filter(mentor__course__id__in=courses).annotate(
        mentor_name=Concat(
            "mentor__user__first_name",
            Value(" "),
            "mentor__user__last_name",
            output_field=CharField(),
        )
    )

    export_fields = ["mentor__user__email", "mentor_name"]
    export_headers = ["Mentor email", "Mentor name"]

    if "course_name" in fields:
        export_fields.append("mentor__course__name")
        export_headers.append("Course")
    if "section_id" in fields:
        export_fields.append("id")
        export_headers.append("Section ID")
    if "section_description" in fields:
        export_fields.append("description")
        export_headers.append("Description")
    if "num_students" in fields:
        section_queryset = section_queryset.annotate(num_students=Count("students"))
        export_fields.append("num_students")
        export_headers.append("Student count")
    if "capacity" in fields:
        export_fields.append("capacity")
        export_headers.append("Capacity")

    if preview is not None and preview > 0:
        # limit queryset
        section_queryset = section_queryset[:preview]

    # query database for values; always fetch id
    values = section_queryset.values("id", *export_fields)

    section_time_dict = {}
    max_spacetime_count = 0
    if "section_times" in fields:
        used_ids = set(d["id"] for d in values)
        section_time_dict = get_section_times_dict(courses, used_ids)

        # get the maximum number of section spacetimes
        if len(section_time_dict) > 0:
            max_spacetime_count = max(
                d["_num_spacetimes"] for d in section_time_dict.values()
            )

        # these appends are only for the csv writer
        if max_spacetime_count > 1:
            for spacetime_idx in range(1, max_spacetime_count + 1):
                export_fields.append(f"section_times_{spacetime_idx}")
                export_headers.append(f"Section times ({spacetime_idx})")
        else:
            # if there is zero or one spacetime, the header doesn't need to differentiate
            # between indices; we still keep the index in the raw field,
            # to simplify the code in writing to the csv
            export_fields.append("section_times_1")
            export_headers.append("Section times")

    csv_writer, get_formatted_row = create_csv_dict_writer(export_fields)

    # write the header row
    csv_writer.writerow(dict(zip(export_fields, export_headers)))
    yield get_formatted_row()

    # write the remaining rows
    for row in values:
        # filter out unwanted fields (id, etc.)
        final_row = {k: v for k, v in row.items() if k in export_fields}
        if "section_times" in fields:
            # fetch section info from auxiliary query
            section_info = section_time_dict[row["id"]]
            formatted_times = format_section_times(section_info)

            # write formatted spacetimes in separate columns
            for spacetime_idx in range(max_spacetime_count):
                cur_formatted = ""  # default to empty string to pad extras
                if spacetime_idx < len(formatted_times):
                    cur_formatted = formatted_times[spacetime_idx]
                final_row[f"section_times_{spacetime_idx + 1}"] = cur_formatted

        csv_writer.writerow(final_row)
        yield get_formatted_row()


def prepare_student_data(
    courses: List[int], fields: List[str], preview: Optional[int] = None
):
    """
    Prepare student data.
    Returns a generator for each row of the CSV file.

    Fields:
        Required:
        - student_email
        - student_name
        Optional:
        - course_name
        - active
        - mentor_email
        - mentor_name
        - section_id
        - section_times
        - num_present
        - num_excused
        - num_unexcused
    """
    # include the full name in the student queryset by default
    # (email is already included as user__email)
    student_queryset = Student.objects.filter(course__id__in=courses).annotate(
        full_name=Concat(
            "user__first_name", Value(" "), "user__last_name", output_field=CharField()
        )
    )

    # fields to fetch from the database
    export_qs_fields = ["user__email", "full_name", "section__id"]
    # fields to use for the CSV file; must correspond exactly to export_headers
    export_fields = ["user__email", "full_name"]
    # headers to use for the CSV file; must correspond exactly to export_fields
    export_headers = ["Email", "Name"]

    if "course_name" in fields:
        export_fields.append("course__name")
        export_qs_fields.append("course__name")
        export_headers.append("Course")
    if "active" in fields:
        export_fields.append("active")
        export_qs_fields.append("active")
        export_headers.append("Active")
    if "mentor_email" in fields:
        export_fields.append("section__mentor__user__email")
        export_qs_fields.append("section__mentor__user__email")
        export_headers.append("Mentor email")
    if "mentor_name" in fields:
        student_queryset = student_queryset.annotate(
            mentor_name=Concat(
                "section__mentor__user__first_name",
                Value(" "),
                "section__mentor__user__last_name",
                output_field=CharField(),
            )
        )
        export_fields.append("mentor_name")
        export_qs_fields.append("mentor_name")
        export_headers.append("Mentor name")
    if "section_id" in fields:
        export_fields.append("section__id")
        export_headers.append("Section ID")

    if "num_present" in fields:
        student_queryset = student_queryset.annotate(
            num_present=Count("attendance", filter=Q(attendance__presence="PR"))
        )
        export_fields.append("num_present")
        export_qs_fields.append("num_present")
        export_headers.append("Present count")
    if "num_unexcused" in fields:
        student_queryset = student_queryset.annotate(
            num_unexcused=Count("attendance", filter=Q(attendance__presence="UN"))
        )
        export_fields.append("num_unexcused")
        export_qs_fields.append("num_unexcused")
        export_headers.append("Unexcused count")
    if "num_excused" in fields:
        student_queryset = student_queryset.annotate(
            num_excused=Count("attendance", filter=Q(attendance__presence="EX"))
        )
        export_fields.append("num_excused")
        export_qs_fields.append("num_excused")
        export_headers.append("Excused count")

    if preview is not None and preview > 0:
        # limit queryset
        student_queryset = student_queryset[:preview]

    # query database for values
    values = student_queryset.values(*export_qs_fields)

    # default empty dict (not used if section_times is not specified)
    section_time_dict = {}
    max_spacetime_count = 0
    if "section_times" in fields:
        # A second aggregate query on a different related field
        # causes two OUTER JOIN operations in the SQL; this means that
        # the table size increases multiplicatively, and creates many duplicate items.
        # An alternative considered is a subquery in the SELECT statement,
        # but this causes an extra subquery for every returned row in the database.
        # A last alternative is a subquery to fetch the aggregate data as an INNER JOIN,
        # but Django does not make it easy to take control of the INNER JOIN calls.
        # As such, we make a second query to individually fetch the aggregate section time data,
        # and combine the results in Python.

        used_ids = set(d["section__id"] for d in values)
        section_time_dict = get_section_times_dict(courses, used_ids)

        # get the maximum number of section spacetimes
        if len(section_time_dict) > 0:
            max_spacetime_count = max(
                d["_num_spacetimes"] for d in section_time_dict.values()
            )

        # these appends are only for the csv writer
        if max_spacetime_count > 1:
            for spacetime_idx in range(max_spacetime_count):
                export_fields.append(f"section_times_{spacetime_idx + 1}")
                export_headers.append(f"Section times ({spacetime_idx + 1})")
        else:
            # if there is zero or one spacetime, the header doesn't need to differentiate
            # between indices; we still keep the index in the raw field,
            # to simplify the code in writing to the csv
            export_fields.append("section_times_1")
            export_headers.append("Section times")

    csv_writer, get_formatted_row = create_csv_dict_writer(export_fields)

    # write the header row
    csv_writer.writerow(dict(zip(export_fields, export_headers)))
    yield get_formatted_row()

    # write the remaining rows
    for row in values:
        # filter out unwanted fields (id, etc.)
        final_row = {k: v for k, v in row.items() if k in export_fields}
        if "section_times" in fields:
            # fetch section info from auxiliary query
            section_info = section_time_dict[row["section__id"]]
            formatted_times = format_section_times(section_info)
            # write formatted spacetimes in separate columns
            for spacetime_idx in range(max_spacetime_count):
                cur_formatted = ""  # default to empty string to pad extras
                if spacetime_idx < len(formatted_times):
                    cur_formatted = formatted_times[spacetime_idx]
                final_row[f"section_times_{spacetime_idx + 1}"] = cur_formatted

        csv_writer.writerow(final_row)
        yield get_formatted_row()
