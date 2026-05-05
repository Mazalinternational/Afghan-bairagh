from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from .models import PrintingPrinter, PrintingJob, PrintingJobItem, PrintingPayment


class PrintingPrinterSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintingPrinter
        fields = '__all__'


class PrintingJobItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintingJobItem
        fields = ['id', 'flag_name', 'size', 'qty', 'total_meters', 'per_meter_price', 'line_total']


class PrintingPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrintingPayment
        fields = ['id', 'job', 'amount', 'payment_method', 'reference', 'notes', 'payment_date']
        read_only_fields = ['payment_date']


class PrintingJobSerializer(serializers.ModelSerializer):
    printer_name = serializers.CharField(source='printer.name', read_only=True)
    items = PrintingJobItemSerializer(many=True)
    payments = PrintingPaymentSerializer(many=True, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PrintingJob
        fields = [
            'id', 'printer', 'printer_name', 'bill_number', 'job_title', 'total_price',
            'payment_status', 'notes', 'job_date', 'updated_at',
            'items', 'payments', 'total_paid', 'remaining_amount'
        ]
        read_only_fields = ['job_date', 'updated_at', 'payment_status']

    def _normalize_items(self, items):
        normalized = []
        total = Decimal('0')
        for idx, item in enumerate(items):
            try:
                qty = Decimal(str(item.get('qty', '0')))
                meters = Decimal(str(item.get('total_meters', '0')))
                per_meter = Decimal(str(item.get('per_meter_price', '0')))
            except (InvalidOperation, TypeError, ValueError):
                raise serializers.ValidationError({'items': f'Row {idx + 1}: invalid number format.'})

            if qty < 0 or meters < 0 or per_meter < 0:
                raise serializers.ValidationError({'items': f'Row {idx + 1}: values cannot be negative.'})

            line_total = (meters * per_meter).quantize(Decimal('0.01'))
            total += line_total
            normalized.append({
                'flag_name': str(item.get('flag_name', '')).strip(),
                'size': str(item.get('size', '')).strip(),
                'qty': qty,
                'total_meters': meters,
                'per_meter_price': per_meter,
                'line_total': line_total,
            })
        return normalized, total

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        normalized, total = self._normalize_items(items_data)
        if not validated_data.get('job_title'):
            validated_data['job_title'] = normalized[0]['flag_name'] if len(normalized) == 1 else f"Printing Job ({len(normalized)})"
        validated_data['total_price'] = total
        job = PrintingJob.objects.create(**validated_data)
        PrintingJobItem.objects.bulk_create([PrintingJobItem(job=job, **row) for row in normalized])
        return job

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)

        if items_data is not None:
            normalized, total = self._normalize_items(items_data)
            instance.total_price = total
            if not instance.job_title:
                instance.job_title = normalized[0]['flag_name'] if len(normalized) == 1 else f"Printing Job ({len(normalized)})"
            instance.save()
            instance.items.all().delete()
            PrintingJobItem.objects.bulk_create([PrintingJobItem(job=instance, **row) for row in normalized])
        else:
            instance.save()
        instance.update_payment_status()
        return instance

