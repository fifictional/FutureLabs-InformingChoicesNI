from rest_framework import viewsets
from rest_framework.response import Response

class FormsViewSet(viewsets.ViewSet):
    # we need a forms manager that can handle the interactions with google forms api
    # the idea is that we can 

    def list(self, request):
        # get a list of available forms, 
        # should be queryable and filterable and sortable
        pass

    def create(self, request):
        # create a new form on Google forms, and add it to the database
        # with google forms api, this is very doable
        pass

    def retrieve(self, request, pk=None):
        # get form by id, its questions and answers etc
        pass

    def update(self, request, pk=None):
        # update form details
        # we can even add questions etc, 
        # but we need to be careful with 
        # this since it can mess up existing 
        # responses, so maybe we should only 
        # allow updating the form name and description, 
        # but not the questions
        pass

    def partial_update(self, request, pk=None):
        # update form details, 
        # but only the fields that are provided in the request
        pass

    def destroy(self, request, pk=None):
        # create a backup of the deleted form data 
        # (for data retention and recovery purposes)
        # delete form from database and Google forms
        pass
