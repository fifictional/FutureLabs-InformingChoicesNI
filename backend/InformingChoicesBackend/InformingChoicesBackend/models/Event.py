"""
Represents an event organised by or linked to Informing Choices.
"""

from django.core.exceptions import ValidationError
from django.db import models

from InformingChoicesBackend.models.EventTag import EventTag

class Event(models.Model):
    """
    Represents an event.

    Fields include:
    - name: The name of the event.
    - description: A description of the event.
    - tags: A list of tags associated with the event.
    """
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)
    tags = models.ManyToManyField(EventTag, related_name="events", blank=True)

    def clean(self):
        """
        Asserts that the event name is not blank.
        :return: None
        """
        super().clean()
        if self.name and not self.name.strip():
            raise ValidationError({"name": "Event name cannot be blank."})

