from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from decimal import Decimal

from django.db.models import Sum, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import Expense
from .serializers import ExpenseSerializer


class ExpensePagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    pagination_class = ExpensePagination
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'expense_date', 'is_for_press']
    search_fields = ['description', 'notes']
    ordering_fields = ['expense_date', 'amount']
    ordering = ['-expense_date']

    def get_queryset(self):
        qs = Expense.objects.all()
        params = self.request.query_params
        df = params.get('date_from')
        dt = params.get('date_to')
        min_amount = params.get('min_amount')
        max_amount = params.get('max_amount')
        if df:
            qs = qs.filter(expense_date__gte=df)
        if dt:
            qs = qs.filter(expense_date__lte=dt)
        if min_amount:
            qs = qs.filter(amount__gte=min_amount)
        if max_amount:
            qs = qs.filter(amount__lte=max_amount)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Generate monthly expense summary"""
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not month or not year:
            return Response(
                {'error': 'month and year parameters required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        expenses = self.queryset.filter(
            expense_date__month=month,
            expense_date__year=year
        )
        
        total_amount = expenses.aggregate(total=Sum('amount'))['total'] or 0
        total_count = expenses.count()
        
        category_summary = expenses.values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        return Response({
            'month': f"{year}-{month:02d}",
            'total_expenses': total_amount,
            'total_count': total_count,
            'category_breakdown': category_summary,
            'expenses': ExpenseSerializer(expenses, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def filter_by_category(self, request):
        """Filter expenses by category"""
        category = request.query_params.get('category')
        if not category:
            return Response({'error': 'category parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        expenses = self.queryset.filter(category=category)
        total = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'category': category,
            'total_amount': total,
            'count': expenses.count(),
            'expenses': ExpenseSerializer(expenses, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def filter_by_amount_range(self, request):
        """Filter expenses by amount range"""
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')
        
        queryset = self.queryset
        if min_amount:
            queryset = queryset.filter(amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(amount__lte=max_amount)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def category_summary(self, request):
        """Get expense summary grouped by category"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.queryset
        if start_date:
            queryset = queryset.filter(expense_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(expense_date__lte=end_date)
        
        category_summary = queryset.values('category').annotate(
            total_amount=Sum('amount'),
            count=Count('id'),
            avg_amount=Sum('amount') / Count('id')
        ).order_by('-total_amount')
        
        total_expenses = queryset.aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'total_expenses': total_expenses,
            'category_breakdown': category_summary
        })

    @action(detail=False, methods=['get'], url_path='location-totals')
    def location_totals(self, request):
        """Totals split by home vs press for optional date_from / date_to range."""
        qs = Expense.objects.all()
        df = request.query_params.get('date_from')
        dt = request.query_params.get('date_to')
        if df:
            qs = qs.filter(expense_date__gte=df)
        if dt:
            qs = qs.filter(expense_date__lte=dt)

        def pack(q):
            agg = q.aggregate(total=Sum('amount'), count=Count('id'))
            total = agg['total'] or Decimal('0')
            return {
                'total': str(total),
                'count': agg['count'] or 0,
            }

        return Response({
            'home': pack(qs.filter(is_for_press=False)),
            'press': pack(qs.filter(is_for_press=True)),
        })
