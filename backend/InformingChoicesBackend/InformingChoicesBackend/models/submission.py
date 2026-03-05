from django.db import models

from InformingChoicesBackend.models.form import Form

class Submission(models.Model):
    form = models.ForeignKey(Form, 
                             on_delete=models.CASCADE)
    submitted_at = models.DateTimeField()
    external_id = models.CharField(max_length=255)