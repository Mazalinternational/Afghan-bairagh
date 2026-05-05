from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Count, Q, F, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from orders.models import Order
from purchases.models import Supplier, Purchase, Payment
from inventory.models import Item, LowStockAlert
from employees.models import Employee, Advance
from expenses.models import Expense
from sales.direct_sales_models import DirectSale
from customers.models import CustomerBalancePayment
from printing.models import PrintingJob


class OrdersWithDuesReport(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Report of orders with outstanding dues"""
        orders = Order.objects.filter(due__gt=0).select_related('customer')
        
        # Optional filters
        customer_id = request.query_params.get('customer_id')
        min_due = request.query_params.get('min_due')
        max_due = request.query_params.get('max_due')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if customer_id:
            orders = orders.filter(customer_id=customer_id)
        if min_due:
            orders = orders.filter(due__gte=float(min_due))
        if max_due:
            orders = orders.filter(due__lte=float(max_due))
        if start_date:
            orders = orders.filter(order_date__gte=start_date)
        if end_date:
            orders = orders.filter(order_date__lte=end_date)
        
        total_due = orders.aggregate(total=Sum('due'))['total'] or 0
        
        data = [{
            'order_id': o.id,
            'customer_name': o.customer.name,
            'customer_phone': o.customer.phone,
            'total_amount': float(o.total_estimated_amount),
            'total_paid': float(o.total_paid),
            'due_amount': float(o.due),
            'order_date': o.order_date,
            'status': o.status
        } for o in orders.order_by('-due')]
        
        return Response({
            'total_outstanding': float(total_due),
            'count': len(data),
            'orders': data
        })


class SuppliersWithBalanceReport(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Report of suppliers with outstanding balance"""
        suppliers = Supplier.objects.annotate(
            total_purchases=Sum('purchases__cost'),
            total_paid=Sum('purchases__payments__amount')
        )
        
        # Calculate actual balance for each supplier
        suppliers_with_balance = []
        for s in suppliers:
            total_cost = s.total_purchases or 0
            total_paid_amount = Payment.objects.filter(purchase__supplier=s).aggregate(total=Sum('amount'))['total'] or 0
            calculated_balance = total_cost - total_paid_amount
            
            # Apply filters
            min_balance = request.query_params.get('min_balance')
            max_balance = request.query_params.get('max_balance')
            
            if calculated_balance <= 0:
                continue
            if min_balance and calculated_balance < float(min_balance):
                continue
            if max_balance and calculated_balance > float(max_balance):
                continue
            
            suppliers_with_balance.append({
                'supplier_id': s.id,
                'name': s.name,
                'contact_person': s.contact_person,
                'phone': s.phone,
                'balance': float(calculated_balance),
                'created_at': s.created_at
            })
        
        # Sort by balance descending
        suppliers_with_balance.sort(key=lambda x: x['balance'], reverse=True)
        
        total_balance = sum(s['balance'] for s in suppliers_with_balance)
        
        return Response({
            'total_outstanding': float(total_balance),
            'count': len(suppliers_with_balance),
            'suppliers': suppliers_with_balance
        })


class LowStockReport(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Report of items with low stock"""
        items = Item.objects.filter(current_stock__lte=F('minimum_stock'))
        
        # Optional filters
        item_type = request.query_params.get('item_type')
        critical_only = request.query_params.get('critical_only', 'false').lower() == 'true'
        
        if item_type:
            items = items.filter(item_type=item_type)
        if critical_only:
            items = items.filter(current_stock=0)
        
        data = [{
            'item_id': i.id,
            'name': i.name,
            'sku': i.sku,
            'item_type': i.item_type,
            'current_stock': i.current_stock,
            'minimum_stock': i.minimum_stock,
            'unit_price': float(i.unit_price),
            'stock_value': float(i.current_stock * i.unit_price)
        } for i in items.order_by('current_stock')]
        
        return Response({
            'count': len(data),
            'items': data
        })


class PendingAdvancesReport(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Report of pending employee advances"""
        advances = Advance.objects.filter(status='Pending').select_related('employee')
        
        # Optional filters
        employee_id = request.query_params.get('employee_id')
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')
        
        if employee_id:
            advances = advances.filter(employee_id=employee_id)
        if min_amount:
            advances = advances.filter(amount__gte=float(min_amount))
        if max_amount:
            advances = advances.filter(amount__lte=float(max_amount))
        
        total_pending = advances.aggregate(total=Sum('amount'))['total'] or 0
        
        data = [{
            'advance_id': a.id,
            'employee_name': a.employee.name,
            'employee_id': a.employee.id,
            'amount': float(a.amount),
            'date_given': a.date_given,
            'return_plan': a.return_plan,
            'status': a.status,
            'notes': a.notes
        } for a in advances.order_by('-date_given')]
        
        return Response({
            'total_pending': float(total_pending),
            'count': len(data),
            'advances': data
        })


class MonthlyExpensesReport(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Report of monthly expenses by category"""
        month = int(request.query_params.get('month', timezone.now().month))
        year = int(request.query_params.get('year', timezone.now().year))
        
        expenses = Expense.objects.filter(
            expense_date__month=month,
            expense_date__year=year
        )
        
        # Group by category
        by_category = expenses.values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'period': f"{year}-{month:02d}",
            'total_expenses': float(total_expenses),
            'by_category': list(by_category),
            'count': expenses.count()
        })


class EmployeeSalaryReport(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Report of employee net salary with advances"""
        employees = Employee.objects.filter(is_active=True)
        
        # Optional filter
        employee_id = request.query_params.get('employee_id')
        if employee_id:
            employees = employees.filter(id=employee_id)
        
        data = []
        for emp in employees:
            pending_advances = emp.advances.filter(is_deducted=False).aggregate(
                total=Sum('amount')
            )['total'] or 0
            
            data.append({
                'employee_id': emp.id,
                'name': emp.name,
                'salary': float(emp.salary),
                'pending_advances': float(pending_advances),
                'net_salary': float(emp.net_salary),
                'join_date': emp.join_date
            })
        
        return Response({
            'count': len(data),
            'employees': data
        })


class PurchasePaymentStatusReport(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Report of purchases grouped by payment status"""
        status_filter = request.query_params.get('status')
        supplier_id = request.query_params.get('supplier_id')
        
        purchases = Purchase.objects.select_related('supplier')
        
        if status_filter:
            purchases = purchases.filter(payment_status=status_filter)
        if supplier_id:
            purchases = purchases.filter(supplier_id=supplier_id)
        
        # Group by status
        by_status = purchases.values('payment_status').annotate(
            total_cost=Sum('cost'),
            count=Count('id')
        )
        
        data = [{
            'purchase_id': p.id,
            'supplier_name': p.supplier.name,
            'item_name': p.item_name,
            'quantity': p.quantity,
            'cost': float(p.cost),
            'total_paid': float(p.total_paid),
            'remaining': float(p.remaining_amount),
            'payment_status': p.payment_status,
            'purchase_date': p.purchase_date
        } for p in purchases.order_by('-purchase_date')]
        
        return Response({
            'by_status': list(by_status),
            'purchases': data,
            'count': purchases.count()
        })



class DetailedReportView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Comprehensive detailed report with daily, weekly, monthly, yearly, and date-range filters"""
        period = request.query_params.get('period', 'daily')  # daily, weekly, monthly, yearly, custom
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Calculate date range based on period
        now = timezone.now()
        today = now.date()
        
        if period == 'daily':
            start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
            end = now
        elif period == 'weekly':
            start_date = today - timedelta(days=today.weekday())
            start = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end = now
        elif period == 'monthly':
            start_date = today.replace(day=1)
            start = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end = now
        elif period == 'yearly':
            start_date = today.replace(month=1, day=1)
            start = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end = now
        elif period == 'custom' and start_date and end_date:
            start = timezone.make_aware(datetime.strptime(start_date, '%Y-%m-%d'))
            end = timezone.make_aware(datetime.strptime(end_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59))
        else:
            start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
            end = now
        
        # Orders Report
        orders = Order.objects.filter(order_date__gte=start, order_date__lte=end)
        total_paid_orders = sum(o.total_paid for o in orders)
        orders_data = {
            'total_orders': orders.count(),
            'total_revenue': float(orders.aggregate(Sum('total_estimated_amount'))['total_estimated_amount__sum'] or 0),
            'total_paid': float(total_paid_orders),
            'total_due': float(orders.aggregate(Sum('due'))['due__sum'] or 0),
            'by_status': list(orders.values('status').annotate(count=Count('id'), total=Sum('total_estimated_amount'))),
            'orders': [{
                'id': o.id,
                'customer': o.customer.name,
                'total_amount': float(o.total_estimated_amount),
                'paid': float(o.total_paid),
                'due': float(o.due),
                'status': o.status,
                'date': o.order_date
            } for o in orders.select_related('customer').order_by('-order_date')]
        }
        
        # Direct Sales Report (no stock)
        direct_sales_qs = DirectSale.objects.filter(sale_date__gte=start, sale_date__lte=end, status='Confirmed')
        direct_sales_agg = direct_sales_qs.aggregate(
            total_revenue=Sum('net_amount'),
            total_cost=Sum('cost_amount'),
            total_profit=Sum('profit'),
            total_due=Sum('due'),
            count=Count('id')
        )
        direct_sales_data = {
            'total_direct_sales': direct_sales_agg.get('count') or 0,
            'total_revenue': float(direct_sales_agg.get('total_revenue') or 0),
            'total_cost': float(direct_sales_agg.get('total_cost') or 0),
            'total_profit': float(direct_sales_agg.get('total_profit') or 0),
            'total_due': float(direct_sales_agg.get('total_due') or 0),
            'sales': [{
                'id': s.id,
                'customer': s.customer.name if s.customer else s.customer_name,
                'total_amount': float(s.total_amount),
                'discount': float(s.discount),
                'net_amount': float(s.net_amount),
                'cost_amount': float(s.cost_amount),
                'profit': float(s.profit),
                'due': float(s.due),
                'status': s.status,
                'payment_status': s.payment_status,
                'date': s.sale_date
            } for s in direct_sales_qs.select_related('customer').order_by('-sale_date')]
        }
        
        # Purchases Report
        purchases = Purchase.objects.filter(purchase_date__gte=start, purchase_date__lte=end)
        total_paid_purchases = sum(p.total_paid for p in purchases)
        total_remaining_purchases = sum(p.remaining_amount for p in purchases)
        purchases_data = {
            'total_purchases': purchases.count(),
            'total_cost': float(purchases.aggregate(Sum('cost'))['cost__sum'] or 0),
            'total_paid': float(total_paid_purchases),
            'total_remaining': float(total_remaining_purchases),
            'by_status': list(purchases.values('payment_status').annotate(count=Count('id'), total=Sum('cost'))),
            'purchases': [{
                'id': p.id,
                'supplier': p.supplier.name,
                'item': p.item_name,
                'quantity': p.quantity,
                'cost': float(p.cost),
                'paid': float(p.total_paid),
                'remaining': float(p.remaining_amount),
                'status': p.payment_status,
                'date': p.purchase_date
            } for p in purchases.select_related('supplier').order_by('-purchase_date')]
        }

        # Printing Press Report
        printing_jobs = PrintingJob.objects.filter(job_date__gte=start, job_date__lte=end).select_related('printer')
        printing_total_paid = sum(j.total_paid for j in printing_jobs)
        printing_total_remaining = sum(j.remaining_amount for j in printing_jobs)
        printing_data = {
            'total_jobs': printing_jobs.count(),
            'total_cost': float(printing_jobs.aggregate(Sum('total_price'))['total_price__sum'] or 0),
            'total_paid': float(printing_total_paid),
            'total_remaining': float(printing_total_remaining),
            'by_status': list(printing_jobs.values('payment_status').annotate(count=Count('id'), total=Sum('total_price'))),
            'jobs': [{
                'id': j.id,
                'printer': j.printer.name,
                'bill_number': j.bill_number,
                'job_title': j.job_title,
                'total_price': float(j.total_price),
                'paid': float(j.total_paid),
                'remaining': float(j.remaining_amount),
                'status': j.payment_status,
                'date': j.job_date,
            } for j in printing_jobs.order_by('-job_date')]
        }
        
        # Expenses Report
        expenses = Expense.objects.filter(expense_date__gte=start, expense_date__lte=end)
        expenses_data = {
            'total_expenses': float(expenses.aggregate(Sum('amount'))['amount__sum'] or 0),
            'count': expenses.count(),
            'by_category': list(expenses.values('category').annotate(total=Sum('amount'), count=Count('id')).order_by('-total')),
            'expenses': [{
                'id': e.id,
                'description': e.description,
                'amount': float(e.amount),
                'category': e.category,
                'date': e.expense_date
            } for e in expenses.order_by('-expense_date')]
        }
        
        # Previous Balance Payments Report (customer opening balances)
        prev_payments_qs = CustomerBalancePayment.objects.filter(
            payment_date__gte=start,
            payment_date__lte=end,
        )
        prev_payments_agg = prev_payments_qs.aggregate(
            total=Sum('amount'),
            count=Count('id'),
        )
        previous_balance_payments = {
            'total_payments': prev_payments_agg.get('count') or 0,
            'total_amount': float(prev_payments_agg.get('total') or 0),
            'payments': [{
                'id': p.id,
                'customer': p.customer.name,
                'amount': float(p.amount),
                'date': p.payment_date,
                'notes': p.notes,
            } for p in prev_payments_qs.select_related('customer').order_by('-payment_date')]
        }
        
        # Inventory Report
        items = Item.objects.all()
        inventory_data = {
            'total_items': items.count(),
            'total_stock_value': float(sum((i.current_stock or 0) * (i.unit_price or 0) for i in items)),
            'low_stock_items': items.filter(current_stock__lte=F('minimum_stock')).count(),
            'out_of_stock': items.filter(current_stock=0).count(),
            'by_type': list(items.values('item_type').annotate(
                count=Count('id'),
                total_stock=Sum('current_stock'),
                total_value=Sum(F('current_stock') * F('unit_price'))
            ))
        }
        
        # Employees Report
        employees = Employee.objects.filter(is_active=True)
        total_salary = employees.aggregate(Sum('salary'))['salary__sum'] or 0
        pending_advances = Advance.objects.filter(is_deducted=False).aggregate(Sum('amount'))['amount__sum'] or 0
        employees_data = {
            'total_employees': employees.count(),
            'total_salary': float(total_salary),
            'pending_advances': float(pending_advances),
            'net_payable': float(total_salary - pending_advances)
        }
        
        # Financial Summary (include direct sales and previous balance payments)
        total_revenue = orders_data['total_revenue'] + direct_sales_data['total_revenue'] + previous_balance_payments['total_amount']
        profit = total_revenue - purchases_data['total_cost'] - printing_data['total_cost'] - expenses_data['total_expenses']
        financial_summary = {
            'revenue': total_revenue,
            'costs': purchases_data['total_cost'] + printing_data['total_cost'],
            'expenses': expenses_data['total_expenses'],
            'profit': profit,
            'receivables': orders_data['total_due'] + direct_sales_data['total_due'],
            'payables': purchases_data['total_remaining'] + printing_data['total_remaining'],
            'direct_sales_revenue': direct_sales_data['total_revenue'],
            'direct_sales_profit': direct_sales_data['total_profit'],
            'previous_balance_payments': previous_balance_payments['total_amount'],
            'printing_total_cost': printing_data['total_cost'],
            'printing_total_remaining': printing_data['total_remaining'],
        }
        
        return Response({
            'period': period,
            'start_date': start,
            'end_date': end,
            'financial_summary': financial_summary,
            'orders': orders_data,
            'direct_sales': direct_sales_data,
            'purchases': purchases_data,
            'printing': printing_data,
            'expenses': expenses_data,
            'inventory': inventory_data,
            'employees': employees_data,
            'previous_balance_payments': previous_balance_payments,
        })
