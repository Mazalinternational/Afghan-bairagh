from rest_framework import serializers

from .models import RentPayment, Shop


class RentPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentPayment
        fields = ["id", "amount", "payment_date", "note", "created_at"]
        read_only_fields = ["id", "created_at"]


class ShopSerializer(serializers.ModelSerializer):
    payments = RentPaymentSerializer(many=True, read_only=True)
    total_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    paid_periods = serializers.IntegerField(read_only=True)
    remaining_periods = serializers.IntegerField(read_only=True)

    class Meta:
        model = Shop
        fields = [
            "id",
            "shop_no",
            "tenant_name",
            "tenant_phone",
            "owner_name",
            "rent_date",
            "duration_count",
            "period_type",
            "rent_amount",
            "notes",
            "is_active",
            "total_due",
            "total_paid",
            "paid_periods",
            "remaining_periods",
            "payments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
