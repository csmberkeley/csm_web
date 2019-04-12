# Generated by Django 2.1.7 on 2019-04-12 02:21

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("logistinator", "0004_matching_weekly")]

    operations = [
        migrations.AddField(
            model_name="matching",
            name="end_datetime",
            field=models.DateField(blank=True, default=datetime.datetime.now),
        ),
        migrations.AddField(
            model_name="matching",
            name="start_datetime",
            field=models.DateField(blank=True, default=datetime.datetime.now),
        ),
    ]
