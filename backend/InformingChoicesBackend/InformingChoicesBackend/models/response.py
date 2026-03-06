from django.db import models

from InformingChoicesBackend.models.question import Question
from InformingChoicesBackend.models.submission import Submission

class Response(models.Model):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    value_text = models.TextField(null=True, blank=True)
    value_number = models.FloatField(null=True, blank=True)
    value_choice = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["submission", "question"], name="unique_response_per_question_and_submission")
        ]