"""
Represents a tag associated with an event.

Tags are used to label or classify events.
There is a many-to-many relationship between events and tags.
"""

from django.db import models

class EventTag(models.Model):
    """
    Represents an event tag.
    """
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)

    def __str__(self):
        """
        Returns the string representation of the event tag.
        :return: The name of the event tag.
        """
        return self.name
