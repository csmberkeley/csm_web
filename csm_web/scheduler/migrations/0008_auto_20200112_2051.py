# Generated by Django 3.0.1 on 2020-01-13 04:51

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0007_auto_20200103_1530'),
    ]

    operations = [
        migrations.RenameField(
            model_name='spacetime',
            old_name='_day_of_week',
            new_name='day_of_week',
        ),
        migrations.RenameField(
            model_name='spacetime',
            old_name='_duration',
            new_name='duration',
        ),
        migrations.RenameField(
            model_name='spacetime',
            old_name='_location',
            new_name='location',
        ),
        migrations.RenameField(
            model_name='spacetime',
            old_name='_start_time',
            new_name='start_time',
        ),
        migrations.AlterField(
            model_name='override',
            name='overriden_spacetime',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE,
                                       related_name='_override', to='scheduler.Spacetime'),
        ),
    ]
