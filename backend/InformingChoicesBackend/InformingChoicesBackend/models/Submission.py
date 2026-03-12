"""
Represents a form submission.

Each form submission consists of a set of responses to questions in the form.
"""

from django.db import models

from InformingChoicesBackend.models.Form import Form

class Submission(models.Model):
    form = models.ForeignKey(Form, 
                             on_delete=models.CASCADE)
    submitted_at = models.DateTimeField()
    external_id = models.CharField(max_length=255)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["form", "external_id"], name="unique_submission_per_form")
        ]