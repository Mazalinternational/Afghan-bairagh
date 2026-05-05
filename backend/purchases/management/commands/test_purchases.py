from django.core.management.base import BaseCommand
from purchases.models import Supplier, Purchase, Payment
from inventory.models import Item


class Command(BaseCommand):
    help = 'Test purchases functionality'

    def handle(self, *args, **options):
        # Create test supplier
        supplier, created = Supplier.objects.get_or_create(
            name='Test Supplier',
            defaults={
                'contact_person': 'John Doe',
                'phone': '1234567890',
                'email': 'test@supplier.com'
            }
        )
        self.stdout.write(f'Supplier: {supplier.name} (Balance: {supplier.balance})')

        # Create test item for press
        item, created = Item.objects.get_or_create(
            name='Test Raw Material',
            defaults={
                'category': 'raw_material',
                'unit': 'kg',
                'current_stock': 0,
                'minimum_stock': 10
            }
        )
        self.stdout.write(f'Item: {item.name} (Stock: {item.current_stock})')

        # Create purchase for press
        purchase = Purchase.objects.create(
            supplier=supplier,
            item_name='Test Raw Material',
            quantity=100,
            cost=1000.00,
            is_for_press=True,
            item=item,
            description='Test purchase for press'
        )
        self.stdout.write(f'Purchase created: #{purchase.id} - Status: {purchase.payment_status}')

        # Refresh objects to see updated values
        supplier.refresh_from_db()
        item.refresh_from_db()
        self.stdout.write(f'Updated Supplier Balance: {supplier.balance}')
        self.stdout.write(f'Updated Item Stock: {item.current_stock}')

        # Make partial payment
        payment = Payment.objects.create(
            purchase=purchase,
            amount=500.00,
            payment_method='cash',
            notes='Partial payment'
        )
        self.stdout.write(f'Payment created: #{payment.id} - Amount: {payment.amount}')

        # Refresh to see updated status
        purchase.refresh_from_db()
        supplier.refresh_from_db()
        self.stdout.write(f'Updated Purchase Status: {purchase.payment_status}')
        self.stdout.write(f'Total Paid: {purchase.total_paid}')
        self.stdout.write(f'Remaining: {purchase.remaining_amount}')
        self.stdout.write(f'Updated Supplier Balance: {supplier.balance}')

        self.stdout.write(self.style.SUCCESS('Purchase functionality test completed!'))