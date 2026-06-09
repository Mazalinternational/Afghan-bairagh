from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from decimal import Decimal
from .models import Employee, Advance, SalaryPayment, Loan, Tip, SalaryDepositEntry
from .serializers import (
    EmployeeSerializer, AdvanceSerializer, SalaryPaymentSerializer, LoanSerializer, TipSerializer,
    SalaryDepositEntrySerializer,
)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'father_name', 'nid', 'phone']
    ordering_fields = ['name', 'salary', 'join_date']
    ordering = ['name']

    @action(detail=False, methods=['get'])
    def salary_summary(self, request):
        """Get salary summary for all employees"""
        employees = self.queryset.filter(is_active=True)
        total_salary = employees.aggregate(total=Sum('salary'))['total'] or 0
        total_pending_advances = sum(emp.pending_advances for emp in employees)
        total_net_salary = total_salary - total_pending_advances
        
        return Response({
            'total_employees': employees.count(),
            'total_monthly_salary': total_salary,
            'total_pending_advances': total_pending_advances,
            'total_net_salary': total_net_salary,
            'employees': EmployeeSerializer(employees, many=True).data
        })


class SalaryDepositEntryViewSet(viewsets.ModelViewSet):
    queryset = SalaryDepositEntry.objects.select_related('employee').all()
    serializer_class = SalaryDepositEntrySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee', 'entry_type']


class AdvanceViewSet(viewsets.ModelViewSet):
    queryset = Advance.objects.select_related('employee')
    serializer_class = AdvanceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'is_deducted']
    ordering_fields = ['date_given', 'amount']
    ordering = ['-date_given']

    @action(detail=False, methods=['get'])
    def pending_advances_report(self, request):
        """Get report of all pending advances"""
        pending_advances = self.queryset.filter(is_deducted=False)
        total_pending = pending_advances.aggregate(total=Sum('amount'))['total'] or 0
        
        employee_advances = {}
        for advance in pending_advances:
            emp_id = advance.employee.id
            if emp_id not in employee_advances:
                employee_advances[emp_id] = {
                    'employee': EmployeeSerializer(advance.employee).data,
                    'advances': [],
                    'total_pending': 0
                }
            employee_advances[emp_id]['advances'].append(AdvanceSerializer(advance).data)
            employee_advances[emp_id]['total_pending'] += advance.amount
        
        return Response({
            'total_pending_amount': total_pending,
            'total_employees_with_advances': len(employee_advances),
            'employee_advances': list(employee_advances.values())
        })
    
    @action(detail=False, methods=['get'])
    def filter_by_status(self, request):
        """Filter advances by status"""
        status_filter = request.query_params.get('status')
        if not status_filter:
            return Response({'error': 'status parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        advances = self.queryset.filter(status=status_filter)
        serializer = self.get_serializer(advances, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_employee(self, request):
        """Filter advances by employee ID"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        advances = self.queryset.filter(employee_id=employee_id)
        serializer = self.get_serializer(advances, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_date_range(self, request):
        """Filter advances by date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.queryset
        if start_date:
            queryset = queryset.filter(date_given__gte=start_date)
        if end_date:
            queryset = queryset.filter(date_given__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_amount_range(self, request):
        """Filter advances by amount range"""
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')
        
        queryset = self.queryset
        if min_amount:
            queryset = queryset.filter(amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(amount__lte=max_amount)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class SalaryPaymentViewSet(viewsets.ModelViewSet):
    queryset = SalaryPayment.objects.select_related('employee')
    serializer_class = SalaryPaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'month', 'period_type']
    ordering_fields = ['payment_date', 'month']
    ordering = ['-payment_date']

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Get monthly salary payment summary"""
        month = request.query_params.get('month')
        if not month:
            return Response({'error': 'month parameter required (YYYY-MM-DD format)'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        payments = self.queryset.filter(
            month__month=month.split('-')[1],
            month__year=month.split('-')[0],
            period_type='monthly',
        )
        
        total_base = payments.aggregate(total=Sum('base_salary'))['total'] or 0
        total_advances = payments.aggregate(total=Sum('advance_deducted'))['total'] or 0
        total_net = payments.aggregate(total=Sum('net_paid'))['total'] or 0
        
        return Response({
            'month': month,
            'total_employees_paid': payments.count(),
            'total_base_salary': total_base,
            'total_advance_deducted': total_advances,
            'total_net_paid': total_net,
            'payments': SalaryPaymentSerializer(payments, many=True).data
        })
    
    @action(detail=False, methods=['get'])
    def filter_by_date_range(self, request):
        """Filter salary payments by date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.queryset
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_employee(self, request):
        """Filter salary payments by employee ID"""
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        payments = self.queryset.filter(employee_id=employee_id)
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def net_salary_report(self, request):
        """Get net salary report with advance deductions"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.queryset
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        summary = queryset.aggregate(
            total_base_salary=Sum('base_salary'),
            total_advances_deducted=Sum('advance_deducted'),
            total_net_paid=Sum('net_paid'),
            payment_count=Count('id')
        )
        
        return Response({
            'summary': summary,
            'payments': SalaryPaymentSerializer(queryset, many=True).data
        })


class LoanViewSet(viewsets.ModelViewSet):
    queryset = Loan.objects.select_related('employee').all()
    serializer_class = LoanSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'status']
    ordering_fields = ['loan_date', 'amount']
    ordering = ['-loan_date']

    @action(detail=False, methods=['get'])
    def active_loans(self, request):
        """Get all active loans"""
        active_loans = self.queryset.filter(status='Active')
        total_active = sum(float(loan.remaining_amount) for loan in active_loans)
        
        return Response({
            'total_active_loans': active_loans.count(),
            'total_active_amount': total_active,
            'loans': LoanSerializer(active_loans, many=True).data
        })
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record a loan payment"""
        loan = self.get_object()
        payment_amount = request.data.get('amount', 0)
        payment_notes = (request.data.get('notes') or '').strip()
        
        try:
            payment_amount = Decimal(str(payment_amount))
            if payment_amount <= 0:
                return Response({'error': 'Payment amount must be greater than zero'}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            loan.amount_paid = Decimal(str(loan.amount_paid or 0)) + payment_amount
            
            if loan.amount_paid >= loan.amount:
                loan.status = 'Paid'
                loan.amount_paid = loan.amount
            elif loan.amount_paid > 0:
                loan.status = 'Partial'

            payment_line = (
                f"[{timezone.localdate().isoformat()}] Repayment AFN {payment_amount:.2f}"
            )
            if payment_notes:
                payment_line += f" — {payment_notes}"
            loan.notes = f"{loan.notes}\n{payment_line}".strip() if loan.notes else payment_line
            
            loan.save()
            return Response(LoanSerializer(loan).data)
        except (ValueError, TypeError) as e:
            return Response({'error': f'Invalid payment amount: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)


class TipViewSet(viewsets.ModelViewSet):
    queryset = Tip.objects.select_related('employee').all()
    serializer_class = TipSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee']
    ordering_fields = ['date', 'amount']
    ordering = ['-date']