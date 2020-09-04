# Generated by Django 3.0.7 on 2020-09-04 06:57

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0014_auto_20200903_2340'),
    ]

    operations = [
        migrations.AlterField(
            model_name='section',
            name='spacetime',
            field=models.OneToOneField(help_text='The recurring time and location of a section. This can be temporarily overriden by the mentor, in which case the admin page will display the overriding times.',
                                       on_delete=django.db.models.deletion.CASCADE, to='scheduler.Spacetime'),
        ),
    ]
