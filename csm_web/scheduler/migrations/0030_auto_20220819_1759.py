# Generated by Django 3.2.6 on 2022-08-20 00:59

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0029_section_description'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='section',
            name='description',
        ),
        migrations.AlterField(
            model_name='label',
            name='course',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                    related_name='labels', to='scheduler.course'),
        ),
    ]