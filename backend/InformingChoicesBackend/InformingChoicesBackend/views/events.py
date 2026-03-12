from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from InformingChoicesBackend.models import Event
from InformingChoicesBackend.models.EventTag import EventTag
from InformingChoicesBackend.serializers import EventSerializer

class EventsViewSet(viewsets.GenericViewSet):
    def list(self, request):
        """
        Lists all events that match the query parameters given by the request.
        :param request: The request object containing the query parameters.
        :return: A response containing the list of events.
        """
        try:
            queryset = Event.objects.all().prefetch_related("tags")

            params = request.query_params
            name = params.get("name")
            description = params.get("description")
            tags = params.get("tags")
            search = params.get("search")
            ordering = params.get("ordering")

            # Construct query set according to given query parameters

            allowed_ordering_options = [
                "name",  # Alphabetical order by name
                "-name"  # Reverse alphabetical order by name
            ]

            if ordering in allowed_ordering_options:
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

            # If pagination is necessary, serialise the page data
            if page is not None:
                serializer = EventSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            # Serialise the available data
            serializer = EventSerializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({"unexpected_error" : f"Error listing events: {str(e)}"}, status=500)

    def create(self, request):
        """
        Creates a new event.
        :param request: The request object containing the event data.
        :return: A response containing the created event.
        """
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
        """
        Retrieve an event by its primary key.
        :param request: The request object.
        :param pk: The primary key of the event to retrieve.
        :return: A response containing the event data.
        """
        try:
            event = Event.objects.prefetch_related("tags").get(pk=pk)
            serializer = EventSerializer(event)
            return Response(serializer.data)
        except Event.DoesNotExist:
            return Response({"error": "Event not found"}, status=404)
        except Exception as e:
            return Response({"unexpected_error" : f"Error retrieving event: {str(e)}"}, status=500)

    def update(self, request, pk=None):
        """
        Updates an event, as specified by the request data.
        :param request: The request object containing the updated event data.
        :param pk: The primary key of the event to update.
        :return: A response containing the updated event data.
        """
        try:
            # Retrieve event by primary key
            event = Event.objects.get(pk=pk)

            # If the request specifies a field, update that field of the event correspondingly
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
        """
        Partially updates an event, as specified by the request data.
        :param request: The request object containing the updated event data.
        :param pk: The primary key of the event to update.
        :return: A response containing the updated event data.
        """
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
        """
        Removes an event from the database.
        :param request: The request object.
        :param pk: The primary key of the event to delete.
        :return: A response indicating success or failure.
        """
        deleted, _ = Event.objects.filter(pk=pk).delete()
        if deleted == 0:
            return Response({"error": "Event not found"}, status=404)
        return Response(status=204)

    # Tags
    @action(detail=True, methods=["post", "delete"], url_name="tags", url_path="tags")
    def add_tags(self, request, pk=None):
        """
        Add or remove tags from an event.
        :param request: A POST or DELETE request.
        :param pk: The primary key of the event.
        :return: A response indicating success or failure.
        """
        try:
            # Retrieve tag slugs currently associated with the event
            event = Event.objects.prefetch_related("tags").get(pk=pk)
            tag_slugs = request.data.get("tags", [])

            if isinstance(tag_slugs, str):
                tag_slugs = tag_slugs.split(",")

            # Verify that the tags to add/remove correspond to existing tags in the database
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