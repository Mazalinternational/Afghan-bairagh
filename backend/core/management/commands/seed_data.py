from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
import random

from customers.models import Customer
from employees.models import Employee, Advance, SalaryPayment
from expenses.models import Expense
from inventory.models import Category, Item, StockTransaction, LowStockAlert
from orders.models import Order, Payment as OrderPayment
from purchases.models import Supplier, Purchase, SupplierLedger, Payment as PurchasePayment

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with sample data for all models'

    def handle(self, *args, **options):
        self.stdout.write('Starting database seeding...')
        
        # Create users first
        self.create_users()
        
        # Seed all models
        self.seed_customers()
        self.seed_employees()
        self.seed_expenses()
        self.seed_inventory()
        self.seed_suppliers()
        self.seed_purchases()
        self.seed_orders()
        
        self.stdout.write(self.style.SUCCESS('Database seeding completed!'))

    def create_users(self):
        if not User.objects.filter(username='admin').exists():
            User.objects.create_user(
                username='admin',
                email='admin@example.com',
                password='admin123',
                role='admin',
                first_name='Admin',
                last_name='User'
            )

    def seed_customers(self):
        customers_data = [
            {'name': 'Ahmad Khan', 'phone': '+93701234567', 'address': 'Kabul, Afghanistan', 'email': 'ahmad@example.com'},
            {'name': 'Fatima Ahmadi', 'phone': '+93702345678', 'address': 'Herat, Afghanistan', 'email': 'fatima@example.com'},
            {'name': 'Mohammad Ali', 'phone': '+93703456789', 'address': 'Mazar-i-Sharif, Afghanistan', 'email': 'mohammad@example.com'},
            {'name': 'Zahra Karimi', 'phone': '+93704567890', 'address': 'Kandahar, Afghanistan', 'email': 'zahra@example.com'},
            {'name': 'Hassan Rezai', 'phone': '+93705678901', 'address': 'Jalalabad, Afghanistan', 'email': 'hassan@example.com'},
        ]
        
        for data in customers_data:
            Customer.objects.get_or_create(phone=data['phone'], defaults=data)
        
        self.stdout.write('Customers seeded')

    def seed_employees(self):
        employees_data = [
            {'name': 'Ali Ahmad', 'father_name': 'Ahmad Khan', 'nid': 'NID001', 'phone': '+93711234567', 'address': 'Kabul', 'salary': Decimal('15000'), 'join_date': date(2023, 1, 15)},
            {'name': 'Sara Mohammadi', 'father_name': 'Mohammad Ali', 'nid': 'NID002', 'phone': '+93712345678', 'address': 'Herat', 'salary': Decimal('12000'), 'join_date': date(2023, 3, 10)},
            {'name': 'Omar Karimi', 'father_name': 'Karimi Jan', 'nid': 'NID003', 'phone': '+93713456789', 'address': 'Mazar', 'salary': Decimal('18000'), 'join_date': date(2023, 2, 20)},
            {'name': 'Maryam Ahmadi', 'father_name': 'Ahmadi Sahib', 'nid': 'NID004', 'phone': '+93714567890', 'address': 'Kandahar', 'salary': Decimal('14000'), 'join_date': date(2023, 4, 5)},
            {'name': 'Hamid Rezai', 'father_name': 'Rezai Khan', 'nid': 'NID005', 'phone': '+93715678901', 'address': 'Jalalabad', 'salary': Decimal('16000'), 'join_date': date(2023, 5, 12)},
        ]
        
        employees = []
        for data in employees_data:
            employee, created = Employee.objects.get_or_create(nid=data['nid'], defaults=data)
            employees.append(employee)
        
        # Create advances
        for i, employee in enumerate(employees):
            Advance.objects.get_or_create(
                employee=employee,
                amount=Decimal(str(random.randint(1000, 5000))),
                defaults={'return_plan': 'Monthly deduction', 'notes': f'Advance for {employee.name}'}
            )
        
        self.stdout.write('Employees and advances seeded')

    def seed_expenses(self):
        expenses_data = [
            {'description': 'Office rent', 'amount': Decimal('25000'), 'category': 'office', 'expense_date': date.today() - timedelta(days=10)},
            {'description': 'Electricity bill', 'amount': Decimal('8000'), 'category': 'utilities', 'expense_date': date.today() - timedelta(days=15)},
            {'description': 'Fuel for delivery', 'amount': Decimal('5000'), 'category': 'transport', 'expense_date': date.today() - timedelta(days=5)},
            {'description': 'Facebook ads', 'amount': Decimal('3000'), 'category': 'marketing', 'expense_date': date.today() - timedelta(days=20)},
            {'description': 'Printer maintenance', 'amount': Decimal('2500'), 'category': 'maintenance', 'expense_date': date.today() - timedelta(days=8)},
        ]
        
        for data in expenses_data:
            Expense.objects.get_or_create(
                description=data['description'],
                expense_date=data['expense_date'],
                defaults=data
            )
        
        self.stdout.write('Expenses seeded')

    def seed_inventory(self):
        # Create categories
        categories_data = [
            {'name': 'Fabric', 'description': 'Various types of fabric materials'},
            {'name': 'Flags', 'description': 'Finished flag products'},
            {'name': 'Flag Stand', 'description': 'Finished flag stand products'},
            {'name': 'Printing Materials', 'description': 'Inks, papers, and printing supplies'},
            {'name': 'Hardware', 'description': 'Poles, ropes, and mounting hardware'},
            {'name': 'Packaging', 'description': 'Boxes, bags, and wrapping materials'},
        ]
        
        categories = []
        for data in categories_data:
            category, created = Category.objects.get_or_create(name=data['name'], defaults=data)
            categories.append(category)
        
        # Create items
        items_data = [
            {'name': 'Cotton Fabric', 'sku': 'FAB001', 'item_type': 'raw_material', 'category': categories[0], 'unit_price': Decimal('150'), 'current_stock': 50, 'minimum_stock': 10},
            {'name': 'Afghan Flag 3x5ft', 'sku': 'FLAG001', 'item_type': 'finished_product', 'category': categories[1], 'unit_price': Decimal('500'), 'current_stock': 25, 'minimum_stock': 5},
            {'name': 'Metal Flag Stand Display', 'sku': 'FSTAND001', 'item_type': 'finished_product', 'category': categories[2], 'unit_price': Decimal('1200'), 'current_stock': 12, 'minimum_stock': 3, 'size': 'large'},
            {'name': 'Printing Ink Black', 'sku': 'INK001', 'item_type': 'raw_material', 'category': categories[3], 'unit_price': Decimal('200'), 'current_stock': 15, 'minimum_stock': 3},
            {'name': 'Flag Pole 6ft', 'sku': 'POLE001', 'item_type': 'raw_material', 'category': categories[4], 'unit_price': Decimal('300'), 'current_stock': 30, 'minimum_stock': 8},
            {'name': 'Gift Box Medium', 'sku': 'BOX001', 'item_type': 'raw_material', 'category': categories[5], 'unit_price': Decimal('50'), 'current_stock': 100, 'minimum_stock': 20},
        ]
        
        items = []
        for data in items_data:
            item, created = Item.objects.get_or_create(sku=data['sku'], defaults=data)
            items.append(item)
        
        # Create stock transactions
        user = User.objects.first()
        for item in items:
            StockTransaction.objects.get_or_create(
                item=item,
                transaction_type='IN',
                quantity=random.randint(10, 50),
                defaults={'reference_number': f'INIT-{item.sku}', 'created_by': user, 'notes': 'Initial stock'}
            )
        
        self.stdout.write('Inventory seeded')

    def seed_suppliers(self):
        suppliers_data = [
            {'name': 'Kabul Textile Co.', 'contact_person': 'Ahmad Fahim', 'phone': '+93721234567', 'email': 'info@kabultextile.com', 'address': 'Kabul Industrial Park'},
            {'name': 'Herat Printing House', 'contact_person': 'Fatima Karimi', 'phone': '+93722345678', 'email': 'orders@heratprint.com', 'address': 'Herat City Center'},
            {'name': 'Afghan Materials Ltd', 'contact_person': 'Mohammad Rezai', 'phone': '+93723456789', 'email': 'sales@afghanmat.com', 'address': 'Mazar-i-Sharif'},
            {'name': 'Quality Fabrics', 'contact_person': 'Zahra Ahmadi', 'phone': '+93724567890', 'email': 'info@qualityfab.com', 'address': 'Kandahar Market'},
            {'name': 'National Supplies', 'contact_person': 'Hassan Ali', 'phone': '+93725678901', 'email': 'contact@natsupply.com', 'address': 'Jalalabad Business District'},
        ]
        
        suppliers = []
        for data in suppliers_data:
            supplier, created = Supplier.objects.get_or_create(name=data['name'], defaults=data)
            suppliers.append(supplier)
        
        self.stdout.write('Suppliers seeded')

    def seed_purchases(self):
        suppliers = list(Supplier.objects.all())
        items = list(Item.objects.filter(item_type='raw_material'))
        
        purchases_data = [
            {'supplier': suppliers[0], 'item_name': 'Cotton Fabric Roll', 'quantity': 20, 'cost': Decimal('3000'), 'is_for_press': True, 'item': items[0] if items else None},
            {'supplier': suppliers[1], 'item_name': 'Printing Ink Set', 'quantity': 10, 'cost': Decimal('2000'), 'is_for_press': True, 'item': items[1] if len(items) > 1 else None},
            {'supplier': suppliers[2], 'item_name': 'Office Supplies', 'quantity': 1, 'cost': Decimal('1500'), 'is_for_press': False, 'description': 'Stationery and office materials'},
            {'supplier': suppliers[3], 'item_name': 'Flag Poles', 'quantity': 15, 'cost': Decimal('4500'), 'is_for_press': True, 'item': items[2] if len(items) > 2 else None},
            {'supplier': suppliers[4], 'item_name': 'Packaging Materials', 'quantity': 50, 'cost': Decimal('2500'), 'is_for_press': True, 'item': items[3] if len(items) > 3 else None},
        ]
        
        purchases = []
        for data in purchases_data:
            purchase, created = Purchase.objects.get_or_create(
                supplier=data['supplier'],
                item_name=data['item_name'],
                defaults=data
            )
            purchases.append(purchase)
        
        # Create some payments
        for purchase in purchases[:3]:
            PurchasePayment.objects.get_or_create(
                purchase=purchase,
                amount=purchase.cost * Decimal('0.5'),
                defaults={'payment_method': 'cash', 'notes': 'Partial payment'}
            )
        
        self.stdout.write('Purchases seeded')

    def seed_orders(self):
        customers = list(Customer.objects.all())
        items = list(Item.objects.filter(item_type='finished_product'))
        
        if not items:
            # Create a default finished product if none exists
            category = Category.objects.first()
            item, created = Item.objects.get_or_create(
                sku='DEFAULT001',
                defaults={
                    'name': 'Default Flag',
                    'item_type': 'finished_product',
                    'category': category,
                    'unit_price': Decimal('500'),
                    'current_stock': 100,
                    'minimum_stock': 10
                }
            )
            items = [item]
        
        orders_data = [
            {'customer': customers[0], 'flag_size': '3x5 feet', 'price_per_unit': Decimal('500'), 'quantity': 5, 'item': items[0]},
            {'customer': customers[1], 'flag_size': '2x3 feet', 'price_per_unit': Decimal('350'), 'quantity': 10, 'item': items[0]},
            {'customer': customers[2], 'flag_size': '4x6 feet', 'price_per_unit': Decimal('750'), 'quantity': 3, 'item': items[0]},
            {'customer': customers[3], 'flag_size': '3x5 feet', 'price_per_unit': Decimal('500'), 'quantity': 8, 'item': items[0]},
            {'customer': customers[4], 'flag_size': '5x8 feet', 'price_per_unit': Decimal('1000'), 'quantity': 2, 'item': items[0]},
        ]
        
        orders = []
        for i, data in enumerate(orders_data):
            # Check if order already exists
            existing_order = Order.objects.filter(
                customer=data['customer'],
                flag_size=data['flag_size'],
                quantity=data['quantity']
            ).first()
            
            if not existing_order:
                order = Order.objects.create(**data)
                orders.append(order)
            else:
                orders.append(existing_order)
        
        # Create some payments for the first 3 orders
        for order in orders[:3]:
            # Check if payment already exists
            if not order.payments.exists():
                OrderPayment.objects.create(
                    order=order,
                    amount_paid=order.total_amount * Decimal('0.6'),
                    payment_method='cash',
                    notes='Partial payment'
                )
        
        self.stdout.write('Orders seeded')