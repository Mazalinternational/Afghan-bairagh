from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from customers.models import Customer
from inventory.models import Item, Category
from .models import Order

User = get_user_model()


class OrderModelTest(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(
            name="Test Customer",
            phone="1234567890",
            address="Test Address"
        )
        self.category = Category.objects.create(
            name="Flags",
            description="Flag products"
        )
        self.item = Item.objects.create(
            name="Test Flag",
            sku="FLAG-001",
            item_type="finished_product",
            category=self.category,
            description="Test Description",
            unit_price=10.00,
            current_stock=100
        )

    def test_order_creation_with_calculations(self):
        order = Order.objects.create(
            customer=self.customer,
            item=self.item,
            flag_size="Medium",
            price_per_unit=10.00,
            quantity=5,
            due=20.00
        )
        
        self.assertEqual(order.total_amount, 50.00)
        self.assertEqual(order.balance, 30.00)
        self.assertEqual(order.net_total, 50.00)
        self.assertEqual(order.status, 'Pending')

    def test_inventory_deduction_on_order_creation(self):
        initial_stock = self.item.current_stock
        Order.objects.create(
            customer=self.customer,
            item=self.item,
            flag_size="Large",
            price_per_unit=15.00,
            quantity=10
        )
        
        self.item.refresh_from_db()
        self.assertEqual(self.item.current_stock, initial_stock - 10)

    def test_order_cancellation_restores_inventory(self):
        order = Order.objects.create(
            customer=self.customer,
            item=self.item,
            flag_size="Small",
            price_per_unit=8.00,
            quantity=5
        )
        
        initial_stock = self.item.current_stock
        order.cancel_order()
        
        self.item.refresh_from_db()
        self.assertEqual(order.status, 'Cancelled')
        self.assertEqual(self.item.current_stock, initial_stock + 5)


class OrderAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.customer = Customer.objects.create(
            name="API Test Customer",
            phone="9876543210",
            address="API Test Address"
        )
        self.category = Category.objects.create(
            name="API Flags",
            description="API Flag products"
        )
        self.item = Item.objects.create(
            name="API Test Flag",
            sku="FLAG-API-001",
            item_type="finished_product",
            category=self.category,
            description="API Test Description",
            unit_price=12.50,
            current_stock=50
        )

    def test_create_order_api(self):
        url = reverse('order-list')
        data = {
            'customer': self.customer.id,
            'item': self.item.id,
            'flag_size': 'Large',
            'price_per_unit': 12.50,
            'quantity': 3,
            'due': 15.00
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['total_amount'], '37.50')
        self.assertEqual(response.data['balance'], '22.50')

    def test_pending_orders_endpoint(self):
        Order.objects.create(
            customer=self.customer,
            item=self.item,
            flag_size="Medium",
            price_per_unit=10.00,
            quantity=2,
            status='Pending'
        )
        
        url = reverse('order-pending')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_due_orders_endpoint(self):
        Order.objects.create(
            customer=self.customer,
            item=self.item,
            flag_size="Small",
            price_per_unit=8.00,
            quantity=3,
            due=10.00  # Creates balance > 0
        )
        
        url = reverse('order-due')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_cancel_order_api(self):
        order = Order.objects.create(
            customer=self.customer,
            item=self.item,
            flag_size="Large",
            price_per_unit=15.00,
            quantity=2
        )
        
        url = reverse('order-cancel', kwargs={'pk': order.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        order.refresh_from_db()
        self.assertEqual(order.status, 'Cancelled')