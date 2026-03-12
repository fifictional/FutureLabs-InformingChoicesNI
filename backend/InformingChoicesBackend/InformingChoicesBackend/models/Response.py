"""
Represents a response to a question in a form submission.
"""

from django.db import models

from InformingChoicesBackend.models.Question import Question
from InformingChoicesBackend.models.Submission import Submission


class Response(models.Model):
    """
    Represents a question response.

    Fields include:
    - submission: The submission to which the response belongs.
    - question: The question to which the response corresponds.
    - value_text: The textual value of the response.
    - value_number: The numerical value of the response.
    - value_choice: The choice value of the response.
    """
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    value_text = models.TextField(null=True, blank=True)
    value_number = models.FloatField(null=True, blank=True)
    value_choice = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        """
        Ensures that each question response is unique within a submission.
        """
        constraints = [
            models.UniqueConstraint(fields=["submission", "question"], name="unique_response_per_question_and_submission")
        ]