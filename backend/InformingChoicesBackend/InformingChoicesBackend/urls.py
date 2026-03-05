from django.urls import include, path
from rest_framework import routers
from InformingChoicesBackend import views

router = routers.DefaultRouter()
router.register(r'events', views.EventsViewSet, basename='events')
router.register(r'tags', views.EventTagViewSet, basename='tags')

urlpatterns = [
    path('', include(router.urls)),
]
