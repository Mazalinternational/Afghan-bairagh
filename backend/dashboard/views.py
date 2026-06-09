from rest_framework.views import APIView
from rest_framework.response import Response
from decimal import Decimal
from django.db.models import Sum, Count, Q, F, Case, When, DecimalField, Max, Avg, Min, Value, ExpressionWrapper
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime, timedelta
from orders.models import Order, OrderItem, Payment as OrderPayment
from customers.models import Customer, CustomerBalancePayment
from inventory.models import Item, LowStockAlert
from purchases.models import Supplier, Purchase, Payment as SupplierPayment
from expenses.models import Expense
from employees.models import Employee, SalaryPayment
from sales.models import Sale, SaleItem, SalePayment
from sales.direct_sales_models import DirectSale
from bank.models import BankTransaction


def _dec_money(v):
    """Normalize DB aggregates / numbers to Decimal for financial math."""
    if v is None:
        return Decimal('0')
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def _inventory_sales_cogs_for_period(start_datetime, end_datetime):
    """
    COGS for stock-based (Sale) invoices in the period: sum(qty * unit_cost).
    Unit cost matches the sales UI: item.cost_price when set, else latest press purchase line unit_cost.
    """
    from inventory.purchase_cost import build_latest_supplier_unit_cost_by_item_id

    supplier_unit = build_latest_supplier_unit_cost_by_item_id()
    cogs = Decimal('0')
    qs = SaleItem.objects.filter(
        sale__sale_date__gte=start_datetime,
        sale__sale_date__lte=end_datetime,
        sale__status='Confirmed',
    ).select_related('item')
    for line in qs.iterator(chunk_size=500):
        item = line.item
        if item.cost_price is not None and item.cost_price > 0:
            unit = _dec_money(item.cost_price)
        else:
            uc = supplier_unit.get(item.id) or 0
            unit = _dec_money(uc) if uc else Decimal('0')
        cogs += Decimal(line.quantity) * unit
    return cogs


def _delivered_order_cogs_for_period(start_datetime, end_datetime):
    """
    COGS for delivered orders in the period: sum(qty × unit cost).
    Uses OrderItem.purchase_unit_cost when set; else item.cost_price; else latest press purchase unit_cost.
    """
    from inventory.purchase_cost import build_latest_supplier_unit_cost_by_item_id

    supplier_unit = build_latest_supplier_unit_cost_by_item_id()
    cogs = Decimal('0')
    qs = OrderItem.objects.filter(
        order__order_date__gte=start_datetime,
        order__order_date__lte=end_datetime,
        order__status='Delivered',
    ).select_related('item')
    for line in qs.iterator(chunk_size=500):
        unit = Decimal('0')
        if line.purchase_unit_cost is not None and line.purchase_unit_cost > 0:
            unit = _dec_money(line.purchase_unit_cost)
        elif line.item_id and line.item is not None:
            it = line.item
            if it.cost_price is not None and it.cost_price > 0:
                unit = _dec_money(it.cost_price)
            else:
                uc = supplier_unit.get(it.id) or 0
                if uc:
                    unit = _dec_money(uc)
        cogs += Decimal(line.quantity) * unit
    return cogs


