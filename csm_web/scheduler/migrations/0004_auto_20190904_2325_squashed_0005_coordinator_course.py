# Generated by Django 2.2.4 on 2019-09-05 06:32

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    replaces = [('scheduler', '0004_auto_20190904_2325'), ('scheduler', '0005_coordinator_course')]

    dependencies = [
        ('scheduler', '0003_auto_20190904_2222'),
    ]

    operations = [
        migrations.AlterField(
            model_name='section',
            name='description',
            field=models.CharField(
                blank=True, help_text='A brief note to add some extra information about the section, e.g. "EOP" or "early start".', max_length=100),
        ),
        migrations.AlterField(
            model_name='section',
            name='spacetime',
            field=models.OneToOneField(help_text='The recurring time and location of a section. This can be temporarily overriden by the mentor, in which case the admin page will display the overriding times.',
                                       on_delete=django.db.models.deletion.CASCADE, to='scheduler.Spacetime'),
        ),
        migrations.AlterField(
            model_name='student',
            name='active',
            field=models.BooleanField(default=True, help_text='An inactive student is a dropped student.'),
        ),
        migrations.CreateModel(
            name='Coordinator',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('course', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='scheduler.Course')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
