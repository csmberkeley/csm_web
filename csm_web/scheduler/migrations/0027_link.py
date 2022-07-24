# Generated by Django 3.2.6 on 2022-03-26 19:00

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0026_user_priority_enrollment'),
    ]

    operations = [
        migrations.CreateModel(
            name='Link',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('url', models.URLField(max_length=255)),
                ('resource', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='scheduler.resource')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]