from django.db import models

from InformingChoicesBackend.models.form import Form

class Question(models.Model):
    form = models.ForeignKey(Form, on_delete=models.CASCADE)
    external_id = models.CharField(max_length=255)
    text = models.TextField()
    type = models.CharField(max_length=50)
    metadata = models.JSONField(null=True, blank=True)