# Generated by Django 3.1.5 on 2021-07-21 15:55

from django.db import migrations, models
import scheduler.models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0018_resource'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='resource',
            options={'ordering': ['week_num']},
        ),
        migrations.AlterField(
            model_name='resource',
            name='solution_file',
            field=models.FileField(blank=True, upload_to=scheduler.models.worksheet_path),
        ),
        migrations.AlterField(
            model_name='resource',
            name='worksheet_file',
            field=models.FileField(blank=True, upload_to=scheduler.models.worksheet_path),
        ),
    ]
