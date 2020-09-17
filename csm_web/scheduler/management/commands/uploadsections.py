from django.core.management import BaseCommand
from scheduler.models import Course, User, Mentor, Section, Spacetime, DayOfWeekField
from datetime import timedelta, datetime
import re
import csv
import io
import requests


class Command(BaseCommand):
    TIME_FORMAT = "%I:%M %p"
    CSV_FIELDS = ('mentor_email', 'day1', 'time1', 'day2', 'time2', 'description', 'capacity')
    one_hour = timedelta(hours=1)
    SECTION_DURATIONS = {
        'CS61A': one_hour,
        'CS61B': one_hour,
        'CS61C': one_hour,
        'CS70': one_hour,
        'CS88': one_hour,
        'EE16A': one_hour * 1.5,
        'EE16B': one_hour * 1.5,
        'EECS16A': one_hour * 1.5,
        'EECS16B': one_hour * 1.5,
    }

    def add_arguments(self, parser):
        parser.add_argument("course_name", type=str, help="The name of the course to make sections for")
        parser.add_argument("csv_path", type=str, help="The filepath or URL of the CSV file to be read")
        parser.add_argument("--validateonly", action="store_true",
                            help="Do not create sections, just validate that the CSV matches the expected format")

    def handle(self, *args, **options):
        with self.get_csv_file(options['csv_path']) as csvfile:
            course = Course.objects.get(name=options['course_name'].upper())
            reader = csv.DictReader(csvfile, fieldnames=self.CSV_FIELDS)
            self.validate(reader)
            if options['validateonly']:
                return
            csvfile.seek(0)
            reader = csv.DictReader(csvfile, fieldnames=self.CSV_FIELDS)
            self.create_sections(course, reader)

    def get_csv_file(self, csv_path):
        if re.match(r'https?://', csv_path):
            response = requests.get(csv_path)
            response.raise_for_status()
            return io.StringIO(response.text)
        else:
            return open(csv_path, 'r')

    def parse_time(self, timestring):
        return datetime.strptime(timestring, self.TIME_FORMAT).time()

    def validate(self, reader):
        next(reader)  # Skip header row
        for row in reader:
            row = {key: value.strip() for key, value in row.items()}
            assert re.fullmatch(r'.+@berkeley\.edu', row['mentor_email'])
            assert row['day1'] in DayOfWeekField.DAYS
            assert self.parse_time(row['time1'])
            if row['day2'] or row['time2']:
                assert row['day2'] and row['time2']
                assert row['day2'] in DayOfWeekField.DAYS
                assert self.parse_time(row['time2'])
            assert len(row['description']) <= Section._meta.get_field('description').max_length
            assert row['capacity'].isdecimal()

    def create_sections(self, course, reader):
        next(reader)  # Skip header row
        for row in reader:
            row = {key: value.strip() for key, value in row.items()}
            user, _ = User.objects.get_or_create(email=row['mentor_email'], username=row['mentor_email'].split('@')[0])
            mentor = Mentor.objects.create(user=user)
            spacetimes = [Spacetime.objects.create(location='Online', day_of_week=row['day1'], start_time=self.parse_time(
                row['time1']), duration=self.SECTION_DURATIONS[course.name], section=None), ]
            if row['day2'] and row['time2']:
                spacetimes.append(Spacetime.objects.create(location='Online', day_of_week=row['day2'], start_time=self.parse_time(
                    row['time2']), duration=self.SECTION_DURATIONS[course.name], section=None))
            section = Section.objects.create(course=course, capacity=int(row['capacity']),
                                             mentor=mentor, description=row['description'])
            section.spacetimes.set(spacetimes)
            section.save()
