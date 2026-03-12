from django.utils.text import slugify
from rest_framework import viewsets

from InformingChoicesBackend.models.EventTag import EventTag
from InformingChoicesBackend.serializers import EventTagSerializer

class EventTagViewSet(viewsets.ModelViewSet):
    serializer_class = EventTagSerializer
    queryset = EventTag.objects.all()
