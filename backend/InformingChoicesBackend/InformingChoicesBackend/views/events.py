from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from InformingChoicesBackend.models import Event
from InformingChoicesBackend.models.event_tag import EventTag
from InformingChoicesBackend.serializers import EventSerializer

class EventsViewSet(viewsets.GenericViewSet):
    def list(self, request):
        try:
            queryset = Event.objects.all().prefetch_related("tags")
            params = request.query_params
            name = params.get("name")
            description = params.get("description")
            tags = params.get("tags")
            search = params.get("search")
            ordering = params.get("ordering")

            allowed_fields = ["name", "-name"]

            if ordering in allowed_fields:
                queryset = queryset.order_by(ordering)

            if search:
                queryset = queryset.filter(
                    Q(name__icontains=search) |
                    Q(description__icontains=search) |
                    Q(tags__name__icontains=search)
                )
            if name:
                queryset = queryset.filter(name__icontains=name)
            if description:
                queryset = queryset.filter(description__icontains=description)
            if tags:
                tag_list = tags.split(",")
                queryset = queryset.filter(tags__slug__in=tag_list)

            queryset = queryset.distinct()
            page = self.paginate_queryset(queryset)

            if page is not None:
                serializer = EventSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = EventSerializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"unexpected_error" : f"Error listing events: {str(e)}"}, status=500)

    def create(self, request):
        try:
            serializer = EventSerializer(data=request.data)

            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=201)

            return Response(serializer.errors, status=400)
        except ValidationError as e:
            return Response(e.message_dict, status=400)
        except Exception as e:
            return Response({"unexpected_error" : f"Error creating event: {str(e)}"}, status=500)

    def retrieve(self, request, pk=None):
        try:
            event = Event.objects.prefetch_related("tags").get(pk=pk)
            serializer = EventSerializer(event)
            return Response(serializer.data)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=404)
        except Exception as e:
            return Response({"unexpected_error" : f"Error retrieving event: {str(e)}"}, status=500)

    def update(self, request, pk=None):
        try:
            event = Event.objects.get(pk=pk)
            event.name = request.data.get("name", event.name)
            event.description = request.data.get("description", event.description)
            event.project_id = request.data.get("project_id", event.project_id)
            event.full_clean()
            event.save()
            serializer = EventSerializer(event)
            return Response(serializer.data)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=404)
        except ValidationError as e:
            return Response(e.message_dict, status=400)
        except Exception as e:
            return Response({"unexpected_error" : f"Error updating event: {str(e)}"}, status=500)

    def partial_update(self, request, pk=None):
        try:
            event = Event.objects.get(pk=pk)
            if "name" in request.data:
                event.name = request.data["name"]
            if "description" in request.data:
                event.description = request.data["description"]
            if "project_id" in request.data:
                event.project_id = request.data["project_id"]
            event.full_clean()
            event.save()
            serializer = EventSerializer(event)
            return Response(serializer.data)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=404)
        except ValidationError as e:
            return Response(e.message_dict, status=400)
        except Exception as e:
            return Response({"unexpected_error" : f"Error updating event: {str(e)}"}, status=500)


    def destroy(self, request, pk=None):
        deleted, _ = Event.objects.filter(pk=pk).delete()
        if deleted == 0:
            return Response({"error": "Event not found"}, status=404)
        return Response(status=204)

    # Tags
    @action(detail=True, methods=["post", "delete"], url_name="tags", url_path="tags")
    def add_tags(self, request, pk=None):
        try:
            event = Event.objects.prefetch_related("tags").get(pk=pk)
            tag_slugs = request.data.get("tags", [])

            if isinstance(tag_slugs, str):
                tag_slugs = tag_slugs.split(",")

            tags = EventTag.objects.filter(slug__in=tag_slugs)
            if not tags.exists():
                return Response({"error": "No valid tags found"}, status=400)

            if request.method == "POST":
                event.tags.add(*tags)
                return Response({"message": "Tags added"})

            if request.method == "DELETE":
                event.tags.remove(*tags)
                return Response({"message": "Tags removed"})
            
            return Response({"error": "Invalid method"}, status=405)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=404)
        except Exception as e:
            return Response({"unexpected_error" : f"Error adding tags to event: {str(e)}"}, status=500)