# Generated by Django 3.2.6 on 2022-01-28 02:03

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0025_student_course'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='priority_enrollment',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
