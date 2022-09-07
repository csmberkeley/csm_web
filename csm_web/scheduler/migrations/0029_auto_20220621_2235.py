# Generated by Django 3.2.13 on 2022-06-22 05:35

from django.db import migrations, models
import django.db.models.deletion
import scheduler.models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0028_merge_0027_auto_20220424_0333_0027_link'),
    ]

    operations = [
        migrations.AddField(
            model_name='matcher',
            name='active',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='matcher',
            name='assignment',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name='matcher',
            name='course',
            field=scheduler.models.OneToOneOrNoneField(
                blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='scheduler.course'),
        ),
    ]
