from django.db import models
from datetime import datetime

# Create your models here.


class ActivatableModel(models.Model):
    active = models.BooleanField(default=True)

    class Meta:
        abstract = True


class Matching(ActivatableModel):

    user_id = models.CharField(max_length=100)
    room_id = models.CharField(max_length=16)
    start_datetime = models.DateTimeField(default=datetime.now, blank=True)
    end_datetime = models.DateTimeField(default=datetime.now, blank=True)
    weekly = models.BooleanField(default=True)

    def __str__(self):
        return "({person}, {room}, {start}, {end}, {weekly})".format(
            person=self.user_id,
            room=self.room_id,
            start=self.start_datetime,
            end=self.end_datetime,
            weekly="Yes" if self.weekly else "No",
        )
