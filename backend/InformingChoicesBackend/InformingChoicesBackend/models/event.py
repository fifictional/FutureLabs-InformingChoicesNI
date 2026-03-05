from django.core.exceptions import ValidationError
from django.db import models

from InformingChoicesBackend.models.event_tag import EventTag

class Event(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    tags = models.ManyToManyField(EventTag, related_name="events", blank=True)

    def clean(self):
        super().clean()
        if self.name and not self.name.strip():
            raise ValidationError({"name": "Event name cannot be blank."})

