from decimal import Decimal

from django.core.management.base import BaseCommand

from customers.models import Customer
from orders.models import Order, OrderItem, Payment


DEMO_NOTE = 'A5 print demo — 11 items'
DEMO_PHONE = '0701234567'

DEMO_LINES = [
    ('بیرق افغانستان', '3x5 ft', 'ساتین', 10, 500),
    ('بیرق افغانستان', '4x6 ft', 'ساتین', 5, 750),
    ('بیرق ریاست جمهوری', '2x3 ft', 'مخمل', 8, 400),
    ('بیرق رومیزی', '6x9 in', 'ساتین', 20, 80),
    ('پایه بیرق کوچک', 'small', 'فلزی', 4, 1200),
    ('پایه بیرق بزرگ', 'large', 'فلزی', 2, 2500),
    ('بیرق دیواری', '5x8 ft', 'پولیستر', 3, 1000),
    ('بیرق موتر', '12x18 in', 'ساتین', 15, 150),
    ('سیت بیرق میز', 'set', 'مخلوط', 6, 350),
    ('بیرق تشریفات', '3x5 ft', 'گلدوزی', 2, 1800),
    ('بیرق بینر', '2x8 ft', 'وینیل', 4, 600),
]


class Command(BaseCommand):
    help = 'Create one demo order with 11 line items for A5 print testing'

    def handle(self, *args, **options):
        customer, _ = Customer.objects.get_or_create(
            phone=DEMO_PHONE,
            defaults={
                'name': 'احمد خان (Demo)',
                'address': 'کابل، چهارراهی صدارت',
                'email': 'demo@local.test',
                'notes': 'Demo customer for A5 bill print testing',
            },
        )

        order = Order.objects.filter(notes=DEMO_NOTE).first()
        if order:
            order.order_items.all().delete()
            order.payments.all().delete()
        else:
            order = Order.objects.create(
                customer=customer,
                status='Pending',
                notes=DEMO_NOTE,
                manual_serial_no='DEMO-A5-11',
                discount=Decimal('200'),
            )

        order.customer = customer
        order.status = 'Pending'
        order.notes = DEMO_NOTE
        order.manual_serial_no = 'DEMO-A5-11'
        order.discount = Decimal('200')
        order.save()

        for name, size, design, qty, price in DEMO_LINES:
            OrderItem.objects.create(
                order=order,
                quantity=qty,
                price_estimate=Decimal(str(price)),
                flag_size=size,
                quality_design_type=design,
                manual_item_name=name,
                stock_type='press_stock',
            )

        order.calculate_totals()
        order.save(update_fields=['total_estimated_amount'])

        paid = (order.total_estimated_amount * Decimal('0.4')).quantize(Decimal('1'))
        Payment.objects.create(
            order=order,
            amount_paid=paid,
            payment_method='partial',
            notes='Demo partial payment for A5 print',
        )
        order.update_due()

        self.stdout.write(self.style.SUCCESS(
            f'Demo order #{order.id} ready: 11 items, total {order.total_estimated_amount}, '
            f'paid {paid}. Open /orders/{order.id} and print A5.'
        ))
