from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import RozNamcha
from .serializers import RozNamchaSerializer


class RozNamchaPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class RozNamchaViewSet(viewsets.ModelViewSet):
    queryset = RozNamcha.objects.all()
    serializer_class = RozNamchaSerializer
    permission_classes = [AllowAny]
    pagination_class = RozNamchaPagination
    http_method_names = ['get', 'head', 'options']  # Read-only: removed post, put, patch, delete
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['date', 'item_name']
    search_fields = ['item_name', 'description']
    ordering_fields = ['date', 'cost_price', 'created_at']
    ordering = ['-date', '-created_at']

    @action(detail=False, methods=['get'])
    def date_range_summary(self, request):
        """Get summary for a date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if not start_date or not end_date:
            return Response(
                {'error': 'start_date and end_date parameters required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        entries = self.queryset.filter(
            date__gte=start_date,
            date__lte=end_date
        )
        
        total_cost = entries.aggregate(total=Sum('cost_price'))['total'] or 0
        total_count = entries.count()
        
        return Response({
            'start_date': start_date,
            'end_date': end_date,
            'total_cost': total_cost,
            'total_count': total_count,
            'entries': RozNamchaSerializer(entries, many=True).data
        })
