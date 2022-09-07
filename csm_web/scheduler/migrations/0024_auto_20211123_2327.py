from django.db import migrations, models
import django.db.models.deletion


def move_section_course_to_mentor(apps, schema_editor):
    Section = apps.get_model("scheduler", "Section")
    Course = apps.get_model("scheduler", "Course")
    Mentor = apps.get_model("scheduler", "Mentor")
    for mentor in Mentor.objects.all():
        mentor.course = mentor.section.course
        mentor.save()
    assert Mentor.objects.filter(course__isnull=True).count() == 0


class Migration(migrations.Migration):
    atomic = True

    dependencies = [
        ("scheduler", "0023_alter_sectionoccurrence_unique_together"),
    ]

    operations = [
        # temporarily allow null values
        migrations.AddField(
            model_name="mentor",
            name="course",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to="scheduler.course",
            ),
            preserve_default=False,
        ),
        # migrate data from Section to Mentor
        migrations.RunPython(move_section_course_to_mentor),
        migrations.RemoveField(
            model_name="section",
            name="course",
        ),
        # no longer allow null values
        migrations.AlterField(
            model_name="mentor",
            name="course",
            field=models.ForeignKey(
                null=False,
                on_delete=django.db.models.deletion.CASCADE,
                to="scheduler.course",
            ),
            preserve_default=False,
        ),
    ]
