"""
Represents a form or questionnaire to be sent out to respondents.
"""

from django.core.exceptions import ValidationError
from django.db import models

from InformingChoicesBackend.models.Event import Event

class Form(models.Model):
    """
    Represents a form.

    Fields include:
    - name: The name of the form.
    - provider: The platform on which the form is hosted.
    - base_link: The base link of the form.
    - external_id: The external ID of the form.
    - event: The event with which the form is associated.
    - schema: The schema of the form.
    """

    # List of all data providers, i.e. platforms on which the form is hosted
    # First element of tuple: String stored in database
    # Second element of tuple: User-facing string, e.g. shown in a form widget
    PROVIDER_OPTIONS = [
        ("google_forms", "Google Forms"),
    ]

    name = models.CharField(max_length=255, unique=True)
    provider = models.CharField(max_length=50, choices=PROVIDER_OPTIONS)
    base_link = models.CharField(max_length=1024)
    external_id = models.CharField(max_length=255)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    schema = models.JSONField(blank=True, null=True)

    def clean(self):
        """
        Asserts that the form name, base link, and external ID are not blank.
        :return: None.
        """
        super().clean()

        errors = {}

        if self.name and not self.name.strip():
            errors["name"] = "Form name cannot be blank."

        if self.base_link and not self.base_link.strip():
            errors["base_link"] = "Base link cannot be blank."

        if self.external_id and not self.external_id.strip():
            errors["external_id"] = "External ID cannot be blank."

        if errors:
            raise ValidationError(errors)