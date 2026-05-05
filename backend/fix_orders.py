"""
Fix orders without customers before migration
Run this script: python fix_orders.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from orders.models import Order
from customers.models import Customer

# Get or create a default customer for orphaned orders
default_customer, created = Customer.objects.get_or_create(
    name='Unknown Customer',
    defaults={
        'phone': '0000000000',
        'address': 'N/A',
        'email': ''
    }
)

if created:
    print(f"Created default customer: {default_customer.name}")
else:
    print(f"Using existing default customer: {default_customer.name}")

# Fix orders without customers
orphaned_orders = Order.objects.filter(customer__isnull=True)
count = orphaned_orders.count()

if count > 0:
    orphaned_orders.update(customer=default_customer)
    print(f"Fixed {count} orders without customers")
else:
    print("No orders need fixing")

print("\nDatabase is ready for migration!")
print("Now run: python manage.py makemigrations sales")
