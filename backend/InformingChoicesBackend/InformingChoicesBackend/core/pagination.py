"""
Defines pagination parameters.
"""

from rest_framework.pagination import PageNumberPagination

class DefaultPagination(PageNumberPagination):
    PAGE_SIZE = 20
    PAGE_SIZE_QUERY_PARAMETER = "page_size"
    MAX_PAGE_SIZE = 100