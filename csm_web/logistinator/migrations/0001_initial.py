# Generated by Django 2.1.7 on 2019-04-12 02:02

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Matching",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("active", models.BooleanField(default=True)),
                ("user_id", models.CharField(max_length=100)),
                (
                    "room_id",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("Cory-144MB", "Cory-144MB"),
                            ("Cory-258", "Cory-258"),
                            ("Cory-258", "Cory-258"),
                            ("Cory-400", "Cory-400"),
                            ("Cory-504", "Cory-504"),
                            ("Cory-521", "Cory-521"),
                            ("Cory-531", "Cory-531"),
                            ("Cory-540AB", "Cory-540AB"),
                            ("Cory-557", "Cory-557"),
                            ("Cory-Classroom-293", "Cory-Classroom-293"),
                            ("Cory-Classroom-299", "Cory-Classroom-299"),
                            ("Soda-306", "Soda-306"),
                            ("Soda-310", "Soda-310"),
                            ("Soda-320", "Soda-320"),
                            ("Soda-373", "Soda-373"),
                            ("Soda-380", "Soda-380"),
                            ("Soda-405", "Soda-405"),
                            ("Soda-430-438", "Soda-430-438"),
                            ("Soda-511", "Soda-511"),
                            ("Soda-606", "Soda-606"),
                            ("Soda-Alcove-283E", "Soda-Alcove-283E"),
                            ("Soda-Alcove-283H", "Soda-Alcove-283H"),
                            ("Soda-Alcove-341A", "Soda-Alcove-341A"),
                            ("Soda-Alcove-341B", "Soda-Alcove-341B"),
                            ("Soda-Alcove-411", "Soda-Alcove-411"),
                            ("Soda-Alcove-611", "Soda-Alcove-611"),
                        ],
                        max_length=16,
                    ),
                ),
                ("start_datetime", models.DateField()),
                ("end_datetime", models.DateField()),
                ("weekly", models.BooleanField(default=True)),
            ],
            options={"abstract": False},
        )
    ]