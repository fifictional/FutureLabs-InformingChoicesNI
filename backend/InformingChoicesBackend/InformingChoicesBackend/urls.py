"""
URL configurations.
"""

from django.urls import include, path
from rest_framework import routers
from InformingChoicesBackend import views

router = routers.DefaultRouter()
router.register(r'events', views.EventsViewSet, basename='events')
router.register(r'tags', views.EventTagViewSet, basename='tags')
router.register(r'forms', views.FormsViewSet, basename='forms')

urlpatterns = [
    path('', include(router.urls)),
]