class AdminDashboardView(APIView):
    def get(self, request):
        try:
            # Get period parameter (daily, weekly, monthly, yearly)
            period = request.query_params.get('period', 'monthly')
            
            # Calculate date range based on period (use timezone-aware datetime)
            now = timezone.now()
            today = now.date()
            
            if period == 'daily':
                start_datetime = timezone.make_aware(datetime.combine(today, datetime.min.time()))
                end_datetime = now
            elif period == 'weekly':
                # Monday to now
                start_date = today - timedelta(days=today.weekday())
                start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
                end_datetime = now
            elif period == 'yearly':
                start_date = today.replace(month=1, day=1)
                start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
                end_datetime = now
            else:  # monthly
                start_date = today.replace(day=1)
                start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
                end_datetime = now
            
            # Optimize queries with annotations and select_related/prefetch_related
            dashboard_data = {
                'orders': self._get_orders_data(start_datetime, end_datetime),
                'customers': self._get_customers_data(),
                'inventory': self._get_inventory_data(),
                'suppliers': self._get_suppliers_data(),
                'financials': self._get_financials_data(start_datetime, end_datetime),
                'employees': self._get_employees_data(start_datetime, end_datetime),
                'overview': self._get_overview_metrics(start_datetime, end_datetime),
                'period_info': {
                    'period': period,
                    'start': start_datetime.isoformat(),
                    'end': end_datetime.isoformat()
                }
            }
            
            return Response(dashboard_data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=500)

    def _get_orders_data(self, start_datetime, end_datetime):
        """Optimized orders aggregation with enhanced metrics"""
        try:
            # Order model uses total_estimated_amount and status 'Delivered' for completed
            orders_summary = Order.objects.filter(
                order_date__gte=start_datetime,
                order_date__lte=end_datetime
            ).aggregate(
                total_orders=Count('id'),
                pending_orders=Count('id', filter=Q(status='Pending')),
                completed_orders=Count('id', filter=Q(status='Delivered')),
                cancelled_orders=Count('id', filter=Q(status='Cancelled')),
                total_revenue=Sum('total_estimated_amount', filter=Q(status='Delivered')),
                pending_revenue=Sum('total_estimated_amount', filter=Q(status='Pending')),
                total_due=Sum('due', filter=Q(status='Pending')),
                avg_order_value=Avg('total_estimated_amount', filter=Q(status='Delivered')),
                today_orders=Count('id', filter=Q(order_date__date=timezone.now().date())),
                this_week_orders=Count('id', filter=Q(order_date__gte=timezone.now() - timedelta(days=7)))
            )
            
            recent_raw = list(Order.objects.select_related('customer').filter(
                order_date__gte=timezone.now() - timedelta(days=7)
            ).values(
                'id', 'customer__name', 'total_estimated_amount', 'due', 'status', 'order_date'
            ).order_by('-order_date')[:10])
            recent_orders = [
                {**r, 'total_amount': r['total_estimated_amount'], 'flag_size': '', 'quantity': 0}
                for r in recent_raw
            ]
            
            priority_raw = list(Order.objects.select_related('customer').filter(
                status='Pending', total_estimated_amount__gte=1000
            ).values(
                'id', 'customer__name', 'total_estimated_amount', 'due', 'order_date'
            ).order_by('-total_estimated_amount')[:5])
            priority_orders = [
                {**r, 'total_amount': r['total_estimated_amount']}
                for r in priority_raw
            ]
            
            return {
                'summary': orders_summary,
                'recent_orders': recent_orders,
                'priority_pending': priority_orders
            }
        except Exception as e:
            print(f"Error in _get_orders_data: {e}")
            return {'summary': {}, 'recent_orders': [], 'priority_pending': []}

    def _get_customers_data(self):
        """Enhanced customer dues and credits with risk analysis"""
        try:
            # Outstanding orders: not Delivered/Cancelled (Pending, In_Production, Ready)
            outstanding_orders = Q(orders__status__in=['Pending', 'In_Production', 'Ready'])
            # Outstanding sales: Confirmed and not fully paid (Unpaid, Partial)
            outstanding_sales = Q(sales__status='Confirmed', sales__payment_status__in=['Unpaid', 'Partial'])
            
            # Annotate customers with combined dues from orders and sales
            customers_data = list(Customer.objects.annotate(
                total_orders=Count('orders'),
                total_sales=Count('sales'),
                order_due=Coalesce(Sum('orders__due', filter=outstanding_orders), Value(0, output_field=DecimalField())),
                sale_due=Coalesce(Sum('sales__due', filter=outstanding_sales), Value(0, output_field=DecimalField())),
                total_due=ExpressionWrapper(
                    F('order_due') + F('sale_due'),
                    output_field=DecimalField()
                ),
                total_credit=Value(Decimal('0'), output_field=DecimalField()),
                total_spent=Coalesce(Sum('orders__total_estimated_amount', filter=Q(orders__status='Delivered')), Value(0, output_field=DecimalField())) + 
                           Coalesce(Sum('sales__net_amount', filter=Q(sales__status='Confirmed')), Value(0, output_field=DecimalField())),
                last_order_date=Max('orders__order_date'),
                avg_order_value=Avg('orders__total_estimated_amount')
            ).filter(
                total_due__gt=0
            ).values(
                'id', 'name', 'phone', 'total_orders', 'total_sales', 'total_due',
                'total_credit', 'total_spent', 'last_order_date', 'avg_order_value'
            ).order_by('-total_due'))
            
            high_risk_customers = list(Customer.objects.annotate(
                order_due=Coalesce(Sum('orders__due', filter=outstanding_orders), Value(0, output_field=DecimalField())),
                sale_due=Coalesce(Sum('sales__due', filter=outstanding_sales), Value(0, output_field=DecimalField())),
                total_due=ExpressionWrapper(
                    F('order_due') + F('sale_due'),
                    output_field=DecimalField()
                ),
                last_order=Max('orders__order_date')
            ).filter(
                total_due__gte=500,
                last_order__lt=timezone.now() - timedelta(days=30)
            ).values('id', 'name', 'phone', 'total_due', 'last_order')[:10])
            
            summary = Customer.objects.aggregate(
                total_customers=Count('id'),
                active_customers=Count('id', filter=Q(orders__order_date__gte=timezone.now() - timedelta(days=30)) | Q(sales__sale_date__gte=timezone.now() - timedelta(days=30))),
                customers_with_dues=Count('id', filter=Q(orders__due__gt=0) | Q(sales__due__gt=0)),
                orders_due=Sum('orders__due', filter=outstanding_orders),
                sales_due=Sum('sales__due', filter=outstanding_sales),
                avg_customer_value=Avg('orders__total_estimated_amount', filter=Q(orders__status='Delivered'))
            )
            
            # Combine dues from orders and sales
            orders_due_val = summary.get('orders_due')
            sales_due_val = summary.get('sales_due')
            summary['total_outstanding_dues'] = float((orders_due_val if orders_due_val is not None else 0) + (sales_due_val if sales_due_val is not None else 0))
            summary['customers_with_credits'] = 0
            summary['total_customer_credits'] = 0
            # Ensure numeric for frontend (aggregate can return None when no rows)
            if summary.get('total_outstanding_dues') is None:
                summary['total_outstanding_dues'] = 0
            if summary.get('customers_with_dues') is None:
                summary['customers_with_dues'] = 0
            
            return {
                'summary': summary,
                'customers_with_balances': customers_data,
                'high_risk_customers': high_risk_customers
            }
        except Exception as e:
            print(f"Error in _get_customers_data: {e}")
            return {'summary': {}, 'customers_with_balances': [], 'high_risk_customers': []}

    def _get_inventory_data(self):
        """Enhanced inventory alerts with critical stock analysis"""
        try:
            low_stock_items = list(Item.objects.select_related('category').filter(
                current_stock__lte=F('minimum_stock')
            ).values(
                'id', 'name', 'sku', 'category__name', 'current_stock', 
                'minimum_stock', 'item_type'
            ).order_by('current_stock')[:20])
            
            critical_items = list(Item.objects.select_related('category').filter(
                Q(current_stock=0) | Q(current_stock__lte=F('minimum_stock') / 4)
            ).values(
                'id', 'name', 'sku', 'category__name', 'current_stock', 'minimum_stock'
            ).order_by('current_stock')[:10])
            
            inventory_summary = Item.objects.aggregate(
                total_items=Count('id'),
                low_stock_count=Count('id', filter=Q(current_stock__lte=F('minimum_stock'))),
                critical_stock_count=Count('id', filter=Q(current_stock=0)),
                out_of_stock_count=Count('id', filter=Q(current_stock=0)),
                avg_stock_level=Avg('current_stock'),
                total_stock_value=Sum(F('current_stock') * F('unit_price'), output_field=DecimalField(max_digits=15, decimal_places=2))
            )
            
            recent_alerts = list(LowStockAlert.objects.select_related('item').filter(
                is_resolved=False
            ).values(
                'id', 'item__name', 'item__sku', 'current_stock', 
                'minimum_stock', 'created_at'
            ).order_by('-created_at')[:15])
            
            # Ensure total_stock_value is properly set (default to 0 if None)
            if inventory_summary.get('total_stock_value') is None:
                inventory_summary['total_stock_value'] = 0
            
            return {
                'summary': inventory_summary,
                'low_stock_items': low_stock_items,
                'critical_items': critical_items,
                'recent_alerts': recent_alerts
            }
        except Exception as e:
            print(f"Error in _get_inventory_data: {e}")
            return {'summary': {}, 'low_stock_items': [], 'critical_items': [], 'recent_alerts': []}

    def _get_suppliers_data(self):
        """Enhanced supplier balances with payment analysis"""
        try:
            from purchases.models import Payment
            
            # Get all suppliers and calculate actual balance from purchases and payments
            suppliers = Supplier.objects.annotate(
                total_purchases=Count('purchases')
            )
            
            suppliers_with_balance = []
            critical_suppliers_list = []
            total_outstanding_balance = 0
            suppliers_with_balance_count = 0
            
            for supplier in suppliers:
                # Calculate actual balance: total purchases cost - total payments
                total_cost = supplier.purchases.aggregate(total=Sum('cost'))['total'] or 0
                total_paid_amount = SupplierPayment.objects.filter(purchase__supplier=supplier).aggregate(total=Sum('amount'))['total'] or 0
                calculated_balance = total_cost - total_paid_amount
                
                # Only include suppliers with balance > 0
                if calculated_balance > 0:
                    suppliers_with_balance_count += 1
                    total_outstanding_balance += calculated_balance
                    
                    supplier_data = {
                        'id': supplier.id,
                        'name': supplier.name,
                        'contact_person': supplier.contact_person,
                        'phone': supplier.phone,
                        'total_purchases': supplier.total_purchases,
                        'outstanding_balance': float(calculated_balance),
                        'balance': float(calculated_balance)
                    }
                    
                    suppliers_with_balance.append(supplier_data)
                    
                    # Add to critical suppliers if balance >= 1000
                    if calculated_balance >= 1000:
                        critical_suppliers_list.append({
                            'id': supplier.id,
                            'name': supplier.name,
                            'phone': supplier.phone,
                            'balance': float(calculated_balance)
                        })
            
            # Sort by balance descending and take top 10
            suppliers_with_balance.sort(key=lambda x: x['outstanding_balance'], reverse=True)
            suppliers_data = suppliers_with_balance[:10]
            
            # Sort critical suppliers by balance descending
            critical_suppliers_list.sort(key=lambda x: x['balance'], reverse=True)
            critical_suppliers = critical_suppliers_list[:10]
            
            # Get total and active supplier counts
            total_suppliers_count = Supplier.objects.count()
            active_suppliers_count = Supplier.objects.filter(
                purchases__purchase_date__gte=timezone.now() - timedelta(days=90)
            ).distinct().count()
            
            summary = {
                'total_suppliers': total_suppliers_count,
                'active_suppliers': active_suppliers_count,
                'suppliers_with_balance': suppliers_with_balance_count,
                'total_outstanding': float(total_outstanding_balance)
            }
            
            return {
                'summary': summary,
                'suppliers_with_balances': suppliers_data,
                'critical_suppliers': critical_suppliers
            }
        except Exception as e:
            print(f"Error in _get_suppliers_data: {e}")
            return {'summary': {}, 'suppliers_with_balances': [], 'critical_suppliers': []}

    def _get_financials_data(self, start_datetime, end_datetime):
        """Enhanced expenses and revenue analysis for date range"""
        try:
            period_expenses = list(Expense.objects.filter(
                expense_date__gte=start_datetime,
                expense_date__lte=end_datetime
            ).values('category').annotate(
                total_amount=Sum('amount'),
                count=Count('id')
            ).order_by('-total_amount'))
            
            # Revenue from delivered orders, confirmed stock-based sales, confirmed direct sales,
            # and payments against previous customer balances
            order_revenue = Order.objects.filter(
                order_date__gte=start_datetime,
                order_date__lte=end_datetime,
                status='Delivered'
            ).aggregate(
                total=Sum('total_estimated_amount'),
                count=Count('id')
            )
            
            sale_revenue = Sale.objects.filter(
                sale_date__gte=start_datetime,
                sale_date__lte=end_datetime,
                status='Confirmed'
            ).aggregate(
                total=Sum('net_amount'),
                count=Count('id')
            )

            direct_sales = DirectSale.objects.filter(
                sale_date__gte=start_datetime,
                sale_date__lte=end_datetime,
                status='Confirmed'
            ).aggregate(
                total=Sum('net_amount'),
                cost=Sum('cost_amount'),
                count=Count('id'),
                profit=Sum('profit')
            )
            
            previous_balance_payments = CustomerBalancePayment.objects.filter(
                payment_date__gte=start_datetime,
                payment_date__lte=end_datetime,
            ).aggregate(
                total=Sum('amount'),
                count=Count('id'),
            )

            prev_total = previous_balance_payments.get('total') or 0

            # Delivered orders: revenue minus COGS (same cost logic as stock sales where line cost not stored)
            order_cogs = _delivered_order_cogs_for_period(start_datetime, end_datetime)
            order_revenue_dec = _dec_money(order_revenue.get('total'))
            order_profit_dec = order_revenue_dec - order_cogs

            # Stock-based Sale invoices: COGS from line qty × (inventory cost_price or latest press purchase unit cost)
            inventory_sales_cogs = _inventory_sales_cogs_for_period(start_datetime, end_datetime)
            inventory_sales_revenue_dec = _dec_money(sale_revenue.get('total'))
            inventory_sales_profit_dec = inventory_sales_revenue_dec - inventory_sales_cogs

            # For direct sales: revenue is the selling price, but profit calculation needs cost subtracted
            direct_sales_revenue = direct_sales.get('total') or 0
            direct_sales_cost = direct_sales.get('cost') or 0
            direct_sales_profit = direct_sales.get('profit') or 0

            income_deposited_to_bank = BankTransaction.objects.filter(
                transaction_type=BankTransaction.TYPE_DEPOSIT,
                source=BankTransaction.SOURCE_INCOME,
                transaction_date__gte=start_datetime,
                transaction_date__lte=end_datetime
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            period_revenue = {
                'total_revenue': (
                    (order_revenue.get('total') or 0) +
                    (sale_revenue.get('total') or 0) +
                    direct_sales_revenue +
                    prev_total -
                    income_deposited_to_bank
                ),
                'orders_count': order_revenue.get('count') or 0,
                'sales_count': sale_revenue.get('count') or 0,
                'direct_sales_count': direct_sales.get('count') or 0,
                'direct_sales_revenue': direct_sales_revenue,
                'direct_sales_cost': direct_sales_cost,
                'direct_sales_profit': direct_sales_profit,
                'previous_balance_payments_total': prev_total,
                'previous_balance_payments_count': previous_balance_payments.get('count') or 0,
                'income_deposited_to_bank': income_deposited_to_bank,
                'order_cogs': order_cogs,
                'order_profit': order_profit_dec,
                'inventory_sales_cogs': inventory_sales_cogs,
                'inventory_sales_profit': inventory_sales_profit_dec,
            }
            
            expense_summary = Expense.objects.filter(
                expense_date__gte=start_datetime,
                expense_date__lte=end_datetime
            ).aggregate(
                total_expenses=Sum('amount'),
                expense_count=Count('id')
            )
            
            total_revenue = period_revenue.get('total_revenue') or 0
            total_expenses = expense_summary.get('total_expenses') or 0
            
            # Net profit calculation:
            # - Delivered orders: profit (total_estimated_amount - line COGS), not full revenue as profit
            # - Stock-based Sale: profit (net_amount - COGS)
            # - Direct sales: stored profit
            # - Subtract expenses; add previous balance payments; subtract income moved to bank
            net_profit = (
                order_profit_dec +
                inventory_sales_profit_dec +
                _dec_money(direct_sales_profit) +
                _dec_money(prev_total) -
                _dec_money(total_expenses) -
                _dec_money(income_deposited_to_bank)
            )
            
            # Gross profit = Total revenue - order COGS - stock-sale COGS - direct sale cost - expenses
            gross_profit = (
                _dec_money(total_revenue) -
                order_cogs -
                inventory_sales_cogs -
                _dec_money(direct_sales_cost) -
                _dec_money(total_expenses)
            )
            
            return {
                'period': f"{start_datetime.date()} to {end_datetime.date()}",
                'revenue': period_revenue,
                'expenses': {
                    'summary': expense_summary,
                    'by_category': period_expenses
                },
                'profitability': {
                    'gross_profit': gross_profit,
                    'net_profit': net_profit,
                    'income_deposited_to_bank': income_deposited_to_bank
                }
            }
        except Exception as e:
            print(f"Error in _get_financials_data: {e}")
            return {'period': f"{start_datetime.date()} to {end_datetime.date()}", 'revenue': {}, 'expenses': {}, 'profitability': {}}

    def _get_employees_data(self, start_datetime, end_datetime):
        """Employee salary and advance data"""
        try:
            employee_summary = Employee.objects.filter(is_active=True).aggregate(
                total_employees=Count('id'),
                total_monthly_salary=Sum('salary')
            )
            
            period_salaries = SalaryPayment.objects.filter(
                month__gte=start_datetime.date(),
                month__lte=end_datetime.date()
            ).aggregate(
                total_paid=Sum('net_paid'),
                payments_count=Count('id')
            )
            
            pending_advances = list(Employee.objects.filter(
                is_active=True
            ).values(
                'id', 'name'
            ).order_by('-id')[:10])
            
            return {
                'summary': employee_summary,
                'monthly_payments': period_salaries,
                'pending_advances': pending_advances
            }
        except Exception as e:
            print(f"Error in _get_employees_data: {e}")
            return {'summary': {}, 'monthly_payments': {}, 'pending_advances': []}
    
    def _get_overview_metrics(self, start_datetime, end_datetime):
        """Key performance indicators and alerts"""
        try:
            alerts = {
                'critical_stock': Item.objects.filter(current_stock=0).count(),
                'high_customer_dues': 0,
                'overdue_suppliers': Supplier.objects.filter(balance__gte=500).count(),
                'pending_high_value_orders': Order.objects.filter(
                    order_date__gte=start_datetime,
                    order_date__lte=end_datetime,
                    status='Pending', 
                    total_estimated_amount__gte=1000
                ).count()
            }
            
            return {
                'alerts': alerts,
                'total_critical_alerts': sum(alerts.values())
            }
        except Exception as e:
            print(f"Error in _get_overview_metrics: {e}")
            return {'alerts': {}, 'total_critical_alerts': 0}
    
    def _calculate_fulfillment_rate(self, month, year):
        return 0
    
    def _calculate_inventory_turnover(self):
        return 0
    
    def _calculate_customer_retention(self):
        return 0
    
    def _calculate_avg_payment_delay(self):
        return 0


class DashboardSummaryView(APIView):
    """Quick summary for dashboard widgets with enhanced metrics"""
    def get(self, request):
        summary = {
            'orders': {
                'pending': Order.objects.filter(status='Pending').count(),
                'completed_today': Order.objects.filter(
                    status='Completed',
                    order_date__date=timezone.now().date()
                ).count(),
                'high_value_pending': Order.objects.filter(
                    status='Pending', total_estimated_amount__gte=1000
                ).count()
            },
            'inventory': {
                'critical_stock': Item.objects.filter(current_stock=0).count(),
                'low_stock_alerts': Item.objects.filter(
                    current_stock__lte=F('minimum_stock')
                ).count(),
                'total_stock_value': Item.objects.aggregate(
                    total=Sum(F('current_stock') * F('unit_price'))
                )['total'] or 0
            },
            'financials': {
                'monthly_revenue': (
                    (Order.objects.filter(
                        order_date__month=timezone.now().month,
                        order_date__year=timezone.now().year,
                        status='Delivered'
                    ).aggregate(total=Sum('total_estimated_amount'))['total'] or 0) +
                    (Sale.objects.filter(
                        sale_date__month=timezone.now().month,
                        sale_date__year=timezone.now().year,
                        status='Confirmed'
                    ).aggregate(total=Sum('net_amount'))['total'] or 0) +
                    (DirectSale.objects.filter(
                        sale_date__month=timezone.now().month,
                        sale_date__year=timezone.now().year,
                        status='Confirmed'
                    ).aggregate(total=Sum('net_amount'))['total'] or 0)
                ),
                'monthly_expenses': Expense.objects.filter(
                    expense_date__month=timezone.now().month,
                    expense_date__year=timezone.now().year
                ).aggregate(total=Sum('amount'))['total'] or 0,
                'monthly_direct_sales_cost': DirectSale.objects.filter(
                    sale_date__month=timezone.now().month,
                    sale_date__year=timezone.now().year,
                    status='Confirmed'
                ).aggregate(total=Sum('cost_amount'))['total'] or 0,
                'pending_supplier_payments': Supplier.objects.aggregate(
                    total=Sum('balance')
                )['total'] or 0
            },
            'customers': {
                'total_dues': (Order.objects.filter(
                    status__in=['Pending', 'In_Production', 'Ready']
                ).aggregate(total=Sum('due'))['total'] or 0) + 
                (Sale.objects.filter(
                    status='Confirmed', payment_status__in=['Unpaid', 'Partial']
                ).aggregate(total=Sum('due'))['total'] or 0),
                'high_risk_customers': Customer.objects.annotate(
                    order_due=Coalesce(Sum('orders__due', filter=Q(orders__status__in=['Pending', 'In_Production', 'Ready'])), Value(0, output_field=DecimalField())),
                    sale_due=Coalesce(Sum('sales__due', filter=Q(sales__status='Confirmed', sales__payment_status__in=['Unpaid', 'Partial'])), Value(0, output_field=DecimalField())),
                    total_due=ExpressionWrapper(F('order_due') + F('sale_due'), output_field=DecimalField())
                ).filter(total_due__gte=1000).count()
            },
            'alerts': {
                'critical_items': Item.objects.filter(current_stock=0).count(),
                'overdue_suppliers': Supplier.objects.filter(
                    balance__gte=1000
                ).count(),
                'high_value_pending_orders': Order.objects.filter(
                    status='Pending', total_estimated_amount__gte=1000
                ).count()
            }
        }
        
        return Response(summary)


class FinancialAnalyticsView(APIView):
    """Detailed financial analytics and trends"""
    def get(self, request):
        # Get last 6 months data for trends
        months_data = []
        for i in range(6):
            date = timezone.now() - timedelta(days=30*i)
            month_data = self._get_month_analytics(date.month, date.year)
            months_data.append(month_data)
        
        return Response({
            'monthly_trends': months_data,
            'yearly_summary': self._get_yearly_summary(),
            'profitability_analysis': self._get_profitability_analysis()
        })
    
    def _get_month_analytics(self, month, year):
        order_revenue = Order.objects.filter(
            order_date__month=month, order_date__year=year, status='Delivered'
        ).aggregate(total=Sum('total_estimated_amount'))['total'] or 0
        
        sale_revenue = Sale.objects.filter(
            sale_date__month=month, sale_date__year=year, status='Confirmed'
        ).aggregate(total=Sum('net_amount'))['total'] or 0

        direct_sales_data = DirectSale.objects.filter(
            sale_date__month=month, sale_date__year=year, status='Confirmed'
        ).aggregate(
            revenue=Sum('net_amount'),
            cost=Sum('cost_amount'),
            profit=Sum('profit')
        )
        
        direct_sales_revenue = direct_sales_data['revenue'] or 0
        direct_sales_cost = direct_sales_data['cost'] or 0
        direct_sales_profit = direct_sales_data['profit'] or 0

        income_deposited_to_bank = BankTransaction.objects.filter(
            transaction_type=BankTransaction.TYPE_DEPOSIT,
            source=BankTransaction.SOURCE_INCOME,
            transaction_date__month=month,
            transaction_date__year=year
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Total revenue includes all sales (orders, sales, direct sales)
        revenue = order_revenue + sale_revenue + direct_sales_revenue - income_deposited_to_bank
        
        expenses = Expense.objects.filter(
            expense_date__month=month, expense_date__year=year
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        purchases = Purchase.objects.filter(
            purchase_date__month=month, purchase_date__year=year
        ).aggregate(total=Sum('cost'))['total'] or 0
        
        # Gross profit = Revenue - Purchases - Direct sales cost
        gross_profit = revenue - purchases - direct_sales_cost
        
        # Net profit = Gross profit - Expenses
        # Or: Revenue - Purchases - Direct sales cost - Expenses
        net_profit = gross_profit - expenses - income_deposited_to_bank
        
        return {
            'month': f"{year}-{month:02d}",
            'revenue': revenue,
            'expenses': expenses,
            'purchases': purchases,
            'direct_sales_cost': direct_sales_cost,
            'gross_profit': gross_profit,
            'net_profit': net_profit,
            'income_deposited_to_bank': income_deposited_to_bank
        }
    
    def _get_yearly_summary(self):
        current_year = timezone.now().year
        return Order.objects.filter(
            order_date__year=current_year, status='Delivered'
        ).aggregate(
            total_revenue=Sum('total_estimated_amount'),
            total_orders=Count('id')
        )
    
    def _get_profitability_analysis(self):
        # Top profitable customers
        top_customers = Customer.objects.annotate(
            total_revenue=Sum('orders__total_estimated_amount', filter=Q(orders__status='Delivered'))
        ).filter(total_revenue__gt=0).order_by('-total_revenue')[:10]
        
        return {
            'top_customers': list(top_customers.values('id', 'name', 'total_revenue'))
        }