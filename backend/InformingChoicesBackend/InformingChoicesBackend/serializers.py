from rest_framework import serializers

from .models import EventTag
from .models import Event
from .models import Form
from .models import Question
from .models import Response
from .models import Submission

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = "__all__"

class FormSerializer(serializers.ModelSerializer):
    class Meta:
        model = Form
        fields = "__all__"

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = "__all__"

class ResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Response
        fields = "__all__"

class SubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = "__all__"

class EventTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventTag
        fields = "__all__"