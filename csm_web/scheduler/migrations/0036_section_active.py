from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "scheduler",
            "0035_course_max_waitlist_enroll_section_waitlist_capacity_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="section",
            name="active",
            field=models.BooleanField(db_index=True, default=True),
        ),
    ]
