from django.core.exceptions import ValidationError
from django.db import models

from InformingChoicesBackend.models.event import Event

class Form(models.Model):
    PROVIDERS = [
        ("google_forms", "Google Forms"),
    ]

    name = models.CharField(max_length=255, unique=True)
    provider = models.CharField(max_length=50, choices=PROVIDERS)
    base_link = models.CharField(max_length=1024)
    external_id = models.CharField(max_length=255)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    schema = models.JSONField(blank=True, null=True)

    def clean(self):
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