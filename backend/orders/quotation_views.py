from django.http import HttpResponse
from django.template.loader import render_to_string
from django.views import View
from .models import Order


class QuotationTemplateView(View):
    def get(self, request, order_id):
        try:
            order = Order.objects.select_related('customer', 'item').get(id=order_id)
            
            context = {
                'order': order,
                'customer_name': order.customer.name,
                'customer_phone': order.customer.phone,
                'customer_email': order.customer.email,
                'item_name': order.item.name,
                'flag_size': order.flag_size,
                'quality_design_type': order.quality_design_type,
                'quantity': order.quantity,
                'price_per_unit': order.price_per_unit,
                'total_amount': order.total_estimated_amount,
                'total_paid': order.total_paid,
                'due': order.due,
                'order_date': order.order_date.strftime('%d/%m/%Y'),
                'status': order.status,
                'payments': order.payments.all(),
            }
            
            html = render_to_string('orders/quotation.html', context)
            return HttpResponse(html, content_type='text/html')
        except Order.DoesNotExist:
            return HttpResponse('Order not found', status=404)
