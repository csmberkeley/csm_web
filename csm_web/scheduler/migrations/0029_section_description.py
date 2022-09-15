# Generated by Django 3.2.6 on 2022-07-21 02:34

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0028_auto_20220720_1924'),
    ]

    operations = [
        migrations.AddField(
            model_name='section',
            name='description',
            field=models.CharField(
                blank=True, help_text='A brief note to add some extra information about the section, e.g. "EOP" or "early start".', max_length=100),
        ),
    ]